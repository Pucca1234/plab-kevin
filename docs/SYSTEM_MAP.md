# 시스템 맵

## 요약
`plab-kevin`은 내부 KPI 분석용 Next.js App Router 대시보드입니다. 현재 구현 기준으로 분석 조회는 BigQuery를 사용하고, 인증과 템플릿, 사용자별 앱 데이터는 Supabase가 담당합니다.

## 주요 제품 영역
### 대시보드 셸과 오케스트레이션
- 목적: 최상위 상태, 데이터 로딩 순서, 검색 실행, 드릴다운 컨텍스트, 내보내기 흐름 관리
- 핵심 파일: `app/page.tsx`
- 주요 책임:
  - 지표, 기간, 측정단위, 템플릿 로딩
  - 지표 선택 상태와 필터 상태 유지
  - 엔티티 드릴다운 및 기간 드릴다운 히스토리 유지
  - 상태 변경 후 자동 재조회 예약
  - 현재 옵션 집합에 맞춰 선택값 정규화
  - 조회용 기간 목록과 표시용 기간 목록 계산

### 필터 및 검색 컨트롤
- 핵심 파일: `app/components/ControlBar.tsx`
- 관련 API:
  - `app/api/filter-units/route.ts`
  - `app/api/filter-options/route.ts`
  - `app/api/filter-options-batch/route.ts`
  - `app/api/period-filter-units/route.ts`
- 현재 동작:
  - 2줄 구성 검색 영역
  - 기간/측정단위 단일 선택
  - 동적 다중 선택 필터
  - 템플릿 탭 및 저장 액션
  - 내보내기와 초기화 액션

### 결과 테이블과 드릴다운
- 핵심 파일:
  - `app/components/MetricTable.tsx`
  - `app/components/EntityMetricTable.tsx`
- 관련 API:
  - `app/api/heatmap/route.ts`
  - `app/api/drilldown-options/route.ts`
  - `app/api/raw-data/route.ts`
- 현재 동작:
  - 전체 단위는 metric table 사용
  - 엔티티 단위는 grouped entity table 사용
  - 엔티티 클릭 시 portal 기반 드릴다운 메뉴 표시
  - 기간 헤더는 드릴다운과 정렬을 분리된 클릭 영역으로 제공
  - 현재 또는 미완료 기간은 흐리게 표시되고 sparkline 추세 계산에서 제외

### 분석 provider 계층
- 핵심 파일:
  - `app/lib/dataQueries.ts`
  - `app/lib/analytics/provider.ts`
  - `app/lib/analytics/bigqueryProvider.ts`
  - `app/lib/analytics/bigqueryShared.ts`
  - `app/lib/analytics/bigqueryClient.ts`
- 현재 동작:
  - provider 추상화로 분석 백엔드 선택을 숨김
  - BigQuery provider가 weeks, metrics, measurement units, filter units, filter options, drilldown options, heatmap을 처리
  - 기간단위, 부모 컨텍스트, source-only 필터 여부에 따라 serving table 경로와 source table 경로를 전환

### 템플릿과 사용자 설정
- 관련 API:
  - `app/api/filter-templates/route.ts`
  - `app/api/filter-templates/[id]/route.ts`
  - `app/api/user-preferences/route.ts`
- 현재 동작:
  - 템플릿은 사용자 기준으로 저장되며 shared/default 플래그를 가질 수 있음
  - 템플릿 목록은 `created_at asc` 기준으로 정렬
  - 기본 탭과 저장 템플릿 탭은 UI에서 서로 다른 개념으로 동작

### AI 어시스턴트
- 핵심 파일:
  - `app/components/AiChat.tsx`
  - `app/components/chat/*`
  - `app/api/ai/chat/route.ts`
  - `app/api/ai/summary/route.ts`
- 현재 동작:
  - summary API는 현재 대시보드 컨텍스트에서 결정적 요약 문장을 생성
  - chat API는 사용 가능한 옵션과 현재 데이터로 system prompt를 구성
  - chat 응답은 필터 적용 action과 chart payload를 반환할 수 있음
  - `ANTHROPIC_API_KEY`가 있으면 Anthropic 사용, 없으면 fallback 응답 사용

## 보조 영역
- 인증:
  - `app/login/page.tsx`
  - `app/auth/callback/route.ts`
  - `app/lib/supabase/*`
- 프로토타입:
  - `app/prototypes/page.tsx`
- 내보내기:
  - `app/api/export-sheets/route.ts`
  - `app/page.tsx`의 클라이언트 Excel 생성 로직

## 데이터 흐름
1. 클라이언트가 지표, 측정단위, 기간, 템플릿, 사용자 상태를 로드합니다.
2. 사용자가 기간단위, 기간범위, 측정단위, 지표, 동적 필터를 선택합니다.
3. 클라이언트가 표시 가능한 기간과 active filter를 계산합니다.
4. heatmap과 옵션 관련 API를 호출합니다.
5. provider가 serving-table 경로 또는 source-table 경로를 선택합니다.
6. 결과 테이블이 렌더링되고, 엔티티 또는 기간 드릴다운이 가능해집니다.
7. 템플릿 저장과 AI 액션은 Supabase 기반 앱 API를 통해 처리됩니다.

## 현재 문서 공백
- `ANALYTICS_API_CONTRACT.md`는 인코딩이 깨져 있어 현재 기준 문서로 신뢰하기 어렵습니다.
- export, auth, prototype 영역은 아직 기능별 PRD로 분리되지 않았습니다.
- 일부 UI 소스의 한글 문자열은 인코딩 문제로 읽기 어려워 별도 정리 계획이 필요합니다.
