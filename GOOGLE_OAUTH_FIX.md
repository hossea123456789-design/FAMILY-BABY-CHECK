# FAMILY-BABY-CHECK — Google OAuth 승인 차단 해결 절차

최종 점검: 2026-11-12

## 증상과 과거 찬양팀 앱의 차이

- WORSHIP-SCHEDULE: Google OAuth '외부 / 테스트'였고, 테스트 앱의 7일 재승인 문제 때문에 브랜딩·승인 도메인 등록 후 프로덕션으로 게시했습니다.
- FAMILY-BABY-CHECK: 신규 Apps Script의 기본 Google Cloud 프로젝트에서 **처음부터** '차단된 앱: 민감한 정보 접근 차단'이 표시됩니다. 이전 사건과 동일한 원인이라고 단정할 수 없습니다.
- 2026-10월 공개 버그 사례: https://issuetracker.google.com/issues/571856421
- 표준 Google Cloud 프로젝트로 전환하고 승인 사용자로 추가하여 성공했다는 유사 사례: https://issuetracker.google.com/issues/572515608

## 권장: 별도의 표준 Google Cloud 프로젝트

찬양팀의 운영 중인 OAuth 프로젝트를 재사용하면 관련 승인 상태가 바뀔 가능성이 있어 이번 앱은 분리합니다.

1. https://console.cloud.google.com/projectcreate 에서 새 Cloud 프로젝트를 만듭니다. 이름: `family-baby-check-oauth`.
2. https://console.cloud.google.com/auth/overview 에서 생성한 프로젝트를 선택하고 Google Auth Platform 초기 설정을 수행합니다.
   - Branding 이름: `우리 가족 체크노트`
   - User support email: 앱 운영자 계정
   - Audience: `External`
   - 처음에는 `Testing`으로 두고 소유자 Google 계정을 Test users에 등록
   - 홈페이지: https://hossea123456789-design.github.io/FAMILY-BABY-CHECK/
   - 개인정보처리방침: https://hossea123456789-design.github.io/FAMILY-BABY-CHECK/privacy.html
   - 이용약관: https://hossea123456789-design.github.io/FAMILY-BABY-CHECK/terms.html
   - Authorized domains: `hossea123456789-design.github.io` (경로·프로토콜 없음)
   - Data Access: Google Sheets `https://www.googleapis.com/auth/spreadsheets` 권한이 필요한지 확인
3. https://console.cloud.google.com/cloud-resource-manager 에서 새 프로젝트의 **프로젝트 번호 (Project Number, 숫자만)**를 복사합니다. 프로젝트 ID 문자열과 구분하세요.
4. 가족 체크노트 DB에서 열었던 Apps Script 편집기로 돌아가서 **프로젝트 설정 → Google Cloud 프로젝트 → 프로젝트 변경**에 그 번호를 넣고 설정합니다.
5. `Code.gs`의 `generateEnrollmentCodes`를 **한 번 실행**해 승인합니다. 실행 로그에는 3가족의 8자리 초대 코드가 출력됩니다. 공개 채팅이나 GitHub에 붙여넣지 마세요.
6. 권한 승인이 되면 `배포 → 새 배포 → 웹 앱`, `실행 사용자: 나`, `액세스 권한: 모든 사용자`로 배포하고 `/exec` URL을 전달하세요.
7. 7일 만료를 피하려면 OAuth 인증 문제가 해결된 후 **프로덕션 게시**를 진행합니다. Google의 OAuth 검증 요건은 사용 범위와 운영 방식에 따라 달라질 수 있습니다.

이 방법은 **지원되는 정식 설정 경로**지만, '차단된 앱'이 계정 정책·Google 측 버그라면 성공이 보장되지는 않습니다. 표준 Cloud 프로젝트에서 승인 오류가 계속되면 오류 화면과 Google Auth Platform의 Publishing Status를 확인하세요.

## GitHub 코드 / Sheets 데이터 상태

- 앱 프런트: https://hossea123456789-design.github.io/FAMILY-BABY-CHECK/
- 전용 DB: Google Drive에서 '우리 가족 체크노트_DB_암호문 전용' 검색
- 최소 스코프: `apps-script/appsscript.json` (Google Sheets 접근만 선언)
- **주의:** `SpreadsheetApp.openById()`는 전체 spreadsheets scope를 요구합니다. 웹앱 실행에서 `getActiveSpreadsheet()`는 동작하지 않을 수 있으므로 단순히 `spreadsheets.currentonly`로 바꾸면 서버 동작이 깨질 수 있습니다.
- 정책 페이지: https://hossea123456789-design.github.io/FAMILY-BABY-CHECK/privacy.html , https://hossea123456789-design.github.io/FAMILY-BABY-CHECK/terms.html

## 운영 중인 WORSHIP-SCHEDULE 설정 보호

WORSHIP-SCHEDULE 코드, Google Sheets DB, Cloud OAuth 게시 상태는 변경하지 않습니다.
