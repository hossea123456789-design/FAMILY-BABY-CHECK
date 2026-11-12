/* 공개 템플릿 전용 데이터입니다. 개인 기록·구매 내역은 포함하지 않습니다. */
const BABY_PREP_SEED_VERSION = '2026-11-12';
const BABY_PREP_REFERENCE_ITEMS = `
맘스 안심팬티/패드|11680|1|https://www.coupang.com/vp/products/7388438607
가위(일반)|0|1|
오버나이트 생리대 : 입는 오버나이트|12600|1|https://www.coupang.com/vp/products/6741356617
임부 팬티|0|5|
수유 패드|11900|1|https://m.doubleheart.co.kr/product/컴포트필-수유패드-126매/202/
수유 나시, 수유 브라|14900|3|https://smartstore.naver.com/aa-f/products/5875009125
일반팬티|0|1|
모유 저장팩|5500|2|https://www.motherkmall.co.kr/product/모유저장팩-100ml/621/
유축기 깔대기 (스펙트라 일반형 흡입기 깔대기)|0|1|
비데 물티슈|15900|1|https://naver.me/x0aAJdG8
가슴 보호 크림|9600|1|https://www.coupang.com/vp/products/8400481154
반찬통|0|1|
튼살 크림|0|1|
임부 내의, 레깅스|25000|1|https://www.coupang.com/vp/products/30104013
봉제선 없는 양말|13900|2|https://smartstore.naver.com/daisyorganic/products/9450569060
손목 보호대|0|1|https://smartstore.naver.com/underles/products/6800092851
압박 스타킹|0|1|
영양제·스킨로션|0|1|
휴대폰 충전기 / 거치대|0|1|
이어폰|0|1|
가슴팩|0|1|
구부러지는 빨대|0|1|
수면 양말|0|2|
신분증|0|1|
텀블러|0|1|
폼클렌징/샴푸/바디워시|0|1|
칫솔/치약/가글|0|1|
립밤|0|1|
수건|0|3|
각티슈|0|1|
슬리퍼|0|2|
종이컵|0|1|
마스크|0|30|
가디건|0|1|
보호자용 침구|0|1|
배냇저고리|0|1|
생수|0|2|
개인 생리대|0|20|
겉싸개|23900|1|https://m.coupang.com/vm/products/7330384868
속싸개|9900|1|https://m.smartstore.naver.com/happyorganic/products/4325636091
가제 손수건|0|2|
아기용 물티슈|15900|1|
아기용 수건(카시트 고정용)|0|5|
미끄럼 방지 양말|0|1|
코로나 자가검사키트|0|2|
신생아 애착인형|0|2|
신생아 모자|0|1|
---집안준비---
가습기|300000|1|https://www.lge.co.kr/humidifiers/hw500das-akor1
바구니 카시트|0|1|
분유 포트|95000|1|https://www.coupang.com/vp/products/6962086794
젖병/세제/세척솔|36900|1|https://smartstore.naver.com/snpiholic/products/10159830026
쪽쪽이|15000|1|https://brand.naver.com/philips_avent/products/10129579129
아기 침대|0|1|
온습도계|21000|1|https://www.hubdic.co.kr/product/휴비딕-디지털-온습도계-ht-20/52/
애착 인형|22000|1|https://smartstore.naver.com/mdbfactory/products/4549515354
수유의자|135000|1|https://search.shopping.naver.com/catalog/48500289619
수유시트|0|1|
수유쿠션|61000|1|https://brand.naver.com/mothersbaby/products/288427958
방수패드|0|1|
기저귀 갈이대|0|1|
체온계|0|1|
CCTV|36220|2|https://www.coupang.com/vp/products/7675548875
바운서|0|1|
아기 로션|26900|1|https://brand.naver.com/ap_dailybeauty/products/8130349157
타이니 모빌|0|1|
역류 방지 쿠션|79800|1|https://brand.naver.com/jeinjena_brand/products/4459988595
아기 비데|87200|1|https://shopping.naver.com/window-products/kids/4938779333
아기 욕조|0|1|
워터탭|18900|1|https://brand.naver.com/happydarling/products/6429267218
초점책|26340|1|https://www.11st.co.kr/products/6680211687
아기 손톱깎이|8900|1|https://smartstore.naver.com/snpiholic/products/10160141525
아기 샴푸|26000|1|https://brand.naver.com/kenvueofficial/products/5124201953
아기 세제|26000|1|https://www.coupang.com/vp/products/6483005254
아기띠|0|1|
분유|0|1|
유축기|0|1|
`.trim();
const BABY_PREP_TASKS = [
 ['출산 병원·분만 방식·입원 절차 확인','서류·일정',-90,'함께'],
 ['산후조리원 예약·입퇴소 준비물 확인','서류·일정',-75,'함께'],
 ['산전 진료 및 검사 일정 정리','서류·일정',-90,'아내'],
 ['육아휴직·출산휴가 회사 절차 확인','서류·일정',-90,'함께'],
 ['산모·신생아 건강관리 서비스 상담·신청 시기 확인','서류·일정',-45,'함께'],
 ['병원·조리원 비용과 결제 일정 점검','서류·일정',-30,'남편'],
 ['출산가방 최종 패킹 확인','서류·일정',-21,'함께'],
 ['아기 카시트 설치 및 장착 점검','서류·일정',-21,'남편'],
 ['출생신고 준비 및 신청','출산 후',7,'함께'],
 ['첫만남이용권·부모급여 등 지원제도 확인','출산 후',14,'함께'],
 ['건강보험 관련 등록 확인','출산 후',14,'함께'],
 ['신생아 검진·예방접종 일정 등록','출산 후',7,'함께'],
 ['신생아용 기저귀·물티슈 재고 확인','출산 후',7,'함께'],
 ['아기 수면·수유 기록용 탭 만들기','출산 후',14,'함께'],
 ];
function babyPrepInitialData() {
  let category = '출산 가방'; let ix = 0;
  const items = BABY_PREP_REFERENCE_ITEMS.split('\n').filter(Boolean).flatMap(line => {
    if(line === '---집안준비---') { category = '집안 준비'; return []; }
    const [title,price,qty,referenceUrl] = line.split('|');
    const item={id:'seed-'+(++ix),title,section:category,type:'item',status:'pending',acquisition:'undecided',quantity:Number(qty)||1,estimate:0,actual:0,referencePrice:Number(price)||0,referenceUrl:referenceUrl||'',product:'',giver:'',owner:'함께',priority:'normal',dueOffset:category==='출산 가방'?-21:-45,dueDate:'',notes:'',updatedAt:0,deleted:false};
    return [item];
  });
  for(const [title,section,dueOffset,owner] of BABY_PREP_TASKS) items.push({id:'task-'+(++ix),title,section,type:'task',status:'pending',acquisition:'undecided',quantity:1,estimate:0,actual:0,referencePrice:0,referenceUrl:'',product:'',giver:'',owner,priority:'high',dueOffset,dueDate:'',notes:'',updatedAt:0,deleted:false});
  return {schema:2,seedVersion:BABY_PREP_SEED_VERSION,settings:{dueDate:'',babyName:'',budget:0},sections:['출산 가방','집안 준비','서류·일정','출산 후'],items};
}