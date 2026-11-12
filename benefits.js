/* 2026-11-12 현재 공식 자료 기준. 정적 참고 체크리스트이며 실시간 자격 판정이 아닙니다.
 * region: all(전국), seoul(서울), gyeonggi(경기)
 * stage: pregnancy / birth / infant / toddler
 * month: -N 출산 예정 N개월 전, 0 출생월, N 생후 N개월 무렵 확인을 위한 참고 시점
 * 공식 공고의 신청 기한은 desc에서 별도로 확인합니다.
 */
const BABY_PREP_BENEFITS_UPDATED = '2026-11-12';
const BABY_PREP_BENEFITS = [
  {id:'national-health-voucher',region:'all',stage:'pregnancy',month:-6,title:'국민행복카드 임신·출산 진료비 신청',desc:'2026년 건강보험 임신·출산 진료비는 단태아 기준 100만 원. 다태아·분만취약지 등은 별도 기준. 발급·잔여 사용 기간 확인.',source:'https://www.nhis.or.kr/'},
  {id:'national-prenatal-health',region:'all',stage:'pregnancy',month:-5,title:'보건소 임산부 등록·검사·영양 지원 확인',desc:'관할 보건소의 임신 초기 검사, 엽산·철분 지원, 고위험 임산부 의료비 등 대상과 신청방법 확인. 지역마다 서비스 내용 다름.',source:'https://www.e-health.go.kr/'},
  {id:'national-leave-plan',region:'all',stage:'pregnancy',month:-2,title:'출산휴가·배우자 출산휴가·육아휴직 급여 계획',desc:'고용형태별 대상·신청 기한·회사 서류 확인. 2026년 배우자 출산휴가는 원칙적으로 20일(다태아 25일) 등 제도 조건 확인.',source:'https://www.work24.go.kr/'},
  {id:'national-postpartum-service',region:'all',stage:'pregnancy',month:-1,title:'산모·신생아 건강관리 서비스(산후도우미) 신청 확인',desc:'소득·출산순위·지자체에 따른 정부지원 가능 여부, 신청 시기 및 바우처 사용 기간 확인.',source:'https://www.bokjiro.go.kr/'},
  {id:'national-one-stop',region:'all',stage:'birth',month:0,title:'출생신고·행복출산 원스톱 서비스 신청',desc:'정부24 또는 주민센터에서 첫만남이용권·부모급여·아동수당·지자체 출산지원금 등 신청 항목을 한꺼번에 확인.',source:'https://www.gov.kr/'},
  {id:'national-first-meeting',region:'all',stage:'birth',month:0,title:'첫만남이용권 지급·사용 기한 확인',desc:'2026년 기준 첫째 200만 원, 둘째 이상 300만 원. 출생신고 및 국민행복카드 바우처 신청·잔액 확인.',source:'https://www.bokjiro.go.kr/'},
  {id:'national-parent-benefit',region:'all',stage:'birth',month:0,title:'부모급여 신청 및 지급 확인',desc:'2026년 기준 0~11개월 월 100만 원, 12~23개월 월 50만 원. 출생 후 60일 이내 신청하면 출생월부터 소급; 어린이집 이용 시 별도 전환 확인.',source:'https://www.korea.kr/news/policyFocusView.do?newsId=148957936&pkgId=49500831'},
  {id:'national-child-allowance',region:'all',stage:'birth',month:0,title:'아동수당 신청·지급 확인',desc:'2026년 기준 대상 연령과 지역별 추가 지원 여부 확인. 출생신고 시 행복출산 통합 신청과 지급 계좌 확인.',source:'https://www.gov.kr/'},
  {id:'national-local-birth-grant',region:'all',stage:'birth',month:0,title:'거주 시·군·구 출산지원금·지역 혜택 조회',desc:'국가 공통 혜택 외 지자체 출산축하금·산후조리·교통/택시·육아용품 지원은 실제 주소지 공고에 따라 신청. 중복 지원 조건 확인.',source:'https://www.gov.kr/'},
  {id:'national-electricity',region:'all',stage:'birth',month:0,title:'출산가구 전기요금 할인 신청 여부',desc:'출생·가족 구성 요건에 따른 한전 주택용 전기요금 감면 대상 확인. 고객번호·계약정보 및 신청 완료 여부 체크.',source:'https://cyber.kepco.co.kr/'},
  {id:'national-medical-extra',region:'all',stage:'infant',month:0,title:'미숙아·선천성질환·난청 등 의료비 지원 해당 여부',desc:'대상 가정만 해당. 출생 상황·검사 결과에 따른 지원 및 퇴원 후 신청 기한을 e보건소에서 확인.',source:'https://www.e-health.go.kr/'},
  {id:'national-diaper-support',region:'all',stage:'infant',month:1,title:'저소득층 기저귀·조제분유 지원 해당 여부',desc:'2026년 기준 2세 미만 저소득·특정 자격 가구 등 조건부. 월 지원액·신청 시기·바우처 사용 기간을 확인.',source:'https://www.bokjiro.go.kr/'},
  {id:'national-daycare-fee',region:'all',stage:'infant',month:10,title:'어린이집 입소 전 보육료·부모급여 전환 확인',desc:'어린이집 입소 시 보육료 자격 신청과 부모급여 현금 차액, 종일제 아이돌봄 중복·전환 조건 점검.',source:'https://www.bokjiro.go.kr/'},
  {id:'national-parent-1y',region:'all',stage:'infant',month:12,title:'돌 이후 부모급여 금액·보육료 변경 확인',desc:'생후 12~23개월은 2026년 기준 부모급여 월 50만 원. 어린이집 이용 시 보육료 지원과 차액 규정 확인.',source:'https://www.korea.kr/news/policyFocusView.do?newsId=148957936&pkgId=49500831'},
  {id:'national-caretaker',region:'all',stage:'toddler',month:22,title:'조부모 돌봄 지원금 및 정부 아이돌봄 자격 사전 확인',desc:'주소지에 따라 서울형 손주돌봄수당·경기형 가족돌봄수당 등 별도 사업. 중위소득·양육공백·돌봄시간·중복 이용 요건을 신청 전에 확인.',source:'https://www.bokjiro.go.kr/'},
  {id:'national-home-care-2y',region:'all',stage:'toddler',month:24,title:'24개월 이후 가정양육수당·보육료 전환 확인',desc:'가정양육 여부·어린이집/유치원 이용 여부에 따라 지원 제도가 다릅니다. 2026년 해당 연령과 지급 조건 확인.',source:'https://www.bokjiro.go.kr/'},
  {id:'national-childcare-services',region:'all',stage:'toddler',month:24,title:'시간제 보육·아이돌봄서비스 정부지원 자격 확인',desc:'맞벌이·돌봄공백 가정의 정부지원 아이돌봄, 시간제 보육 및 지자체 추가 지원 여부를 확인. 선택한 돌봄사업의 중복지원 제한 확인.',source:'https://www.bokjiro.go.kr/'},
  {id:'national-wellchild',region:'all',stage:'toddler',month:29,title:'영유아 건강검진·구강검진 무료 지원 일정 확인',desc:'예: 5차 영유아 건강검진 생후 30~36개월, 2차 구강검진 생후 30~41개월. 별도 진료 예약 전 공단 수검 기간 확인.',source:'https://www.nhis.or.kr/'},
  {id:'seoul-maternity-transport',region:'seoul',stage:'pregnancy',month:-4,title:'서울시 임산부 교통비 바우처 확인',desc:'2026년 기준 첫째 70만·둘째 80만·셋째 이상 100만 원, 서울시 거주기간 조건 등 확인. 임신 3개월~출산 후 6개월 신청 가능 여부 재검토.',source:'https://seoul-agi.seoul.go.kr/pregnant-transportation-support'},
  {id:'seoul-postpartum-voucher',region:'seoul',stage:'birth',month:0,title:'서울형 산후조리경비 바우처 신청',desc:'2026년 기준 첫째 100만·둘째 120만·셋째 이상 150만 원, 출산 후 180일 내 신청. 산모/출생아 주소 및 사용기한 확인.',source:'https://seoul-agi.seoul.go.kr/postpartum-care'},
  {id:'seoul-grandparent',region:'seoul',stage:'toddler',month:23,title:'서울형 손주돌봄수당 신청 준비·접수',desc:'2026년 안내상 23개월부터 사전 신청, 매월 1~15일. 24~36개월 아이·기준 중위소득 150% 이하·양육공백·친인척 월 40시간 돌봄 등 조건 확인. 1명 월 30만 원 등. 정부 아이돌봄 유형 판정 및 서류 필요.',source:'https://umppa.seoul.go.kr/hmpg/sprt/bzin/bzmgComtDetail.do?biz_mng_no=59F45FE9BC024848AD07143C962E6869'},
  {id:'gyeonggi-postpartum',region:'gyeonggi',stage:'birth',month:0,title:'경기도 산후조리비 지역화폐 신청',desc:'2026년 기준 출생아 1명당 50만 원, 경기도 출생신고·거주 등 요건. 출생일로부터 12개월 이내 신청 안내 확인.',source:'https://gg24.gg.go.kr/svcreqst/selectSvcReqst.do?svc_seq=803'},
  {id:'gyeonggi-family-care',region:'gyeonggi',stage:'toddler',month:23,title:'경기형 가족돌봄수당 시·군 모집 상태·신청 확인',desc:'2026년 기준 24~36개월, 기준 중위소득 150% 이하·양육공백·월 40시간 돌봄 등. 월 30만 원(1명) 등. 전월 1~15일 접수 원칙. 지역별 예산/접수 중단 가능. 2026년 11월 공고에서 성남·용인 등 일부 시군 신규 접수 중단 명시. 2027년은 다시 확인 필요.',source:'https://gg24.gg.go.kr/svcreqst/selectSvcReqst.do?svc_seq=931'}
];
window.BABY_PREP_BENEFITS_UPDATED = BABY_PREP_BENEFITS_UPDATED;
window.BABY_PREP_BENEFITS = BABY_PREP_BENEFITS;
