# 프로젝트 메모리 — plab-kevin

Claude Code가 이 프로젝트에서 작업할 때 참고하는 컨텍스트입니다.

## 프로젝트 개요
- **목적**: 플랩풋볼 내부 KPI 분석 대시보드 (Next.js App Router)
- **분석 백엔드**: BigQuery (`ANALYTICS_BACKEND=bigquery` 설정 필수)
- **인증/사용자 데이터**: Supabase (Google OAuth)
- **배포**: Vercel

## 핵심 아키텍처

### 데이터 흐름
```
[BigQuery 소스 스케줄러] ~07:30 KST
        ↓
data_mart.data_mart_1_social_match  (read-only)
        ↓
[cron-job.org → workflow_dispatch] 08:00 KST 정시  (백업: 네이티브 schedule)
[GitHub Actions: Serving Rebuild] 소스 갱신 확인(최대 60분 대기) → rebuild → validate → Slack
        ↓
kevin_serving.weekly_agg / weekly_expanded_agg  ← 대시보드 메인
        ↓
Next.js API → 대시보드 UI
```

### Provider 선택 구조
`app/lib/analytics/provider.ts`:
- `ANALYTICS_BACKEND=bigquery` → BigQuery provider (운영 기준)
- 미설정 시 기본값 `supabase` → Supabase fallback (⚠️ 의도치 않은 전환 위험)

## 운영 스케줄러 현황 (2026-11-09 기준)

| 워크플로우 | 트리거 | 실제 실행 | 상태 |
|---|---|---|---|
| BigQuery Serving Rebuild | 주: cron-job.org dispatch 08:00 KST / 백업: `30 23 * * *` | 주: 08:00 KST 정시 / 백업: 당일 성공 시 skip | ✅ 활성 |
| Weekly MV Rebuild | (비활성화) | — | ⏸ 스케줄 트리거 제거 |
| Data Validation | (비활성화) | — | ⏸ PR 트리거 제거 |

### 정시 실행 구조 (2026-11-09, heat-wave 레포와 동일 원리)
- **원인**: GitHub 네이티브 schedule은 이 계정에서 지연이 크고 변동이 심함. 07:38 KST 설정이 실제 09:10~12:41 KST에 실행됨(2026-09~11 실측). cron 값을 당겨 맞추는 방식은 지연 폭이 계속 변해서 두 번(06-02, 08-11) 다 깨졌음 → **cron 재조정으로 해결하지 말 것.**
- **해법**: `workflow_dispatch`는 API 호출 즉시 실행됨(heat-wave에서 ±수십 초 확인). 외부 크론 cron-job.org가 매일 08:00 KST에 `POST /repos/Pucca1234/plab-kevin/actions/workflows/bigquery-serving-rebuild.yml/dispatches` 호출. 인증은 `Actions: Read and write`만 가진 fine-grained PAT (cron-job.org에만 저장, 레포엔 없음).
- **백업**: cron-job.org 점검/장애 대비로 네이티브 schedule 유지. `guard` 잡이 오늘(KST) 성공 실행이 있으면 rebuild/Slack 없이 종료. 백업으로 rebuild되면 Slack `트리거` 필드에 경고 표시 → cron-job.org 잡 점검.
- **소스 대기**: 정시 실행이라 소스 갱신과의 버퍼가 작음 → `scripts/bigquery/wait-source-fresh.mjs`가 소스 테이블 `lastModifiedTime`이 05:00 KST 이후인지 확인, 아니면 최대 60분 폴링. 끝까지 미갱신이면 rebuild는 진행하고 Slack에 `⚠️ 소스 미갱신` 표시.
- 수동 실행 시 `skip_source_wait` 입력으로 대기 생략 가능.

## 신규 지표 반영 구조
1. 구글 시트 `metric_store_native`에 지표 추가
2. `data_mart_1_social_match`에 동명 컬럼 존재 필수 (INNER JOIN으로 필터링)
3. 다음 Serving Rebuild 실행 시 자동 반영 (수동: GitHub Actions → Run workflow)
4. 현재 지표 수: **134개** (2026-06-02 기준)

## Slack 알림
- 채널: `#plab-kevin-update` (ID: `C0B6ZSZPU7R`)
- Serving Rebuild 성공/실패 시 자동 알림 (소스 갱신 시각·트리거 종류 포함, 백업 schedule이 skip한 날은 알림 없음)
- 시크릿: `SLACK_BOT_TOKEN` (2026-06-01 등록)

## 주요 문서 위치
- 시스템 전체 구조: `docs/SYSTEM_MAP.md`
- 분석 백엔드 규칙: `docs/feature-prds/ANALYTICS_BACKEND_PRD.md`
- 현재 TODO: `docs/todo/ACTIVE_TODO.md`
- 백로그: `docs/todo/BACKLOG_TODO.md`
- 문서 작성 규칙: `docs/DOCUMENTATION_RULES.md`

## 알려진 리스크 및 주의사항

### ⚠️ OPS-001 (pending)
Vercel에 `ANALYTICS_BACKEND=bigquery` 미설정 시 Supabase fallback으로 조용히 전환됨.
설정 여부 반드시 확인 필요.

### Serving Rebuild 자동 비활성화 (2026-10-11 발생, 해결)
GitHub은 저장소에 60일간 커밋이 없으면 schedule 워크플로우를 `disabled_inactivity`로 끔 → 실행 자체가 없어 슬랙 실패 알림도 안 옴.
대응: 워크플로우 `guard` 잡의 `Keepalive` 단계가 매 실행마다 enable API를 호출해 타이머를 리셋 (`permissions: actions: write` 필요).
그래도 꺼졌다면: Actions → BigQuery Serving Rebuild → Enable workflow → Run workflow.

### Data Validation 워크플로우 비활성화 (2026-06-02)
`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` 시크릿 미등록 + BigQuery 전환으로 실효성 없음.
재활성화 시: `data-validation.yml` `on:` 블록 주석 해제 + Supabase 시크릿 등록.

### FIL-004 (pending)
`stadium_group='부산'`에 실제로 `stadium='해운대구'`만 존재하는지 BigQuery 데이터 검증 미완.

## 브랜치 네이밍 규칙
`{이니셜}_{작업유형}_{YYMMDD}_{순번}`
예: `kevin_improvement_260602_01`
