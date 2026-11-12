/* 2026-11-12 대한민국 판매/공식 제품 페이지 확인 기반 추천 카탈로그.
 * 추천 후보는 사용자 데이터(제품 선택/지출/구매 여부)가 아님.
 * 가격·재고·KC 등은 판매 시점에 변동하므로 실시간 확정값으로 쓰지 않음.
 * 연령은 제조사의 최소 사용 연령과 사용 목적을 구분. 36개월+는 36개월 미만에 '지금 추천' 금지.
 */
const BABY_PREP_RECOMMENDATIONS={
  updatedAt:'2026-11-12',mode:'verified-catalog',
  note:'제품은 구매 확정이 아닌 비교 후보입니다. 실제 구매 전에 제조사 권장 연령, KC·리콜, 현재 재고·가격과 우리 집의 보유 물품을 확인하세요.',
  retiredTitles:[
    '친척에게 받을 물품·중고 물품 목록 정리',
    '분기별 큰 육아 지출·예산 계획',
    '2027년 1학기 준비물 구매 예산 수립',
    '24개월 이후 바뀌는 생활용품 점검',
    '24~36개월 놀이·도서 교체 계획',
    '30개월 이후 외출·활동 준비',
    '두 돌 행사·촬영 준비물',
    '계절별 야외 놀이 안전용품',
    '침구·수면 환경 개선용 물품(필요한 경우)',
    '24~36개월 그림책·퍼즐',
    '숫자·시간 개념용 전자시계 또는 교구',
    '대형 자석 블록·조작 놀이 교구'
  ],
  // 구버전 계정을 열 때 기존 구매 이력은 유지하고, 중복되지 않는 실물 구매후보만 추가합니다.
  curatedGoods:[
    {id:'first-cars',title:'18개월+ 첫 자동차 · 듀플로 10474',section:'발달단계 준비',month:null,notes:'18개월부터 안전하게 시작하는 큰 블록 자동차. 보유 중이면 제외',recId:'first-cars'},
    {id:'toddler-clock',title:'큰 숫자 전자시계 (아기용 안전 구조)',section:'발달단계 준비',month:24,notes:'시계를 좋아하는 아이용. 버튼전지 접근·밝기·소음·전도 위험 확인 후 선택',recId:'toddler-clock'},
    {id:'book-board',title:'24개월 그림책 · 달님 안녕 보드북',section:'발달단계 준비',month:24,notes:'짧은 일상 이야기, 두꺼운 보드북. 집에 이미 있다면 제외',recId:'book-board'},
    {id:'animal-puzzle',title:'24개월 동물 판퍼즐 · 핑크퐁',section:'발달단계 준비',month:24,notes:'개별 조각 크기·삼킴 위험·KC와 적정 연령을 확인',recId:'animal-puzzle'},
    {id:'animal-train',title:'동물 기차 블록 · 레고 듀플로 10412',section:'발달단계 준비',month:null,notes:'제조사 18개월 이상. 색·동물 매칭 및 조립 놀이, 이미 있으면 제외',recId:'animal-train'},
    {id:'vehicle-block',title:'24개월 자동차 블록 · 레고 듀플로 10475',section:'발달단계 준비',month:24,notes:'제조사 만 2세 이상. 차를 좋아하는 아기에게, 기존 탈것 장난감과 중복 확인',recId:'vehicle-block'},
    {id:'magnetic-36',title:'36개월 이후 자석 블록 구매 검토',section:'발달단계 준비',month:36,notes:'36개월 미만은 추천 대상에서 제외. 제조사 연령·자석 이탈 및 삼킴 위험 우선 확인',recId:'magnetic-36'}
  ],
  categories:[
    {id:'book-board',stage:'toddler',match:['그림책','보드북','달님 안녕'],minMonths:18,maxMonths:60,reason:'일상 소재를 반복해 읽고 짧게 대화하기 좋은 보드북. 책 보유 여부를 먼저 확인하세요.',candidates:[
      {name:'한림출판사 달님 안녕 시리즈 보드북 4권 세트',minMonths:18,why:'짧은 반복 문장과 생활 장면, 튼튼한 보드북 구성.',url:'https://www.yes24.com/Product/Goods/4415176',source:'국내 도서 판매 페이지'}]},
    {id:'animal-puzzle',stage:'toddler',match:['판퍼즐','퍼즐'],minMonths:24,maxMonths:48,reason:'큰 조각을 제자리에 넣는 판퍼즐부터 시작하고, 조각 수와 KC 표시를 확인합니다.',candidates:[
      {name:'핑크퐁 아기 판퍼즐 동물 12종',minMonths:24,why:'낱개 동물 판퍼즐 구성. 조각 크기와 적정 연령은 구매 페이지에서 확인.',url:'https://www.coupang.com/vp/products/47740148',source:'국내 판매 페이지'}]},
    {id:'first-cars',stage:'toddler',match:['첫 자동차 · 듀플로 10474','나의 첫 자동차'],minMonths:18,maxMonths:48,reason:'차를 좋아하는 18개월 이상 아이에게 큰 조립 브릭과 역할 놀이를 제공합니다.',candidates:[
      {name:'레고 듀플로 나의 첫 자동차 10474',minMonths:18,why:'레고 공식 최소 18개월, 42개 부품으로 자동차 4종 조립.',url:'https://www.lego.com/ko-kr/product/creative-vehicles-10474',source:'레고 공식 상품'}]},
    {id:'animal-train',stage:'toddler',match:['동물 기차'],minMonths:18,maxMonths:48,reason:'기차 연결과 동물 색·모양 맞추기. 제조사에서 18개월 이상으로 안내합니다.',candidates:[
      {name:'레고 듀플로 나의 첫 동물 기차 10412',minMonths:18,why:'18개월+ 공식 권장, 19개 대형 브릭, 기차와 동물 조립.',url:'https://www.lego.com/ko-kr/product/animal-train-10412',source:'레고 공식 상품'}]},
    {id:'vehicle-block',stage:'toddler',match:['자동차 블록','건설 차량','자동차·건설놀이'],minMonths:24,maxMonths:60,reason:'차량을 좋아하는 유아에게 실제 차 모양 만들기와 굴리기 놀이. 만 2세 이상 제품을 선택합니다.',candidates:[
      {name:'레고 듀플로 3in1 건설 차량 10475',minMonths:24,why:'공식 권장 만 2세+, 22개 브릭으로 다양한 공사 차량 조립.',url:'https://www.lego.com/ko-kr/product/3-in-1-construction-vehicles-10475',source:'레고 공식 상품'},
      {name:'레고 듀플로 나의 첫 동물 기차 10412',minMonths:18,why:'차량 조립이 어려우면 18개월+ 난이도로 시작.',url:'https://www.lego.com/ko-kr/product/animal-train-10412',source:'레고 공식 상품'}]},
    {id:'magnetic-36',stage:'toddler',match:['자석 블록','자석블록'],minMonths:36,maxMonths:84,reason:'자석 이탈·작은 조각 삼킴 위험 때문에 36개월 미만 추천에서 제외합니다. 해당 연령 이후에도 KC/제조사 기준을 반드시 확인하세요.',candidates:[]},
    {id:'toddler-shoes',stage:'toddler',match:['운동화','실내화'],minMonths:18,maxMonths:72,reason:'발 길이·발볼을 실측하고 신발이 헐겁지 않은지 확인하세요. 브랜드 모델보다 현재 사이즈 적합성이 우선입니다.',candidates:[
      {name:'뉴발란스 키즈 740 토들러 IZ740KP',minMonths:18,why:'유아용 토들러 신발 판매 모델. 사이즈와 소재/굽 높이는 실제 착화 확인.',url:'https://www.gero.co.kr/shop/shopbrand.html?mcode=003&type=X&xcode=009',source:'국내 판매 목록'}]},
    {id:'toddler-clock',stage:'toddler',match:['전자시계','시간 개념','디지털 시계'],minMonths:24,maxMonths:72,reason:'시계를 보는 흥미를 활용합니다. 버튼전지 접근이 불가능한 구조, 밝기/소리, 넘어짐 위험부터 확인하세요. 검증된 개별 모델은 아직 선정하지 않았습니다.',candidates:[]},
    {id:'toddler-clothes',stage:'toddler',match:['겨울·봄 사이즈','교체 의류','여벌옷'],minMonths:18,maxMonths:72,reason:'현재 옷 치수와 어린이집 공지에 맞춰 필요한 개수만 준비하세요. 고정 사이즈 제품을 자동 추천하지 않습니다.',candidates:[]},
    {id:'toddler-seat',stage:'toddler',match:['카시트 교체 후보'],minMonths:24,maxMonths:72,reason:'현재 카시트가 키·몸무게·장착 조건에 맞으면 불필요한 교체를 추천하지 않습니다. 사고 이력이 불명확한 중고 카시트는 피하세요.',candidates:[]},
    {id:'newborn-bottle',stage:'newborn',match:['젖병/','젖병','수유병'],minMonths:0,maxMonths:3,reason:'모유·분유 수유 방식과 아기 흡입에 맞는 젖꼭지 유속을 확인하고 소량으로 시작하세요.',candidates:[
      {name:'필립스 아벤트 내추럴 리스폰스 PPSU 125ml SCY940/01',minMonths:0,why:'제조사 표기 0~3개월, 125ml, 저속 젖꼭지 포함.',url:'https://www.philips.co.kr/c-p/SCY940_01/natural-response-ppsu-baby-bottle',source:'필립스 공식 상품'}]},
    {id:'newborn-pacifier',stage:'newborn',match:['쪽쪽이','노리개 젖꼭지'],minMonths:0,maxMonths:6,reason:'아기 선호에 따라 다릅니다. 제조사 권장 월령·통기 구멍·손상 및 위생 확인.',candidates:[
      {name:'필립스 아벤트 ultra air SCF545/10 (0~6개월)',minMonths:0,why:'제조사 표기 0~6개월, 통기형 젖꼭지.',url:'https://www.philips.co.kr/c-p/SCF545_10/ultra-air-pacifier',source:'필립스 공식 상품'}]},
    {id:'newborn-humidifier',stage:'newborn',match:['가습기'],minMonths:0,maxMonths:36,reason:'집 안 습도와 관리 빈도를 먼저 확인하세요. 물통 세척 접근성과 안전장치가 핵심입니다.',candidates:[
      {name:'LG 퓨리케어 자연기화 가습기 HW500DAS',minMonths:0,why:'자연기화식, 자동습도조절·차일드락과 분리 세척 구조.',url:'https://www.lge.co.kr/humidifiers/hw500das-akor1',source:'LG전자 공식 상품'}]},
    {id:'newborn-thermometer',stage:'newborn',match:['체온계'],minMonths:0,maxMonths:60,reason:'영아용 체온계는 제품 설명의 권장 측정 연령과 정확한 측정 방법을 함께 확인하세요.',candidates:[
      {name:'브라운 써모스캔 7 IRT6520',minMonths:0,why:'귓속형 적외선 체온계, 렌즈 필터 사용. 신생아 측정 시 의료진 안내와 사용설명서 확인.',url:'https://www.braunhealthcare.com/us_en/thermometer/thermoscan-7/',source:'브라운 제조사 공식 설명'}]},
    {id:'newborn-room',stage:'newborn',match:['온습도계'],minMonths:0,maxMonths:72,reason:'수치 읽기 쉬운 장치. 동일 위치에서 수치 차이를 확인하세요.',candidates:[
      {name:'휴비딕 디지털 온습도계 HT-20',minMonths:0,why:'국내 제조사 공식 페이지의 제품 모델. 재고는 구매 시 재확인.',url:'https://hubdic.co.kr/category/%EC%98%A8%EC%8A%B5%EB%8F%84%EA%B3%84/47/',source:'휴비딕 공식 상품 목록'}]}
  ]
};
