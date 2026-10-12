# 출근체크 관리자 (attendance-app-admin)

[attendance-app](../attendance-app)의 관리자 웹. 회사 전체의 출퇴근 · 휴가 · 직원 · 근무지를 한곳에서 관리합니다.
[Vite](https://vite.dev) + React + TypeScript, API는 [attendance-app-server](../attendance-app-server)의 `/admin/*`을 씁니다.

## 시작하기

```bash
npm install
cp .env.example .env     # VITE_API_BASE_URL 에 서버 주소 (기본 http://localhost:3000)
npm run dev              # http://localhost:5173
```

서버가 먼저 떠 있어야 합니다. 앱에서 쓰는 **관리자(`role: 'manager'`) 계정**으로 로그인합니다.
데모 데이터를 넣었다면 회사명 `데모회사`, 사번 `1001`, 비밀번호 `1234`.

```bash
npm run build       # 타입 검사 후 dist/ 로 빌드 (정적 파일. 어느 경로로 들어와도 index.html 을 주도록 호스팅 설정)
npm run typecheck
```

## 화면

| 경로 | 화면 | 하는 일 |
| --- | --- | --- |
| `/` | 오늘 현황 | 출근 · 지각 · 휴가 · 미출근 인원과 직원별 근무 구간. 1분마다 새로 읽습니다. |
| `/attendance` | 근태 기록 | 월 · 직원 · 상태로 걸러 보고 CSV로 내려받습니다. |
| `/leaves` | 휴가 | 회사 전체의 결재 대기와 연도별 내역. 승인 · 반려 |
| `/employees` | 직원 | 직원 추가, 인사 정보 · 권한 · 입사일 · 연간 연차 수정, 비밀번호 재설정, 퇴사 처리 |
| `/worksite` | 근무지 | 위치 · 허용 반경 · 근무시간 |

## 알아 둘 규칙

서버의 규칙을 그대로 따릅니다.

- **관리자** — 따로 관리자 등급이 있지 않고 `manager` 역할이면 누구나 이 페이지를 쓸 수 있습니다.
  부서 팀장을 관리자로 지정하면 그 사람도 회사 전체 직원을 관리하게 됩니다.
- **휴가 결재** — 신청자와 같은 부서의 관리자만 결재하고, 본인 신청은 결재하지 못합니다.
  다른 부서의 신청은 목록에는 보이지만 버튼 대신 담당 부서가 표시됩니다.
- **본인 계정** — 본인의 권한을 내리거나 스스로 퇴사 처리할 수 없습니다.
- **퇴사 처리** — 로그인만 막고 기록은 지우지 않습니다. 다시 재직으로 돌릴 수 있습니다.
- **시각** — 기기가 아니라 `VITE_TIMEZONE`(기본 `Asia/Seoul`)으로 표시합니다. 서버의 `APP_TIMEZONE`과 같게 둡니다.

## 구조

```
src/
  api/          # client.ts (fetch · 토큰 · 오류 문장), admin.ts (엔드포인트), types.ts (서버와 같은 타입)
  hooks/        # use-auth (세션), use-query (읽기 · 다시 읽기)
  components/   # layout (메뉴), ui (Pill · Field · Modal 등)
  pages/        # 화면 하나에 파일 하나
  lib/          # format (날짜 · 시각 · 상태 라벨), csv
  styles.css    # 디자인 토큰과 전체 스타일. 바탕과 상태색은 앱의 theme.ts 와 같고, 강조는 검정입니다.
```
