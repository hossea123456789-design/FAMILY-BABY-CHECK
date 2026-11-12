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
for(const f of ['seed.js','toddler-seed.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
const source=fs.readFileSync(path.join(root,'app.js'),'utf8');
assert(source.includes(' init();\n})();'),'앱 시작 진입점을 찾지 못했습니다. 테스트 스크립트를 확인하세요.');
vm.runInContext(source.replace(' init();\n})();',' globalThis.__testHooks={S,dueOf,budget,addMonthsClamped,readPreferredFamily,selectFamily};\n})();'),ctx);
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
console.log('PASS: newborn 90, toddler 32, month dates, cost, per-device family selection and recovery');