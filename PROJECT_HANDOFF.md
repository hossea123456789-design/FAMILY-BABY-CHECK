# FAMILY-BABY-CHECK — 전체 작업 히스토리 및 인수인계

**기준일:** 2026-11-12 (KST)  
**인수인계 원칙:** 이 문서를 후속 세션 첫 참조 파일로 사용. 이후 작업자는 `main`과 GitHub Actions, Apps Script 실제 배포, Google Sheets DB 기록을 다시 확인한 뒤 업데이트한다. 완료한 것과 검증하지 않은 것을 반드시 구분한다.

관련: [README](./README.md) · [CHANGELOG](./CHANGELOG.md) · [OAuth 해결](./GOOGLE_OAUTH_FIX.md) · [AGENTS 지침](./AGENTS.md) · [GitHub 공통 인수인계 규칙](./GITHUB_HANDOFF_STANDARD.md)

## 최신 v1.4.1 — 실제 구매 후보 선탑재, 월령별 리스트 및 무의미한 항목 정리 (2026-11-12)

**이번 요청과 해결:** '구매 품목에는 실제 추천이 하나도 없음' / '처음부터 나이 맞는 추천 품목을 리스트에 넣어 달라' / '친척에게 받을 물품·중고 물품 목록 정리 같은 불필요한 내용 제거'. 구형 앱의 `recommendations.js`는 팁 문장과 과거 구매 참조링크 위주여서 **모델 추천이라고 보기 어려웠음**.

**현 구현:**
- `recommendations.js`에 한국에서 실제 확인 가능한 제품명, 최소 권장 월령, 연령 설명, 추천 근거, 공홈/판매 링크를 **공개 정적 카탈로그**로 관리. 2026-11-12 확인 기준이며 실시간 판매/재고 API는 없음. 특정 링크가 오래되거나 품절이면 갱신 필요.
- **유아 추천 예시:** 레고 듀플로 나의 첫 자동차 10474(18개월+; 제조사 공식), 나의 첫 동물 기차 10412(18개월+), 3in1 건설 차량 10475(24개월+), 한림출판사 달님 안녕 보드북 세트, 핑크퐁 동물 판퍼즐, 뉴발란스 키즈 740 토들러 신발(사이즈 실측), 유아 전자시계는 버튼전지 접근 등 안전상 검증된 개별 모델이 없어 **기준만 공개**. 자석 블록은 **36개월 이후 항목**으로 따로 유지하며 36개월 미만 즉시 추천 금지.
- **신생아 후보:** 필립스 아벤트 PPSU 125ml SCY940/01(0~3개월), 울트라 에어 SCF545/10(0~6개월), LG 퓨리케어 HW500DAS(세척/차일드락), 브라운 써모스캔7 IRT6520, 휴비딕 HT-20 등. 수유방식·체중·월령/측정방법이 우선이며 단순 브랜드 순위 아님.
- **UX:** 모든 실물 물품 중 추천 매칭이 있는 항목은 체크리스트에서 곧바로 **제품명·현재 적합/향후 개월수·제품 비교 버튼** 표시. 버튼 → 공식 링크/제품 이유/권장 월령 → '이 후보로 선택'을 누르면 `item.product`와 `referenceUrl`만 저장. 기존 제품명이 있으면 변경 확인을 요구. `status`, `actual`, `estimate`, `quantity`, `done`은 자동 변경하지 않음. 구매 상세 화면은 3세 이상 모델을 20개월 아이에게 선택 불가.
- **프리셋 정리:** 하람·예원 구형 22일정+10상품=32에서 신규 템플릿은 **16 일정+11 구매 후보=27**로 정리. 불필요한 추상 업무 및 친척 중고 목록 정리를 제거. 7개 구체 구매 후보를 새 시드에 포함했고 이는 **구매 필수가 아니라 선택항목**.
- **기존 저장 자료:** `reconcileToddlerCatalog()`는 구형 `toddler-roadmap-*`/`toddler-goods-*` 기본 항목 중 `updatedAt=0`, status=pending, 제품명/지출/수정 없는 것만 `deleted:true`로 숨김. 사용자가 상태·금액·상품·수령인 등을 변경한 항목은 보존. `curated-[id]`가 있는 경우 또는 같은 상품명이 이미 존재하면 재추가 안 함. 변경은 서버 최신본 확인 후 `markDirty()`로 암호화 동기화 예약. 저장이 끝나지 않았다고 완료로 선언하지 않음.
- **기타 가족:** 신생아 두 계정의 90개 준비/일정은 삭제하지 않고 핵심 품목에 추천을 연결.
- **테스트:** 구문검사 및 프리셋 27/90, 실제 상품 공식 URL, 20개월 대 36개월 사용 기준, 초기 기록 정리와 사용자 작성값 보존, 중복 방지, 추천 링크 렌더링 자동 테스트. **실제 Android 화면/실제 두 기기 DB 동기화는 아직 미검증**.
- **작업 유의:** 모델·재고·가격은 실시간 검증하지 않으므로 최신 상품으로 갱신 시 관련 공식 링크 확인. 사용자의 실제 구매 내역에 임의 모델·가격을 자동 기록하지 않음. `apps-script/Code.gs`는 이번에 변경하지 않음.
- **변경 파일:** `recommendations.js`, `toddler-seed.js`, `app.js`, `style.css`, `index.html`, `config.js`, `tests/check-presets.cjs`, `README.md`, `CHANGELOG.md`, 본 인수인계.
- **확인한 공식 자료:** https://www.lego.com/ko-kr/product/creative-vehicles-10474 / https://www.lego.com/ko-kr/product/animal-train-10412 / https://www.lego.com/ko-kr/product/3-in-1-construction-vehicles-10475 / https://www.philips.co.kr/c-p/SCY940_01/natural-response-ppsu-baby-bottle / https://www.philips.co.kr/c-p/SCF545_10/ultra-air-pacifier / https://www.lge.co.kr/humidifiers/hw500das-akor1 / https://www.yes24.com/Product/Goods/4415176.

## 1. 최종 목표와 사용자가 확정한 사항

- 세 가족의 출산·육아 준비물, 신청할 복지혜택, 미래 일정, 구매·예산을 관리하는 **별도 모바일 웹앱**. GitHub Pages 공개 앱, Google Apps Script + 암호문 전용 Google Sheets DB 구성.
- `ew-he` 은원·하은 / `ce-hy` 채은·하영: 출산용품 76개 + 예정·할 일 14개, 각 90개 유지. `hr-yw` 하람·예원: **현재 신규 프리셋 16개 실제 일정 + 11개 구매 검토 = 27개** (v1.3.2까지는 초기 32개였으며 기존 사용자의 사용자 작성 기록은 보존).
- 하람·예원 가족은 이미 '유하 육아 도구 모음'이 있으므로, 일상 수면/양치/식사/발달 기록과 **중복하지 않기**. 초안의 반복 루틴 17개를 제거. 이 프로젝트는 계획/구매/행정/예산/혜택 중심.
- 원본 사용자 재무 워크북의 '육아 관련 체크리스트'만 참고. 원본 재무 다른 탭, 기존 개인정보, 구매 상태, 실제 지출액은 새 가족 공간에 이관하지 않음. 예전 참고 가격은 자동 예산 합산하지 않음.
- 계정 로그인은 **4자리 숫자 PIN 패드**. 가족 내부에서 서로의 기록을 존중하는 간편 잠금 장치이며, 기존에 검토한 12자리 비밀번호와 필수 복구키는 사용자 요청에 따라 적용하지 않음. 최초 등록에 가족별 8자리 초대 코드 필요. PIN은 브라우저 키 생성에 사용되지만, 1만 가지 조합이라 암호문 유출 시 대입 공격에 취약함을 명시.
- 모든 GitHub MCP 가능한 작업(코드 편집·커밋·검증·문서)은 조력자가 직접 실행. 사용자가 반드시 수행해야 하는 Google Cloud 로그인/소유자 승인만 구체적인 화면 안내.
- **모든 프로젝트 공통 규칙:** 후속 개발 가능한 이력 MD를 프로젝트 루트에 두고, 매 작업 후 상태·오류·커밋·테스트·미완료를 갱신.
- 등록할 아이 이름/출생일/거주 지역/시군구와 가족별 혜택 체크 상태는 **가족별 암호화 DB 기록**으로만 관리. 공개 GitHub에 실명·실제 생일·PIN·초대코드 원문·실지출을 넣지 않음.

## 2. 현재 동작 아키텍처

```text
GitHub Pages: index.html, style.css, config.js, app.js,
  seed.js, toddler-seed.js, benefits.js, recommendations.js
  ├─ 가족 선택 / 마지막 가족 선택 localStorage(기기별 코드만 저장)
  ├─ PIN 4자리 → PBKDF2-SHA256(310,000회) / AES-GCM
  ├─ 상단 단일 4개 메뉴(홈·체크·일정·혜택), 설정은 우측 상단 ⚙
  └─ iframe postMessage + 매 접속 nonce와 출처 검증
       ↓
Google Apps Script 웹앱 (apps-script/Code.gs, 단일 파일·내장 브리지)
  doGet, bridgeRequest(meta/setup/login/save), LockService/revision
       ↓
Google Sheets 소유자 전용 "우리 가족 체크노트_DB_암호문 전용"
  APP_DB: family | salt | verifier_hash | revision | updated_at
          | chunk_count | cipher_chunk_1 ... cipher_chunk_24
```

- **앱 URL:** https://hossea123456789-design.github.io/FAMILY-BABY-CHECK/
- **프런트 버전:** `1.4.1` (`index.html`의 CSS/JS 캐시 쿼리와 `config.js`).
- **GAS 공개 엔드포인트:** https://script.google.com/macros/s/AKfycbxEqsoeEzlHfME5CE7SUa-XjZQ4G7UspNM9wLXsIQcPXvLTyheeuELTPR7T3Pinb6sl/exec
- **GAS 배포:** GitHub 서버 파일을 고쳐도 실제 Google Apps Script 코드와 배포는 자동 변경되지 않음. `apps-script/Bridge.html`은 이전 분리형 참고 파일; 현재 `Code.gs` 내 `BRIDGE_DOCUMENT` 사용. 데이터 스키마를 바꿀 때는 기존 암호문과 충돌 없는지 검증할 것.
- **전용 DB는 다른 금융 시트에서 완전히 분리.** Google Sheets ID를 공개 문서에 추가하지 말 것. 문서 제목으로 Drive에서 찾아야 함.
- **Cloud OAuth:** 전용 `family-baby-check-oauth` 프로젝트. 기존 찬양팀 앱의 OAuth·DB·코드는 변경하지 말 것.
- `apps-script/appsscript.json`의 Google Sheets OAuth 범위만 사용. 실제 GAS 프로젝트 권한 승인은 소유자가 별도로 해야 함.

### 2026-11-12 v1.2.3 — 지원금 신청 상태 UX 수정

- **사용자 재현 화면:** 25개 혜택 카드의 기본 미확인 상태인데 파란색 첫 버튼이 '✓ 신청·처리 완료'여서 이미 신청한 듯 보이고, '확인 중' 버튼은 아무 화면도 열지 않고 저장 상태만 바꿔 혼동을 유발.
- **원인:** 데이터 상태(`pending`)와 버튼 동작(`done` 변경)을 한 줄에 섞었으며, 사용자가 예상하는 안내 이동과 상태 변경을 구분하지 않음. 상태 저장마다 화면 전체를 새로 렌더링하여 스크롤/포커스 소실 가능.
- **개선:** 카드 아래에 단일 중립 `내 진행 상태` 드롭다운(미확인 / 조건·신청 확인 중 / 신청·처리 완료 / 해당 없음). **신청 완료가 기본값이 아님**. '공식 안내 열기 ↗' 링크는 별도 배치하고 실제 외부 안내와 앱 내 기록 변경을 명확히 구분. 값 변경 즉시 가족 데이터에 반영·암호화 자동저장 예약. 혜택 카드 전체 재렌더링 없이 요약 건수만 제자리 업데이트. 월별 활동 내역과 다른 가족 데이터 보존.
- **검증 필요:** 실제 모바일의 네이티브 선택창/접근성/동기화 확인. JS 단위 테스트로 미확인 선택·단일 입력·상태 변경·과거 값 보존을 검증. PIN 및 Apps Script 코드는 변경하지 않음.
- **릴리스:** 프런트 `v1.2.3`; 실배포 여부는 같은 커밋의 GitHub Actions를 확인할 것.

## 2026-11-12 · v1.3.2 UI 보완 및 유하 앱 비교 후속

**사용자 스크린샷 재현 문제:** 편집 모달이 길어 스크롤할 때 뒷배경 딤드 바깥 하단에 흰색 단절 영역이 보임. 지원금/지원 서비스 같은 비물품에서도 '추천 받기' 버튼이 있음. 홈에 원래 기대한 현황 지표와 아이 나이·프로필이 빠짐.

**조치:** `app.js`, `style.css`, `tests/check-presets.cjs`, `index.html`, `config.js`에서 v1.3.2 수정.
1. 모바일 오버레이는 `100dvh` 높이로 전체 화면을 덮고, 폼 편집창을 아래에 밀착. 내부 콘텐츠만 스크롤. 모달 열린 동안 `document.body` 위치를 고정하여 뒤 스크롤을 잠그고 닫을 때 원래 스크롤 좌표로 복원. iOS Safari/Android 키보드 실기기 화면 재확인은 **미완료**.
2. 제품 추천은 `canRecommendProduct(item)`에서 `type=item` 및 신청·수당·지원금·검진 등 제목 필터로 제한하고 편집 UI/추천 페이지 접근 양쪽을 보호. 일부 혼합 물품/복지명칭의 단어 경계 검토는 추후 가능.
3. 홈에는 6가지 숫자 서머리: 전체 준비, 완료, 남은 준비, 14일 내 확인, 실제 지출, 추가 예상 비용. 상단 메뉴 중복 없음. 홈 자체 완료율 그래프는 계속 제외하고 체크 탭에서만 제공.
4. 가족 암호화 설정의 아이 이름·출생일·출산예정일에서 실제 경과일·만 나이·생후 개월/잔여 일수 또는 출산 D-day 계산. 생년월일 미입력 시 설정 유도. 개인정보는 공개 소스에 삽입하지 않음.
5. 자동 검사는 실제 모바일 렌더링 검증과 별개. Google Sheets 최초 등록/재로그인/다른 기기 동기화도 실사용 검증 전. PIN 캐시와 스토리지 값의 호환성은 유지.

**릴리스:** `1.3.2`. 최신 화면: https://hossea123456789-design.github.io/FAMILY-BABY-CHECK/?v=1.3.2

## 3. 사용자 피드백과 변경 과정

1. **기획:** 출산 준비물 두 부부 + 약 20개월 아이를 키우는 부부 3개 가족 공간 필요. 각 가족의 계획·예산·기록을 암호화해 분리.
2. **중복 피드백:** 하람·예원 가족은 별도 육아 기록 앱 존재 → 반복 수면/식사/양치/발달 루틴 전부 제거, 미래 계획 32개를 중심에.
3. **GitHub 직접 작업:** 사용자는 수동 파일 업로드를 원치 않음 → GitHub MCP로 저장소 초기화·소스 파일 업로드·CI·Pages 배포까지 직접 수행.
4. **PIN:** 12자리 비밀번호가 불편함 → 4자리 PIN 터치 패드. 패드가 한 줄로 붙고 진행 원이 선처럼 깨지는 스크린샷 → CSS/JS 캐시 버전 분리와 인라인 핵심 CSS 적용.
5. **DB:** 기존 가족 재무 자료와 별개로 암호문 DB를 만들고 `APP_DB` 탭(30컬럼)을 만듦. 최초 `generateEnrollmentCodes`에서 시트 ID와 허용 GitHub origin 자동 설정.
6. **OAuth 차단:** 처음 Apps Script 승인이 '차단된 앱'으로 표시. Google Sheets 최소 scope 명시, 기존 WORSHIP-SCHEDULE 승인 절차 비교, 별도 표준 Google Cloud OAuth 프로젝트 구성.
7. **도메인 소유권:** Cloud 브랜딩에서 GitHub Pages 홈페이지 소유권 오류 → Search Console HTML 메타 인증 태그를 GitHub `index.html`에 직접 넣어 배포. 사용자가 Search Console에서 '인증된 소유자입니다' 확인. **Google Cloud 브랜딩 최종 검토/게시 상태는 별개로 미확인.**
8. **GAS 연결:** 사용자가 `generateEnrollmentCodes` 성공 로그와 3가족 숫자 초대 코드 발급 확인, `/exec` URL 제공 → `config.js` 연동. 외부 HTTP GET 가드와 nonce 브리지 HTML 응답을 GitHub Actions로 확인. 초기에 실패했던 허용 도메인 문자열 일치 테스트는 HTMLService 래핑을 고려하지 않은 검사 오류였고 바로 수정해 최종 성공.
9. **기기별 가족 기억:** 첫 화면에서 늘 은원·하은 탭이 기본 선택되는 불편함 → 마지막 가족 코드만 기기별 로컬에 저장, 다음 방문 자동 선택. PIN은 절대 저장하지 않음.
10. **메뉴·입력 불편:** 처음 7개 이상 상단 탭(각 분류별 탭까지)과 긴 항목 입력 폼 → 주요 메뉴 홈·체크·일정·설정 4개만 유지. 기존 분류는 필터에서 선택. 항목명만 쓰는 빠른 추가, 상세 편집 접이식, 예산·제품 추천은 홈/설정 내부 링크로 이동. 기존 항목의 제품명·제공자·수량·월령·담당·반복·지출·링크 필드는 삭제하지 않음.
11. **프로그레스바/PIN 지연:** 완료율을 홈에만 노출하던 것을 모든 화면의 상단 고정 진행률로 복원. PIN 이후 PBKDF2 및 GAS 왕복 동안 단계별 인디케이터. KDF 반복 수를 낮추면 기존 암호문 호환성이 깨질 수 있으므로 유지. 실기기 체감속도 E2E 미측정.
12. **가족 수당 누락:** 손주돌봄수당뿐 아니라 출생·영아·2세 단계별 지원금까지 각 부부가 놓치지 않도록 2026년 공공기관 자료로 혜택 목록 25개 신설(전국 18, 서울 4, 경기 3). 데이터와 원래 32/90개 준비물 체크리스트는 분리.
13. **지역별 혜택:** 설정에서 거주 지역(미설정/서울/경기/기타)과 시군구, 임신 가족은 실제 출생일을 등록. 전국 공통 사업은 모든 가족에, 서울/경기 사업은 선택한 가족에만 노출. 완료/확인 중/해당 없음 상태는 가족 암호문 데이터의 `benefits` 속성에 저장. 거주지를 변경해도 과거 수당 체크 상태는 삭제하지 않음.
14. **특별 주의:** 서울형 손주돌봄수당은 2026년 기준 23개월이 되는 **달 1~15일**에 사전 신청 가능하므로, 해당 월의 23번째 생일이 아닌 **그달 1일**을 확인 시작일로 표시. 경기 가족돌봄수당 역시 돌봄 전월 1~15일 접수가 원칙. **2026년 11월 경기민원24 공고에는 성남시 등 일부 시군 신규 접수 중단**이라고 나옴. 2027년 사업·신청 조건은 반드시 새로 확인.
15. **월별 활동 점검:** 손주돌봄수당은 신청 이후에도 월 40시간 등 활동 증빙이 필요해 서울·경기 각각 1개씩 월별 점검 항목을 추가. 달마다 새 상태를 표시하고 `benefits[id].monthly[YYYY-MM]`에 이전 월 기록을 보존. 단 신청 대상이거나 수급 확정된 것으로 판단하지 않음.
16. **데이터 안전:** 혜택 상태는 기존 준비물 items/sections와 분리된 `benefits` 사전에 저장하고 복호화 시 이전 데이터가 없어도 `{}`로 채움. 기존 준비물 및 비용·진행률을 초기화·삭제하지 않음. 새로운 데이터 버전을 불필요하게 도입하지 않았음.

## 4. 검증 결과 vs 아직 미검증

| 검사 항목 | 상태 | 방법/근거 |
|---|---|---|
| GitHub 소스 업로드·커밋 | ✅ | MCP를 통한 최신 파일/커밋 재조회 |
| 자동 JS/GAS 구문·프리셋/일자/비용 테스트 | ✅ | [Actions](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/actions) |
| 가족 선택 로컬 기억·PIN 미저장 | ✅ 정적/테스트 | `tests/check-presets.cjs` |
| 상단 4개 메뉴·빠른 항목 추가·기존 편집 필드 유지 | ✅ 정적/테스트 | 동일 테스트 |
| 25개 혜택 목록·지역 조건·시기·기존 체크 상태 보존 | ✅ 자동 테스트 | 23개 항목, 서울/경기 전용, 소급 신청월 1일 테스트 |
| GitHub Pages 정적 배포 | ✅ 이전 버전 / 새 버전 재검증 | Actions `pages build and deployment` |
| Apps Script 공개 GET 및 브리지 코드 응답 | ✅ | `backend-smoke.yml` 테스트 |
| Google Sheets APP_DB 구조 | ✅ | 연결된 Google Sheets API |
| 최초 8자리 초대 코드 발급 | ✅ 사용자 로그 | 실제 코드 원문은 기록 금지 |
| **새 부부 실제 PIN 최초 가입→시트 행 생성** | ⬜ | 수동 E2E 미확인 |
| **PIN 재로그인·2대 기기 동기화·충돌** | ⬜ | 수동 E2E 미확인 |
| **25개 지원사업 실제 신청/수급** | ⬜ | 각 가족의 조건·사업 연도/시군별 모집 확인 필요 |
| **Android / iOS 실제 UI 체감과 PIN 지연 개선량** | ⬜ | 코드·CI만으로 체감시간 단정 불가 |
| **Google Cloud OAuth 브랜딩 최종 게시·인증** | ⬜ | 별도 Cloud 화면에서 확인 |

**중요:** GitHub Actions의 HTTP 브리지 테스트 성공 ≠ 브라우저→GAS→시트 최초 등록·복호화·동기화 E2E 성공.

## 5. 다음 세션 우선 작업

1. 새 사이트 https://hossea123456789-design.github.io/FAMILY-BABY-CHECK/?v=1.2.1 를 연 뒤 로그인. PIN·초대 코드는 기록/재전송하지 않는다.
2. 가족별 **설정**에서 아이 출생일 또는 출산예정일, 출생한 경우 실제 출생일, 거주 지역, 선택적 시군구 등록. 세 부부는 서로 독립적으로 설정.
3. 홈의 **🎁 지원금·가족 혜택** 진입 → 현재 단계/전체 단계 전환, 서울형·경기형 해당 지역의 손주돌봄수당 및 월별 돌봄활동 점검 항목 노출 여부 확인. 신청 여부는 '확인 중'/'신청·처리 완료'/'해당 없음'으로 기록.
4. 혜택 상태 하나 변경 후 Google Sheets 암호문이 갱신되는지, 재로그인/다른 기기에서 그대로 나타나는지 테스트. 그전까지 실동기화 완료로 보고하지 않는다.
5. 2027년 신정책/거주지 시군구 변경 시 **공식 링크/사업 존속/신청기간/소득 조건**을 재검색하고 `benefits.js` 및 본 인수인계 문서를 갱신. UI에서 금액을 지원 확정값으로 표시하지 않는다.
6. 프런트 코드 편집은 GitHub MCP로 직접 커밋, 변경마다 버전 쿼리·Actions·Pages 확인. GAS 코드 자체를 바꾼 경우에는 실제 Apps Script 재배포 별도 수행.
7. 오류가 있으면 페이지/가족/작업 단계·실제 오류·기기/브라우저·Actions 실행 ID·DB 갱신 상태를 구분해서 진단. 공개 채팅에 인증 토큰·개인 데이터·PIN을 요구하지 않는다.
8. 각 작업 끝에 `PROJECT_HANDOFF.md`와 `CHANGELOG.md`를 새 상태로 갱신. 다른 앱 작업 시에도 해당 저장소의 인수인계 파일을 직접 갱신.

## 6. 참고한 공공기관 정책 출처 (2026년 자료)

- 전국 공통: [2026 행복출산 원스톱](https://www.ui4u.go.kr/portal/bbs/view.do?bIdx=364436&mId=0301010000&ptIdx=35), [2026 부모급여](https://www.korea.kr/news/policyFocusView.do?newsId=148957936&pkgId=49500831), [국민행복카드·건강보험 임신출산 진료비](https://www.incheon.go.kr/jobs/main/support/welfare/view.do?search=SEhiVlBCbUcvb3dzRUNwZHFtdmd6aW9RZ2h3R0NXUHl4dGxxSjZhSUxiYUhwS1crQ1plcm05T3JkOXNMV2ZSeA%3D%3D&wl_srvc_sn=636)
- 서울: [서울형 손주돌봄수당](https://umppa.seoul.go.kr/hmpg/sprt/bzin/bzmgComtDetail.do?biz_mng_no=59F45FE9BC024848AD07143C962E6869), [임산부 교통비](https://seoul-agi.seoul.go.kr/pregnant-transportation-support), [서울 산후조리경비](https://seoul-agi.seoul.go.kr/postpartum-care)
- 경기도: [가족돌봄수당 2026·시군별 모집](https://gg24.gg.go.kr/svcreqst/selectSvcReqst.do?svc_seq=931), [산후조리비](https://gg24.gg.go.kr/svcreqst/selectSvcReqst.do?svc_seq=803)
- 기타: 지역별 실거주 요건·중복 여부·시군구 추가 지원은 사용자 등록 거주지역에서 직접 자격 확인이 필요. 연도 변경 때 최신 공고로 갱신.

## 7. 전체 GitHub 커밋 로그 (2026-11-12, 문서 작성 전)

| 순번 | 커밋 시각 | 커밋 | 내용 |
|---:|---|---|---|
| 1 | 2026-11-12 04:23 UTC | [cadfd3fa0](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/cadfd3fa0bbdbd47436355cd522d17f5bd499779) | chore: initialize family baby checklist repository |
| 2 | 2026-11-12 04:24 UTC | [6eef9598f](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/6eef9598f2e28d3cdd1ac7ccf62550440059c28b) | feat: add encrypted family checklist web app v1.1 |
| 3 | 2026-11-12 04:26 UTC | [2aa4c1200](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/2aa4c1200b641a148b840956d159f86f21ab198d) | ci: verify JavaScript syntax and family checklist presets |
| 4 | 2026-11-12 04:44 UTC | [166967f37](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/166967f3769761a6fb0ebe34d975094219fc426b) | fix: auto-configure bound Google Sheets and GitHub origin on enrollment |
| 5 | 2026-11-12 04:44 UTC | [3ecf4b99b](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/3ecf4b99bbda5b83ed2755a0131041e71d8782e0) | docs: streamline Google Apps Script setup with automatic DB binding |
| 6 | 2026-11-12 04:48 UTC | [8894b0a18](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/8894b0a187274b3818db6db2be658dacb85ee94d) | feat: replace long password with four-digit family PIN keypad |
| 7 | 2026-11-12 04:54 UTC | [25af08511](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/25af08511d9f83a44f6057f63b66dca9d8132eb7) | fix: prevent cached styles/scripts from breaking 4-digit PIN keypad |
| 8 | 2026-11-12 04:59 UTC | [6f025fb94](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/6f025fb94ccdf0c763076da7ec9935e7f135101e) | feat: make Google Apps Script deployment single-file (no HTML file setup) |
| 9 | 2026-11-12 04:59 UTC | [6d3b8ceea](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/6d3b8ceea28f7b6d6c0ed2decbb080c0176052bc) | docs: streamline first-time Apps Script installation to one Code.gs paste |
| 10 | 2026-11-12 05:00 UTC | [ba26b6fc3](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/ba26b6fc3e5aba12b075781d77b021dc4fec6cdf) | ci: validate single-file Apps Script backend syntax |
| 11 | 2026-11-12 05:00 UTC | [7a2f0612f](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/7a2f0612f1c921b249fc9fadefc8f0de03dc3d72) | ux: use one-time 8-digit family invitation codes |
| 12 | 2026-11-12 05:05 UTC | [554597380](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/554597380b3bde357ec3c215aa345a4252de2f3b) | security: define minimum Google Sheets OAuth scope explicitly |
| 13 | 2026-11-12 05:05 UTC | [046dd4b48](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/046dd4b485d80300578992584fe4e73205d0ff14) | docs: diagnose Google's hard OAuth block and offer safe preview path |
| 14 | 2026-11-12 05:05 UTC | [05405cbab](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/05405cbabdad6f198fb2d3f0e68e9f4b8920d834) | ci: verify Apps Script requests only necessary Sheets OAuth scope |
| 15 | 2026-11-12 05:13 UTC | [3cc4a97f5](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/3cc4a97f56c9f18d1de3aaf44c4643f64a8eaafc) | docs: add family-app OAuth branding, policies and blocked-authorization recovery guide |
| 16 | 2026-11-12 05:41 UTC | [d41ba2d7c](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/d41ba2d7cc6c71d975401d41b2fc225daa395837) | chore: verify FAMILY-BABY-CHECK site ownership in Google Search Console |
| 17 | 2026-11-12 05:58 UTC | [c5449496a](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/c5449496a7ce9a1b6c6f68a4ef82b95db7fd5a8b) | feat: connect deployed family Google Apps Script backend |
| 18 | 2026-11-12 06:00 UTC | [23c7e67ff](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/23c7e67ffaccc3e7d5d7a0c8acb5427f2b11a84e) | test: confirm published Apps Script web app responds publicly |
| 19 | 2026-11-12 06:01 UTC | [8c5a09a89](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/8c5a09a8964e929bae872ec60f84ca8f8796e5c0) | test: verify Apps Script bridge nonce and allowed GitHub origin |
| 20 | 2026-11-12 06:02 UTC | [ffc3c13ef](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/ffc3c13ef6f21a9f79b1c71c4aa45d5b409bb9bd) | test: expose bounded bridge response details when nonce endpoint fails |
| 21 | 2026-11-12 06:03 UTC | [ab6c1f67a](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/ab6c1f67a923deafa6929faaf7eacc3233ec2d52) | test: accept Google HTMLService iframe wrapper in bridge smoke check |
| 22 | 2026-11-12 06:14 UTC | [06a6ec3f1](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/06a6ec3f1ef31b4c2128ecef58e15e8c32bab601) | feat: remember last selected family on each device without storing PIN |
| 23 | 2026-11-12 06:21 UTC | [e3553adab](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/e3553adab3b95178f232c7333bbc425ef00b5841) | ux: show progress on every page and during PIN login, simplify primary navigation |
| 24 | 2026-11-12 06:26 UTC | [4c4f8c961](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/4c4f8c961f8f8d31cb13e8c13ff51fe70bfecc16) | ux: quick-add checklist, category filters, and compact editor preserving advanced fields |
| 25 | 2026-11-12 06:27 UTC | [2db463ab5](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/2db463ab594bf726e554bfc81176c205685f6e4b) | ux: make home quick actions single-field entry and derive baby age from settings |
| 26 | 2026-11-12 06:28 UTC | [588624825](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/58862482585dcf2e159fc73b9d8382f8b633009c) | test: cover simplified navigation, quick entry, hidden field retention and progress |
| 27 | 2026-11-12 06:32 UTC | [7db92ed5b](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/7db92ed5bbe8547bb43959dce01252d7c8f81b6b) | feat: catalog national Seoul and Gyeonggi family benefits by pregnancy and child stage |
| 28 | 2026-11-12 06:34 UTC | [3b59cc440](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/3b59cc440e46ad630aa72080877d83aaba98a931) | feat: family benefits navigator with region stage and encrypted per-family checklist states |
| 29 | 2026-11-12 06:35 UTC | [07dfded3b](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/07dfded3bfe3f4f5b58f4f781039001ffab85d24) | fix: remove stray escape characters from family benefits view templates |
| 30 | 2026-11-12 06:36 UTC | [a40095d63](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/a40095d632653a97c03e6e86d72bdc4a1685d280) | fix: show month-start deadline for grandparent-care applications and separate review/applied states |
| 31 | 2026-11-12 06:36 UTC | [9ecf1a507](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/9ecf1a5075c3a34df73319543c81cd7209691b70) | style: accessible mobile family benefit cards, filters and settings region inputs |
| 32 | 2026-11-12 06:37 UTC | [a1efc74fa](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commit/a1efc74fa5de9eeb9baf7338be5ca830565ab654) | test: family benefits coverage by stage and region, month-first application, legacy state retention |

이 문서 작성 커밋 이후 기록은 [전체 GitHub 커밋](https://github.com/hossea123456789-design/FAMILY-BABY-CHECK/commits/main/)을 기준으로 계속 추가한다.
