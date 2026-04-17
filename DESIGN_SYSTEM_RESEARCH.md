# Kevin Dashboard Design System Research

## Goal
Kevin 대시보드의 실제 운영 화면을 바로 변경하지 않고, 동일한 기능 표면을 가진 별도 프로토타입에서 디자인 방향을 검증한다.

기본 컨셉:
- 흰색 바탕
- 맨체스터 시티 블루 계열 포인트 컬러
- 운영/매칭/PX팀이 많은 필터와 대형 테이블을 빠르게 읽는 내부 분석 도구
- 기존 기능 표면 유지: 기간/측정단위 2줄 필터, 지표 선택 패널, 다중 선택 드롭다운, heatmap 테이블, sparkline, 엔티티 드릴다운, Kevin AI

## Reference Systems

### IBM Carbon
Source: https://carbondesignsystem.com/components/data-table/usage/

Observed strengths:
- 데이터 테이블의 toolbar, search, table action 영역이 명확하다.
- 고밀도 업무 화면에서 필터/검색/내보내기 같은 global action을 테이블 위에 모으는 패턴이 Kevin과 잘 맞는다.
- 행/툴바/페이지네이션의 규칙이 명확해 운영 대시보드에 적용하기 쉽다.

Kevin fit:
- 대형 테이블과 export, 필터, 표시 설정을 한 줄에 정리하는 데 유리하다.
- 다만 Carbon 그대로 적용하면 다소 엔터프라이즈 느낌이 강해질 수 있어, 색상과 여백은 Kevin 도메인에 맞게 조정한다.

### Elastic UI
Source: https://eui.elastic.co/

Observed strengths:
- Kibana 계열의 분석/관측 도구에 최적화된 고밀도 layout, forms, panels, tables가 강점이다.
- 복잡한 필터와 결과 테이블, 사이드 패널을 같은 화면에서 다루는 패턴이 Kevin과 유사하다.
- composable component 사고방식이 기존 React 구조와 잘 맞는다.

Kevin fit:
- 필터 2줄 구조, 지표 패널, 테이블 중심 화면에 가장 직접적으로 참고하기 좋다.
- 지나치게 많은 border와 dense control은 사용자의 피로도를 만들 수 있어 A안에서만 강하게 사용한다.

### Microsoft Fluent 2
Sources:
- https://fluent2.microsoft.design/
- https://fluent2.microsoft.design/layout
- https://learn.microsoft.com/en-us/fluent-ui/web-components/components/data-grid

Observed strengths:
- 4px 기반의 정돈된 spacing, responsive layout, 편안한 form/control 표현이 좋다.
- Data Grid는 tabular data 표현에 초점을 두며, 업무용 SaaS UI에 익숙한 인상을 준다.
- hover/focus/selection state가 부드럽고 접근성 기준을 세우기 좋다.

Kevin fit:
- 비개발 운영자가 장시간 볼 화면에는 Fluent 계열의 부담 없는 밀도가 잘 맞을 수 있다.
- 화면 정보량이 너무 줄어들면 Kevin의 빠른 비교성이 약해지므로 B안은 여백을 늘리되 테이블 밀도는 유지한다.

### Atlassian Design System / Analytics
Sources:
- https://atlassian.design/design-system
- https://support.atlassian.com/analytics/docs/chart-and-dashboard-templates/
- https://support.atlassian.com/analytics/docs/create-charts-on-your-dashboard/

Observed strengths:
- 토큰, foundation, component, pattern이 잘 분리되어 있어 실제 적용 단계에서 design token 문서화에 유리하다.
- Analytics 문서에서 chart/dashboard template, chart building, interactive legend 같은 분석 화면 패턴을 확인할 수 있다.
- 협업/업무 도구 느낌이 강하고, 설명 가능한 UI에 적합하다.

Kevin fit:
- 템플릿 저장, 공유 가능한 조회 조건, Kevin AI 추천 질문 같은 협업형 기능과 잘 맞는다.
- 단순 카드형 SaaS로 흐르면 대형 테이블의 밀도가 약해질 수 있어, 테이블은 별도 원칙을 유지한다.

## Prototype Directions

2026-04-17 correction:
- 프로토타입은 실제 `plab-kevin` 대시보드의 UI 구성을 바꾸지 않는다.
- 세 후보 모두 동일한 정보 구조를 유지한다.
  - 상단 헤더
  - 템플릿 탭
  - 지표 선택 row
  - 기간 필터 row
  - 측정단위 필터/action row
  - 결과 테이블
  - 엔티티 드릴다운 메뉴
  - Kevin AI 사이드 패널
  - 지표 선택 사이드 패널
- A/B/C 차이는 레이아웃 변경이 아니라 색상, border, radius, density, emphasis의 차이로만 둔다.

### Prototype A: Dense Operations
Route: `/prototype/design-a`

Design intent:
- 실제 Kevin 운영 화면 구성을 유지한 상태에서 Carbon + Elastic UI 계열의 compact density를 적용한다.
- border와 compact control을 사용하되 필터 row, 테이블, 패널 위치는 기존과 동일하게 둔다.

Best for:
- 필터/테이블 사용 빈도가 높은 운영팀.
- 데이터가 많아도 화면 이동 없이 빠르게 비교해야 하는 업무.

Risks:
- 초보 사용자에게는 다소 빽빽하게 느껴질 수 있다.
- 시각적 휴식이 적어 AI/요약 영역의 중요도가 약해질 수 있다.

### Prototype B: Modern SaaS Analytics
Route: `/prototype/design-b`

Design intent:
- 실제 Kevin 운영 화면 구성을 유지한 상태에서 Fluent 2 + Atlassian 계열의 부드러운 control 표현을 적용한다.
- 흰색 배경, 맨시티 블루 포인트, 조금 더 부드러운 radius와 여백을 사용한다.

Best for:
- 운영팀 외 이해관계자까지 같이 보는 화면.
- 향후 보고서/템플릿/AI 요약 기능을 더 강조할 방향.

Risks:
- 너무 넓어지면 Kevin의 핵심인 대형 테이블 스캔 속도가 떨어질 수 있다.
- 실제 적용 시 필터 영역의 높이와 결과 테이블 첫 화면 노출량을 별도 검증해야 한다.

### Prototype C: Command Center
Route: `/prototype/design-c`

Design intent:
- 실제 Kevin 운영 화면 구성을 유지한 상태에서 헤더와 테이블 헤더의 대비만 강화한다.
- 흰색 바탕을 유지하되 상단 헤더와 테이블 헤더에서 짙은 네이비를 사용해 상태 판단을 빠르게 한다.
- 맨시티 블루는 primary action과 heatmap 강조에 사용한다.

Best for:
- 매일 아침 주요 지표를 빠르게 점검하는 ritual 화면.
- 현재 데이터 상태, 이상치, 드릴다운 탐색을 강하게 보여주고 싶은 방향.

Risks:
- 어두운 헤더가 브랜드/운영 도구 느낌을 강하게 만들 수 있다.
- 기존 Kevin의 가벼운 흰색 화면과 차이가 커서 실제 적용 전 선호도 확인이 필요하다.

## Suggested Evaluation Criteria

각 프로토타입은 같은 더미 데이터와 기능 표면을 사용한다. 선택 시 아래 기준으로 평가한다.

- 실제 운영 화면과 동일한 필터 2줄 구조가 한눈에 들어오는가
- 지표 선택 패널에서 지표명/ID/설명/담당자 정보를 빠르게 훑을 수 있는가
- 대형 테이블에서 엔티티, 지표명, 기간 값, heatmap 농도가 잘 읽히는가
- 드릴다운 메뉴가 자연스럽고 테이블과 충돌하지 않는가
- Kevin AI 영역이 방해되지 않으면서 필요할 때 눈에 띄는가
- 모바일/좁은 화면에서 최소한의 구조가 유지되는가
- 실제 운영 화면에 구조 변경 없이 스타일 토큰 중심으로 이식할 수 있는가

## Recommended Next Implementation Plan

1. 세 프로토타입 중 하나를 선택한다.
2. 선택된 방향을 design token으로 정리한다.
   - color
   - typography
   - spacing
   - radius
   - border
   - shadow
   - control height
   - table density
3. 실제 적용은 단계적으로 진행한다.
   - 전역 token 및 layout shell
   - button/select/dropdown
   - 검색 필터 영역
   - 지표 선택 패널
   - 결과 테이블과 heatmap
   - Kevin AI 패널과 상태 화면
4. 각 단계마다 `npm run build`, `git diff --check`, 브라우저 필터/조회/드릴다운 확인을 수행한다.

## Current Prototype Files

- `app/prototype/page.tsx`
- `app/prototype/design-a/page.tsx`
- `app/prototype/design-b/page.tsx`
- `app/prototype/design-c/page.tsx`
- `app/prototype/_components/PrototypeDashboard.tsx`
- `app/prototype/_components/prototypeData.ts`
- `app/prototype/_components/prototypeDashboard.module.css`

## Static HTML Prototypes

2026-04-17 second pass:
- 목적은 디자인만 빠르게 확인하는 것이므로 Next 라우트와 분리된 정적 HTML 파일을 추가한다.
- 기존 Kevin 정보 구조는 유지한다.
  - 헤더
  - 템플릿 탭
  - 지표 선택 row
  - 기간 필터 row
  - 측정단위/action row
  - 결과 테이블
  - 드릴다운 메뉴
  - Kevin AI 패널
  - 지표 선택 사이드 패널
- 파일은 `public/design-prototypes/` 아래에 둔다.
- 제거 시 해당 폴더만 삭제하면 되므로 운영 앱과 쉽게 분리된다.

Files:
- `public/design-prototypes/kevin-linear.html`
  - Linear의 dashboard/filter/productivity UI 감각을 참고한 세련된 흰 배경 + 맨체스터 시티 블루 포인트 스타일
  - 저장된 view, 빠른 필터, compact table scan에 초점
- `public/design-prototypes/kevin-pajamas.html`
  - GitLab Pajamas의 dashboard/data visualization 패턴을 참고한 데이터 제품형 스타일
  - 명확한 panel boundary, table header hierarchy, dashboard-level filtering에 초점

References:
- Linear dashboards and filters:
  - https://linear.app/docs/dashboards
  - https://linear.app/docs/filters
- GitLab Pajamas dashboards and data visualization:
  - https://design.gitlab.com/patterns/dashboards
  - https://design.gitlab.com/data-visualization/
- Shopify Polaris Index Filters:
  - https://polaris-react.shopify.com/components/selection-and-input/index-filters
