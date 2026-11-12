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
 const S={family:'ew-he',setup:false,authToken:'',key:null,data:null,revision:0,route:'home',saving:false,generation:0,savedGeneration:0,conflict:null,filter:'all',sectionFilter:'all',benefitFilter:'relevant',search:'',previousRoute:'home',initialized:false,retryCount:0,backend:!!CONFIG.backendUrl};
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
 const ageInMonths=iso=>{
   const birth=dateValue(iso),now=dateValue(today());
   if(!birth||!now||birth>now)return null;
   let months=(now.getFullYear()-birth.getFullYear())*12+now.getMonth()-birth.getMonth();
   if(addMonthsClamped(birth,months)>now)months--;
   return Math.max(0,months);
 };
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
 const cleanData=d=>({schema:3,profile:d?.profile||'newborn',seedVersion:d?.seedVersion||BABY_PREP_SEED_VERSION,settings:{...{dueDate:'',birthDate:'',babyName:'',budget:0,residenceRegion:'unknown',residenceCity:''},...(d?.settings||{})},sections:Array.isArray(d?.sections)?d.sections:['출산 가방','집안 준비','서류·일정','출산 후'],items:Array.isArray(d?.items)?d.items:[],benefits:(d?.benefits&&typeof d.benefits==='object'&&!Array.isArray(d.benefits))?d.benefits:{}});
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
 let miniProgressTimer=null;
 let miniStarted=0;
 function stopMiniProgress(){
   if(miniProgressTimer!==null){clearInterval(miniProgressTimer);miniProgressTimer=null}
 }
 function setMiniValue(value,determinate){
   const valueEl=byId('syncMiniValue'),fill=byId('syncMiniFill'),track=byId('syncMiniTrack');
   if(!valueEl||!fill||!track)return;
   valueEl.textContent=value;
   if(determinate){
     fill.style.width='100%';track.setAttribute('aria-valuenow','100');
   }else{
     fill.style.width=Math.min(92,Math.round(8+84*(1-Math.exp(-(Date.now()-miniStarted)/2300))))+'%';
     track.removeAttribute('aria-valuenow');
   }
 }
 function labelStatus(message,mode=''){
   const el=byId('syncStatus');el.textContent=message;el.className='sync-status '+mode;
   const mini=byId('syncMini'),activity=byId('syncMiniActivity');
   if(!mini||!activity)return;
   const state=mode==='error'?'error':mode==='saved'?'done':mode==='loaded'?'loaded':mode==='cached'?'loading':
     /대기|미전송/.test(message)?'pending':/확인|불러|저장 중|기기 암호화|서버|동기화/.test(message)?'loading':'idle';
   const previous=mini.dataset.state;
   mini.dataset.state=state;
   activity.textContent=state==='done'?'저장 완료':state==='loaded'?'불러오기 완료':
     state==='error'?'연결 오류':state==='pending'?'저장 대기':
     state==='loading'?(message.includes('저장')?'저장 중':'불러오는 중'):'연결됨';
   mini.setAttribute('aria-label',message);
   mini.title='처리 중 진행률은 경과 시간 추정이며 서버 성공 응답 전 100%로 표시하지 않습니다.';
   if(state==='loading'){
     if(previous!=='loading'||miniProgressTimer===null){
       stopMiniProgress();miniStarted=Date.now();
       miniProgressTimer=setInterval(()=>{
         const n=Math.min(92,Math.round(8+84*(1-Math.exp(-(Date.now()-miniStarted)/2300))));
         setMiniValue(n+'%',false);
       },180);
     }
     setMiniValue('8%',false);
     return;
   }
   stopMiniProgress();
   const valueEl=byId('syncMiniValue'),fill=byId('syncMiniFill'),track=byId('syncMiniTrack');
   if(valueEl){valueEl.textContent=state==='done'?'✓':state==='loaded'?'100%':state==='pending'?'대기':state==='error'?'!':'—'}
   if(fill)fill.style.width=(state==='done'||state==='loaded'||state==='error'?'100%':state==='pending'?'22%':'0%');
   if(track){if(state==='done'||state==='loaded')track.setAttribute('aria-valuenow','100');else track.removeAttribute('aria-valuenow')}
 }
 function toast(message){const t=byId('toast');t.textContent=message;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2500)}
 async function showAuth(){
   stopMiniProgress();
   S.openedFromCache=false;
   S.key=null;S.authToken='';S.data=null;S.revision=0;S.generation=0;S.savedGeneration=0;S.retryCount=0;S.conflict=null;S.route='home';S.previousRoute='home';
   byId('authScreen').classList.remove('hidden');byId('mainScreen').classList.add('hidden');resetPins(true);byId('authMessage').textContent='';
   await refreshMeta();
 }
 let metaRequestSeq=0;
 function applyMeta(initialized,salt,fromCache=false){
   S.setup=!initialized;
   S.authSalt=salt;
   byId('inviteWrap').classList.toggle('hidden',!S.setup);
   byId('passwordAgainWrap').classList.toggle('hidden',!S.setup);
   byId('pinLabel').textContent=S.setup?'새 4자리 PIN 설정':'4자리 PIN 입력';
   byId('authSubmit').textContent=S.setup?'PIN 설정 후 시작':'잠금 해제';
   byId('authMode').textContent=S.setup?'처음 입장입니다. 초대 코드를 입력해 PIN을 설정하세요.':
     fromCache?'이 기기에 암호화 기록이 있습니다. PIN 입력 시 바로 열립니다.':'등록된 가족 공간입니다. PIN을 입력하세요.';
   paintPins();
 }
 async function refreshMeta(){
   const seq=++metaRequestSeq,selectedFamily=S.family,cache=storageGet(cacheKey(selectedFamily));
   byId('authMessage').textContent='';resetPins(true);
   if(cache?.salt&&cache.cipher&&Number(cache.revision)>0){
     // 같은 기기는 salt와 암호문을 보유하므로 메타 요청 완료까지 PIN을 잠그지 않습니다.
     applyMeta(true,cache.salt,true);
     byId('authSubmit').disabled=false;authProgress(false);
     return;
   }
   byId('authMode').textContent='가족 공간 확인 중…';
   byId('authSubmit').disabled=true;authProgress(true,'가족 공간을 확인하는 중…');
   try{
     const r=await Bridge.call({action:'meta',family:selectedFamily});
     if(seq!==metaRequestSeq)return;
     applyMeta(!!r.initialized,r.salt||'',false);
   }catch(e){
     if(seq!==metaRequestSeq)return;
     byId('authMode').textContent='연결 오류: '+e.message;
     byId('authMessage').textContent='네트워크 연결 상태를 확인해 주세요.';
   }finally{
     if(seq===metaRequestSeq){byId('authSubmit').disabled=false;authProgress(false)}
   }
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
     storageSet(cacheKey(),{cipher,revision:S.revision,salt:S.authSalt,pending:false});toast('가족 공간이 준비되었습니다.');
   } else {
     const derived=await derive(pass,S.authSalt);S.key=derived.key;S.authToken=derived.authToken;
     const cache=storageGet(cacheKey());
     // PIN으로 암호화된 로컬 기록을 먼저 복호화하면, 서버 왕복 전에 화면을 열 수 있습니다.
     // pending 기록은 무조건 서버 동기화·충돌 검사 후 사용하여 미전송 변경을 보호합니다.
     let openedCache=false;
     if(cache?.cipher&&!cache.pending&&cache.salt===S.authSalt&&Number(cache.revision)>0){
       try{
         S.data=await decryptPayload(cache.cipher);
         S.revision=cache.revision;
         openedCache=true;
       }catch{
         // 로컬 캐시가 깨졌다면 서버 원본으로 검증하여 복구합니다.
         S.data=null;
       }
     }
     if(!openedCache){
       authProgress(true,'서버에서 암호화 기록을 불러오는 중…');
       const r=await Bridge.call({action:'login',family:S.family,authToken:derived.authToken});
       if(!r.ok)throw Error(r.error||'로그인 실패');
       S.revision=r.revision;S.data=await decryptPayload(r.cipher);
       if(cache?.pending&&cache.cipher){
         try{const local=await decryptPayload(cache.cipher);
           if(confirm('이 기기에 아직 전송되지 않은 기록이 있습니다. 서버 기록 대신 이 기기 기록으로 복원하시겠습니까?\n취소하면 서버 기록을 사용하고 미전송 기록은 별도로 보관합니다.')){
             S.data=local;S.generation++;S.savedGeneration=0;S.revision=cache.revision??S.revision;
           }
         }catch(err){console.warn('로컬 미전송 복원 실패',err)}
       }
       if(!cache?.pending)storageSet(cacheKey(),{cipher:r.cipher,revision:S.revision,salt:S.authSalt,pending:false});
     }
     S.openedFromCache=openedCache;
   }
   byId('authScreen').classList.add('hidden');byId('mainScreen').classList.remove('hidden');byId('familyTitle').textContent=FAMILY[S.family];
   labelStatus(S.openedFromCache&&S.backend?'기기 기록을 열었습니다 · 서버 확인 중':S.backend?'✓ 서버 기록 불러오기 완료':'✓ 이 기기 기록 확인',S.openedFromCache&&S.backend?'cached':S.backend?'loaded':'saved');render();
   if(S.generation>S.savedGeneration)queueSave();
   if(S.openedFromCache&&S.backend)void refreshFromServer(true);
   else if(S.generation===S.savedGeneration&&reconcileToddlerCatalog())markDirty();
   S.openedFromCache=false;
  }catch(err){S.key=null;S.authToken='';S.data=null;resetPins();msg.textContent=err.message||'잠금 해제 실패';}
  finally{btn.disabled=false;btn.textContent=S.setup?'PIN 설정 후 시작':'잠금 해제';authProgress(false)}
 }
 let saveTimer=null;
 function markDirty(shouldRender=true){S.retryCount=0;S.generation++;labelStatus('● 변경 사항 저장 대기','');queueSave();if(shouldRender)render()}
 function queueSave(delay=900){clearTimeout(saveTimer);saveTimer=setTimeout(persist,delay)}
 async function persist(){
   if(!S.key||!S.data||S.saving||S.conflict)return;
   if(S.generation===S.savedGeneration)return;
   S.saving=true;const gen=S.generation;labelStatus('● 기기 암호화 및 저장 중');
   try{
     const cipher=await encryptPayload(S.data);
     storageSet(cacheKey(),{cipher,revision:S.revision,salt:S.authSalt,pending:true});
     const r=await Bridge.call({action:'save',family:S.family,authToken:S.authToken,revision:S.revision,cipher});
     if(r.error==='CONFLICT'||r.ok===false){S.conflict={serverRevision:r.revision,cipher};labelStatus('⚠ 다른 기기의 수정과 충돌','error');showConflict();return}
     S.revision=r.revision;S.savedGeneration=gen;S.retryCount=0;
     if(S.generation===gen){storageSet(cacheKey(),{cipher,revision:S.revision,salt:S.authSalt,pending:false});labelStatus(S.backend?'✓ 암호화된 서버 저장 완료':'✓ 이 기기 저장 완료','saved')}
     else labelStatus('● 추가 변경 사항 저장 대기');
   }catch(e){S.retryCount++;labelStatus('⚠ 서버 전송 실패 · 이 기기 암호화 보관','error');toast(e.message)}
   finally{S.saving=false;if(!S.conflict&&S.generation>S.savedGeneration&&S.retryCount<=5)queueSave(S.retryCount?Math.min(60000,1200*Math.pow(2,S.retryCount)):900)}
 }
 async function refreshFromServer(quiet=false){
   if(!S.data)return;
   if(S.generation>S.savedGeneration||S.saving){if(!quiet)toast('미저장 변경을 먼저 동기화합니다.');queueSave();return}
   const startedGeneration=S.generation,startedFamily=S.family,startedToken=S.authToken,startedKey=S.key;
   const stale=()=>S.generation!==startedGeneration||S.saving||!S.data||S.family!==startedFamily||S.authToken!==startedToken||S.key!==startedKey;
   try{
     labelStatus('↻ 서버 최신 기록 확인 중');
     const r=await Bridge.call({action:'login',family:startedFamily,authToken:startedToken});
     if(!r.ok)throw Error(r.error||'서버 인증 실패');
     // 요청하는 동안 사용자가 체크를 변경했다면 서버 데이터로 덮어쓰지 않습니다.
     if(stale()){if(S.data&&S.family===startedFamily)labelStatus('● 변경 사항 저장 대기');return}
     if(r.revision>S.revision){
       const remoteData=await decryptPayload(r.cipher);
       if(stale()){if(S.data&&S.family===startedFamily)labelStatus('● 변경 사항 저장 대기');return}
       S.data=remoteData;
       S.revision=r.revision;storageSet(cacheKey(),{cipher:r.cipher,revision:r.revision,salt:S.authSalt,pending:false});
       render();if(!quiet)toast('다른 기기에서 수정한 내역을 반영했습니다.');
     }else if(!quiet)toast('최신 상태입니다.');
     if(!stale()&&reconcileToddlerCatalog()){markDirty();return}
     labelStatus('✓ 서버 최신 기록 확인 완료','loaded');
   }catch(e){
     if(S.family!==startedFamily||S.authToken!==startedToken||!S.data)return;
     labelStatus('⚠ 서버 확인 실패 · 이 기기 암호화 기록 유지','error');
     if(!quiet)toast(e.message);
   }
 }
 let modalPageScroll=null;
 function modal(title,html){
   if(modalPageScroll===null&&document.body?.style){
     modalPageScroll=window.scrollY||document.documentElement?.scrollTop||0;
     document.body.style.position='fixed';
     document.body.style.top='-'+modalPageScroll+'px';
     document.body.style.left='0';
     document.body.style.right='0';
     document.body.style.width='100%';
     document.body.classList.add('modal-open');
   }
   byId('modalTitle').textContent=title;
   byId('modalBody').innerHTML=html;
   byId('modalBody').scrollTop=0;
   byId('modal').classList.remove('hidden');
 }
 function closeModal(){
   byId('modal').classList.add('hidden');
   byId('modalBody').innerHTML='';
   if(modalPageScroll!==null&&document.body?.style){
     const scroll=modalPageScroll;modalPageScroll=null;
     document.body.classList.remove('modal-open');
     document.body.style.position='';
     document.body.style.top='';
     document.body.style.left='';
     document.body.style.right='';
     document.body.style.width='';
     if(typeof window.scrollTo==='function')window.scrollTo(0,scroll);
   }
 }
 function showConflict(){modal('기록 충돌 감지',`<p class="warning">다른 휴대폰에서 먼저 저장했습니다. 자동 덮어쓰기를 중단했습니다. 이 기기 기록은 암호화 보관되어 있습니다.</p><p class="tiny-note">서버 최신 기록을 불러오거나, 현재 기기의 기록으로 서버를 교체할 수 있습니다. 두 변경을 자동 병합하지 않습니다.</p><div class="stack"><button class="secondary" data-action="conflict-remote">서버 최신 기록 불러오기</button><button class="danger" data-action="conflict-local">현재 기록으로 서버 덮어쓰기</button><button class="ghost" data-action="export">암호화 백업 내려받기</button></div>`)}
 async function resolveConflict(choice){
   if(!S.conflict)return;
   try{
     const r=await Bridge.call({action:'login',family:S.family,authToken:S.authToken});
     if(!r.ok)throw Error(r.error);
     if(choice==='remote'){
       if(!confirm('이 기기의 미전송 기록을 포기하고 서버 기록으로 전환하시겠습니까?'))return;
       S.data=await decryptPayload(r.cipher);S.revision=r.revision;S.savedGeneration=S.generation;S.conflict=null;
       storageSet(cacheKey(),{cipher:r.cipher,revision:r.revision,salt:S.authSalt,pending:false});closeModal();render();labelStatus('✓ 최신 서버 기록 적용','loaded');
     } else {
       if(!confirm('서버의 최신 변경을 현재 기기의 기록으로 교체합니다. 계속하시겠습니까?'))return;
       S.revision=r.revision;S.conflict=null;closeModal();S.generation++;queueSave();
     }
   }catch(e){toast(e.message)}
 }
 // Only pristine built-in placeholders are retired. User-edited/completed/costed items remain intact.
 const catalog=()=>BABY_PREP_RECOMMENDATIONS;
 const productRecommendations=()=>catalog().categories||[];
 const retiredSeedTitles=()=>new Set(catalog().retiredTitles||[]);
 function isPristineLegacyItem(i){
   return /^toddler-(?:roadmap|goods)-/.test(String(i.id||''))&&
     (i.updatedAt===0||!i.updatedAt)&&i.status==='pending'&&!i.deleted&&
     !i.product&&!i.giver&&!i.referenceUrl&&!(Number(i.actual)>0)&&!(Number(i.estimate)>0)&&
     (i.acquisition==='undecided'||!i.acquisition)&&!i.lastDoneDate;
 }
 function isRetiredPristine(i){return isToddler()&&retiredSeedTitles().has(i.title)&&isPristineLegacyItem(i)}
 function buildCuratedItem(entry){
   return {id:'curated-'+entry.id,title:entry.title,section:entry.section,type:'item',
     status:'pending',acquisition:'undecided',quantity:1,estimate:0,actual:0,referencePrice:0,referenceUrl:'',
     product:'',giver:'',owner:'함께',priority:'normal',dueMonth:entry.month,dueOffset:null,dueDate:'',
     repeat:'none',lastDoneDate:'',notes:entry.notes||'',recommendationId:entry.recId,updatedAt:0,deleted:false};
 }
 function reconcileToddlerCatalog(){
   if(!S.data||!isToddler()||!Array.isArray(S.data.items))return false;
   let changed=false;
   for(const item of S.data.items){
     if(isRetiredPristine(item)){item.deleted=true;item.updatedAt=stamp();changed=true}
   }
   for(const recommended of catalog().curatedGoods||[]){
     const id='curated-'+recommended.id;
     if(S.data.items.some(i=>i.id===id||i.title===recommended.title||i.recommendationId===recommended.recId))continue;
     if(!S.data.sections.includes(recommended.section))continue;
     S.data.items.push(buildCuratedItem(recommended));changed=true;
   }
   if(changed)S.data.seedVersion=BABY_PREP_TODDLER_SEED_VERSION;
   return changed;
 }
 function activeItems(){return S.data.items.filter(i=>!i.deleted&&!isRetiredPristine(i))}

 function budget(){
   const items=activeItems(),done=items.filter(doneNow).length;
   const spent=items.reduce((n,i)=>n+(Number(i.actual)||0),0);
   const needed=items.filter(i=>!doneNow(i)&&i.status!=='skipped'&&i.acquisition!=='gift'&&i.acquisition!=='already').reduce((n,i)=>n+(Number(i.estimate)||0),0);
   const missing=items.filter(i=>!doneNow(i)&&i.status!=='skipped'&&i.type==='item'&&i.acquisition!=='gift'&&i.acquisition!=='already'&&!(Number(i.estimate)>0)).length;
   return {items,done,spent,needed,missing,total:spent+needed};
 }
 function alertItems(){return activeItems().filter(i=>!doneNow(i)&&i.status!=='skipped'&&dueOf(i)&&daysUntil(dueOf(i))<=14).sort((a,b)=>dueOf(a).localeCompare(dueOf(b)))}
 function renderChecklistProgress(){
   const items=activeItems(),done=items.filter(doneNow).length,pct=items.length?Math.round(done*100/items.length):0;
   return `<div class="check-progress"><div class="check-progress-line"><strong>준비 현황</strong><span>${done} / ${items.length}개 · ${pct}%</span></div><div class="check-progress-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="체크리스트 완료율"><span style="width:${pct}%"></span></div></div>`;
 }
 function render(){if(!S.data)return;renderTabs();byId('settingsBtn').textContent=S.route==='settings'?'←':'⚙';byId('settingsBtn').setAttribute('aria-label',S.route==='settings'?'이전 화면으로':'가족 설정 열기');const route=S.route;let html='';if(route==='home')html=renderHome();else if(route==='all'||route.startsWith('section:'))html=renderList(route);else if(route==='timeline')html=renderTimeline();else if(route==='budget')html=renderBudget();else if(route==='reco')html=renderReco();else if(route==='settings')html=renderSettings();else if(route==='benefits')html=renderBenefits();byId('mainContent').innerHTML=`<div class="screen">${html}</div>`;}
 function renderTabs(){
   const tabs=[['home','홈'],['all','체크'],['timeline','일정'],['benefits','혜택']];
   const active=S.route==='budget'?'home':S.route.startsWith('section:')?'all':S.route;
   byId('topTabs').innerHTML=tabs.map(([route,title])=>`<button type="button" data-action="route" data-route="${route}" class="tab ${active===route?'active':''}" ${active===route?'aria-current="page"':''}>${title}</button>`).join('');
 }
 // 가족별 혜택 상태는 기본 준비물과 분리해 저장하여 기존 진행률·구매 내역을 변경하지 않습니다.
 const benefitEntries=()=>Array.isArray(window.BABY_PREP_BENEFITS)?window.BABY_PREP_BENEFITS:[];
 function benefitContext(){
   const st=S.data?.settings||{},region=['seoul','gyeonggi','other'].includes(st.residenceRegion)?st.residenceRegion:'unknown';
   const birth=isToddler()?st.dueDate:st.birthDate;
   const months=ageInMonths(birth);
   const profile=isToddler()||months>=18?'toddler':months===null?'pregnancy':months<2?'birth':'infant';
   return {region,months,profile,birthDate:birth,dueDate:st.dueDate,city:String(st.residenceCity||'')};
 }
 function benefitVisible(entry,ctx,all=false){
   if(entry.region!=='all'&&entry.region!==ctx.region)return false;
   if(all)return true;
   if(ctx.profile==='pregnancy')return entry.stage==='pregnancy'||entry.stage==='birth';
   if(ctx.profile==='birth')return entry.stage==='birth'||entry.stage==='infant';
   if(ctx.profile==='infant')return entry.stage==='infant'||(ctx.months>=12&&entry.stage==='toddler');
   return entry.stage==='toddler'||(ctx.months<24&&entry.stage==='infant'&&entry.month>=ctx.months);
 }
 function benefitDue(entry,ctx){
   const base=entry.stage==='pregnancy'?ctx.dueDate:(ctx.birthDate||ctx.dueDate);
   const parsed=dateValue(base);
   if(!parsed)return '';
   const date=addMonthsClamped(parsed,Number(entry.month||0));
   if(entry.monthly){
     if(dateValue(today())>=date)return today().slice(0,7)+'-01';
     date.setDate(1);return isoDate(date);
   }
   // 월 1~15일 접수: 23개월이 되는 '날'이 아닌 해당 월 첫날부터 확인
   if(['seoul-grandparent','gyeonggi-family-care'].includes(entry.id))date.setDate(1);
   return isoDate(date);
 }
 function benefitState(id){
   const entry=benefitEntries().find(x=>x.id===id),record=S.data.benefits?.[id];
   if(!entry?.monthly)return record?.status||'pending';
   if(record?.status==='na')return 'na';
   return record?.monthly?.[today().slice(0,7)]||'pending';
 }
 function benefitStats(){
   const ctx=benefitContext(),relevant=benefitEntries().filter(e=>benefitVisible(e,ctx));
   return {ctx,relevant,pending:relevant.filter(e=>benefitState(e.id)==='pending'),reviewing:relevant.filter(e=>benefitState(e.id)==='review'),done:relevant.filter(e=>benefitState(e.id)==='done').length};
 }
 function saveBenefitStatus(code,next){
   const entry=benefitEntries().find(x=>x.id===code);
   if(!entry||!['done','review','na','pending'].includes(next))return false;
   if(!S.data.benefits)S.data.benefits={};
   const prev=S.data.benefits[code]||{};
   if(entry.monthly){
     const month=today().slice(0,7);
     S.data.benefits[code]={...prev,status:next==='na'?'na':'pending',
       monthly:{...(prev.monthly||{}),[month]:next},updatedAt:stamp()};
   } else S.data.benefits[code]={status:next,updatedAt:stamp()};
   return true;
 }
 function updateBenefitSummary(){
   const done=byId('benefitDone'),pending=byId('benefitPending');
   if(!done||!pending)return;
   const stats=benefitStats();
   done.textContent=stats.done+'개 완료';
   pending.textContent=stats.pending.length+'개 미확인 · '+stats.reviewing.length+'개 확인 중';
 }
 function benefitCard(e,ctx){
   const state=benefitState(e.id),due=benefitDue(e,ctx),source=safeUrl(e.source);
   const statusOptions=[
     ['pending','미확인'],
     ['review','조건·신청 확인 중'],
     ['done','신청·처리 완료'],
     ['na','해당 없음']
   ];
   return `<article class="benefit-card" data-benefit-card="${escape(e.id)}">
     <div class="inline"><span class="chip">${e.region==='seoul'?'서울':e.region==='gyeonggi'?'경기':'전국'} · ${({pregnancy:'임신',birth:'출생',infant:'영아',toddler:'두 돌 전후'})[e.stage]}${e.monthly?' · 매월':''}</span></div>
     <h3>${escape(e.title)}</h3>
     <p>${escape(e.desc)}</p>
     ${due?`<p class="benefit-due">📅 ${escape(due)} 무렵 확인 ${!ctx.birthDate&&e.stage!=='pregnancy'?'(출산예정일 기준 예상)':''}</p>`:''}
     <div class="benefit-controls">
       <label class="benefit-status-label"><span>내 진행 상태</span>
         <select class="benefit-status-select" data-benefit="${escape(e.id)}" aria-label="${escape(e.title)} 진행 상태">
           ${statusOptions.map(([value,label])=>`<option value="${value}" ${state===value?'selected':''}>${label}</option>`).join('')}
         </select>
       </label>
       ${source?`<a class="benefit-info-link" href="${escape(source)}" rel="noopener noreferrer" target="_blank" aria-label="${escape(e.title)} 공식 신청 안내 보기">공식 안내 열기 ↗</a>`:''}
     </div>
   </article>`;
 }
 function renderBenefits(){
   const ctx=benefitContext(),stats=benefitStats(),all=S.benefitFilter==='all';
   const results=benefitEntries().filter(e=>benefitVisible(e,ctx,all))
     .sort((a,b)=>((benefitState(a.id)==='pending'?0:1)-(benefitState(b.id)==='pending'?0:1))||a.month-b.month);
   const regionName=({seoul:'서울',gyeonggi:'경기도',other:'기타 지역',unknown:'거주 지역 미설정'})[ctx.region];
   const areaWarning=ctx.region==='unknown'?'<div class="help-block">지역 지원을 놓치지 않으려면 <button class="link-button" data-action="route" data-route="settings">설정에서 거주지 선택</button>을 먼저 해주세요. 지금은 전국 공통 혜택만 표시합니다.</div>':
     ctx.region==='gyeonggi'?'<div class="warning">경기도 가족돌봄수당은 시·군별 참여·예산·신규 접수 여부가 다릅니다. 2026년 11월 공고에는 성남·용인 등 일부 시군 접수 중단이 포함됩니다. 2027년은 재확인해야 합니다.</div>':'';
   return `<div class="inline"><h2 class="section-title">🎁 우리 가족 혜택</h2><button class="link-button" data-action="route" data-route="home">홈으로</button></div>
     <p class="muted-small">2026년 공식 안내 기준 · 현재 단계와 ${escape(regionName)} 혜택 · 세 가족 데이터는 각각 저장됩니다.</p>
     ${areaWarning}
     <div class="card benefit-summary"><div><strong id="benefitDone">${stats.done}개 완료</strong><span id="benefitPending">${stats.pending.length}개 미확인 · ${stats.reviewing.length}개 확인 중</span></div><button class="mini-btn" data-action="route" data-route="settings">가족·거주지 설정</button></div>
     <div class="benefit-filter"><button class="pill ${!all?'active':''}" data-action="benefit-filter" data-filter="relevant">현재 단계</button><button class="pill ${all?'active':''}" data-action="benefit-filter" data-filter="all">전체 단계·과거 내역</button></div>
     <p class="benefit-usage-note">‘내 진행 상태’를 바꾸면 이 앱에 자동 저장됩니다. 실제 신청·조건 확인은 각 카드의 ‘공식 안내 열기’를 이용하세요.</p>
     <div class="benefits-list">${results.map(e=>benefitCard(e,ctx)).join('')||'<div class="empty">현재 조건에 맞는 혜택이 없습니다.</div>'}</div>
     <p class="tiny-note">‘신청·처리 완료’는 실제로 신청하거나 해당 혜택의 처리가 완료됐을 때만 선택하세요. 이 화면에서의 상태 변경은 실제 정부 지원금 신청이 아닙니다. 각 항목은 수급 확정이 아닌 신청·자격 확인용입니다. 가족별 주소·소득·맞벌이/양육공백·아동 연령에 따라 달라질 수 있습니다. 연도가 바뀌면 금액·기한·신청 접수를 다시 확인해야 합니다.</p>`;
 }
 function benefitHomePanel(){
   const stats=benefitStats(),near=stats.pending.slice().sort((a,b)=>a.month-b.month).slice(0,3);
   return `<section class="benefit-home"><div class="inline"><h3 class="subhead">🎁 지원금·가족 혜택</h3><button class="link-button" data-action="route" data-route="benefits">전체 ${stats.relevant.length}개 보기</button></div>
     ${stats.ctx.region==='unknown'?'<div class="help-block">서울·경기 등 지역 혜택은 <button class="link-button" data-action="route" data-route="settings">거주지 설정</button> 후 표시됩니다.</div>':''}
     <div class="card">${near.length?near.map(x=>`<div class="benefit-preview"><span>${escape(x.title)}</span><button class="mini-btn" data-action="route" data-route="benefits">확인</button></div>`).join(''):'<div class="muted-small">현재 단계에서 확인할 혜택을 모두 검토했습니다.</div>'}</div></section>`;
 }

 function babyProfileSummary(){
   const st=S.data.settings||{},birth=isToddler()?st.dueDate:st.birthDate;
   const age=ageInMonths(birth);
   if(birth&&age!==null){
     const birthday=dateValue(birth),current=dateValue(today());
     const anniversary=addMonthsClamped(birthday,age);
     const dayNo=(a,b)=>Math.round((Date.UTC(a.getFullYear(),a.getMonth(),a.getDate())-Date.UTC(b.getFullYear(),b.getMonth(),b.getDate()))/86400000);
     const daysAfterMonth=Math.max(0,dayNo(current,anniversary));
     const totalDays=Math.max(0,dayNo(current,birthday));
     const years=Math.floor(age/12);
     return {name:st.babyName||'우리 아이',subtitle:'만 '+years+'세 · 생후 '+age+'개월 '+daysAfterMonth+'일',detail:totalDays+'일째 · '+birth+' 출생',missing:false};
   }
   if(!isToddler()&&dateValue(st.dueDate)){
     const d=daysUntil(st.dueDate);
     return {name:st.babyName||'출산 준비',subtitle:d>=0?'출산까지 D-'+d:'출산 예정일 D+'+Math.abs(d),detail:'출산예정일 '+st.dueDate,missing:false};
   }
   return {name:st.babyName||'우리 아이',subtitle:isToddler()?'출생일을 설정하면 월령을 표시합니다':'출산예정일을 설정하면 D-day를 표시합니다',detail:'가족 설정에서 아이 정보를 한 번 등록하세요',missing:true};
 }
 function renderHome(){
   const B=budget(),profile=babyProfileSummary(),upcoming=alertItems(),near=upcoming.slice(0,3);
   const remaining=B.items.filter(i=>!doneNow(i)&&i.status!=='skipped').length;
   const benefitCount=benefitStats().pending.length;
   const tasks=near.length?near.map(renderItemRow).join(''):'<p class="home-empty">14일 이내 확인할 일정이 없습니다. 체크리스트에서 준비 항목을 확인하세요.</p>';
   const metrics=[
     {label:'준비 항목',value:B.items.length+'개'},
     {label:'완료',value:B.done+'개'},
     {label:'남은 준비',value:remaining+'개'},
     {label:'14일 내 확인',value:upcoming.length+'개'},
     {label:'기록된 지출',value:fmt(B.spent)},
     {label:'추가 예상비',value:fmt(B.needed)}
   ];
   const firstSection=isToddler()?'구매·예산':'출산 가방';
   return `<div class="home-page">
     <section class="home-profile">
       <div class="home-profile-main"><div><span class="eyebrow">아이 정보</span><h2>${escape(profile.name)}</h2><p class="home-profile-age">${escape(profile.subtitle)}</p><p class="home-profile-extra">${escape(profile.detail)}</p></div>
         <button type="button" class="home-profile-edit" data-action="route" data-route="settings" aria-label="아이 정보 및 가족 설정 열기">⚙ 설정</button></div>
     </section>
     <section class="home-summary" aria-label="가족 준비 요약">${metrics.map(m=>`<div class="home-summary-stat"><span>${escape(m.label)}</span><strong>${escape(m.value)}</strong></div>`).join('')}</section>
     <div class="home-heading"><h3>곧 확인할 일</h3><button type="button" class="link-button" data-action="route" data-route="timeline">전체 일정</button></div>
     <div class="card home-tasks">${tasks}</div>
     <button class="primary home-quick-add" type="button" data-action="quick-add" data-section="${firstSection}">＋ 새 준비 항목 추가</button>
     <div class="home-shortcuts">
       <button type="button" class="home-shortcut" data-action="route" data-route="benefits"><span>🎁</span><span><strong>가족 혜택</strong><small>신청·자격 미확인 ${benefitCount}건</small></span><b aria-hidden="true">›</b></button>
       <button type="button" class="home-shortcut" data-action="route" data-route="budget"><span>₩</span><span><strong>예산 자세히 보기</strong><small>실제 지출·예정 비용 및 항목별 내역</small></span><b aria-hidden="true">›</b></button>
     </div>${!S.backend?'<p class="warning">이 기기에서만 저장되는 미리보기 모드입니다.</p>':''}
   </div>`;
 }
 function acquisitionText(a){return ({undecided:'미정',buy:'직접 구매',gift:'가족에게 받기',second:'중고 구매',rental:'대여',already:'집에 있음'})[a]||'미정'}
 function renderItemRow(i){const when=dueOf(i),days=daysUntil(when),done=doneNow(i),desc=i.product?i.product:acquisitionText(i.acquisition);return `<div class="item-row"><input class="item-check" type="checkbox" data-action="toggle" data-id="${escape(i.id)}" ${done?'checked':''} aria-label="${escape(i.title)} 완료 체크"><div class="item-main" data-action="edit" data-id="${escape(i.id)}"><div class="item-name ${done?'done':''}">${escape(i.title)}</div><div class="item-meta"><span class="chip">${escape(i.section)}</span><span class="chip">${escape(desc)}</span>${i.repeat&&i.repeat!=='none'?`<span class="chip repeating">${repeatLabel(i)}</span>`:''}${i.type==='item'?`<span>×${Number(i.quantity)||1}</span>`:''}${when?`<span class="chip ${!done&&days<=7?'due':''}">${escape(when)}${!done&&days<0?' · 지남':''}</span>`:`<span>${dueHint(i)}</span>`}${i.actual?`<span>${fmt(i.actual)} 지출</span>`:''} </div>${recommendationLine(i)}</div><button class="mini-btn" data-action="edit" data-id="${escape(i.id)}">수정</button></div>`}

 function renderQuickForm(section){
   const chosen=section||S.data.sections[0];
   const options=S.data.sections.map(name=>`<option value="${escape(name)}" ${chosen===name?'selected':''}>${escape(name)}</option>`).join('');
   return `<form id="quickAddForm" class="quick-add-form"><label class="field" for="quickTitle">빠른 추가 · 이름만 입력하면 끝</label>
     <div class="quick-add-line"><input id="quickTitle" name="title" required maxlength="120" placeholder="예: 어린이집 실내화 / 겨울 외투" autocomplete="off"><button class="primary" type="submit">+ 추가</button></div>
     <select name="section" aria-label="추가할 분류">${options}</select></form>`;
 }
 function renderSectionFilter(section){
   const opts=S.data.sections.map(name=>`<option value="${escape(name)}" ${section===name?'selected':''}>${escape(name)}</option>`).join('');
   return `<select id="sectionFilter" aria-label="분류 필터"><option value="all" ${!section?'selected':''}>모든 분류</option>${opts}</select>`;
 }
 function quickNewItem(title,section){
   if(!S.data.sections.includes(section))throw Error('유효한 분류를 선택하세요.');
   const kind=/일정|검진|지원|행정|할 일/.test(section)?'task':'item';
   return {id:uid(),title,section,type:kind,status:'pending',acquisition:'undecided',quantity:1,estimate:0,actual:0,
     referencePrice:0,referenceUrl:'',product:'',giver:'',owner:'함께',priority:'normal',
     dueMonth:null,dueOffset:null,dueDate:'',repeat:'none',lastDoneDate:'',notes:'',updatedAt:stamp(),deleted:false};
 }
 function saveQuickAdd(e){
   e.preventDefault();
   const f=new FormData(e.target),title=String(f.get('title')||'').trim(),section=String(f.get('section')||'');
   if(!title)return toast('항목명을 입력하세요.');
   if(!S.data.sections.includes(section))return toast('분류를 확인하세요.');
   S.data.items.push(quickNewItem(title,section));
   markDirty();toast('추가했습니다. 이어서 입력할 수 있습니다.');
   byId('quickTitle')?.focus();
 }
 function renderList(route){const isCustom=route.startsWith('section:'),section=isCustom?route.slice(8):(S.sectionFilter!=='all'&&S.data.sections.includes(S.sectionFilter)?S.sectionFilter:null);
   const all=activeItems().filter(i=>!section||i.section===section).filter(i=>S.filter==='all'||(S.filter==='pending'&&!doneNow(i)&&i.status!=='skipped')||(S.filter==='done'&&doneNow(i))||(S.filter==='skipped'&&i.status==='skipped')).filter(i=>!S.search||`${i.title} ${i.product} ${i.giver} ${i.notes}`.toLowerCase().includes(S.search.toLowerCase()));
   const grouped=Object.groupBy?Object.groupBy(all,i=>i.section):all.reduce((r,i)=>((r[i.section]||=[]).push(i),r),{});
   return `<div class="inline"><h2 class="section-title">체크리스트</h2><span class="muted-small">${all.length}개 표시</span></div>${renderChecklistProgress()}${recommendationOverview()}${renderQuickForm(section)}
    <div class="toolbar filter-toolbar"><input id="listSearch" type="search" placeholder="품목·제품·메모 검색" value="${escape(S.search)}">${renderSectionFilter(section)}<select id="listFilter" aria-label="상태 필터"><option value="all" ${S.filter==='all'?'selected':''}>전체</option><option value="pending" ${S.filter==='pending'?'selected':''}>미완료</option><option value="done" ${S.filter==='done'?'selected':''}>완료</option><option value="skipped" ${S.filter==='skipped'?'selected':''}>제외</option></select></div>
   <p class="muted-small">${all.length}개 항목 · 체크하면 완료, 항목을 누르면 가격·가족 지원·제품명을 입력할 수 있습니다.</p>
   ${Object.keys(grouped).length?Object.entries(grouped).map(([name,list])=>`<section><div class="inline"><h3 class="subhead">${escape(name)}</h3><span class="muted-small">${list.filter(doneNow).length}/${list.length}</span></div><div class="card">${list.map(renderItemRow).join('')}</div></section>`).join(''):'<div class="empty">조건에 해당하는 항목이 없습니다.</div>'}`;
 }
 function renderTimeline(){const due=S.data.settings.dueDate,items=activeItems().filter(i=>i.status!=='skipped').sort((a,b)=>(dueOf(a)||'9999').localeCompare(dueOf(b)||'9999')||((a.dueOffset||0)-(b.dueOffset||0)));const undone=items.filter(i=>!doneNow(i));const toddler=isToddler();const taskSection=toddler?'검진·의료 일정':'서류·일정';return `<div class="inline"><h2 class="section-title">📅 다음 일정</h2><button class="secondary" data-action="export-ics">캘린더 내보내기</button></div>${due?`<p class="help-block">${toddler?'아이 출생일':'출산예정일'} ${escape(due)} 기준입니다. 개별 목표일은 편집할 수 있고, 검진 및 지원 정책의 법정 기한과는 다를 수 있습니다.</p>`:`<div class="warning">${toddler?'출생일':'출산예정일'}을 등록해야 정확한 날짜를 계산할 수 있습니다.</div>`}<div class="inline"><h3 class="subhead">미완료 준비 일정 ${undone.length}개</h3><button class="link-button" data-action="add" data-section="${taskSection}" data-kind="task">+ 일정 등록</button></div><div class="timeline">${undone.length?undone.map(i=>`<div class="card ${dueOf(i)&&daysUntil(dueOf(i))<0?'late':''}"><div class="inline"><strong>${escape(dueOf(i)||dueHint(i))}</strong><span class="chip">${escape(i.owner||'함께')}${repeatLabel(i)?' · '+repeatLabel(i):''}</span></div><div class="item-row"><input type="checkbox" class="item-check" data-action="toggle" data-id="${escape(i.id)}"><div class="item-main" data-action="edit" data-id="${escape(i.id)}"><div class="item-name">${escape(i.title)}</div><p class="muted-small">${escape(i.section)}</p></div><button class="mini-btn" data-action="edit" data-id="${escape(i.id)}">수정</button></div></div>`).join(''):'<div class="empty">남은 일정이 없습니다.</div>'}</div><p class="tiny-note">캘린더 파일(.ics)을 휴대폰에 가져오면 일회성 일정에 7일 전·1일 전 알림이 포함됩니다. 앱 자체에서 백그라운드 푸시를 보내지는 않습니다. 완료한 일회성 일정도 캘린더에 포함될 수 있으니 확인하세요.</p>`}
 function renderBudget(){const B=budget(),groups=S.data.sections.map(section=>({section,items:activeItems().filter(i=>i.section===section)})).filter(x=>x.items.length);const limit=Number(S.data.settings.budget)||0;return `<div class="inline"><h2 class="section-title">💳 지출·예산</h2><button class="link-button" data-action="route" data-route="home">홈으로</button></div><div class="kpis"><div class="kpi"><span>지출 완료</span><strong>${fmt(B.spent)}</strong><small>실제로 지출한 총액</small></div><div class="kpi accent"><span>추가 예상 지출</span><strong>${fmt(B.needed)}</strong><small>미완료 중 직접 입력된 예상액</small></div><div class="kpi"><span>현재 합산 전망</span><strong>${fmt(B.total)}</strong><small>실제 + 추가 예상</small></div><div class="kpi"><span>비용 미기입 항목</span><strong>${B.missing}개</strong><small>예산에서 제외된 준비물</small></div></div><p class="warning" style="margin-top:12px">${isToddler()?'과거 구매 이력은 가져오지 않았습니다.':'2025년 원본 시트의 참고가격은 현재 예산에 자동 합산하지 않습니다.'} 예상 구매금액을 입력하지 않은 ${B.missing}개는 추가 비용이 생길 수 있습니다.</p>${limit?`<div class="hero"><strong>설정 예산 ${fmt(limit)}</strong><p>현재 전망 대비 여유 ${fmt(limit-B.total)}</p><div class="progress-track"><div style="width:${Math.min(100,Math.round(B.total/limit*100))}%"></div></div></div>`:''}<h3 class="subhead">항목별 집계</h3>${groups.map(g=>{const spent=g.items.reduce((s,i)=>s+(Number(i.actual)||0),0),estimated=g.items.filter(i=>!doneNow(i)&&i.status!=='skipped'&&i.acquisition!=='gift'&&i.acquisition!=='already').reduce((s,i)=>s+(Number(i.estimate)||0),0);return `<div class="card budget-row"><div><b>${escape(g.section)}</b><br><small>${g.items.length}개 항목</small></div><div class="right"><strong>${fmt(spent)}</strong><br><small>추가 예상 ${fmt(estimated)}</small></div></div>`}).join('')}<button class="secondary" data-action="export-csv">비용 CSV 추출</button><p class="tiny-note">CSV는 복호화된 개인정보가 포함될 수 있으므로 공개 GitHub 저장소에 올리지 마세요.</p>`}

 function recommendFor(item){
   if(!item||item.type!=='item')return null;
   const entries=productRecommendations().filter(e=>e.stage===(isToddler()?'toddler':'newborn'));
   if(item.recommendationId){
     const direct=entries.find(e=>e.id===item.recommendationId);
     if(direct)return direct;
   }
   const title=String(item.title||'');
   return entries.find(e=>(e.match||[]).some(x=>title.includes(x)))||null;
 }
 function recommendationAge(entry){
   if(!entry)return {ready:false,label:'추천 정보 없음',months:null};
   const months=isToddler()?ageInMonths(S.data.settings.dueDate):(ageInMonths(S.data.settings.birthDate)??0);
   if(isToddler()&&months===null)return {ready:false,label:'출생일 등록 후 확인',months:null};
   if(months<entry.minMonths)return {ready:false,label:entry.minMonths+'개월부터',months};
   if(entry.maxMonths!=null&&months>entry.maxMonths)return {ready:false,label:'적정 시기 지남',months};
   return {ready:true,label:'현재 '+months+'개월 추천',months};
 }
 function recommendedCandidate(item,entry){
   const age=recommendationAge(entry);
   return age.ready?(entry.candidates||[]).find(c=>c.minMonths<=age.months)||null;
 }
 function recommendationLine(item){
   if(item.type!=='item')return '';
   const rec=recommendFor(item);
   if(!rec)return '';
   const age=recommendationAge(rec),candidate=recommendedCandidate(item,rec);
   const recommendation=candidate?.name||((rec.candidates||[])[0]?.name||'선택 기준 확인');
   return `<div class="item-recommendation ${age.ready?'ready':'future'}"><span>추천 후보</span><strong>${escape(recommendation)}</strong><em>${escape(age.label)}</em></div>`;
 }
 function recommendationOverview(){
   const covered=activeItems().filter(i=>canRecommendProduct(i)&&recommendFor(i));
   const now=covered.filter(i=>recommendationAge(recommendFor(i)).ready);
   const later=covered.length-now.length;
   const hasBirthday=!!S.data.settings.dueDate;
   return `<div class="reco-overview"><div><strong>🛒 ${isToddler()?'아이 월령에 맞춘':'출산 준비'} 구매 후보</strong><p>${isToddler()&&!hasBirthday?'출생일을 설정하면 월령별 추천 시기가 표시됩니다.':`지금 검토 ${now.length}개 · 이후 단계 ${later}개`} · 보유 중이면 제외</p></div><button type="button" class="mini-btn" data-action="route" data-route="reco">후보 전체</button></div>`;
 }
 function renderReco(){
   const R=catalog(),entries=productRecommendations().filter(e=>e.stage===(isToddler()?'toddler':'newborn'));
   const rows=entries.map(rec=>{
     const age=recommendationAge(rec),target=activeItems().find(i=>recommendFor(i)?.id===rec.id);
     const goods=(R.curatedGoods||[]).find(x=>x.recId===rec.id);
     const exists=goods&&S.data.items.some(i=>i.id==='curated-'+goods.id||i.title===goods.title);
     const candidates=(rec.candidates||[]).map(c=>`<div class="reco-option"><div><strong>${escape(c.name)}</strong><p>${escape(c.why)}</p><small>${escape(c.source)}</small></div><a href="${escape(safeUrl(c.url))}" target="_blank" rel="noopener noreferrer">제품 정보 ↗</a>${target&&age.ready&&age.months>=c.minMonths?`<button class="mini-btn" type="button" data-action="recommend-item" data-id="${escape(target.id)}">후보 선택</button>`:''}</div>`).join('');
     return `<article class="card recommendation-card"><div class="reco-title"><strong>${escape(rec.match?.[0]||rec.id)}</strong><span class="${age.ready?'reco-now':'reco-later'}">${escape(age.label)}</span></div><p>${escape(rec.reason)}</p>
       ${candidates||'<p class="muted-small">구체적인 판매 모델은 아직 선정하지 않았습니다. 연령·안전 조건을 먼저 확인하세요.</p>'}
       ${goods&&!exists?`<button class="secondary" type="button" data-action="catalog-add" data-catalog="${escape(goods.id)}">+ 체크리스트에 추가</button>`:''}</article>`;
   }).join('');
   return `<div class="inline"><h2 class="section-title">🛍️ 월령별 구매 후보</h2><button class="link-button" data-action="route" data-route="all">체크리스트</button></div><p class="muted-small">${escape(R.updatedAt)} 확인 · ${escape(R.note)}</p>${rows}`;
 }
 function renderSettings(){const st=S.data.settings;return `<h2 class="section-title">⚙️ 가족 설정</h2><p class="muted-small">아이 정보와 거주지를 한 번만 등록하면 일정과 혜택에 적용됩니다.</p><form id="settingsForm" class="stack"><label class="field">${isToddler()?'아이 출생일 (한 번 등록 · 모든 월령 일정 자동 계산)':'출산예정일'}<input name="dueDate" type="date" value="${escape(st.dueDate||'')}"></label><label class="field">${isToddler()?'아이 이름(선택)':'아기 태명(선택)'}<input name="babyName" maxlength="60" value="${escape(st.babyName||'')}" placeholder="${isToddler()?'우리 아이':'태명'}"></label>${!isToddler()?`<label class="field">출산 후 실제 아기 출생일 (출생한 경우)<input name="birthDate" type="date" value="${escape(st.birthDate||'')}"></label>`:''}<div class="settings-region"><label class="field">거주 지역 (혜택 추천 기준)<select name="residenceRegion"><option value="unknown" ${!['seoul','gyeonggi','other'].includes(st.residenceRegion)?'selected':''}>아직 선택 안 함 · 전국 혜택</option><option value="seoul" ${st.residenceRegion==='seoul'?'selected':''}>서울특별시</option><option value="gyeonggi" ${st.residenceRegion==='gyeonggi'?'selected':''}>경기도</option><option value="other" ${st.residenceRegion==='other'?'selected':''}>그 외 지역 · 전국 혜택 + 지자체 확인</option></select></label><label class="field">시·군·구 (선택)<input name="residenceCity" maxlength="40" value="${escape(st.residenceCity||'')}" placeholder="예: 성남시, 관악구"></label><p class="tiny-note">설정값은 이 부부 공간에 암호화 저장합니다. 지역을 바꿔도 기존 혜택 확인 기록은 삭제하지 않습니다.</p></div><label class="field">준비 예산 (원)<input name="budget" type="number" min="0" step="100" value="${Number(st.budget)||0}"></label><button class="primary" type="submit">설정 저장</button></form><details class="settings-advanced"><summary>체크리스트 분류 관리</summary><form id="sectionForm" class="inline"><input name="section" class="control" maxlength="25" placeholder="예: 생후 1개월 준비"><button class="secondary" type="submit">분류 추가</button></form><div class="card">${S.data.sections.map(s=>`<div class="budget-row"><strong>${escape(s)}</strong><button class="mini-btn" data-action="section-remove" data-section="${escape(s)}">삭제</button></div>`).join('')}</div><p class="tiny-note">분류 삭제 시 해당 분류에 항목이 남아 있으면 삭제되지 않습니다. 다른 탭으로 물품을 옮긴 후 삭제할 수 있습니다.</p></details><details class="settings-advanced"><summary>예산·제품·데이터 관리</summary><h3 class="subhead">부가 기능</h3><button class="secondary" data-action="route" data-route="benefits">🎁 가족 지원금·혜택 확인</button><div class="list-actions"><button class="secondary" data-action="route" data-route="budget">지출 상세</button><button class="secondary" data-action="route" data-route="reco">제품 추천 참고</button></div><h3 class="subhead">🔐 데이터 보호·백업</h3><div class="stack"><button class="secondary" data-action="export">암호화 백업 파일 저장</button><button class="secondary" data-action="import-backup">암호화 백업 불러오기</button><input id="backupFile" class="hidden" type="file" accept=".json,application/json"><button class="secondary" data-action="sync">서버 최신 자료 동기화</button><button class="secondary" data-action="export-ics">일정 캘린더(.ics) 내보내기</button><button class="danger" data-action="lock">현재 기기 잠그기</button></div><p class="warning">PIN을 잊으면 서버 관리자도 기록을 복호화할 수 없습니다. 암호화 백업만으로는 복원할 수 없으며 기존 PIN이 필요합니다. 다른 사람에게 PIN을 공개하지 마세요.</p></details><p class="muted-small">v${escape(CONFIG.version||'0.9.0')} · 현재 모드: ${S.backend?'Google Sheets 서버 동기화':'로컬 미리보기'} · 가족 공간 ${escape(FAMILY[S.family])}</p>`}
 function canRecommendProduct(item){
   return !!item&&item.type==='item'&&!/(지원금|지원사업|지원|수당|바우처|급여|보험|의료|검진|접종|행정|신청|서류|휴가|돌봄비|예약|상담|정부|정책|교육비|등록|수급|복지|출산신고)/.test(String(item.title||''));
 }
 function openEditor(id,section,kind){const original=activeItems().find(x=>x.id===id);const i=original?{...original}:{id:uid(),title:'',section:section||S.data.sections[0],type:kind||(/일정|검진|지원|행정|할 일/.test(section||'')?'task':'item'),status:'pending',acquisition:'undecided',quantity:1,estimate:0,actual:0,referencePrice:0,referenceUrl:'',product:'',giver:'',owner:'함께',priority:'normal',dueMonth:null,dueOffset:isToddler()?null:-30,dueDate:'',repeat:'none',lastDoneDate:'',notes:'',updatedAt:0,deleted:false};
   const opt=(arr,v)=>arr.map(([value,label])=>`<option value="${escape(value)}" ${v===value?'selected':''}>${escape(label)}</option>`).join('');
   modal(original?'항목 수정':'준비물·일정 추가',`<form id="itemForm"><input type="hidden" name="id" value="${escape(i.id)}"><div class="info-grid"><label class="field full">준비 항목명<input name="title" value="${escape(i.title)}" maxlength="120" required autofocus placeholder="예: 기저귀"></label><label class="field">분류<select name="section">${opt(S.data.sections.map(x=>[x,x]),i.section)}</select></label><label class="field">유형<select name="type">${opt([['item','물품'],['task','할 일·일정']],i.type)}</select></label><label class="field">현재 상태<select name="status">${opt([['pending','미완료'],['done','완료'],['skipped','제외']],i.status)}</select></label><label class="field">준비 방법<select name="acquisition">${opt([['undecided','미정'],['buy','직접 구매'],['gift','가족에게 받기'],['second','중고 구매'],['rental','대여'],['already','집에 있음']],i.acquisition)}</select></label></div><fieldset class="form-section"><legend>비용 · 일정</legend><div class="info-grid"><label class="field">예상 구매비 (총액, 원)<input name="estimate" type="number" min="0" step="1" value="${Number(i.estimate)||0}"></label><label class="field">실제 지출액 (총액, 원)<input name="actual" type="number" min="0" step="1" value="${Number(i.actual)||0}"></label><label class="field">개별 마감일(우선 적용)<input name="dueDate" type="date" value="${escape(i.dueDate||'')}"></label><label class="field full">메모<textarea name="notes" rows="2" maxlength="1500">${escape(i.notes||'')}</textarea></label></div></fieldset><details class="editor-more"><summary>추가 정보 · 담당, 수량, 제품, 목표 월령, 반복, 링크</summary><p class="tiny-note">아기 출생일·출산예정일은 설정에서 한 번 입력합니다. 여기의 월령은 개별 항목의 목표 시점입니다.</p><div class="info-grid"><label class="field">반복<select name="repeat">${opt([['none','반복 없음'],['daily','매일'],['weekly','매주'],['monthly','매월']],i.repeat||'none')}</select></label><label class="field">담당<select name="owner">${opt([['함께','함께'],['남편','남편'],['아내','아내']],i.owner)}</select></label><label class="field">수량<input name="quantity" type="number" min="1" max="10000" value="${Number(i.quantity)||1}"></label><label class="field full">제품명 / 모델명<input name="product" maxlength="180" value="${escape(i.product||'')}" placeholder="예: 모델명 또는 브랜드"></label><label class="field full">받을 사람 또는 제공해 주는 가족<input name="giver" maxlength="120" value="${escape(i.giver||'')}" placeholder="예: 형님 / 부모님"></label>${isToddler()?`<label class="field">출생일 기준 목표 월령 (개월)<input name="dueMonth" type="number" min="0" max="120" value="${i.dueMonth==null?'':Number(i.dueMonth)}"></label>`:''}<label class="field">${isToddler()?'출생일 기준 +일(선택)':'출산예정일 기준(일)'}<input name="dueOffset" type="number" min="-300" max="3000" value="${i.dueOffset==null?'':Number(i.dueOffset)}"></label><label class="field full">제품 / 구매 링크<input name="referenceUrl" type="url" value="${escape(i.referenceUrl||'')}" placeholder="https://..."></label></div><p class="hint">원본 기록의 참고 가격 ${fmt(i.referencePrice||0)} · 과거 자료이며 예상 예산에 자동 반영하지 않습니다.</p></details><div class="form-actions editor-sticky-actions"><button type="submit" class="primary">변경 저장</button><button type="button" class="secondary" data-action="close">취소</button></div>${original?`<div class="form-actions"><button type="button" class="danger" data-action="delete" data-id="${escape(i.id)}">항목 삭제</button>${canRecommendProduct(i)?`<button type="button" class="secondary" data-action="recommend-item" data-id="${escape(i.id)}">${recommendFor(i)?.candidates?.length?'제품 후보 보기':'구매 기준 보기'}</button>`:''}</div>`:''}</form>`)
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
 function showItemReco(id){
   const item=activeItems().find(i=>i.id===id);
   if(!canRecommendProduct(item))return toast('지원금·행정·검진 항목에는 제품 추천을 제공하지 않습니다.');
   const rec=recommendFor(item);
   if(!rec)return modal('제품 정보 · '+item.title,'<p class="muted-small">검증된 구매 후보가 아직 없습니다. 연령과 현재 보유품을 확인한 뒤 제품명을 직접 입력해 주세요.</p>');
   const age=recommendationAge(rec);
   const choices=(rec.candidates||[]).map((c,index)=>{
     const available=age.ready&&age.months>=c.minMonths;
     return `<div class="reco-choice"><strong>${escape(c.name)}</strong><p>${escape(c.why)}</p><p class="muted-small">${escape(c.source)} · ${c.minMonths}개월+</p><div class="form-actions"><a class="secondary reco-open-link" href="${escape(safeUrl(c.url))}" target="_blank" rel="noopener noreferrer">제품 상세 보기 ↗</a><button type="button" class="primary" data-action="reco-use" data-id="${escape(item.id)}" data-candidate="${index}" ${available?'':'disabled'}>${available?'이 후보로 선택':age.label}</button></div></div>`;
   }).join('');
   modal('추천 구매 후보 · '+item.title,`<p class="reco-age-note">${escape(age.label)} · ${escape(rec.reason)}</p>${choices||'<p class="muted-small">구체적인 모델은 아직 선정하지 않았습니다. 제조사의 월령·안전 기준을 확인하세요.</p>'}<p class="tiny-note">후보를 선택하면 제품명과 참고 링크만 입력됩니다. 구매 완료·실제 지출액은 변경되지 않습니다. 재고와 판매가는 구매 시 다시 확인하세요.</p>`);
 }
 function chooseRecommendedProduct(id,index){
   const item=S.data.items.find(i=>i.id===id&&!i.deleted);
   const rec=recommendFor(item),candidate=rec?.candidates?.[index];
   const age=recommendationAge(rec);
   if(!canRecommendProduct(item)||!candidate||!age.ready||age.months<candidate.minMonths)return toast('해당 월령에 맞는 상품만 선택할 수 있습니다.');
   if(item.product&&item.product!==candidate.name&&!confirm('기존 제품명을 다른 후보로 변경하시겠습니까?'))return;
   item.product=candidate.name;
   item.referenceUrl=safeUrl(candidate.url);
   item.updatedAt=stamp();
   closeModal();markDirty();toast('구매 후보를 입력했습니다. 구매 완료 처리하지 않았습니다.');
 }
 function addCuratedGood(id){
   if(!isToddler())return;
   const entry=(catalog().curatedGoods||[]).find(x=>x.id===id);
   if(!entry||!S.data.sections.includes(entry.section))return;
   if(S.data.items.some(i=>i.id==='curated-'+id||i.title===entry.title))return toast('이미 목록에 있는 항목입니다.');
   S.data.items.push(buildCuratedItem(entry));markDirty();toast('추천 물품을 체크리스트에 추가했습니다.');
 }
 function download(filename,blob){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
 async function exportEncrypted(){if(!S.data||!S.key)return toast('잠금 해제 후 사용하세요.');const cipher=await encryptPayload(S.data);download('baby-prep-'+S.family+'-'+today()+'.encrypted.json',new Blob([JSON.stringify({family:S.family,exportedAt:new Date().toISOString(),salt:S.authSalt,cipher,revision:S.revision,pending:S.generation>S.savedGeneration},null,2)],{type:'application/json'}));toast('현재 기록을 암호화 백업했습니다.')}
 async function importEncryptedFile(file){if(!S.data||!S.key)return;try{if(file.size>1500000)throw Error('백업 크기는 1.5MB 이하여야 합니다.');const backup=JSON.parse(await file.text());if(backup.family!==S.family||backup.salt!==S.authSalt||typeof backup.cipher!=='string')throw Error('다른 가족 공간이거나 암호화 키가 다른 백업입니다.');const recovered=await decryptPayload(backup.cipher);if(!Array.isArray(recovered.items)||!Array.isArray(recovered.sections))throw Error('올바른 백업 기록이 아닙니다.');if(!confirm('현재 화면의 기록을 백업 내용으로 바꾸시겠습니까? 서버 충돌이 발생하면 저장이 멈추고 선택할 수 있습니다.'))return;S.data=recovered;markDirty();toast('백업 복원 후 암호화 동기화 중');}catch(e){toast('백업 불러오기 실패: '+e.message)}}
 function csv(v){return '"'+String(v??'').replaceAll('"','""')+'"'}
 function exportCSV(){const lines=[['구분','품목','상태','구비방법','제품','제공자','수량','예상가격','실제지출','마감일','담당','반복'].map(csv).join(',')];activeItems().forEach(i=>lines.push([i.section,i.title,i.status,acquisitionText(i.acquisition),i.product,i.giver,i.quantity,i.estimate,i.actual,dueOf(i),i.owner,repeatLabel(i)].map(csv).join(',')));download('baby-prep-budget-'+today()+'.csv',new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}))}
 function exportICS(){const active=activeItems().filter(i=>i.type==='task'&&dueOf(i)&&i.status!=='skipped');if(!active.length)return toast('날짜가 있는 일정이 없습니다. 먼저 기준일을 입력하세요.');const escICS=s=>String(s||'').replaceAll('\\','\\\\').replaceAll(';','\\;').replaceAll(',','\\,').replaceAll('\n','\\n');const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Baby Prep//KR//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];for(const i of active){const d=dueOf(i).replaceAll('-',''),next=isoDate(addDays(dateValue(dueOf(i)),1)).replaceAll('-','');lines.push('BEGIN:VEVENT','UID:'+i.id+'@baby-prep.local','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z'),'DTSTART;VALUE=DATE:'+d,'DTEND;VALUE=DATE:'+next,'SUMMARY:'+escICS(i.title),'DESCRIPTION:'+escICS(i.notes||i.section),'BEGIN:VALARM','TRIGGER:-P7D','ACTION:DISPLAY','DESCRIPTION:일정 7일 전','END:VALARM','BEGIN:VALARM','TRIGGER:-P1D','ACTION:DISPLAY','DESCRIPTION:일정 하루 전','END:VALARM','END:VEVENT')}lines.push('END:VCALENDAR');download('baby-prep-calendar.ics',new Blob([lines.join('\r\n')],{type:'text/calendar;charset=utf-8'}))}
 async function clickAction(e){const el=e.target.closest('[data-action]');if(!el)return;const action=el.dataset.action,id=el.dataset.id,section=el.dataset.section;try{switch(action){
  case 'route':if(el.dataset.route==='settings'&&S.route!=='settings')S.previousRoute=S.route;S.route=el.dataset.route;S.search='';S.filter='all';render();break;
  case 'benefit-filter':S.benefitFilter=el.dataset.filter==='all'?'all':'relevant';render();break;
  case 'add':openEditor(null,section,el.dataset.kind);break;
  case 'quick-add':S.route='all';S.sectionFilter=S.data.sections.includes(section)?section:'all';S.filter='all';S.search='';render();byId('quickTitle')?.focus();break;
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
  case 'reco-use':chooseRecommendedProduct(id,Number(el.dataset.candidate));break;
  case 'catalog-add':addCuratedGood(el.dataset.catalog);break;
  case 'section-remove':if(S.data.sections.length<=1)return toast('최소 한 개 탭이 필요합니다.');if(activeItems().some(i=>i.section===section))return toast('해당 탭의 항목을 먼저 다른 탭으로 옮기세요.');if(confirm('이 탭을 삭제하시겠습니까?')){S.data.sections=S.data.sections.filter(s=>s!==section);S.route='home';markDirty()}break;
 }}catch(err){toast(err.message)}}
 function submitAction(e){
   const formId=e.target.getAttribute('id');
   if(formId==='itemForm')return saveEditor(e);
    if(formId==='quickAddForm')return saveQuickAdd(e);
   if(formId==='settingsForm'){e.preventDefault();const f=new FormData(e.target);S.data.settings={...S.data.settings,dueDate:String(f.get('dueDate')||''),birthDate:String(f.get('birthDate')||''),babyName:String(f.get('babyName')||'').trim(),residenceRegion:['seoul','gyeonggi','other'].includes(String(f.get('residenceRegion')))?String(f.get('residenceRegion')):'unknown',residenceCity:String(f.get('residenceCity')||'').trim().slice(0,40),budget:Math.max(0,Number(f.get('budget'))||0)};markDirty();toast('설정과 가족별 혜택 기준을 저장했습니다.');return}
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
   document.addEventListener('change',e=>{
     if(e.target.matches('.benefit-status-select')){
       const value=e.target.value,code=e.target.dataset.benefit;
       if(!saveBenefitStatus(code,value))return;
       // 카드/선택 입력을 새로 그리지 않아 현재 스크롤과 사용자 포커스를 유지한다.
       updateBenefitSummary();
       markDirty(false);
       toast('진행 상태 변경 · 암호화 자동 저장 중');
       return;
     }
     if(e.target.id==='listFilter'){S.filter=e.target.value;render()}if(e.target.id==='sectionFilter'){S.sectionFilter=e.target.value;S.route='all';render()}if(e.target.id==='backupFile'&&e.target.files?.[0]){importEncryptedFile(e.target.files[0]);e.target.value=''}});
   byId('modalClose').addEventListener('click',closeModal);byId('modal').addEventListener('click',e=>{if(e.target===byId('modal')&&!S.conflict)closeModal()});
   byId('lockBtn').addEventListener('click',()=>clickAction({target:{closest:()=>({dataset:{action:'lock'}})}}));
   byId('settingsBtn').addEventListener('click',()=>{
     if(S.route==='settings')S.route=S.previousRoute&&S.previousRoute!=='settings'?S.previousRoute:'home';
     else {S.previousRoute=S.route;S.route='settings';}
     render();
   });
   document.addEventListener('visibilitychange',()=>{if(!document.hidden&&S.data&&S.generation===S.savedGeneration&&S.backend&&!S.conflict)refreshFromServer()});
   window.addEventListener('beforeunload',e=>{if(S.data&&S.generation>S.savedGeneration){e.preventDefault();e.returnValue=''}});
 }
 async function init(){if(!window.crypto?.subtle){byId('authMessage').textContent='안전한 연결(HTTPS)에서 열어주세요. file:// 대신 로컬 서버 또는 GitHub Pages를 사용하세요.';return}selectFamily(readPreferredFamily());bind();Bridge.start();await refreshMeta()}
 init();
})();