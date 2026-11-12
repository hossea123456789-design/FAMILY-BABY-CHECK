# AGENTS.md — FAMILY-BABY-CHECK 후속 작업자 지침

## 시작 시 반드시 읽기
먼저 [PROJECT_HANDOFF.md](./PROJECT_HANDOFF.md) → [CHANGELOG.md](./CHANGELOG.md) → 실제 소스/CI 순서로 읽는다. 사용자가 다음 대화에서 "후속 제작"이라고만 해도 여기서 마지막 완료·미검증을 먼저 복원한다.

## 실행 규칙
1. GitHub MCP로 가능한 파일 업로드/수정/커밋/검증은 작업자가 직접 한다. 사용자에게 수동 GitHub 업로드를 요구하지 않는다.
2. 최신 파일과 브랜치 SHA, 현재 Apps Script/Google Sheets 상태를 확인하고 안전하게 변경한다.
3. 사용자에게 버튼을 안내할 때는 제공된 화면이나 공식 최신 UI에서 확인된 정확한 명칭·위치를 사용하고, 존재하지 않는 버튼을 추측하지 않는다.
4. 작업이 끝나면 같은 작업 단위에서 **PROJECT_HANDOFF.md**의 현재 상태·이슈·원인·패치·커밋·테스트·미완료를 갱신한다. 기능 변경은 CHANGELOG도 작성.
5. GitHub Action 성공과 Android/PC 렌더링, GAS 실제 저장/재로그인/동기화 E2E는 서로 다른 증거다. 실제로 검사하지 않은 것을 완료로 표시하지 않는다.
6. 원본 재무 워크북과 기존 WORSHIP-SCHEDULE/YUHA-CARE 앱은 허가 없이 수정하지 않는다.
7. 공개 GitHub에 초대코드 8자리, PIN, 자녀 실명·실제 출생일, 가족 수급/지출 상세, 사용자 데이터, 복호화 키, Google Sheets ID를 올리지 않는다.
8. 다른 저장소에서 작업할 때도 해당 저장소에 전용 인수인계 MD를 만들어 동일 규칙을 적용한다. 본 파일 자체가 다른 저장소를 자동 수정하지는 않는다.
