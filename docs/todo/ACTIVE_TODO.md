# 현재 TODO

## 즉시 처리할 항목
### DOC-010
- Status: `done`
- Source: 2026-05-28 신규 지표 미노출 이슈 조사
- Why: BigQuery 확인 결과 `metric_store_native`와 `data_mart_1_social_match`에는 존재하지만 `kevin_serving.weekly_agg`/`weekly_expanded_agg`에는 없는 지표가 확인됐고, 현재 `bq:validate-serving`은 `manager_match_cnt`만 검증해서 이런 누락을 잡지 못합니다.
- Next action: 신규 자동화 구조 설계는 `DOC-011`에서 이어갑니다.
- References:
  - `scripts/bigquery/build-serving-layer.mjs`
  - `scripts/bigquery/validate-serving-layer.mjs`
  - `app/lib/analytics/bigqueryProvider.ts`
  - `docs/feature-prds/ANALYTICS_BACKEND_PRD.md`

### DOC-011
- Status: `todo`
- Source: 2026-05-28 BigQuery 반영 구조 개선 요청
- Why: source scheduler와 serving rebuild가 따로 움직이면 신규 numeric metric 반영 누락이나 늦은 반영을 사전에 잡기 어렵습니다.
- Next action: 매일 source 갱신 이후 numeric metric sync 검증, serving rebuild, post-rebuild 검증을 한 흐름으로 묶는 운영 계획과 구현 후보를 정리합니다.
- References:
  - `scripts/bigquery/build-serving-layer.mjs`
  - `scripts/bigquery/validate-serving-layer.mjs`
  - `docs/feature-prds/ANALYTICS_BACKEND_PRD.md`

### DOC-012
- Status: `done`
- Source: 2026-05-29 필터 UX 구조 재설계 요청
- Why: 현재 동적 필터는 자동 계산과 상호 영향이 과도해서 사용자가 방금 본 후보 리스트를 다시 신뢰하기 어렵고, 선택한 필터가 뒤쪽 필터를 좁힌 뒤 그 계산 결과가 다시 앞쪽 필터를 흔드는 구조가 예측 불가능성을 키웁니다.
- Next action: 배포와 수동 회귀는 `DOC-013`에서 이어갑니다.
  1. 필터 기능 단위 분해
     - 필터 영향 방향 정의
     - 필터 최초 후보 리스트 보존 규칙
     - 다음 필터 후보 계산 규칙
     - 필터 반영 중 pending 상태 처리
     - 선택 해제 및 초기화 복원 규칙
     - 드릴다운/기간 필터 결합 규칙
     - 회귀 테스트 시나리오 정리
  2. 단방향 영향 규칙 고정
     - 원칙: 선택한 필터는 아직 선택하지 않은 다음 필터에만 영향을 줍니다.
     - 금지: 뒤쪽 필터 후보를 계산한 결과가 앞쪽 필터 후보를 다시 줄이거나 재정렬하면 안 됩니다.
     - 예시:
       - `지역그룹` 최초 후보: `서울`, `경기`, `인천`
       - `구장그룹` 최초 후보: `A`, `B`, `C`, `D`, `E`
       - 사용자가 `지역그룹=서울`을 선택하면 `구장그룹` 후보는 `A`, `B`처럼 서울에 속한 값으로 좁혀질 수 있습니다.
       - 이후 `구장그룹`을 열었다고 해서 `지역그룹` 후보가 `서울`만 남도록 다시 줄어들면 안 됩니다.
  3. 최초 후보 리스트 보존 규칙 설계
     - 원칙: 사용자가 특정 필터를 처음 열었을 때 본 후보 리스트는 이후 다시 열어도 그대로 보여야 합니다.
     - 예시:
       - 상태: `측정단위=구장`, `기간범위=최근 8주`
       - 사용자가 `지역그룹`을 처음 열어 `서울`, `경기`, `인천`을 확인합니다.
       - 이후 `서울`을 선택하더라도 `지역그룹`을 다시 열면 같은 세 값이 보여야 하고, 선택 체크만 `서울`에 남아 있어야 합니다.
  4. 다음 필터 후보 계산 규칙 설계
     - 원칙: 다음 필터는 직전까지 확정된 선택 결과 안에서 가능한 후보 전체를 보여줍니다.
     - 예시:
       - `지역그룹=서울` 선택 후 `구장그룹`을 처음 열면 서울에 속한 `A`, `B` 전체를 보여줍니다.
       - 여기서 `A`만 선택했더라도 `구장그룹`을 다시 열면 `A`, `B`를 그대로 다시 볼 수 있어야 합니다.
  5. 선택 변경 및 해제 규칙 설계
     - 원칙: 상위 필터를 바꾸면 하위 필터 후보는 재계산되지만, 그 재계산이 상위 필터를 다시 바꾸면 안 됩니다.
     - 예시:
       - `지역그룹=서울`
       - `구장그룹=A,B`
       - 사용자가 `지역그룹`을 `경기`로 변경
       - 기대 결과:
         - `구장그룹` 후보는 경기 기준으로 새로 계산됩니다.
         - 기존 `A,B`가 새 후보에 없으면 선택 해제됩니다.
         - 이 변화는 `지역그룹` 변경 1회에 의해 발생한 것으로 취급합니다.
         - 반대로 `구장그룹` 재계산 결과가 `지역그룹` 후보를 다시 흔들면 안 됩니다.
  6. pending UX 정의
     - 원칙: 필터 반영 중에는 상태 경합을 막기 위해 다른 액션을 잠시 비활성화합니다.
     - 검토 대상:
       - 다른 필터 드롭다운 열기
       - 추가 선택/해제
       - 조회 버튼
       - 드릴다운 클릭
       - 템플릿 적용
     - 예시:
       - 사용자가 필터를 선택한 직후 API 응답이 끝날 때까지 다른 필터와 드릴다운 클릭을 막고, 현재 반영 중인 필터에 로딩 표시를 붙입니다.
  7. 드릴다운/기간 필터 결합 규칙 정리
     - 원칙: 필터 UX 재설계 후에도 드릴다운 컨텍스트와 기간 필터 컨텍스트는 유지되어야 합니다.
     - 예시:
       - 엔티티 드릴다운 상태에서 `지역그룹` 필터를 바꿔도 현재 depth는 유지되어야 합니다.
       - 기간 필터가 함께 있을 때도 단방향 영향 규칙은 동일하게 적용되어야 합니다.
  8. 회귀 시나리오 문서화
     - 첫 번째 필터 리스트 유지 확인
     - 상위 필터가 하위 필터만 좁히는지 확인
     - 하위 필터 계산이 상위 필터를 다시 바꾸지 않는지 확인
     - 선택 해제 후 후보 복원 확인
     - 드릴다운 상태에서 같은 규칙 유지 확인
     - 기간 필터와 함께 써도 같은 규칙 유지 확인
- References:
  - `app/page.tsx`
  - `app/components/ControlBar.tsx`
  - `app/components/MultiSelectDropdown.tsx`
  - `app/lib/analytics/bigqueryShared.ts`
  - `docs/feature-prds/FILTER_AND_SEARCH_PRD.md`
  - `docs/feature-prds/DRILLDOWN_PRD.md`

### DOC-013
- Status: `todo`
- Source: `DOC-012` 구현 후속
- Why: 단방향 필터 UX는 `NEXT_PUBLIC_FILTER_UX_V2_ENABLED=1`일 때만 활성화되도록 넣었고, 배포 전후에 실제 브라우저 회귀와 롤백 경로 확인이 필요합니다.
- Next action:
  1. preview 또는 dev 환경에 `NEXT_PUBLIC_FILTER_UX_V2_ENABLED=1`을 켭니다.
  2. `지역그룹 -> 구장그룹 -> 면` 순서처럼 상위 필터가 하위 필터만 좁히는지 확인합니다.
  3. 필터를 다시 열었을 때 같은 상위 컨텍스트에서는 처음 본 후보 리스트가 유지되는지 확인합니다.
  4. 필터 반영 중 다른 필터, 조회, 드릴다운, 템플릿 클릭이 잠시 막히는지 확인합니다.
  5. 문제 발생 시 `NEXT_PUBLIC_FILTER_UX_V2_ENABLED=0`으로 즉시 롤백 가능한지 배포 경로까지 검증합니다.
- References:
  - `app/page.tsx`
  - `app/components/ControlBar.tsx`
  - `app/components/MultiSelectDropdown.tsx`
  - `docs/feature-prds/FILTER_AND_SEARCH_PRD.md`

### DOC-009
- Status: `todo`
- Source: `DOC-008` 후속
- Why: provider 레벨에서는 복합 필터 export 정합성을 확인했지만, 현재 로컬 환경은 인증 세션이 없으면 `/login`으로 강제 리다이렉트되므로 실제 로그인 후 UI에서 Excel/Sheets 내보내기까지 누르는 브라우저 회귀는 아직 남아 있습니다.
- Next action: 인증 가능한 환경에서 로그인 후 `area_group=서울` + `stadium_group` 복합 필터 같은 실제 시나리오로 내보내기를 눌러, 다운로드 시트와 화면 결과가 일치하는지 최종 확인합니다.
- References:
  - `app/login/page.tsx`
  - `app/page.tsx`
  - `docs/feature-prds/EXPORT_AND_RAW_DATA_PRD.md`

### DOC-002
- Status: `done`
- Source: 코드 구조 검토 결과
- Why: 운영 중인 Kevin 대시보드 기능 기준으로 PRD 커버리지를 넓힐 필요가 있었습니다.
- Next action: prototype은 제외하고, 이후에는 기존 PRD의 최신성 보강과 기능 간 중복 정리에 집중합니다.
- References:
  - `docs/SYSTEM_MAP.md`
  - `app/api/export-sheets/route.ts`
  - `app/login/page.tsx`
  - `docs/feature-prds/AUTH_AND_ACCESS_PRD.md`
  - `docs/feature-prds/EXPORT_AND_RAW_DATA_PRD.md`

### DOC-003
- Status: `todo`
- Source: 문서 운영 규칙 수립 작업
- Why: 앞으로 모든 구현 작업에서 후속 TODO가 저장소에 남아야 하는데, 아직 팀 차원 습관으로 굳지 않았습니다.
- Next action: 이후 작업을 마칠 때마다 `docs/todo/*` 갱신을 기본 절차로 계속 적용합니다.
- References:
  - `docs/todo/README.md`
  - `docs/DOCUMENTATION_RULES.md`

## 이번 작업에서 완료한 항목
### DOC-000
- Status: `done`
- Source: 문서 재설계 요청
- Why: 문서 허브, 문서 규칙, 기능별 PRD, TODO 구조가 필요했습니다.
- Next action: 없음
- References:
  - `docs/README.md`
  - `docs/MASTER_PRD.md`
  - `docs/feature-prds/*`

### DOC-004
- Status: `done`
- Source: 이번 한글화 및 레거시 분리 요청
- Why: 새 문서 체계를 실제 운영 기준으로 쓰려면 문서 언어와 파일 역할이 명확해야 했습니다.
- Next action: 이후 문서 추가 시 같은 한글 기준과 구조를 유지합니다.
- References:
  - `README.md`
  - `PRD.md`
  - `레거시_README.md`
  - `레거시_PRD.md`

### DOC-005
- Status: `done`
- Source: 다중 PC 작업 연속성 확보 요청
- Why: 다른 PC에서도 같은 기준 문서를 바로 열고 이어서 작업할 수 있도록 상대경로 링크와 원격 백업이 필요했습니다.
- Next action: 이후 문서 링크는 저장소 기준 상대경로만 사용하고, 다음 기능 작업 전 `DOC-001`부터 이어서 진행합니다.
- References:
  - `README.md`
  - `PRD.md`
  - `docs/README.md`
  - `docs/DOCUMENTATION_RULES.md`

### DOC-001
- Status: `done`
- Source: 2026-05-26 문서 재구성 작업
- Why: 레거시 `레거시_README.md`, `레거시_PRD.md`에 남아 있던 핵심 실행 정보와 제품 정책을 새 문서 체계로 이관할 필요가 있었습니다.
- Next action: 남은 문서 작업은 운영 기능 기준 최신성 보강과 중복 정리입니다.
- References:
  - `레거시_README.md`
  - `레거시_PRD.md`
  - `README.md`
  - `PRD.md`
  - `docs/feature-prds/FILTER_AND_SEARCH_PRD.md`
  - `docs/feature-prds/ANALYTICS_BACKEND_PRD.md`

### DOC-006
- Status: `done`
- Source: 운영 기능 PRD 커버리지 점검 결과
- Why: 기능별 PRD는 운영 기능 전반을 덮기 시작했지만, 서로 중복되는 내용과 최신 구현이 덜 반영된 부분이 아직 남아 있습니다.
- Next action: 아래 순서로 진행합니다.
  1. 완료: `FILTER_AND_SEARCH_PRD.md`와 `DRILLDOWN_PRD.md`의 경계 재정리
  2. 완료: `TEMPLATES_AND_PREFERENCES_PRD.md`와 검색 상태 모델 연결 보강
  3. 완료: `AI_ASSISTANT_PRD.md`의 최신 운영 흐름과 제약 보강
  4. 완료: `EXPORT_AND_RAW_DATA_PRD.md`의 운영 우선 경로 명확화
- References:
  - `docs/MASTER_PRD.md`
  - `docs/feature-prds/FILTER_AND_SEARCH_PRD.md`
  - `docs/feature-prds/DRILLDOWN_PRD.md`
  - `docs/feature-prds/TEMPLATES_AND_PREFERENCES_PRD.md`
  - `docs/feature-prds/AI_ASSISTANT_PRD.md`
  - `docs/feature-prds/EXPORT_AND_RAW_DATA_PRD.md`

### DOC-007
- Status: `done`
- Source: `DOC-006` 내보내기 문서 최신화 과정
- Why: 원본 데이터 내보내기 경로가 현재 화면의 전체 `filterSelections`를 그대로 전달하지 않고 `filterValue` 요약 문자열 중심으로 동작해, 복합 필터 상황의 정합성 확인이 필요했습니다.
- Next action: 수정 후 실제 UI 기반 회귀 확인은 `DOC-008`에서 이어갑니다.
- References:
  - `app/page.tsx`
  - `app/api/raw-data/route.ts`
  - `app/api/export-sheets/route.ts`
  - `app/lib/analytics/bigqueryProvider.ts`
  - `docs/feature-prds/EXPORT_AND_RAW_DATA_PRD.md`

### DOC-008
- Status: `done`
- Source: `DOC-007` 구현 수정 후속
- Why: raw-data/export-sheets 경로가 active `filterSelections`를 전달하도록 바뀌었으므로, 복합 필터와 드릴다운이 있는 실제 시나리오에서 결과 정합성을 확인할 필요가 있었습니다.
- Next action: 인증 가능한 브라우저 환경에서 실제 로그인 후 UI 내보내기 회귀는 `DOC-009`에서 이어갑니다.
- References:
  - `app/page.tsx`
  - `app/api/raw-data/route.ts`
  - `app/api/export-sheets/route.ts`
  - `app/lib/analytics/bigqueryProvider.ts`
  - `docs/feature-prds/EXPORT_AND_RAW_DATA_PRD.md`
