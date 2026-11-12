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
for(const f of ['seed.js','toddler-seed.js','benefits.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
const source=fs.readFileSync(path.join(root,'app.js'),'utf8');
assert(source.includes(' init();\n})();'),'앱 시작 진입점을 찾지 못했습니다. 테스트 스크립트를 확인하세요.');
vm.runInContext(source.replace(' init();\n})();',' globalThis.__testHooks={S,dueOf,budget,addMonthsClamped,ageInMonths,readPreferredFamily,selectFamily,quickNewItem,renderTabs,renderNav,renderHeaderProgress,openEditor,cleanData,benefitContext,benefitVisible,benefitDue,benefitState,benefitStats,renderBenefits,benefitCard,saveBenefitStatus};\n})();'),ctx);
const newborn=vm.runInContext('babyPrepInitialData()',ctx);
const roadmap=vm.runInContext('babyPrepToddlerData()',ctx);
const hooks=ctx.__testHooks;
assert.equal(newborn.items.length,90);
assert.equal(roadmap.items.length,32);
assert.equal(roadmap.items.filter(i=>i.type==='task').length,22);
assert.equal(roadmap.items.filter(i=>i.type==='item').length,10);
assert(roadmap.items.every(i=>i.repeat==='none'));
assert.equal(roadmap.settings.babyName,'');
assert.equal(roadmap.settings.dueDate,'');
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
const ui={topTabs:{innerHTML:''},bottomNav:{innerHTML:''},headerProgress:{innerHTML:''},modalTitle:{textContent:''},modalBody:{innerHTML:''},modal:{classList:{remove(){}}}};
ctx.document.getElementById=id=>ui[id]||null;
hooks.S.route='home';
hooks.renderTabs();hooks.renderNav();hooks.renderHeaderProgress();
assert.equal((ui.topTabs.innerHTML.match(/data-route=/g)||[]).length,4,'상단 메뉴 네 개');
assert.equal((ui.bottomNav.innerHTML.match(/data-route=/g)||[]).length,4,'하단 메뉴 네 개');
assert(ui.headerProgress.innerHTML.includes('role="progressbar"'),'모든 화면 상단 진행률 구성');
const probe=roadmap.items.find(item=>item.type==='task');
hooks.openEditor(probe.id);
for(const key of ['title','section','type','status','repeat','owner','acquisition','quantity','product','giver','estimate','actual','dueMonth','dueOffset','dueDate','referenceUrl','notes']) {
 assert(new RegExp('name="'+key+'"').test(ui.modalBody.innerHTML),'편집 폼 기존 필드 유지: '+key);
}
assert(ui.modalBody.innerHTML.includes('<details class="editor-more">'),'덜 쓰는 필드는 접힌 상세 보기로 유지');
assert(source.includes('id="quickAddForm"'),'빠른 한 줄 추가 지원');
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
console.log('PASS: 4 tabs, always-visible progress, quick add defaults, collapsed editor preserves fields, baby age from settings');
console.log('PASS: newborn 90, toddler 32, month dates, cost, per-device family selection and recovery');