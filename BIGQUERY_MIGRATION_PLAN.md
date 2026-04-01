# BigQuery Direct Query Migration Plan

## 1. 목적
- 분석 데이터 조회 경로를 `Supabase(Postgres raw + MV)`에서 `BigQuery serving layer`로 전환한다.
- `Supabase`는 인증, 템플릿 저장, 사용자 설정 등 앱 기능용 데이터 저장소로만 유지한다.
- 기존 대시보드 기능과 응답 shape를 유지하면서, Airbyte 및 주간 MV 재생성 의존도를 제거한다.

## 2. 배경
- 현재 분석 데이터 경로:
  - `BigQuery -> Airbyte -> Supabase(bigquery schema) -> MV 재생성 -> Next.js API`
- 현재 운영 이슈:
  - Airbyte 적재 지연/실패 시 대시보드 데이터 반영 지연
  - Supabase raw sync 이후 `weeks_view`, `weekly_agg_mv`, `weekly_expanded_agg_mv` 복구 필요
  - PostgREST schema cache, statement timeout, temp disk 등 운영 장애 반복
  - Airbyte/Supabase 비용이 분석 데이터 read path 때문에 과도하게 발생

## 3. 목표 아키텍처
- 앱 기능 데이터:
  - `Supabase Auth`
  - 템플릿 저장/관리 테이블
  - 사용자별 설정 테이블
- 분석 데이터:
  - `BigQuery serving dataset`를 Next.js 서버에서 직접 조회
- 목표 조회 경로:
  - `BigQuery raw/source -> BigQuery serving tables/views -> Next.js API -> UI`

## 4. 핵심 원칙
- 브라우저에서 BigQuery를 직접 호출하지 않는다.
- `Next.js server route` 또는 서버 전용 데이터 레이어만 BigQuery에 접근한다.
- 기존 API 계약은 유지한다.
  - `GET /api/weeks`
  - `GET /api/filter-options`
  - `POST /api/heatmap`
  - `GET /api/drilldown-options`
- raw table 직접 scan을 기본 전략으로 삼지 않는다.
- BigQuery 안에 앱 서빙용 집계 레이어를 먼저 만든다.

## 5. 권장 데이터 모델
### 5.1 BigQuery serving dataset
- 예시 dataset: `kevin_serving`
- 필요 객체:
  - `weeks_view`
  - `entity_hierarchy`
  - `weekly_agg`
  - `weekly_expanded_agg`

### 5.2 역할
- `weeks_view`
  - 최신 주차 목록, 정렬 기준 제공
- `entity_hierarchy`
  - `area_group -> area -> stadium_group -> stadium` 관계 제공
- `weekly_agg`
  - legacy 단위(`all`, `area_group`, `area`, `stadium_group`, `stadium`) 서빙
- `weekly_expanded_agg`
  - 확장 단위(`*_and_time`, `time`, `hour`) 서빙

### 5.3 집계 규칙
- `cnt` 계열: `MAX`
- `rate` 계열: `AVG`
- 그레인:
  - `weekly_agg`: `(week, measure_unit, filter_value, metric_id)`
  - `weekly_expanded_agg`: 기존 앱 드릴다운에 필요한 parent dimension 포함

## 6. 애플리케이션 설계
### 6.1 Data Provider 분리
- 새 프로젝트에서 분석 데이터 접근 계층을 provider 단위로 분리한다.
- 인터페이스 예시:
  - `getWeeksData()`
  - `getFilterOptions()`
  - `getHeatmap()`
  - `getAvailableDrilldownUnits()`
  - `getMetricDictionary()`
  - `getMeasurementUnitOptions()`

### 6.2 Provider 구성
- `supabaseAnalyticsProvider`
  - 현재 기준 동작 보존용
- `bigqueryAnalyticsProvider`
  - 신규 기본 provider

### 6.3 인증/설정 데이터
- 로그인, 세션, 저장 탭, 템플릿 CRUD는 기존 Supabase 경로 유지
- 분석 API만 BigQuery provider로 교체

## 7. 새 프로젝트 전략
- 현재 프로젝트를 기반으로 별도 프로젝트를 만든다.
- 권장 방식:
  - UI/도메인 로직은 최대한 재사용
  - data access layer만 교체
- 이유:
  - 기존 제품 규칙/드릴다운/응답 shape가 이미 충분히 복잡함
  - 신규 프로젝트를 완전 새로 만들면 재현 비용이 큼

## 8. 단계별 실행 계획
### Phase 0. 사전 조사
- BigQuery 원천 테이블/컬럼/적재 패턴 재확인
- 현재 API 요청 패턴과 응답 shape 고정
- Supabase에 남겨야 할 테이블 목록 명시

### Phase 1. BigQuery serving layer 설계
- `weeks_view` 대응 쿼리 정의
- `entity_hierarchy` 생성 쿼리 정의
- `weekly_agg` 생성 쿼리 정의
- `weekly_expanded_agg` 생성 쿼리 정의
- 비용/성능 기준:
  - 최근 8/12/24주 조회 최적화
  - 최대 bytes billed 제한 검토
  - 필요한 경우 scheduled query 또는 partitioned table 사용

### Phase 2. 새 프로젝트 생성
- 기존 repo를 기반으로 별도 프로젝트 디렉터리 생성
- Supabase auth/template 기능 유지
- analytics provider 추상화 도입
- BigQuery credentials 및 server-only access 구성

### Phase 3. API 이식
- `GET /api/weeks`
- `GET /api/filter-options`
- `POST /api/heatmap`
- `GET /api/drilldown-options`
- 응답 shape와 필드명은 기존과 동일하게 유지

### Phase 4. 병행 검증
- 같은 요청에 대해 현행 프로젝트와 신규 프로젝트 결과 비교
- 비교 대상:
  - 최근 8주
  - 최근 12주
  - 최근 24주
  - legacy 단위
  - expanded 단위
  - drilldown

### Phase 5. 전환 판단
- 기능 일치
- 성능 허용
- 비용 절감 확인
- 운영 단순화 확인

## 9. 검증 기준
- `/api/weeks` 최신 주차 누락 없음
- `all/area_group/area/stadium_group/stadium` 결과가 현행과 실질적으로 동일
- 확장 단위 결과(`time`, `*_and_time`)도 기존 대비 회귀 없음
- drilldown 옵션/결과가 기존과 동일한 경로로 동작
- 최신 적재일 기준 화요일 반영 후 별도 MV 복구 배치 없이 조회 가능

## 10. 리스크
- BigQuery raw 직접 조회 시 비용/응답시간 급증 가능
- serving layer 없이 바로 붙이면 기존 Supabase MV 경로보다 느릴 수 있음
- 기존 응답 shape와 drilldown semantics 재현 누락 위험
- 권한/보안 설정 미흡 시 서비스 계정 노출 위험

## 11. 권장 의사결정
- 채택:
  - `Supabase는 auth/app data 전용`, `분석 데이터는 BigQuery 직접 서빙`
- 비채택:
  - 브라우저에서 BigQuery 직접 호출
  - raw table 중심 조회
  - 기존 운영 프로젝트에 즉시 인플레이스 교체

## 12. 바로 다음 작업
1. 새 프로젝트 범위 정의
2. 현행 API 계약 정리
3. BigQuery serving layer SQL 초안 작성
4. 새 프로젝트 디렉터리/브랜치 전략 결정
5. provider abstraction부터 구현 시작
