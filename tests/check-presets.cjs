/* GitHub 저장소에서 실행: node tests/check-presets.cjs
 * 네트워크 없이 프리셋 구성 및 월령 기반 일정/가족 예산 로직 검증.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const ctx={console,TextEncoder,TextDecoder,crypto:crypto.webcrypto,
 btoa:s=>Buffer.from(s,'binary').toString('base64'),
 atob:s=>Buffer.from(s,'base64').toString('binary'),
 window:{BABY_PREP_CONFIG:{},addEventListener(){}},
 setTimeout,clearTimeout,Date,Uint8Array,URL,Math};
vm.createContext(ctx);
for(const f of ['seed.js','toddler-seed.js','recommendations.js','benefits.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
const source=fs.readFileSync(path.join(root,'app.js'),'utf8');
assert(source.includes(' init();\n})();'),'앱 시작 진입점을 찾지 못했습니다. 테스트 스크립트를 확인하세요.');
vm.runInContext(source.replace(' init();\n})();',' globalThis.__testHooks={S,dueOf,budget,addMonthsClamped,ageInMonths,readPreferredFamily,selectFamily,quickNewItem,renderTabs,renderChecklistProgress,renderHome,babyProfileSummary,canRecommendProduct,modal,closeModal,openEditor,cleanData,reconcileToddlerCatalog,recommendFor,recommendationAge,recommendationLine,renderReco,isRetiredPristine,benefitContext,benefitVisible,benefitDue,benefitState,benefitStats,renderBenefits,benefitCard,saveBenefitStatus,refreshMeta,submitAuth,derive,encryptPayload,storageSet,cacheKey,refreshFromServer,Bridge};\n})();'),ctx);
const newborn=vm.runInContext('babyPrepInitialData()',ctx);
const roadmap=vm.runInContext('babyPrepToddlerData()',ctx);
const hooks=ctx.__testHooks;
assert.equal(newborn.items.length,90);
assert.equal(roadmap.items.length,27);
assert.equal(roadmap.items.filter(i=>i.type==='task').length,16);
assert.equal(roadmap.items.filter(i=>i.type==='item').length,11);
assert(roadmap.items.every(i=>i.repeat==='none'));
assert.equal(roadmap.settings.babyName,'');
assert.equal(roadmap.settings.dueDate,'');
assert(!roadmap.items.some(x=>x.title==='친척에게 받을 물품·중고 물품 목록 정리'),'의미 없는 가족 물품 정리 태스크 제거');
assert(!roadmap.items.some(x=>x.title==='분기별 큰 육아 지출·예산 계획'),'중복된 추상적 예산 계획 제거');
assert(roadmap.items.some(x=>x.recommendationId==='first-cars'),'18개월 이상 자동차 구매 후보를 실제 체크리스트에 포함');
assert(roadmap.items.some(x=>x.recommendationId==='magnetic-36'&&x.dueMonth===36),'자석 블록은 36개월 이후에만 검토');

assert.equal(hooks.addMonthsClamped(new Date('2024-01-31T12:00:00'),1).getDate(),29);
hooks.S.data=roadmap;
hooks.S.data.settings.dueDate='2024-01-31';
const a=roadmap.items.find(i=>i.title.startsWith('4차 영유아'));
assert.equal(hooks.dueOf(a),'2025-12-31'); // 생후 23개월
const price=roadmap.items.find(i=>i.type==='item');
price.actual=12000;price.estimate=35000;price.acquisition='buy';
assert.equal(hooks.budget().spent,12000);
assert.equal(hooks.budget().needed,35000);
price.acquisition='gift';assert.equal(hooks.budget().needed,0);
// 기기별 가족 선택 복원: 선택 코드는 로컬에 저장하지만 PIN은 저장하지 않는다.

// Curated catalog shows actual product names and age-gates rather than generic request-copy buttons.
const firstCar=roadmap.items.find(x=>x.recommendationId==='first-cars');
const futureMagnet=roadmap.items.find(x=>x.recommendationId==='magnetic-36');
const baseDate=new Date();
const birthday=new Date(baseDate.getFullYear(),baseDate.getMonth()-20,1);
hooks.S.data.settings.dueDate=[birthday.getFullYear(),String(birthday.getMonth()+1).padStart(2,'0'),String(birthday.getDate()).padStart(2,'0')].join('-');
const carCatalog=hooks.recommendFor(firstCar);
assert.equal(carCatalog.candidates[0].name,'레고 듀플로 나의 첫 자동차 10474','실제 제조사 모델 제공');
assert(carCatalog.candidates[0].url.startsWith('https://www.lego.com/ko-kr/'),'제조사 공식 구매 정보 링크');
assert.equal(hooks.recommendationAge(carCatalog).ready,true,'20개월 유아에게 18개월 이상 자동차 후보 표시');
assert.equal(hooks.recommendationAge(hooks.recommendFor(futureMagnet)).ready,false,'20개월 유아에게 36개월 이상 자석 블록은 추천하지 않음');
assert(hooks.recommendationLine(firstCar).includes('레고 듀플로 나의 첫 자동차 10474'),'상품 이름이 체크리스트 행에 직접 나타남');
assert(hooks.renderReco().includes('제품 정보 ↗'),'제품 추천 화면에 실제 상품 링크');
assert(!hooks.canRecommendProduct({type:'item',title:'친척에게 받을 물품·중고 물품 목록 정리',section:'정부지원·행정'}),'행정 항목에는 상품 추천 금지');
// Legacy migration archives untouched seed placeholders, never overwrites modified notes/purchases.
const blank={id:'toddler-roadmap-22',title:'친척에게 받을 물품·중고 물품 목록 정리',section:'구매·예산',type:'task',status:'pending',acquisition:'undecided',quantity:1,actual:0,estimate:0,updatedAt:0,deleted:false};
const edited={...blank,id:'toddler-roadmap-custom-edit',notes:'내가 기록한 가족 수령 계획',updatedAt:1234};
const previousData=hooks.S.data;
hooks.S.data={...previousData,items:[...previousData.items,{...blank},{...edited}]};
assert.equal(hooks.reconcileToddlerCatalog(),true,'구버전 기본 태스크 자동 정리');
assert.equal(hooks.S.data.items.find(x=>x.id==='toddler-roadmap-22').deleted,true,'변경 없는 불필요한 태스크만 숨김');
assert.equal(hooks.S.data.items.find(x=>x.id===edited.id).deleted,false,'사용자가 직접 수정한 기존 기록은 보존');
assert.equal(hooks.reconcileToddlerCatalog(),false,'이미 적용된 추천은 중복 추가하지 않음');
hooks.S.data=previousData;

const lastFamilyKey='baby-prep-last-selected-family-v1';
const local=new Map();
ctx.localStorage={
 getItem:key=>local.has(key)?local.get(key):null,
 setItem:(key,value)=>local.set(key,value)
};
const choices=['ew-he','ce-hy','hr-yw'].map(family=>{
 const attrs={};
 const tokens=new Set();
 return {dataset:{family},classList:{toggle(name,on){on?tokens.add(name):tokens.delete(name)}},
   setAttribute:(name,value)=>{attrs[name]=value},attrs,tokens};
});
ctx.document={querySelectorAll:selector=>{assert.equal(selector,'.family-choice');return choices}};
assert.equal(hooks.readPreferredFamily(),'ew-he','기존 저장값 없으면 첫 번째 가족 기본 선택');
hooks.selectFamily('hr-yw',true);
assert.equal(hooks.S.family,'hr-yw');
assert.equal(local.get(lastFamilyKey),'hr-yw','선택한 가족 코드를 기기에 기록');
assert.equal(hooks.readPreferredFamily(),'hr-yw','새 방문 시 마지막 가족 복원');
assert.deepEqual(choices.map(x=>x.attrs['aria-pressed']),['false','false','true']);
hooks.selectFamily('ce-hy',true);
assert.equal(hooks.readPreferredFamily(),'ce-hy','가족 변경 시 마지막 값 갱신');
local.set(lastFamilyKey,'invalid-family');
assert.equal(hooks.readPreferredFamily(),'ew-he','알 수 없는 저장값은 기본 가족으로 복구');
hooks.selectFamily('invalid-family',true);
assert.equal(hooks.S.family,'ce-hy','알 수 없는 코드는 UI 가족을 변경하지 않음');
ctx.localStorage={getItem:()=>{throw Error('storage disabled')},setItem:()=>{throw Error('storage disabled')}};
assert.equal(hooks.readPreferredFamily(),'ew-he','스토리지 차단에서도 앱이 열려야 함');
hooks.selectFamily('hr-yw',true);
assert.equal(hooks.S.family,'hr-yw','스토리지 차단 시에도 수동 선택 가능');

const taskSection=roadmap.sections.find(name=>name.includes('일정'));
const goodsSection=roadmap.sections.find(name=>name.includes('구매'));
assert(taskSection&&goodsSection,'월령 로드맵에 일정/구매 분류가 있어야 함');
const task=hooks.quickNewItem('일정 테스트',taskSection);
const goods=hooks.quickNewItem('물품 테스트',goodsSection);
assert.equal(task.type,'task');
assert.equal(goods.type,'item');
assert.equal(goods.status,'pending');
assert.equal(goods.quantity,1);
assert.equal(goods.estimate,0);
assert.equal(goods.actual,0);
assert.equal(goods.dueMonth,null);
assert.equal(goods.notes,'');
assert.equal(hooks.ageInMonths('2999-01-01'),null,'미래 출생일은 유효한 월령으로 계산하지 않음');
const todayLocal=new Date(),currentDate=[todayLocal.getFullYear(),String(todayLocal.getMonth()+1).padStart(2,'0'),String(todayLocal.getDate()).padStart(2,'0')].join('-');
assert.equal(hooks.ageInMonths(currentDate),0,'오늘 태어난 아이는 생후 0개월');
const ui={topTabs:{innerHTML:''},modalTitle:{textContent:''},modalBody:{innerHTML:''},modal:{classList:{remove(){}}}};
ctx.document.getElementById=id=>ui[id]||null;
hooks.S.route='home';
hooks.renderTabs();
assert.equal((ui.topTabs.innerHTML.match(/data-route=/g)||[]).length,4,'상단 내비게이션 네 개');
assert(!source.includes('getElementById(\'bottomNav\')'),'하단 내비게이션 렌더링 없음');
const homepage=hooks.renderHome();
assert(!homepage.includes('role="progressbar"'),'홈에서는 체크 완료율을 노출하지 않음');
assert(homepage.includes('곧 확인할 일')&&homepage.includes('가족 혜택'),'홈은 예정된 일과 혜택을 우선 표시');
assert(hooks.renderChecklistProgress().includes('role="progressbar"'),'완료율은 체크리스트에서만 제공');
const probe=roadmap.items.find(item=>item.type==='task');
hooks.openEditor(probe.id);
for(const key of ['title','section','type','status','repeat','owner','acquisition','quantity','product','giver','estimate','actual','dueMonth','dueOffset','dueDate','referenceUrl','notes']) {
 assert(new RegExp('name="'+key+'"').test(ui.modalBody.innerHTML),'편집 폼 기존 필드 유지: '+key);
}
assert(ui.modalBody.innerHTML.includes('<details class="editor-more">'),'덜 쓰는 필드는 접힌 상세 보기로 유지');
assert(source.includes('id="quickAddForm"'),'빠른 한 줄 추가 지원');

// UX 1.3.2: no product suggestion on administrative or support-benefit tasks.
assert.equal(hooks.canRecommendProduct(probe),false,'검진·지원 일정은 제품 추천 대상이 아님');
assert.equal(hooks.canRecommendProduct({type:'item',title:'육아 지원금 신청'}),false,'잘못 물품으로 분류된 지원금도 제외');
const purchasing=roadmap.items.find(item=>item.type==='item'&&!/(지원|수당|검진|신청)/.test(item.title));
assert(purchasing,'구매 검토 물품 프리셋이 있어야 함');
assert.equal(hooks.canRecommendProduct(purchasing),true,'실제 물품은 제품 추천 제공');
assert(!ui.modalBody.innerHTML.includes('data-action="recommend-item"'),'지원·검진 일정 편집에서는 추천 버튼 삭제');
hooks.openEditor(purchasing.id);
assert(ui.modalBody.innerHTML.includes('data-action="recommend-item"'),'물품에서만 추천 버튼 제공');
// UX 1.3.2: home profile + compact metrics, no duplicated completion bar.
hooks.S.data.settings.babyName='검사 아이';
hooks.S.data.settings.dueDate='2025-03-23';
const profile=hooks.babyProfileSummary();
assert.equal(profile.name,'검사 아이','가족 설정 이름을 홈에 반영');
assert(profile.subtitle.includes('생후')&&profile.detail.includes('2025-03-23'),'출생일로부터 월령과 출생일 표시');
const profileHome=hooks.renderHome();
for(const name of ['준비 항목','완료','남은 준비','14일 내 확인','기록된 지출','추가 예상비']){
 assert(profileHome.includes(name),'홈 요약 지표: '+name);
}
assert(profileHome.includes('검사 아이'),'홈에 저장한 아이 이름 노출');
assert(!profileHome.includes('role="progressbar"'),'홈에 준비 완료율 막대를 다시 넣지 않음');
const modalCss=fs.readFileSync(path.join(root,'style.css'),'utf8');
assert(modalCss.includes('overscroll-behavior:contain')&&modalCss.includes('#modalBody{flex:1'),'모달 내부 스크롤만 허용');
const originalBody=ctx.document.body;
const fakeBody={style:{},classList:{add(){},remove(){}}};
ctx.document.body=fakeBody;
const previousModalClass=ui.modal.classList;
ui.modal.classList={add(){},remove(){}};
ctx.window.scrollY=130;
let restoredY=-1;
ctx.window.scrollTo=(x,y)=>{restoredY=y};
hooks.modal('스크롤', '<div>스크롤 검사</div>');
assert.equal(fakeBody.style.position,'fixed','편집창이 열린 동안 본문 페이지 스크롤 고정');
assert.equal(fakeBody.style.top,'-130px','모달 열 때 본문 원래 스크롤 좌표 보존');
hooks.closeModal();
assert.equal(fakeBody.style.position,'','모달 닫으면 본문 스크롤 잠금 해제');
assert.equal(restoredY,130,'모달 닫은 후 원래 위치 복원');
ctx.document.body=originalBody;
ui.modal.classList=previousModalClass;
console.log('PASS: modal background locked, support tasks hide recommendations, saved baby profile and 6 home KPIs');

const programs=ctx.window.BABY_PREP_BENEFITS;
assert(Array.isArray(programs)&&programs.length>=25,'지원금 목록은 20개 이상');
assert.equal(new Set(programs.map(x=>x.id)).size,programs.length,'혜택 ID 중복 불가');
assert(programs.every(x=>x.title&&x.desc&&x.source&&x.source.startsWith('https://')),'출처 및 조건 메모 필수');
assert(programs.every(x=>['all','seoul','gyeonggi'].includes(x.region)),'지역 코드는 제한');
const has=id=>programs.some(x=>x.id===id);
assert(has('seoul-grandparent')&&has('gyeonggi-family-care'),'서울·경기형 조부모 돌봄 지원 누락 불가');
assert(has('national-parent-benefit')&&has('national-first-meeting'),'부모급여/첫만남이용권 누락 불가');
const g=programs.find(x=>x.id==='seoul-grandparent');
const givenSeoul={region:'seoul',months:20,profile:'toddler',birthDate:'2025-03-23',dueDate:'2025-03-23',city:'서울'};
assert(hooks.benefitVisible(g,givenSeoul),'서울 거주자에게 손주돌봄수당 안내');
assert(!hooks.benefitVisible(g,{...givenSeoul,region:'gyeonggi'}),'타지역 전용 사업 제외');
assert.equal(hooks.benefitDue(g,givenSeoul),'2027-02-01','서울형 23개월 접수는 생일 당일 아닌 신청월 1일부터 확인');
const gyeonggi=programs.find(x=>x.id==='gyeonggi-family-care');
assert.equal(hooks.benefitDue(gyeonggi,{...givenSeoul,region:'gyeonggi'}),'2027-02-01','경기도도 전월 신청기간 안내');
assert(hooks.benefitVisible(programs.find(x=>x.id==='national-first-meeting'),givenSeoul,true),'전체 단계에서 과거 출생 혜택 열람');
assert(!hooks.benefitVisible(programs.find(x=>x.id==='national-first-meeting'),givenSeoul,false),'현재 단계에서는 지난 출생 혜택 숨김');
const old=hooks.cleanData({profile:'toddler',settings:{dueDate:'2025-03-23'},sections:['A'],items:[]});
assert.deepEqual(Object.keys(old.benefits),[],'기존 사용자 혜택 기록 없으면 새 컨테이너 구성');
assert.equal(old.settings.residenceRegion,'unknown','지역 미등록은 전국 프로그램만');
const restored=hooks.cleanData({...old,benefits:{'seoul-grandparent':{status:'review',updatedAt:123}}});
assert.equal(restored.benefits['seoul-grandparent'].status,'review','기존 사용자 체크 상태 유지');
hooks.S.data=restored;
hooks.S.data.settings.residenceRegion='seoul';
assert(hooks.benefitStats().relevant.some(x=>x.id==='seoul-grandparent'),'해당 지역 돌봄지원 반영');
assert.equal(hooks.benefitState('seoul-grandparent'),'review','기록 상태 보존');
const monthly=programs.find(x=>x.id==='seoul-grandparent-monthly');
assert(monthly&&monthly.monthly,'서울 월별 손주돌봄 확인');
const currentMonthKey=new Date().toISOString().slice(0,7);
const previous=new Date();previous.setUTCMonth(previous.getUTCMonth()-1);
const pastMonthKey=previous.toISOString().slice(0,7);
hooks.S.data.benefits[monthly.id]={status:'pending',monthly:{[pastMonthKey]:'done'},updatedAt:123};
assert.equal(hooks.benefitState(monthly.id),'pending','지난달 완료를 이번달 완료로 간주하지 않음');
hooks.S.data.benefits[monthly.id].monthly[currentMonthKey]='review';
assert.equal(hooks.benefitState(monthly.id),'review','현재 월 활동 점검 상태 반영');
assert.equal(hooks.S.data.benefits[monthly.id].monthly[pastMonthKey],'done','과거 돌봄 증빙 이력 보존');

hooks.S.data.settings.residenceRegion='other';
assert(!hooks.benefitStats().relevant.some(x=>x.id==='seoul-grandparent'),'지역 변경 시 노출만 바뀜');
assert.equal(hooks.benefitState('seoul-grandparent'),'review','지역 변경이 과거 완료 기록을 삭제하지 않음');

hooks.saveBenefitStatus('seoul-grandparent','pending'); // 먼저 기존 review 상태를 초기화해 신규 미확인 카드 렌더링을 검증
const firstCard=hooks.benefitCard(g,givenSeoul);
assert(firstCard.includes('내 진행 상태')&&firstCard.includes('benefit-status-select'),'상태는 단일 선택 입력으로 표시');
assert(firstCard.includes('value="pending" selected'),'신규 혜택은 미확인이 선택된 상태');
assert(firstCard.includes('공식 안내 열기 ↗'),'실제 신청 안내 링크를 별도 표시');
assert(!firstCard.includes('data-action="benefit-status"'),'완료를 기본 강조하는 액션 버튼 제거');
assert(hooks.saveBenefitStatus('seoul-grandparent','review'),'진행 상태 변경 성공');
assert.equal(hooks.benefitState('seoul-grandparent'),'review','선택한 진행 상태가 가족 데이터에 즉시 반영');
assert(hooks.saveBenefitStatus('seoul-grandparent','pending'),'미확인으로 되돌리는 동작');
assert.equal(hooks.benefitState('seoul-grandparent'),'pending');
assert.equal(hooks.saveBenefitStatus('seoul-grandparent','impossible'),false,'잘못된 상태값 차단');

const view=hooks.renderBenefits();
assert(view.includes('가족 혜택')&&view.includes('공식 안내'),'혜택 화면 및 공식 출처 표시');
console.log('PASS: 25 benefits, national + Seoul + Gyeonggi, age/stage/area gates, month-start deadline, safe legacy migration');
console.log('PASS: top-only navigation, checklist-only progress, task-first home, compact editing');
console.log('PASS: newborn 90, curated toddler 27, month dates, cost, per-device family selection and recovery');

async function testInstantLocalUnlock(){
  // Derive the same AES-GCM key used in production without weakening PBKDF2.
  const fixedSalt=Buffer.from('0123456789abcdef').toString('base64');
  const pin='5731';
  const derived=await hooks.derive(pin,fixedSalt);
  hooks.S.family='hr-yw';hooks.S.data=roadmap;hooks.S.key=derived.key;hooks.S.authToken=derived.authToken;
  const encrypted=await hooks.encryptPayload(hooks.S.data);
  const cacheKey=hooks.cacheKey();
  local.set(cacheKey,JSON.stringify({cipher:encrypted,revision:8,salt:fixedSalt,pending:false}));
  hooks.S.data=null;hooks.S.key=null;hooks.S.authToken='';hooks.S.revision=0;hooks.S.backend=true;hooks.S.generation=0;hooks.S.savedGeneration=0;hooks.S.setup=false;
  const classSet=()=>{const values=new Set();return {add:x=>values.add(x),remove:x=>values.delete(x),contains:x=>values.has(x),toggle:(x,on)=>{on?values.add(x):values.delete(x)}}};
  const nodes={...ui};
  for(const id of ['authScreen','mainScreen','authSubmit','authMode','authMessage','inviteWrap','passwordAgainWrap','pinLabel','pinPrimaryDisplay','pinConfirmDisplay','authProgress','authProgressText','passwordInput','passwordAgainInput','inviteInput','familyTitle','syncStatus','syncMini','syncMiniActivity','settingsBtn','topTabs','mainContent','toast']){
    if(!nodes[id])nodes[id]={};
    nodes[id].classList=classSet();
    nodes[id].querySelectorAll=()=>[];
    nodes[id].setAttribute=()=>{};
    nodes[id].style={};
    nodes[id].value='';
  }
  nodes.authScreen.classList.remove('hidden');nodes.mainScreen.classList.add('hidden');
  ctx.document.getElementById=id=>nodes[id]||null;
  // Bridge never resolves: the UI must still unlock from a decryptable local cache.
  let serverCalls=0;
  hooks.Bridge.call=()=>{serverCalls++;return new Promise(()=>{})};
  await hooks.refreshMeta();
  assert.equal(serverCalls,0,'기기 캐시에 salt가 있으면 메타 API 대기 없이 PIN을 입력');
  assert.equal(hooks.S.authSalt,fixedSalt);
  assert.equal(hooks.S.setup,false);
  nodes.passwordInput.value=pin;
  await hooks.submitAuth({preventDefault(){}});
  assert.equal(nodes.mainScreen.classList.contains('hidden'),false,'서버 응답이 없어도 저장된 암호화 기록을 즉시 개방');
  assert.equal(nodes.authScreen.classList.contains('hidden'),true);
  assert.equal(hooks.S.revision,8);
  assert.equal(hooks.S.data.items.length,27,'캐시를 AES-GCM 복호화하여 정확한 가족 데이터 복원');
  assert.equal(serverCalls,1,'잠금 해제 뒤 최신 서버 자료를 백그라운드에서 확인');
  assert.equal(nodes.syncMini.dataset.state,'loading','서버 확인 중에는 완료 상태를 표시하지 않음');
  // Never claim server sync succeeded while backend call is still pending.
  assert(!nodes.syncMiniActivity.textContent.includes('완료'));
}
(async()=>{
 await testInstantLocalUnlock();
 console.log('PASS: PIN unlock from local AES-GCM cache before slow server reply; background sync remains pending');
})().catch(err=>{console.error(err);process.exitCode=1});
