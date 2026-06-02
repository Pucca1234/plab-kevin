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
[BigQuery 소스 스케줄러] ~07:40 KST
        ↓
data_mart.data_mart_1_social_match  (read-only)
        ↓
[GitHub Actions: Serving Rebuild] ~09:00 KST
        ↓
kevin_serving.weekly_agg / weekly_expanded_agg  ← 대시보드 메인
        ↓
Next.js API → 대시보드 UI
```

### Provider 선택 구조
`app/lib/analytics/provider.ts`:
- `ANALYTICS_BACKEND=bigquery` → BigQuery provider (운영 기준)
- 미설정 시 기본값 `supabase` → Supabase fallback (⚠️ 의도치 않은 전환 위험)

## 운영 스케줄러 현황 (2026-06-02 기준)

| 워크플로우 | cron 설정 | 실제 실행 | 상태 |
|---|---|---|---|
| BigQuery Serving Rebuild | `0 22 * * *` | ~09:00 KST (GitHub 2h 지연) | ✅ 활성 |
| Weekly MV Rebuild | `0 1 * * 2` | ~화 12:00 KST | ✅ 활성 |
| Data Validation | (비활성화) | — | ⏸ PR 트리거 제거 |

### GitHub Actions cron 지연 특성
- cron 설정 시각 + ~2시간 후 실제 실행 (1h51m~2h07m, 편차 16분으로 안정적)
- `0 22 * * *` 설정 → 실제 ~09:00 KST 실행
- source 갱신(~07:40 KST) 대비 최소 1h11m 버퍼

## 신규 지표 반영 구조
1. 구글 시트 `metric_store_native`에 지표 추가
2. `data_mart_1_social_match`에 동명 컬럼 존재 필수 (INNER JOIN으로 필터링)
3. 다음 Serving Rebuild 실행 시 자동 반영 (수동: GitHub Actions → Run workflow)
4. 현재 지표 수: **134개** (2026-06-02 기준)

## Slack 알림
- 채널: `#plab-kevin-update` (ID: `C0B6ZSZPU7R`)
- Serving Rebuild 성공/실패 시 자동 알림
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

### Data Validation 워크플로우 비활성화 (2026-06-02)
`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` 시크릿 미등록 + BigQuery 전환으로 실효성 없음.
재활성화 시: `data-validation.yml` `on:` 블록 주석 해제 + Supabase 시크릿 등록.

### FIL-004 (pending)
`stadium_group='부산'`에 실제로 `stadium='해운대구'`만 존재하는지 BigQuery 데이터 검증 미완.

## 브랜치 네이밍 규칙
`{이니셜}_{작업유형}_{YYMMDD}_{순번}`
예: `kevin_improvement_260602_01`
