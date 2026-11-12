/**
 * 우리 가족 체크노트 v1 - GitHub Pages iframe bridge / Google Sheets ciphertext store
 * 배포: Apps Script 웹 앱 -> 실행 사용자: 나, 액세스: 모든 사용자
 * 주의: APP_ORIGINS에 허용한 GitHub Pages 원본 URL만 메시지 수신 가능.
 * 인증 코드는 SHA-256 검증값으로만 저장하고 평문 데이터/복호화 키는 서버에 저장하지 않음.
 */
'use strict';
const DB_TAB = 'APP_DB';
const PAIR_CODES = ['ew-he','ce-hy','hr-yw'];
const CHUNK_LEN=28000;
const MAX_CHUNKS=24;
const MAX_CIPHER_LEN=CHUNK_LEN*MAX_CHUNKS;

function doGet(e) {
  const props=PropertiesService.getScriptProperties();
  const origins=(props.getProperty('APP_ORIGINS')||'').split(',').map(x=>x.trim()).filter(x=>/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(x)||/^http:\/\/localhost:\d+$/i.test(x));
  if(!origins.length)return HtmlService.createHtmlOutput('<p>APP_ORIGINS를 먼저 설정하세요.</p>');
  const nonce=String((e&&e.parameter&&e.parameter.bridge_nonce)||'');
  if(!/^[A-Za-z0-9+/]{22}==$/.test(nonce))return HtmlService.createHtmlOutput('<p>가족 앱을 통해 접근해 주세요.</p>');
  // 단일 파일 설치: HTML 파일을 추가로 만들 필요 없이 Bridge 화면을 Code.gs에서 생성합니다.
  const html=BRIDGE_DOCUMENT
    .replace('__ORIGINS_JSON__',JSON.stringify(origins).replace(/</g,'\\u003c'))
    .replace('__NONCE_JSON__',JSON.stringify(nonce));
  return HtmlService.createHtmlOutput(html).setTitle('Encrypted Family Data Bridge')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function bridgeRequest(req) {
  if(!req||typeof req!=='object'||!PAIR_CODES.includes(req.family))throw Error('허용되지 않은 가족 공간입니다.');
  if(!['meta','setup','login','save'].includes(req.action))throw Error('지원하지 않는 요청입니다.');
  const sheet=db_();
  if(req.action==='meta'){
    const row=findPair_(sheet,req.family);
    return {ok:true,initialized:!!row,salt:row?row.salt:'',revision:row?row.revision:0};
  }
  if(req.action==='setup')return register_(sheet,req);
  if(!/^[0-9a-f]{64}$/.test(String(req.authToken||'')))throw Error('인증 정보가 올바르지 않습니다.');
  const requestVerifier=sha256_(req.authToken);
  if(req.action==='login'){
    const row=findPair_(sheet,req.family);
    if(!row||!equals_(row.verifier,requestVerifier))throw Error('비밀번호가 맞지 않거나 미등록 공간입니다.');
    return {ok:true,cipher:readCipher_(sheet,row),revision:row.revision,salt:row.salt};
  }
  return save_(sheet,req);
}

function register_(sheet,req){
  const salt=String(req.salt||''),verifier=String(req.verifier||''),cipher=String(req.cipher||'');
  if(!/^[A-Za-z0-9+/]{22}==$/.test(salt)||!/^[0-9a-f]{64}$/.test(verifier))throw Error('등록 정보 형식이 올바르지 않습니다.');
  validateCipher_(cipher);
  const propertyKey='INVITE_HASH_'+req.family.toUpperCase().replace(/-/g,'_');
  const expected=PropertiesService.getScriptProperties().getProperty(propertyKey)||'';
  const actual=sha256_(String(req.inviteCode||''));
  if(!expected||!equals_(expected,actual))throw Error('초대 코드가 일치하지 않습니다.');
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    if(findPair_(sheet,req.family))throw Error('이미 등록된 가족 공간입니다. 처음 설정한 비밀번호로 로그인하세요.');
    const row=Math.max(2,sheet.getLastRow()+1);
    writeRow_(sheet,row,{family:req.family,salt,verifier,revision:1,cipher});
    // 초대 코드는 등록에 한 번만 사용합니다.
    PropertiesService.getScriptProperties().deleteProperty(propertyKey);
    return {ok:true,revision:1};
  } finally {lock.releaseLock()}
}

function save_(sheet,req){
  const cipher=String(req.cipher||'');
  validateCipher_(cipher);
  const expectedRevision=Number(req.revision);
  if(!Number.isSafeInteger(expectedRevision)||expectedRevision<1)throw Error('수정 버전이 올바르지 않습니다.');
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const row=findPair_(sheet,req.family);
    if(!row||!equals_(row.verifier,sha256_(req.authToken)))throw Error('인증 실패');
    if(row.revision!==expectedRevision)return {ok:false,error:'CONFLICT',revision:row.revision};
    writeRow_(sheet,row.index,{family:row.family,salt:row.salt,verifier:row.verifier,revision:row.revision+1,cipher});
    return {ok:true,revision:row.revision+1};
  }finally{lock.releaseLock()}
}

function db_(){
  const id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if(!id)throw Error('서버의 SPREADSHEET_ID가 아직 설정되지 않았습니다.');
  const ss=SpreadsheetApp.openById(id);
  let sheet=ss.getSheetByName(DB_TAB);
  if(!sheet){const lock=LockService.getScriptLock();lock.waitLock(30000);try{
    sheet=ss.getSheetByName(DB_TAB)||ss.insertSheet(DB_TAB);
    if(sheet.getMaxColumns()<6+MAX_CHUNKS)sheet.insertColumnsAfter(sheet.getMaxColumns(),6+MAX_CHUNKS-sheet.getMaxColumns());
    sheet.getRange(1,1,1,7).setValues([['family','salt','verifier_hash','revision','updated_at','chunk_count','cipher_chunk_1']]);
    sheet.setFrozenRows(1);
    sheet.hideColumns(3); // 인증 검증값은 평문 비밀번호가 아니나 수동 열람을 줄입니다.
  }finally{lock.releaseLock()}}
  if(sheet.getMaxColumns()<6+MAX_CHUNKS)sheet.insertColumnsAfter(sheet.getMaxColumns(),6+MAX_CHUNKS-sheet.getMaxColumns());
  return sheet;
}
function findPair_(sheet,family){
  const last=sheet.getLastRow();if(last<2)return null;
  const data=sheet.getRange(2,1,last-1,6).getValues();
  for(let i=0;i<data.length;i++)if(data[i][0]===family)return {index:i+2,family,salt:String(data[i][1]),verifier:String(data[i][2]),revision:Number(data[i][3]),chunkCount:Number(data[i][5])||0};
  return null;
}
function readCipher_(sheet,row){
  if(row.chunkCount<1||row.chunkCount>MAX_CHUNKS)throw Error('저장소 데이터 형식 오류');
  return sheet.getRange(row.index,7,1,row.chunkCount).getValues()[0].join('');
}
function writeRow_(sheet,index,d){
  const chunks=d.cipher.match(new RegExp('.{1,'+CHUNK_LEN+'}','gs'))||[];
  if(!chunks.length||chunks.length>MAX_CHUNKS)throw Error('최대 데이터 크기 초과');
  sheet.getRange(index,1,1,6+MAX_CHUNKS).clearContent();
  sheet.getRange(index,1,1,6+chunks.length).setValues([[d.family,d.salt,d.verifier,d.revision,new Date().toISOString(),chunks.length,...chunks]]);
  SpreadsheetApp.flush();
}
function validateCipher_(cipher){
  if(cipher.length>MAX_CIPHER_LEN||cipher.length<20)throw Error('암호화 저장 용량 또는 내용 형식 오류');
  let parsed;try{parsed=JSON.parse(cipher)}catch(e){throw Error('암호화 형식이 아닙니다.')}
  if(parsed.v!==1||typeof parsed.iv!=='string'||typeof parsed.ct!=='string'||!/^([A-Za-z0-9+/]{4})*[A-Za-z0-9+/]*={0,2}$/.test(parsed.ct))throw Error('암호화 형식 오류');
}
function sha256_(text){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,text,Utilities.Charset.UTF_8).map(b=>('0'+(b&255).toString(16)).slice(-2)).join('')}
function equals_(a,b){a=String(a||'');b=String(b||'');if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0;}

/** 최초 한 번만 수동 실행: 3개 가족 전용 1회 등록 코드 생성. 코드는 실행 로그에만 출력합니다. */
function generateEnrollmentCodes(){
 const props=PropertiesService.getScriptProperties();
 // 바인딩된 전용 Google Sheet에서 실행하면 서버 환경을 자동 설정합니다.
 const bound=SpreadsheetApp.getActiveSpreadsheet();
 if(!bound||!bound.getSheetByName(DB_TAB))throw Error('APP_DB 탭이 있는 전용 시트에서 확장 프로그램 → Apps Script로 실행하세요.');
 const configuredId=props.getProperty('SPREADSHEET_ID');
 if(configuredId&&configuredId!==bound.getId())throw Error('이미 다른 스프레드시트와 연결되어 있습니다. 설정을 확인하세요.');
 props.setProperty('SPREADSHEET_ID',bound.getId());
 if(!props.getProperty('APP_ORIGINS'))props.setProperty('APP_ORIGINS','https://hossea123456789-design.github.io');
 Logger.log('서버 연결 준비 완료. DB 탭: '+DB_TAB+' / 허용 출처: '+props.getProperty('APP_ORIGINS'));
 for(const pair of PAIR_CODES){
  const key='INVITE_HASH_'+pair.toUpperCase().replace(/-/g,'_');
  if(props.getProperty(key)){Logger.log(pair+': 이미 초대 코드 생성됨 (로그로 재표시 불가)');continue}
  const code=(Utilities.getUuid()+Utilities.getUuid()).replace(/-/g,'');
  props.setProperty(key,sha256_(code));
  Logger.log(pair+' : '+code);
 }
}

/** Bridge.html을 별도 생성할 필요가 없는 단일 파일 웹앱 버전. */
const BRIDGE_DOCUMENT=String.raw`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>Encrypted Bridge</title></head><body>
<p>암호화 저장 연결용 페이지입니다. 가족 앱에서 접근해 주세요.</p>
<script>
'use strict';
(function(){
 const ALLOWED_ORIGINS=__ORIGINS_JSON__;
 const NONCE=__NONCE_JSON__;
 // 등록된 출처의 부모 창에만 연결 완료를 알립니다.
 ALLOWED_ORIGINS.forEach(origin=>window.top.postMessage({kind:'BABY_PREP_BRIDGE_READY',nonce:NONCE},origin));
 window.addEventListener('message',function(event){
  if(event.source!==window.top||!ALLOWED_ORIGINS.includes(event.origin))return;
  const data=event.data||{};
  if(data.kind!=='BABY_PREP_BRIDGE_REQUEST'||data.nonce!==NONCE||!Number.isSafeInteger(data.id)||!data.req)return;
  const reply=(result,error)=>event.source.postMessage({kind:'BABY_PREP_BRIDGE_REPLY',nonce:NONCE,id:data.id,result,error},event.origin);
  google.script.run.withSuccessHandler(result=>reply(result,null)).withFailureHandler(err=>reply(null,(err&&err.message)||'서버 오류')).bridgeRequest(data.req);
 });
})();
</script></body></html>`;
