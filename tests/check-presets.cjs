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
vm.runInContext(source.replace(' init();\n})();',' globalThis.__testHooks={S,dueOf,budget,addMonthsClamped};\n})();'),ctx);
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
console.log('PASS: newborn 90, toddler roadmap 32 (22 tasks, 10 items), no repeat defaults, month date, cost math');