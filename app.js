'use strict';
/* 클라이언트 전용 복호화: PBKDF2-SHA256(310k), AES-256-GCM. 서버에는 암호문과 인증 검증값만 전송됩니다. */
(() => {
 const $=s=>document.querySelector(s);
 const byId=id=>document.getElementById(id);
 const CONFIG=window.BABY_PREP_CONFIG||{};
 const FAMILY={'ew-he':'은원 & 하은','ce-hy':'채은 & 하영','hr-yw':'하람 & 예원'};
 const LAST_FAMILY_KEY='baby-prep-last-selected-family-v1';
 // 가족 선택은 현재 기기에만 기억합니다. PIN/초대 코드/인증 정보는 저장하지 않습니다.
 function readPreferredFamily(){
   try{
     const value=localStorage.getItem(LAST_FAMILY_KEY);
     return Object.prototype.hasOwnProperty.call(FAMILY,value)?value:'ew-he';
   }catch{return 'ew-he'}
 }
 function selectFamily(family,remember=false){
   if(!Object.prototype.hasOwnProperty.call(FAMILY,family))return;
   S.family=family;
   document.querySelectorAll('.family-choice').forEach(button=>{
     const selected=button.dataset.family===family;
     button.classList.toggle('active',selected);
     button.setAttribute('aria-pressed',String(selected));
   });
   if(remember){try{localStorage.setItem(LAST_FAMILY_KEY,family)}catch{/* private mode에서도 선택은 유지 */}}
 }
 const enc=new TextEncoder(),dec=new TextDecoder();
 const allowPaint=()=>new Promise(resolve=>setTimeout(resolve,0));
 function authProgress(visible,message=''){
   const bar=byId('authProgress');
   if(!bar)return;
   bar.classList.toggle('hidden',!visible);
   bar.setAttribute('aria-hidden',visible?'false':'true');
   if(message)byId('authProgressText').textContent=message;
   byId('authScreen')?.classList.toggle('auth-loading',visible);
 }
 const S={family:'ew-he',setup:false,authToken:'',key:null,data:null,revision:0,route:'home',saving:false,generation:0,savedGeneration:0,conflict:null,filter:'all',sectionFilter:'all',search:'',initialized:false,retryCount:0,backend:!!CONFIG.backendUrl};
 let activePin='passwordInput';
 function paintPins(){
   [['passwordInput','pinPrimaryDisplay'],['passwordAgainInput','pinConfirmDisplay']].forEach(([inputId,displayId])=>{
     const el=byId(displayId),v=byId(inputId).value;
     if(!el)return;
     el.classList.toggle('active',activePin===inputId);
     el.setAttribute('aria-pressed',activePin===inputId?'true':'false');
     el.setAttribute('aria-label','숫자 4자리 중 '+v.length+'자리 입력. 선택하려면 누르세요.');
     el.querySelectorAll('.pin-mark').forEach((mark,i)=>mark.classList.toggle('filled',i<v.length));
   });
 }
 function resetPins(clearInvite=false){
   byId('passwordInput').value='';
   byId('passwordAgainInput').value='';
   if(clearInvite)byId('inviteInput').value='';
   activePin='passwordInput';
   paintPins();
 }
 function pinPress(value){
   if(byId('authScreen').classList.contains('hidden'))return;
   if(byId('authSubmit').disabled)return;
   const input=byId(activePin);
   if(value==='clear'){input.value='';}
   else if(value==='delete'){input.value=input.value.slice(0,-1);}
   else if(/^\d$/.test(value)&&input.value.length<4){input.value+=value;}
   paintPins();
   if(input.value.length===4){
     if(S.setup&&activePin==='passwordInput'){
       activePin='passwordAgainInput';paintPins();
     }else if(!S.setup){
       byId('authForm').requestSubmit();
     }else if(byId('inviteInput').value.trim()){
       byId('authForm').requestSubmit();
     }else{
       byId('authMessage').textContent='초대 코드를 먼저 입력한 뒤 PIN 설정 버튼을 눌러주세요.';
     }
   }
 }
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const fmt=v=>Math.round(Number(v)||0).toLocaleString('ko-KR')+'원';
 const escape=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const safeUrl=url=>{try{const u=new URL(url);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}};
 const rand=n=>crypto.getRandomValues(new Uint8Array(n));
 const b64=bytes=>btoa(Array.from(bytes,x=>String.fromCharCode(x)).join(''));
 const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 const hex=arr=>Array.from(arr,b=>b.toString(16).padStart(2,'0')).join('');
 const sha256=async s=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s))));
 const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
 const dateValue=str=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(str||'')))return null;const d=new Date(str+'T12:00:00');return Number.isNaN(d.valueOf())?null:d};
 const addDays=(date,n)=>{const d=new Date(date);d.setDate(d.getDate()+Number(n||0));return d};
 const isoDate=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 const addMonthsClamped=(date,n)=>{const year=date.getFullYear(),month=date.getMonth()+Number(n),day=date.getDate();const first=new Date(year,month,1,12);const last=new Date(first.getFullYear(),first.getMonth()+1,0,12).getDate();first.setDate(Math.min(day,last));return first};
 const daysUntil=date=>date?Math.round((dateValue(date)-dateValue(today()))/86400000):null;
 const isToddler=()=>S.data?.profile==='toddler';
 const nextPeriodicDate=i=>{
   const now=dateValue(today());if(!now)return '';
   const last=String(i.lastDoneDate||'');
   if(i.repeat==='daily')return last===today()?isoDate(addDays(now,1)):today();
   const anchor=dateValue(i.dueDate)||now;
   if(i.repeat==='weekly'){
     const target=(anchor.getDay()+7-now.getDay())%7;
     const date=addDays(now,target);
     if(last&&isoDate(addDays(date,-((date.getDay()+6)%7)))===isoDate(addDays(dateValue(last),-((dateValue(last).getDay()+6)%7)))) return isoDate(addDays(date,7));
     return isoDate(date);
   }
   if(i.repeat==='monthly'){
     const day=anchor.getDate();let y=now.getFullYear(),m=now.getMonth();
     const candidate=(yy,mm)=>new Date(yy,mm,Math.min(day,new Date(yy,mm+1,0).getDate()),12);
     let d=candidate(y,m);
     if(d<now||last.slice(0,7)===today().slice(0,7))d=candidate(y,m+1);
     return isoDate(d);
   }
   return '';
 };
 const dueOf=item=> item.repeat&&item.repeat!=='none'?nextPeriodicDate(item):item.dueDate||(item.dueMonth!=null&&dateValue(S.data?.settings?.dueDate)?isoDate(addMonthsClamped(dateValue(S.data.settings.dueDate),item.dueMonth)):(item.dueOffset!=null&&dateValue(S.data?.settings?.dueDate)?isoDate(addDays(dateValue(S.data.settings.dueDate),item.dueOffset)):''));
 const shortOffset=n=>n==null?'날짜 미지정':isToddler()?`출생 ${n}일 후`:n===0?'출산예정일':n<0?`출산 ${Math.abs(n)}일 전`:`출산 ${n}일 후`;
 const dueHint=i=>isToddler()&&i.dueMonth!=null?`생후 ${i.dueMonth}개월 기준`:shortOffset(i.dueOffset);
 const doneNow=i=>{if(i.status==='skipped')return false;if(!i.repeat||i.repeat==='none')return i.status==='done';const last=String(i.lastDoneDate||'');if(!last)return false;if(i.repeat==='daily')return last===today();const a=dateValue(last),b=dateValue(today());if(!a||!b)return false;if(i.repeat==='weekly'){const mon=d=>isoDate(addDays(d,-((d.getDay()+6)%7)));return mon(a)===mon(b)}if(i.repeat==='monthly')return last.slice(0,7)===today().slice(0,7);return false};
 const repeatLabel=i=>({daily:'매일',weekly:'매주',monthly:'매월'})[i.repeat]||'';
 const stamp=()=>Date.now();
 const uid=()=>crypto.randomUUID?.()||'id-'+stamp()+'-'+Math.random().toString(36).slice(2);
 const cleanData=d=>({schema:3,profile:d?.profile||'newborn',seedVersion:d?.seedVersion||BABY_PREP_SEED_VERSION,settings:{...{dueDate:'',babyName:'',budget:0},...(d?.settings||{})},sections:Array.isArray(d?.sections)?d.sections:['출산 가방','집안 준비','서류·일정','출산 후'],items:Array.isArray(d?.items)?d.items:[]});
 function cacheKey(family=S.family){return 'baby-prep-secure-v2-'+family}
 function localRowKey(family=S.family){return 'baby-prep-preview-v2-'+family}
 function storageGet(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
 function storageSet(key,val){localStorage.setItem(key,JSON.stringify(val))}
 async function localApi(req){
   const f=req.family;const key=localRowKey(f),row=storageGet(key);
   if(req.action==='meta')return {ok:true,initialized:!!row,salt:row?.salt||'',revision:row?.revision||0};
   if(req.action==='setup') {if(row)throw Error('이미 비밀번호가 설정되었습니다.');if(!req.inviteCode?.trim())throw Error('초대 코드를 입력하세요. (로컬 미리보기용)');storageSet(key,{salt:req.salt,verifier:req.verifier,cipher:req.cipher,revision:1});return {ok:true,revision:1}}
   if(!row)throw Error('등록된 비밀번호가 없습니다.');
   if(!req.authToken||await sha256(req.authToken)!==row.verifier)throw Error('비밀번호가 다릅니다.');
   if(req.action==='login')return {ok:true,cipher:row.cipher,revision:row.revision,salt:row.salt};
   if(req.action==='save'){if(req.revision!==row.revision)return {ok:false,error:'CONFLICT',revision:row.revision};row.cipher=req.cipher;row.revision++;storageSet(key,row);return {ok:true,revision:row.revision}}
   throw Error('알 수 없는 동작');
 }
 const Bridge=(()=>{
   let ready=false,targetWindow=null,targetOrigin='',pending=new Map(),next=0,readyResolve;
   const nonce=b64(rand(16));
   const readyPromise=new Promise(resolve=>readyResolve=resolve);
   const trustedOrigin=origin=>/^https:\/\/(?:[a-z0-9-]+\.)*(?:google\.com|googleusercontent\.com)$/i.test(origin);
   // Apps Script HTMLService는 이중 iframe을 사용하므로 READY를 보낸 실제 내부 iframe으로 직접 회신합니다.
   window.addEventListener('message',event=>{
     if(!S.backend||!trustedOrigin(event.origin))return;
     const data=event.data||{};
     if(data.nonce!==nonce)return;
     if(data.kind==='BABY_PREP_BRIDGE_READY'){
       if(targetWindow&&event.source!==targetWindow)return;
       targetWindow=event.source;targetOrigin=event.origin;ready=true;readyResolve();return;
     }
     if(!ready||event.source!==targetWindow||event.origin!==targetOrigin)return;
     if(data.kind!=='BABY_PREP_BRIDGE_REPLY'||!pending.has(data.id))return;
     const [resolve,reject]=pending.get(data.id);pending.delete(data.id);
     data.error?reject(Error(String(data.error))):resolve(data.result);
   });
   async function call(req){
     if(!S.backend)return localApi(req);
     if(!ready){await Promise.race([readyPromise,sleep(14000).then(()=>{throw Error('Apps Script 연결 시간 초과. 배포 주소·APP_ORIGINS를 확인하세요.')})]);}
     return new Promise((resolve,reject)=>{
       const id=++next;pending.set(id,[resolve,reject]);
       targetWindow.postMessage({kind:'BABY_PREP_BRIDGE_REQUEST',nonce,id,req},targetOrigin);
       setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(Error('서버 응답 시간이 초과되었습니다.'))}},30000);
     });
   }
   function start(){
     if(S.backend){const u=new URL(String(CONFIG.backendUrl).trim());if(u.protocol!=='https:')throw Error('Apps Script HTTPS URL만 사용하세요.');u.searchParams.set('bridge_nonce',nonce);byId('apiFrame').src=u.toString()}
     else byId('offlineBanner').classList.remove('hidden');
   }
   return {start,call};
 })();
 async function derive(password,salt){
   const raw=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
   const bits=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:bytes(salt),iterations:310000,hash:'SHA-256'},raw,512));
   const key=await crypto.subtle.importKey('raw',bits.slice(0,32),{name:'AES-GCM'},false,['encrypt','decrypt']);
   const authToken=hex(bits.slice(32,64));return {key,authToken,verifier:await sha256(authToken)};
 }
 async function encryptPayload(obj){const iv=rand(12),plain=enc.encode(JSON.stringify(obj));const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},S.key,plain));return JSON.stringify({v:1,iv:b64(iv),ct:b64(cipher)})}
 async function decryptPayload(text){const v=JSON.parse(text);if(v.v!==1)throw Error('지원하지 않는 암호 데이터 형식');const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(v.iv)},S.key,bytes(v.ct));return cleanData(JSON.parse(dec.decode(plain)))}
 function labelStatus(message,mode=''){const el=byId('syncStatus');el.textContent=message;el.className='sync-status '+mode}
 function toast(message){const t=byId('toast');t.textContent=message;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2500)}
 async function showAuth(){
   S.key=null;S.authToken='';S.data=null;S.revision=0;S.generation=0;S.savedGeneration=0;S.retryCount=0;S.conflict=null;S.route='home';
   byId('authScreen').classList.remove('hidden');byId('mainScreen').classList.add('hidden');resetPins(true);byId('authMessage').textContent='';
   await refreshMeta();
 }
 let metaRequestSeq=0;
 async function refreshMeta(){
   const seq=++metaRequestSeq,selectedFamily=S.family;
   const mode=byId('authMode');mode.textContent='가족 공간 확인 중…';byId('authSubmit').disabled=true;authProgress(true,'등록 상태를 확인하고 있습니다…');resetPins(true);
   try{const r=await Bridge.call({action:'meta',family:selectedFamily});if(seq!==metaRequestSeq)return;S.setup=!r.initialized;S.authSalt=r.salt;byId('inviteWrap').classList.toggle('hidden',!S.setup);byId('passwordAgainWrap').classList.toggle('hidden',!S.setup);byId('pinLabel').textContent=S.setup?'새 4자리 PIN 설정':'4자리 PIN 입력';byId('authSubmit').textContent=S.setup?'PIN 설정 후 시작':'잠금 해제';mode.textContent=S.setup?'처음 입장합니다. 초대 코드를 입력하고 숫자 PIN을 두 번 설정하세요.':'등록된 가족 공간입니다. 숫자 PIN을 입력하세요.';paintPins();}
   catch(e){if(seq!==metaRequestSeq)return;mode.textContent='연결 오류: '+e.message;byId('authMessage').textContent='연결 상태를 확인한 뒤 다시 시도하세요.'}
   finally{if(seq===metaRequestSeq){byId('authSubmit').disabled=false;authProgress(false)}}
 }
 async function submitAuth(e){
  e.preventDefault();const pass=byId('passwordInput').value,msg=byId('authMessage'),btn=byId('authSubmit');msg.textContent='';btn.disabled=true;btn.textContent='열고 있습니다…';authProgress(true,'암호화된 가족 기록을 여는 중…');await allowPaint();
  try{
   if(S.setup){
     if(!/^\d{4}$/.test(pass))throw Error('PIN은 숫자 4자리여야 합니다.');
     if(pass!==byId('passwordAgainInput').value)throw Error('PIN 확인이 일치하지 않습니다.');
     if(!byId('inviteInput').value.trim())throw Error('초대 코드는 필수입니다.');
     const salt=b64(rand(16)),derived=await derive(pass,salt);S.key=derived.key;S.authToken=derived.authToken;S.data=S.family==='hr-yw'?babyPrepToddlerData():babyPrepInitialData();
     const cipher=await encryptPayload(S.data);
     authProgress(true,'가족 공간을 서버에 등록하고 있습니다…');const r=await Bridge.call({action:'setup',family:S.family,inviteCode:byId('inviteInput').value.trim(),salt,verifier:derived.verifier,cipher});
     if(!r.ok)throw Error(r.error||'최초 등록 실패');S.revision=r.revision||1;S.authSalt=salt;S.generation=0;S.savedGeneration=0;
     storageSet(cacheKey(),{cipher,revision:S.revision,pending:false});toast('가족 공간이 준비되었습니다.');
   } else {
     const derived=await derive(pass,S.authSalt);S.key=derived.key;S.authToken=derived.authToken;
     authProgress(true,'서버에서 암호화 기록을 불러오는 중…');const r=await Bridge.call({action:'login',family:S.family,authToken:derived.authToken});
     if(!r.ok)throw Error(r.error||'로그인 실패');
     S.revision=r.revision;S.data=await decryptPayload(r.cipher);
     const cache=storageGet(cacheKey());
     if(cache?.pending&&cache.cipher){
       try{const local=await decryptPayload(cache.cipher);
         if(confirm('이 기기에 서버로 전송되지 않은 암호화 기록이 있습니다. 해당 기록을 먼저 불러오시겠습니까?\n취소를 누르면 서버 기록으로 시작하며 미전송 기록은 그대로 보관됩니다.')){
           S.data=local;S.generation++;S.savedGeneration=0;S.revision=cache.revision??S.revision;
         }
       }catch(err){console.warn('로컬 미전송 복원 실패',err)}
     }
     if(!cache?.pending)storageSet(cacheKey(),{cipher:r.cipher,revision:S.revision,pending:false});
   }
   byId('authScreen').classList.add('hidden');byId('mainScreen').classList.remove('hidden');byId('familyTitle').textContent=FAMILY[S.family];
   labelStatus(S.backend?'🔐 암호화 동기화 연결됨':'⚠ 이 기기에만 암호화 저장',S.backend?'saved':'error');render();
   if(S.generation>S.savedGeneration)queueSave();
  }catch(err){S.key=null;S.authToken='';S.data=null;resetPins();msg.textContent=err.message||'잠금 해제 실패';}
  finally{btn.disabled=false;btn.textContent=S.setup?'PIN 설정 후 시작':'잠금 해제';authProgress(false)}
 }
 let saveTimer=null;
 function markDirty(){S.retryCount=0;S.generation++;labelStatus('● 변경 사항 저장 대기','');queueSave();render()}
 function queueSave(delay=900){clearTimeout(saveTimer);saveTimer=setTimeout(persist,delay)}
 async function persist(){
   if(!S.key||!S.data||S.saving||S.conflict)return;
   if(S.generation===S.savedGeneration)return;
   S.saving=true;const gen=S.generation;labelStatus('● 기기 암호화 및 저장 중');
   try{
     const cipher=await encryptPayload(S.data);
     storageSet(cacheKey(),{cipher,revision:S.revision,pending:true});
     const r=await Bridge.call({action:'save',family:S.family,authToken:S.authToken,revision:S.revision,cipher});
     if(r.error==='CONFLICT'||r.ok===false){S.conflict={serverRevision:r.revision,cipher};labelStatus('⚠ 다른 기기의 수정과 충돌','error');showConflict();return}
     S.revision=r.revision;S.savedGeneration=gen;S.retryCount=0;
     if(S.generation===gen){storageSet(cacheKey(),{cipher,revision:S.revision,pending:false});labelStatus(S.backend?'✓ 암호화된 서버 저장 완료':'✓ 이 기기 저장 완료','saved')}
     else labelStatus('● 추가 변경 사항 저장 대기');
   }catch(e){S.retryCount++;labelStatus('⚠ 서버 전송 실패 · 이 기기 암호화 보관','error');toast(e.message)}
   finally{S.saving=false;if(!S.conflict&&S.generation>S.savedGeneration&&S.retryCount<=5)queueSave(S.retryCount?Math.min(60000,1200*Math.pow(2,S.retryCount)):900)}
 }
 async function refreshFromServer(){
   if(!S.data)return;
   if(S.generation>S.savedGeneration||S.saving){toast('미저장 변경을 먼저 동기화합니다.');queueSave();return}
   try{labelStatus('↻ 서버 확인 중');const r=await Bridge.call({action:'login',family:S.family,authToken:S.authToken});if(!r.ok)throw Error(r.error);
    if(r.revision>S.revision){S.data=await decryptPayload(r.cipher);S.revision=r.revision;storageSet(cacheKey(),{cipher:r.cipher,revision:r.revision,pending:false});render();toast('다른 기기에서 수정한 내역을 반영했습니다.')}else toast('최신 상태입니다.');labelStatus('✓ 암호화 동기화 완료','saved');
   }catch(e){labelStatus('⚠ 동기화 실패','error');toast(e.message)}
 }
 function modal(title,html){byId('modalTitle').textContent=title;byId('modalBody').innerHTML=html;byId('modal').classList.remove('hidden')}
 function closeModal(){byId('modal').classList.add('hidden');byId('modalBody').innerHTML=''}
 function showConflict(){modal('기록 충돌 감지',`<p class="warning">다른 휴대폰에서 먼저 저장했습니다. 자동 덮어쓰기를 중단했습니다. 이 기기 기록은 암호화 보관되어 있습니다.</p><p class="tiny-note">서버 최신 기록을 불러오거나, 현재 기기의 기록으로 서버를 교체할 수 있습니다. 두 변경을 자동 병합하지 않습니다.</p><div class="stack"><button class="secondary" data-action="conflict-remote">서버 최신 기록 불러오기</button><button class="danger" data-action="conflict-local">현재 기록으로 서버 덮어쓰기</button><button class="ghost" data-action="export">암호화 백업 내려받기</button></div>`)}
 async function resolveConflict(choice){
   if(!S.conflict)return;
   try{
     const r=await Bridge.call({action:'login',family:S.family,authToken:S.authToken});
     if(!r.ok)throw Error(r.error);
     if(choice==='remote'){
       if(!confirm('이 기기의 미전송 기록을 포기하고 서버 기록으로 전환하시겠습니까?'))return;
       S.data=await decryptPayload(r.cipher);S.revision=r.revision;S.savedGeneration=S.generation;S.conflict=null;
       storageSet(cacheKey(),{cipher:r.cipher,revision:r.revision,pending:false});closeModal();render();labelStatus('✓ 최신 서버 기록 적용','saved');
     } else {
       if(!confirm('서버의 최신 변경을 현재 기기의 기록으로 교체합니다. 계속하시겠습니까?'))return;
       S.revision=r.revision;S.conflict=null;closeModal();S.generation++;queueSave();
     }
   }catch(e){toast(e.message)}
 }
 function activeItems(){return S.data.items.filter(i=>!i.deleted)}
 function budget(){
   const items=activeItems(),done=items.filter(doneNow).length;
   const spent=items.reduce((n,i)=>n+(Number(i.actual)||0),0);
   const needed=items.filter(i=>!doneNow(i)&&i.status!=='skipped'&&i.acquisition!=='gift'&&i.acquisition!=='already').reduce((n,i)=>n+(Number(i.estimate)||0),0);
   const missing=items.filter(i=>!doneNow(i)&&i.status!=='skipped'&&i.type==='item'&&i.acquisition!=='gift'&&i.acquisition!=='already'&&!(Number(i.estimate)>0)).length;
   return {items,done,spent,needed,missing,total:spent+needed};
 }
 function alertItems(){return activeItems().filter(i=>!doneNow(i)&&i.status!=='skipped'&&dueOf(i)&&daysUntil(dueOf(i))<=14).sort((a,b)=>dueOf(a).localeCompare(dueOf(b)))}
 function renderHeaderProgress(){
   const el=byId('headerProgress');
   if(!el||!S.data)return;
   const all=activeItems(),done=all.filter(doneNow).length,percentage=all.length?Math.round(done*100/all.length):0;
   el.innerHTML=`<div class="header-progress-label"><strong>준비 진행률 ${percentage}%</strong><span>${done} / ${all.length} 완료</span></div><div class="progress-track compact" role="progressbar" aria-label="준비 완료율" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percentage}"><div style="width:${percentage}%"></div></div>`;
 }
 function render(){if(!S.data)return;renderHeaderProgress();renderTabs();renderNav();const route=S.route;let html='';if(route==='home')html=renderHome();else if(route==='all'||route.startsWith('section:'))html=renderList(route);else if(route==='timeline')html=renderTimeline();else if(route==='budget')html=renderBudget();else if(route==='reco')html=renderReco();else if(route==='settings')html=renderSettings();byId('mainContent').innerHTML=`<div class="screen">${html}</div>`;}
 function renderTabs(){const tabs=[['home','홈'],['all','체크'],['timeline','일정'],['settings','설정']];const active=S.route==='budget'?'home':S.route==='reco'?'settings':S.route.startsWith('section:')?'all':S.route;byId('topTabs').innerHTML=tabs.map(([route,title])=>`<button type="button" data-action="route" data-route="${route}" class="tab ${active===route?'active':''}" aria-current="${active===route?'page':'false'}">${title}</button>`).join('')}
 function renderNav(){const tabs=[['home','⌂','홈'],['all','☑','체크'],['timeline','▤','일정'],['settings','⚙','설정']];const active=S.route==='budget'?'home':S.route==='reco'?'settings':S.route.startsWith('section:')?'all':S.route;byId('bottomNav').innerHTML=tabs.map(([route,icon,label])=>`<button type="button" class="nav-btn ${active===route?'active':''}" data-action="route" data-route="${route}"><span>${icon}</span>${label}</button>`).join('')}
 function renderHome(){const B=budget(),pct=B.items.length?Math.round(100*B.done/B.items.length):0,due=S.data.settings.dueDate,diff=daysUntil(due),alerts=alertItems(),toddler=isToddler();
   const heroTitle=toddler?'육아 준비 로드맵':'출산 준비 현황';
   const label=toddler?`${escape(S.data.settings.babyName||'우리 아이')} · ${due?'생후 '+Math.max(0,-diff)+'일':'설정에서 출생일을 등록하세요'}`:(due?`출산예정일 ${escape(due)}`:'먼저 출산예정일을 등록하세요');
   const dText=toddler&&due?`${Math.max(0,-diff)}일`:due?(diff>=0?'D-'+diff:'D+'+Math.abs(diff)):(toddler?'📅':'D-?');
   const firstSection=toddler?'구매·예산':'출산 가방';const scheduleSection=toddler?'검진·의료 일정':'서류·일정';
   return `<div class="hero"><div class="inline"><div><h2>${heroTitle}</h2><p>${label}</p></div><div class="big">${dText}</div></div><div class="progress-track"><div style="width:${pct}%"></div></div><div class="progress-caption"><span>현재 준비 현황</span><strong>${B.done}/${B.items.length}개 · ${pct}%</strong></div></div>
    <div class="kpis"><div class="kpi"><span>기록된 실제 지출</span><strong>${fmt(B.spent)}</strong><small>각 항목에 입력한 실제 결제액</small></div><div class="kpi accent"><span>추가 필요 예상 비용</span><strong>${fmt(B.needed)}</strong><small>예상 비용 미입력 ${B.missing}개 별도</small></div></div>
    <div class="inline"><h3 class="subhead">⏰ 놓치기 쉬운 일정</h3><button class="link-button" data-action="route" data-route="timeline">전체 보기</button></div>
    ${due?alerts.length?`<div class="card alt">${alerts.slice(0,7).map(renderItemRow).join('')}</div>`:'<div class="card empty">14일 이내 미완료 일정이 없습니다.</div>':`<div class="help-block">${toddler?'출생일':'출산예정일'}을 입력하면 기준일 기반 일정을 자동 날짜로 변환합니다. <button class="link-button" data-action="route" data-route="settings">날짜 등록</button></div>`}
    <div class="inline"><h3 class="subhead">빠른 시작</h3></div><div class="list-actions"><button class="primary" data-action="add" data-section="${firstSection}">+ 물품 추가</button><button class="secondary" data-action="add" data-section="${scheduleSection}">+ 일정 추가</button></div>
    <div class="card"><h3 class="card-title">${toddler?'📌 앞으로 준비할 일':'📋 출산 준비 체크'}</h3><p class="tiny-note">${toddler?'일상 수면·식사·양치 기록은 기존 육아 도구 모음에서 관리합니다. 이 앱은 검진·새 학기·지원금·교체 물품과 비용만 관리합니다.':'가족에게 받은 물품과 실제 구매한 물품을 구분하고, 오래된 참고 가격은 예산에서 제외합니다.'}</p></div>
    ${!S.backend?'<div class="warning">⚠ 현재는 미리보기용 로컬 모드입니다. 다른 기기와 공유되지 않습니다. 배포 설명서에 따라 Apps Script 주소를 설정해야 합니다.</div>':''}`;
 }
 function acquisitionText(a){return ({undecided:'미정',buy:'직접 구매',gift:'가족에게 받기',second:'중고 구매',rental:'대여',already:'집에 있음'})[a]||'미정'}
 function renderItemRow(i){const when=dueOf(i),days=daysUntil(when),done=doneNow(i),desc=i.product?i.product:acquisitionText(i.acquisition);return `<div class="item-row"><input class="item-check" type="checkbox" data-action="toggle" data-id="${escape(i.id)}" ${done?'checked':''} aria-label="${escape(i.title)} 완료 체크"><div class="item-main" data-action="edit" data-id="${escape(i.id)}"><div class="item-name ${done?'done':''}">${escape(i.title)}</div><div class="item-meta"><span class="chip">${escape(i.section)}</span><span class="chip">${escape(desc)}</span>${i.repeat&&i.repeat!=='none'?`<span class="chip repeating">${repeatLabel(i)}</span>`:''}${i.type==='item'?`<span>×${Number(i.quantity)||1}</span>`:''}${when?`<span class="chip ${!done&&days<=7?'due':''}">${escape(when)}${!done&&days<0?' · 지남':''}</span>`:`<span>${dueHint(i)}</span>`}${i.actual?`<span>${fmt(i.actual)} 지출</span>`:''}</div></div><button class="mini-btn" data-action="edit" data-id="${escape(i.id)}">수정</button></div>`}
 function renderList(route){const isCustom=route.startsWith('section:'),section=isCustom?route.slice(8):null;
   const all=activeItems().filter(i=>!section||i.section===section).filter(i=>S.filter==='all'||(S.filter==='pending'&&!doneNow(i)&&i.status!=='skipped')||(S.filter==='done'&&doneNow(i))||(S.filter==='skipped'&&i.status==='skipped')).filter(i=>!S.search||`${i.title} ${i.product} ${i.giver} ${i.notes}`.toLowerCase().includes(S.search.toLowerCase()));
   const grouped=Object.groupBy?Object.groupBy(all,i=>i.section):all.reduce((r,i)=>((r[i.section]||=[]).push(i),r),{});
   return `<div class="inline"><h2 class="section-title">${section?escape(section):'전체 체크리스트'}</h2><button class="primary" data-action="add" data-section="${escape(section||(isToddler()?'구매·예산':'출산 가방'))}">+ 추가</button></div>
   <div class="toolbar"><input id="listSearch" type="search" placeholder="품목·제품·메모 검색" value="${escape(S.search)}"><select id="listFilter" aria-label="상태 필터"><option value="all" ${S.filter==='all'?'selected':''}>전체</option><option value="pending" ${S.filter==='pending'?'selected':''}>미완료</option><option value="done" ${S.filter==='done'?'selected':''}>완료</option><option value="skipped" ${S.filter==='skipped'?'selected':''}>제외</option></select></div>
   <p class="muted-small">${all.length}개 항목 · 체크하면 완료, 항목을 누르면 가격·가족 지원·제품명을 입력할 수 있습니다.</p>
   ${Object.keys(grouped).length?Object.entries(grouped).map(([name,list])=>`<section><div class="inline"><h3 class="subhead">${escape(name)}</h3><span class="muted-small">${list.filter(doneNow).length}/${list.length}</span></div><div class="card">${list.map(renderItemRow).join('')}</div></section>`).join(''):'<div class="empty">조건에 해당하는 항목이 없습니다.</div>'}`;
 }
 function renderTimeline(){const due=S.data.settings.dueDate,items=activeItems().filter(i=>i.status!=='skipped').sort((a,b)=>(dueOf(a)||'9999').localeCompare(dueOf(b)||'9999')||((a.dueOffset||0)-(b.dueOffset||0)));const undone=items.filter(i=>!doneNow(i));const toddler=isToddler();const taskSection=toddler?'검진·의료 일정':'서류·일정';return `<div class="inline"><h2 class="section-title">📅 다음 일정</h2><button class="secondary" data-action="export-ics">캘린더 내보내기</button></div>${due?`<p class="help-block">${toddler?'아이 출생일':'출산예정일'} ${escape(due)} 기준입니다. 개별 목표일은 편집할 수 있고, 검진 및 지원 정책의 법정 기한과는 다를 수 있습니다.</p>`:`<div class="warning">${toddler?'출생일':'출산예정일'}을 등록해야 정확한 날짜를 계산할 수 있습니다.</div>`}<div class="inline"><h3 class="subhead">미완료 준비 일정 ${undone.length}개</h3><button class="link-button" data-action="add" data-section="${taskSection}">+ 일정 등록</button></div><div class="timeline">${undone.length?undone.map(i=>`<div class="card ${dueOf(i)&&daysUntil(dueOf(i))<0?'late':''}"><div class="inline"><strong>${escape(dueOf(i)||dueHint(i))}</strong><span class="chip">${escape(i.owner||'함께')}${repeatLabel(i)?' · '+repeatLabel(i):''}</span></div><div class="item-row"><input type="checkbox" class="item-check" data-action="toggle" data-id="${escape(i.id)}"><div class="item-main" data-action="edit" data-id="${escape(i.id)}"><div class="item-name">${escape(i.title)}</div><p class="muted-small">${escape(i.section)}</p></div><button class="mini-btn" data-action="edit" data-id="${escape(i.id)}">수정</button></div></div>`).join(''):'<div class="empty">남은 일정이 없습니다.</div>'}</div><p class="tiny-note">캘린더 파일(.ics)을 휴대폰에 가져오면 일회성 일정에 7일 전·1일 전 알림이 포함됩니다. 앱 자체에서 백그라운드 푸시를 보내지는 않습니다. 완료한 일회성 일정도 캘린더에 포함될 수 있으니 확인하세요.</p>`}
 function renderBudget(){const B=budget(),groups=S.data.sections.map(section=>({section,items:activeItems().filter(i=>i.section===section)})).filter(x=>x.items.length);const limit=Number(S.data.settings.budget)||0;return `<h2 class="section-title">💳 지출·예산</h2><div class="kpis"><div class="kpi"><span>지출 완료</span><strong>${fmt(B.spent)}</strong><small>실제로 지출한 총액</small></div><div class="kpi accent"><span>추가 예상 지출</span><strong>${fmt(B.needed)}</strong><small>미완료 중 직접 입력된 예상액</small></div><div class="kpi"><span>현재 합산 전망</span><strong>${fmt(B.total)}</strong><small>실제 + 추가 예상</small></div><div class="kpi"><span>비용 미기입 항목</span><strong>${B.missing}개</strong><small>예산에서 제외된 준비물</small></div></div><p class="warning" style="margin-top:12px">${isToddler()?'과거 구매 이력은 가져오지 않았습니다.':'2025년 원본 시트의 참고가격은 현재 예산에 자동 합산하지 않습니다.'} 예상 구매금액을 입력하지 않은 ${B.missing}개는 추가 비용이 생길 수 있습니다.</p>${limit?`<div class="hero"><strong>설정 예산 ${fmt(limit)}</strong><p>현재 전망 대비 여유 ${fmt(limit-B.total)}</p><div class="progress-track"><div style="width:${Math.min(100,Math.round(B.total/limit*100))}%"></div></div></div>`:''}<h3 class="subhead">항목별 집계</h3>${groups.map(g=>{const spent=g.items.reduce((s,i)=>s+(Number(i.actual)||0),0),estimated=g.items.filter(i=>!doneNow(i)&&i.status!=='skipped'&&i.acquisition!=='gift'&&i.acquisition!=='already').reduce((s,i)=>s+(Number(i.estimate)||0),0);return `<div class="card budget-row"><div><b>${escape(g.section)}</b><br><small>${g.items.length}개 항목</small></div><div class="right"><strong>${fmt(spent)}</strong><br><small>추가 예상 ${fmt(estimated)}</small></div></div>`}).join('')}<button class="secondary" data-action="export-csv">비용 CSV 추출</button><p class="tiny-note">CSV는 복호화된 개인정보가 포함될 수 있으므로 공개 GitHub 저장소에 올리지 마세요.</p>`}
 function recommendFor(item){return BABY_PREP_RECOMMENDATIONS.categories.find(x=>item?.title?.includes(x.key)||x.key.includes(item?.title||'~'))}
 function renderReco(){const R=BABY_PREP_RECOMMENDATIONS;return `<h2 class="section-title">🛍️ 제품·추천 참고</h2><p class="warning">${escape(R.note)} 갱신일: ${escape(R.updatedAt)} · 자동 AI 호출 및 토큰 과금 없음</p>${R.categories.filter(r=>isToddler()?r.stage==='toddler':r.stage!=='toddler').map(r=>{const item=activeItems().find(i=>i.title.includes(r.key));return `<div class="card recommend"><div class="inline"><h3>${escape(r.key)}</h3><button class="mini-btn" data-action="copy-reco" data-key="${escape(r.key)}">새 추천 요청 복사</button></div><p>${escape(r.tip)}</p>${safeUrl(item?.referenceUrl)?`<a class="linkline" href="${escape(safeUrl(item.referenceUrl))}" target="_blank" rel="noopener noreferrer">원본 시트의 과거 제품 참고 링크</a>`:'<span class="muted-small">등록된 제품 참고 링크 없음</span>'}</div>`}).join('')}<div class="help-block">새 추천 요청은 ChatGPT에 붙여넣고, 검토가 끝난 제품·가격·링크를 이 저장소의 <code>recommendations.js</code>에 갱신하는 방식입니다. 가족이 앱에서 볼 때마다 모델을 호출하지 않습니다.</div>`}
 function renderSettings(){const st=S.data.settings;return `<h2 class="section-title">⚙️ 가족·앱 설정</h2><form id="settingsForm" class="stack"><label class="field">${isToddler()?'아이 출생일 (월령별 일정 자동 계산)':'출산예정일'}<input name="dueDate" type="date" value="${escape(st.dueDate||'')}"></label><label class="field">${isToddler()?'아이 이름(선택)':'아기 태명(선택)'}<input name="babyName" maxlength="60" value="${escape(st.babyName||'')}" placeholder="${isToddler()?'우리 아이':'태명'}"></label><label class="field">준비 예산 (원)<input name="budget" type="number" min="0" step="100" value="${Number(st.budget)||0}"></label><button class="primary" type="submit">설정 저장</button></form><h3 class="subhead">➕ 체크리스트 탭 관리</h3><form id="sectionForm" class="inline"><input name="section" class="control" maxlength="25" placeholder="예: 생후 1개월 준비"><button class="secondary" type="submit">탭 추가</button></form><div class="card">${S.data.sections.map(s=>`<div class="budget-row"><strong>${escape(s)}</strong><button class="mini-btn" data-action="section-remove" data-section="${escape(s)}">삭제</button></div>`).join('')}</div><p class="tiny-note">탭 삭제 시 해당 탭에 물품이 남아 있으면 삭제되지 않습니다. 다른 탭으로 물품을 옮긴 후 삭제할 수 있습니다.</p><h3 class="subhead">🔐 데이터 보호·백업</h3><div class="stack"><button class="secondary" data-action="export">암호화 백업 파일 저장</button><button class="secondary" data-action="import-backup">암호화 백업 불러오기</button><input id="backupFile" class="hidden" type="file" accept=".json,application/json"><button class="secondary" data-action="sync">서버 최신 자료 동기화</button><button class="secondary" data-action="export-ics">일정 캘린더(.ics) 내보내기</button><button class="danger" data-action="lock">현재 기기 잠그기</button></div><p class="warning">비밀번호를 분실하면 서버 관리자도 복호화할 수 없습니다. 암호화 백업만으로는 복원할 수 없으며 같은 비밀번호가 필요합니다. 비밀번호가 보이는 곳에 적히지 않도록 보관하세요.</p><p class="muted-small">v${escape(CONFIG.version||'0.9.0')} · 현재 모드: ${S.backend?'Google Sheets 서버 동기화':'로컬 미리보기'} · 가족 공간 ${escape(FAMILY[S.family])}</p>`}
 function openEditor(id,section){const original=activeItems().find(x=>x.id===id);const i=original?{...original}:{id:uid(),title:'',section:section||S.data.sections[0],type:'item',status:'pending',acquisition:'undecided',quantity:1,estimate:0,actual:0,referencePrice:0,referenceUrl:'',product:'',giver:'',owner:'함께',priority:'normal',dueMonth:null,dueOffset:isToddler()?null:-30,dueDate:'',repeat:'none',lastDoneDate:'',notes:'',updatedAt:0,deleted:false};
   const opt=(arr,v)=>arr.map(([value,label])=>`<option value="${escape(value)}" ${v===value?'selected':''}>${escape(label)}</option>`).join('');
   modal(original?'항목 수정':'준비물·일정 추가',`<form id="itemForm"><input type="hidden" name="id" value="${escape(i.id)}"><div class="info-grid"><label class="field full">준비 항목명<input name="title" value="${escape(i.title)}" maxlength="120" required autofocus placeholder="예: 기저귀"></label><label class="field">분류<select name="section">${opt(S.data.sections.map(x=>[x,x]),i.section)}</select></label><label class="field">유형<select name="type">${opt([['item','물품'],['task','할 일·일정']],i.type)}</select></label><label class="field">현재 상태<select name="status">${opt([['pending','미완료'],['done','완료'],['skipped','제외']],i.status)}</select></label><label class="field">반복<select name="repeat">${opt([['none','반복 없음'],['daily','매일'],['weekly','매주'],['monthly','매월']],i.repeat||'none')}</select></label><label class="field">담당<select name="owner">${opt([['함께','함께'],['남편','남편'],['아내','아내']],i.owner)}</select></label><label class="field">준비 방법<select name="acquisition">${opt([['undecided','미정'],['buy','직접 구매'],['gift','가족에게 받기'],['second','중고 구매'],['rental','대여'],['already','집에 있음']],i.acquisition)}</select></label><label class="field">수량<input name="quantity" type="number" min="1" max="10000" value="${Number(i.quantity)||1}"></label><label class="field full">제품명 / 모델명<input name="product" maxlength="180" value="${escape(i.product||'')}" placeholder="예: 모델명 또는 브랜드"></label><label class="field full">받을 사람 또는 제공해 주는 가족<input name="giver" maxlength="120" value="${escape(i.giver||'')}" placeholder="예: 형님 / 부모님"></label></div><fieldset class="form-section"><legend>비용 · 일정</legend><div class="info-grid"><label class="field">예상 구매비 (총액, 원)<input name="estimate" type="number" min="0" step="1" value="${Number(i.estimate)||0}"></label><label class="field">실제 지출액 (총액, 원)<input name="actual" type="number" min="0" step="1" value="${Number(i.actual)||0}"></label>${isToddler()?`<label class="field">출생일 기준 목표 월령 (개월)<input name="dueMonth" type="number" min="0" max="120" value="${i.dueMonth==null?'':Number(i.dueMonth)}"></label>`:''}<label class="field">${isToddler()?'출생일 기준 +일(선택)':'출산예정일 기준(일)'}<input name="dueOffset" type="number" min="-300" max="3000" value="${i.dueOffset==null?'':Number(i.dueOffset)}"></label><label class="field">개별 마감일(우선 적용)<input name="dueDate" type="date" value="${escape(i.dueDate||'')}"></label><label class="field full">제품 / 구매 링크<input name="referenceUrl" type="url" value="${escape(i.referenceUrl||'')}" placeholder="https://..."></label><label class="field full">메모<textarea name="notes" rows="2" maxlength="1500">${escape(i.notes||'')}</textarea></label></div></fieldset><p class="hint">원본 기록의 참고 가격 ${fmt(i.referencePrice||0)} · 과거 자료이며 예상 예산에 자동 반영하지 않습니다.</p><div class="form-actions"><button type="submit" class="primary">저장</button><button type="button" class="secondary" data-action="close">취소</button></div>${original?`<div class="form-actions"><button type="button" class="danger" data-action="delete" data-id="${escape(i.id)}">항목 삭제</button><button type="button" class="secondary" data-action="recommend-item" data-id="${escape(i.id)}">추천 받기</button></div>`:''}</form>`)
 }
 function saveEditor(e){e.preventDefault();const f=new FormData(e.target),id=String(f.get('id')),title=String(f.get('title')||'').trim(),section=String(f.get('section'));
   if(!title||!S.data.sections.includes(section))return toast('항목명과 분류를 확인하세요.');
   const existing=S.data.items.find(i=>i.id===id),prev=existing?{...existing}:{id,referencePrice:0,deleted:false};
   const next={...prev,title,section,type:String(f.get('type')),status:String(f.get('status')),acquisition:String(f.get('acquisition')),quantity:Math.max(1,Math.round(Number(f.get('quantity'))||1)),estimate:Math.max(0,Number(f.get('estimate'))||0),actual:Math.max(0,Number(f.get('actual'))||0),product:String(f.get('product')||'').trim(),giver:String(f.get('giver')||'').trim(),owner:String(f.get('owner')),repeat:String(f.get('repeat')||'none'),dueMonth:isToddler()&&String(f.get('dueMonth')).trim()!==''?Math.min(120,Math.max(0,Number(f.get('dueMonth'))||0)):null,dueOffset:String(f.get('dueOffset')).trim()===''?null:Number(f.get('dueOffset'))||0,dueDate:String(f.get('dueDate')||''),referenceUrl:safeUrl(String(f.get('referenceUrl')||'')),notes:String(f.get('notes')||'').trim(),updatedAt:stamp()};
   if(!existing)S.data.items.push(next);else Object.assign(existing,next);
   closeModal();markDirty();toast('항목을 반영했습니다.');
 }
 function toggleItem(id,checked){const i=S.data.items.find(x=>x.id===id);if(!i)return;if(i.repeat&&i.repeat!=='none'){i.lastDoneDate=checked?today():'';i.status='pending'}else i.status=checked?'done':'pending';i.updatedAt=stamp();markDirty()}
 function removeItem(id){const i=S.data.items.find(x=>x.id===id);if(!i||!confirm('정말 이 항목을 삭제하시겠습니까?'))return;i.deleted=true;i.updatedAt=stamp();closeModal();markDirty()}
 function actionCopyReco(key){const text=`${isToddler()?'생후 24~36개월 앞으로의 준비물·일정 관리':'임신·출산 준비 체크리스트'}의 '${key}' 품목을 2026년 한국 판매 기준으로 재검토해줘. 3개 후보의 브랜드·모델·장단점·현재 판매 가격·실제 구매 링크·안전 유의사항과 추천 이유를 출처와 함께 제공해줘. 이후 GitHub 프로젝트의 recommendations.js에 붙여넣을 수 있는 업데이트 객체도 작성해줘. 판매 여부와 가격은 최신 확인을 우선해.`;navigator.clipboard.writeText(text).then(()=>toast('추천 갱신 요청문을 복사했습니다.')).catch(()=>prompt('요청문 복사',text))}
 function showItemReco(id){const item=activeItems().find(i=>i.id===id);if(!item)return;const rr=recommendFor(item),link=safeUrl(item.referenceUrl);modal('제품 추천 · '+item.title,`<p class="warning">현재 실시간 가격·재고는 검증되지 않았습니다. 과거 참고 링크는 추천 확정이 아닙니다.</p>${rr?`<div class="card"><strong>선택 기준</strong><p class="tiny-note">${escape(rr.tip)}</p></div>`:'<p class="tiny-note">저장된 추천 정보가 없습니다. 새 추천 요청을 복사해 갱신할 수 있습니다.</p>'}${link?`<a href="${escape(link)}" rel="noopener noreferrer" target="_blank">원본 시트 참고 링크 열기</a>`:''}<div class="form-actions"><button class="primary" data-action="copy-reco" data-key="${escape(item.title)}">최신 추천 요청 복사</button><button class="secondary" data-action="edit" data-id="${escape(id)}">제품 정보 입력</button></div>`)}
 function download(filename,blob){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
 async function exportEncrypted(){if(!S.data||!S.key)return toast('잠금 해제 후 사용하세요.');const cipher=await encryptPayload(S.data);download('baby-prep-'+S.family+'-'+today()+'.encrypted.json',new Blob([JSON.stringify({family:S.family,exportedAt:new Date().toISOString(),salt:S.authSalt,cipher,revision:S.revision,pending:S.generation>S.savedGeneration},null,2)],{type:'application/json'}));toast('현재 기록을 암호화 백업했습니다.')}
 async function importEncryptedFile(file){if(!S.data||!S.key)return;try{if(file.size>1500000)throw Error('백업 크기는 1.5MB 이하여야 합니다.');const backup=JSON.parse(await file.text());if(backup.family!==S.family||backup.salt!==S.authSalt||typeof backup.cipher!=='string')throw Error('다른 가족 공간이거나 암호화 키가 다른 백업입니다.');const recovered=await decryptPayload(backup.cipher);if(!Array.isArray(recovered.items)||!Array.isArray(recovered.sections))throw Error('올바른 백업 기록이 아닙니다.');if(!confirm('현재 화면의 기록을 백업 내용으로 바꾸시겠습니까? 서버 충돌이 발생하면 저장이 멈추고 선택할 수 있습니다.'))return;S.data=recovered;markDirty();toast('백업 복원 후 암호화 동기화 중');}catch(e){toast('백업 불러오기 실패: '+e.message)}}
 function csv(v){return '"'+String(v??'').replaceAll('"','""')+'"'}
 function exportCSV(){const lines=[['구분','품목','상태','구비방법','제품','제공자','수량','예상가격','실제지출','마감일','담당','반복'].map(csv).join(',')];activeItems().forEach(i=>lines.push([i.section,i.title,i.status,acquisitionText(i.acquisition),i.product,i.giver,i.quantity,i.estimate,i.actual,dueOf(i),i.owner,repeatLabel(i)].map(csv).join(',')));download('baby-prep-budget-'+today()+'.csv',new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}))}
 function exportICS(){const active=activeItems().filter(i=>i.type==='task'&&dueOf(i)&&i.status!=='skipped');if(!active.length)return toast('날짜가 있는 일정이 없습니다. 먼저 기준일을 입력하세요.');const escICS=s=>String(s||'').replaceAll('\\','\\\\').replaceAll(';','\\;').replaceAll(',','\\,').replaceAll('\n','\\n');const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Baby Prep//KR//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];for(const i of active){const d=dueOf(i).replaceAll('-',''),next=isoDate(addDays(dateValue(dueOf(i)),1)).replaceAll('-','');lines.push('BEGIN:VEVENT','UID:'+i.id+'@baby-prep.local','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z'),'DTSTART;VALUE=DATE:'+d,'DTEND;VALUE=DATE:'+next,'SUMMARY:'+escICS(i.title),'DESCRIPTION:'+escICS(i.notes||i.section),'BEGIN:VALARM','TRIGGER:-P7D','ACTION:DISPLAY','DESCRIPTION:일정 7일 전','END:VALARM','BEGIN:VALARM','TRIGGER:-P1D','ACTION:DISPLAY','DESCRIPTION:일정 하루 전','END:VALARM','END:VEVENT')}lines.push('END:VCALENDAR');download('baby-prep-calendar.ics',new Blob([lines.join('\r\n')],{type:'text/calendar;charset=utf-8'}))}
 async function clickAction(e){const el=e.target.closest('[data-action]');if(!el)return;const action=el.dataset.action,id=el.dataset.id,section=el.dataset.section;try{switch(action){
  case 'route':S.route=el.dataset.route;S.search='';S.filter='all';render();break;
  case 'add':openEditor(null,section);break;
  case 'edit':openEditor(id);break;
  case 'delete':removeItem(id);break;
  case 'close':closeModal();break;
  case 'toggle':if(el.tagName==='INPUT')toggleItem(id,el.checked);break;
  case 'lock':clearTimeout(saveTimer);if(S.generation>S.savedGeneration){await persist();if(S.generation>S.savedGeneration){toast('미전송 기록은 이 기기에 암호화되어 보관됩니다.')}}await showAuth();break;
  case 'sync':await refreshFromServer();break;
  case 'conflict-remote':await resolveConflict('remote');break;
  case 'conflict-local':await resolveConflict('local');break;
  case 'export':await exportEncrypted();break;
  case 'import-backup':byId('backupFile')?.click();break;
  case 'export-ics':exportICS();break;
  case 'export-csv':exportCSV();break;
  case 'copy-reco':actionCopyReco(el.dataset.key);break;
  case 'recommend-item':showItemReco(id);break;
  case 'section-remove':if(S.data.sections.length<=1)return toast('최소 한 개 탭이 필요합니다.');if(activeItems().some(i=>i.section===section))return toast('해당 탭의 항목을 먼저 다른 탭으로 옮기세요.');if(confirm('이 탭을 삭제하시겠습니까?')){S.data.sections=S.data.sections.filter(s=>s!==section);S.route='home';markDirty()}break;
 }}catch(err){toast(err.message)}}
 function submitAction(e){
   const formId=e.target.getAttribute('id');
   if(formId==='itemForm')return saveEditor(e);
   if(formId==='settingsForm'){e.preventDefault();const f=new FormData(e.target);S.data.settings={...S.data.settings,dueDate:String(f.get('dueDate')||''),babyName:String(f.get('babyName')||'').trim(),budget:Math.max(0,Number(f.get('budget'))||0)};markDirty();toast('설정을 저장했습니다.');return}
   if(formId==='sectionForm'){e.preventDefault();const f=new FormData(e.target),name=String(f.get('section')||'').trim();if(!name)return;if(S.data.sections.includes(name))return toast('이미 있는 탭입니다.');if(S.data.sections.length>=30)return toast('탭은 최대 30개까지 만들 수 있습니다.');S.data.sections.push(name);S.route='section:'+name;markDirty();toast('새 탭을 추가했습니다.');return}
 }
 function bind(){byId('authForm').addEventListener('submit',submitAuth);
  byId('pinPad').addEventListener('click',e=>{const b=e.target.closest('[data-pin]');if(b)pinPress(b.dataset.pin)});
  byId('pinPrimaryDisplay').addEventListener('click',()=>{activePin='passwordInput';paintPins()});
  byId('pinConfirmDisplay').addEventListener('click',()=>{if(S.setup){activePin='passwordAgainInput';paintPins()}});
  document.addEventListener('keydown',e=>{
    if(byId('authScreen').classList.contains('hidden')||e.target===byId('inviteInput'))return;
    if(/^\d$/.test(e.key)){e.preventDefault();pinPress(e.key)}
    else if(e.key==='Backspace'){e.preventDefault();pinPress('delete')}
  });
  document.addEventListener('click',clickAction);document.addEventListener('submit',submitAction);byId('familyGrid').addEventListener('click',e=>{const b=e.target.closest('[data-family]');if(!b)return;selectFamily(b.dataset.family,true);refreshMeta()});byId('listSearch')?.addEventListener('input',()=>{});
   document.addEventListener('input',e=>{if(e.target.id==='listSearch'){S.search=e.target.value;const focus=e.target.selectionStart;render();const el=byId('listSearch');el?.focus();el?.setSelectionRange(focus,focus)}});
   document.addEventListener('change',e=>{if(e.target.id==='listFilter'){S.filter=e.target.value;render()}if(e.target.id==='backupFile'&&e.target.files?.[0]){importEncryptedFile(e.target.files[0]);e.target.value=''}});
   byId('modalClose').addEventListener('click',closeModal);byId('modal').addEventListener('click',e=>{if(e.target===byId('modal')&&!S.conflict)closeModal()});
   byId('lockBtn').addEventListener('click',()=>clickAction({target:{closest:()=>({dataset:{action:'lock'}})}}));byId('syncNowBtn').addEventListener('click',refreshFromServer);
   document.addEventListener('visibilitychange',()=>{if(!document.hidden&&S.data&&S.generation===S.savedGeneration&&S.backend&&!S.conflict)refreshFromServer()});
   window.addEventListener('beforeunload',e=>{if(S.data&&S.generation>S.savedGeneration){e.preventDefault();e.returnValue=''}});
 }
 async function init(){if(!window.crypto?.subtle){byId('authMessage').textContent='안전한 연결(HTTPS)에서 열어주세요. file:// 대신 로컬 서버 또는 GitHub Pages를 사용하세요.';return}selectFamily(readPreferredFamily());bind();Bridge.start();await refreshMeta()}
 init();
})();