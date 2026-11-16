'use strict';
/* 공개 코드에는 개인별 접종 이력/생년월일을 두지 않습니다.
 * 접종증명서에서 확인한 이력은 앱 로그인 후 가족별 암호문에만 저장합니다.
 * 2026-11-16 질병관리청 국가예방접종 일정 기준. 향후 연도 정책은 재확인 필요.
 */
const BABY_PREP_VACCINES=(()=>{
  const SOURCE='https://nip.kdca.go.kr/irhp/infm/goVcntInfo.do?menuCd=13&menuLv=1';
  const allowedIds=new Set([
    'bcg-1','hepb-1','six-1','six-2','six-3','dtap-4','dtap-5',
    'hib-4','pcv-1','pcv-2','pcv-3','pcv-4','ipv-4',
    'mmr-1','mmr-2','var-1','hepa-1','hepa-2',
    'rota-1','rota-2','rota-3','ij-1','ij-2','ij-3','ij-4','ij-5','lj-1','lj-2',
    'tdap-6','hpv-1','hpv-2'
  ]);
  const validDate=value=>{
    if(typeof value!=='string'||!/^(\d{4})-(\d\d)-(\d\d)$/.test(value))return false;
    const d=new Date(value+'T12:00:00');
    return !Number.isNaN(d.getTime())&&[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')===value;
  };
  const parse=value=>validDate(value)?new Date(value+'T12:00:00'):null;
  const fmt=date=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
  function plusMonths(date,months){
    const first=new Date(date.getFullYear(),date.getMonth()+Number(months),1,12);
    const max=new Date(first.getFullYear(),first.getMonth()+1,0,12).getDate();
    first.setDate(Math.min(date.getDate(),max));return first;
  }
  const datePlus=(date,n)=>date?fmt(plusMonths(date,n)):'';
  function plan(birthText,records={},jeType='unknown',year=new Date().getFullYear()){
    const birth=parse(birthText);
    if(!birth)return [];
    const saved=records&&typeof records==='object'&&!Array.isArray(records)?records:{};
    const dateOf=id=>parse(saved[id]?.date);
    const result=[];
    const append=(id,title,months,options={})=>{
      const predecessor=options.after||'';
      const prior=predecessor?dateOf(predecessor):null;
      const earliest=predecessor&&prior?datePlus(prior,options.interval):datePlus(birth,months);
      const latest=options.endMonths==null?'':datePlus(birth,options.endMonths);
      const needsPrior=!!predecessor&&!prior;
      result.push({id,title,earliest,latest,done:!!dateOf(id),
        completedDate:dateOf(id)?fmt(dateOf(id)):'',
        approximate:!!options.approximate||needsPrior,
        note:options.note||'',needsPrior,after:predecessor});
    };
    append('hepa-2','A형간염 2차',18,{after:'hepa-1',interval:6,endMonths:36,
      note:'1차 접종 후 백신 종류에 따라 6~12개월 또는 6~18개월 간격. 1차 실제 접종일을 우선 적용합니다.'});
    if(jeType==='inactivated'){
      append('ij-1','일본뇌염 불활성화 1차',12,{endMonths:24,note:'12~23개월 기초접종 시작'});
      append('ij-2','일본뇌염 불활성화 2차',13,{after:'ij-1',interval:1,note:'1차 접종 약 1개월 후'});
      append('ij-3','일본뇌염 불활성화 3차',25,{after:'ij-2',interval:11,note:'2차 접종 11개월 후 추가접종'});
      append('ij-4','일본뇌염 불활성화 4차',72,{endMonths:84,note:'만 6세 추가접종. 3차 지연 시 일정 변경 가능'});
      append('ij-5','일본뇌염 불활성화 5차',144,{endMonths:156,note:'만 12세 추가접종'});
    }else if(jeType==='live'){
      append('lj-1','일본뇌염 약독화 생백신 1차',12,{endMonths:24,note:'12~23개월 접종'});
      append('lj-2','일본뇌염 약독화 생백신 2차',24,{after:'lj-1',interval:12,note:'1차 접종 12개월 후'});
    }else{
      append('je-select','일본뇌염 1차 · 백신 종류 확인',12,{endMonths:24,
        note:'증명서에 접종기록이 없으면 병원에서 접종 여부와 불활성화/생백신 종류부터 확인하세요. 종류를 선택하면 후속 차수가 표시됩니다.'});
    }
    append('dtap-5','DTaP 5차',48,{endMonths:84,note:'만 4~6세 추가접종. IPV와 혼합백신 가능'});
    append('ipv-4','IPV 4차 (폴리오)',48,{endMonths:84,note:'만 4~6세 추가접종. DTaP와 혼합백신 가능'});
    append('mmr-2','MMR 2차',48,{endMonths:84,note:'만 4~6세 추가접종'});
    append('tdap-6','Tdap 6차',132,{endMonths:156,note:'만 11~12세 추가접종'});
    append('hpv-1','HPV 1차 지원 대상 재확인',144,{endMonths:156,
      note:'2026년에는 12세 남아도 국가예방접종 지원. 실제 접종연도의 대상·백신 기준을 반드시 재확인'});
    if(dateOf('hpv-1'))append('hpv-2','HPV 2차',150,{after:'hpv-1',interval:6,note:'12세 접종 시작 시 일반적으로 6개월 간격'});
    const seasons=Object.keys(saved).map(k=>/^flu-(\d{4})(?:-\d+)?$/.exec(k)).filter(Boolean).map(m=>Number(m[1]));
    const latestSeason=seasons.length?Math.max(...seasons):0;
    const season=Math.max(Number(year)||new Date().getFullYear(),latestSeason+1);
    result.push({id:'flu-'+season,title:season+'년 인플루엔자',earliest:season+'-09-01',
      latest:'',done:!!dateOf('flu-'+season),completedDate:dateOf('flu-'+season)?fmt(dateOf('flu-'+season)):'',
      approximate:true,needsPrior:false,after:'',note:'가을 접종 예상 시기만 표시. 해당 연도 정부 무료접종 사업 공고에 따라 정확한 기간 확인'});
    return result.sort((a,b)=>a.earliest.localeCompare(b.earliest)||a.title.localeCompare(b.title));
  }
  return Object.freeze({SOURCE,allowedIds,validDate,plan});
})();
