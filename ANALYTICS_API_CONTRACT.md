# Analytics API Contract

## 1. 목적
- BigQuery migration 이후에도 유지해야 하는 현재 분석 API 계약을 고정한다.
- 새 프로젝트는 이 계약을 깨지 않고 provider만 교체하는 것을 원칙으로 한다.

## 2. 공통 원칙
- 응답 shape는 기존 프론트가 그대로 사용할 수 있어야 한다.
- 잘못된 입력은 `400`
- 서버 내부 장애는 `500`
- 인증이 필요한 저장 기능은 `401`
- 분석 API는 모두 server-side only provider를 통해 구현한다.

## 3. Endpoints
### 3.1 `GET /api/weeks`
#### Query
- `n`: optional integer
- `range`: optional, `latest`
- `includeStartDate`: optional boolean-like

#### Response
```json
{ "weeks": ["26.03.09 - 03.15", "26.03.16 - 03.22"] }
```

or

```json
{
  "weeks": [
    { "week": "26.03.09 - 03.15", "startDate": "2026-03-09" }
  ]
}
```

#### Semantics
- 최신 주차부터 정확히 잘려야 한다.
- 1 week당 1 row 기준으로 정렬돼야 한다.

### 3.2 `GET /api/metrics`
#### Response
```json
{
  "metrics": [
    {
      "metric": "total_match_cnt",
      "korean_name": "전체 매치 수",
      "description": "...",
      "query": "...",
      "category2": "매치",
      "category3": "기본"
    }
  ]
}
```

#### Semantics
- UI의 지표 선택 패널이 그대로 동작해야 한다.
- category2/category3는 그룹핑에 사용된다.

### 3.3 `GET /api/measurement-units`
#### Response
```json
{
  "units": [
    { "value": "all", "label": "전체" },
    { "value": "area_group", "label": "지역그룹" }
  ]
}
```

#### Semantics
- 정렬 순서는 현재 UI 기대 순서를 유지해야 한다.
- retired 단위는 제외한다.

### 3.4 `GET /api/filter-options`
#### Query
- `measureUnit`: required
- `parentUnit`: optional
- `parentValue`: optional
- `week`: optional repeated

#### Response
```json
{
  "options": ["경기", "서울", "대전"]
}
```

#### Semantics
- parent context와 weeks 범위를 고려해야 한다.
- 드릴다운 직후의 entity 선택 리스트가 이 응답에 의존한다.

### 3.5 `GET /api/drilldown-options`
#### Query
- `sourceUnit`: required
- `sourceValue`: required
- `candidate`: required repeated
- `week`: optional repeated

#### Response
```json
{
  "options": [
    { "value": "area", "label": "지역" },
    { "value": "stadium_group", "label": "구장" }
  ]
}
```

#### Semantics
- 실제 row가 있는 다음 drilldown만 반환해야 한다.
- 단순 label 목록이 아니라 `{ value, label }` 형태를 유지해야 한다.

### 3.6 `POST /api/heatmap`
#### Request
```json
{
  "measureUnit": "area_group",
  "weeks": ["26.03.09 - 03.15", "26.03.16 - 03.22"],
  "metrics": ["total_match_cnt", "manager_match_cnt"],
  "filterValue": null,
  "primaryMetricId": "total_match_cnt",
  "parentUnit": null,
  "parentValue": null
}
```

#### Response
```json
{
  "rows": [
    {
      "entity": "경기",
      "week": "26.03.09 - 03.15",
      "metrics": {
        "total_match_cnt": 123,
        "manager_match_cnt": 80
      }
    }
  ]
}
```

#### Semantics
- 응답은 entity x week row array다.
- 각 row는 `metrics` map을 가진다.
- 없는 값은 0 또는 null 처리 정책을 현재 UI 기대와 맞춰야 한다.
- parent drilldown context를 반영해야 한다.

## 4. 비분석 API
### 4.1 `GET /api/filter-templates`
### 4.2 `POST /api/filter-templates`
### 4.3 `PATCH /api/filter-templates/[id]`
### 4.4 `DELETE /api/filter-templates/[id]`

이 API들은 BigQuery migration 범위 밖이며, 계속 Supabase를 사용한다.

## 5. Provider 교체 시 구현 대상
- `getWeeksData`
- `getMetricDictionary`
- `getMeasurementUnitOptions`
- `getFilterOptions`
- `getAvailableDrilldownUnits`
- `getHeatmap`

새 프로젝트에서는 이 함수들의 구현체만 BigQuery provider로 교체하면 된다.
