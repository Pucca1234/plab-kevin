# KEVIN Dashboard Brand Identity — v3 (Deep Teal Premium)

> 작성일: 2026-03-16
> Visual Director — CDO Design Upgrade v3

## Design Rationale

### Target Emotion
신뢰, 전문성, 세련됨. 데이터를 다루는 내부 운영팀이 매일 사용하는 도구로서,
Mixpanel/Amplitude 수준의 프리미엄 분석 대시보드 느낌을 목표로 한다.

### Positioning Reflection
- 플랩풋볼 내부 운영 도구 → 외부 고객이 아닌 전문가 집단 대상
- 데이터 밀도가 높은 대시보드 → 가독성과 시각적 위계 최우선
- Indigo에서 Teal로 전환 → 분석/인사이트를 상징하는 색상, 더 차별화된 아이덴티티

### Reference Influence
- Mixpanel: 데이터 테이블의 깔끔한 레이아웃, 절제된 색상 사용
- Amplitude: 카드 기반 UI, 프리미엄 그림자, 세련된 타이포그래피

## Color Palette

### Primary — Deep Teal
| Token | Value | Usage |
|-------|-------|-------|
| --primary | #0D9488 | CTA, 활성 상태, 링크, 차트 주색 |
| --primary-hover | #0F766E | 호버 상태 |
| --primary-soft | rgba(13, 148, 136, 0.08) | 소프트 배경 |
| --primary-muted | #CCFBF1 | 밝은 배경, 선택 상태 |
| --disabled-bg | #99F6E4 | 비활성 배경 |

### Neutral — Cool Slate
| Token | Value |
|-------|-------|
| --bg | #FAFBFC |
| --bg-accent | #F1F5F9 |
| --ink | #0F172A |
| --muted | #64748B |
| --secondary | #475569 |
| --border | #E2E8F0 |

### Semantic
| Token | Value |
|-------|-------|
| --success | #059669 |
| --accent/--warning | #D97706 |
| --down | #DC2626 |

### Elevation
| Token | Value |
|-------|-------|
| --shadow | 0 8px 30px rgba(15,23,42,0.07), 0 2px 8px rgba(15,23,42,0.04) |
| --shadow-soft | 0 2px 8px rgba(15,23,42,0.05), 0 1px 3px rgba(15,23,42,0.03) |
| --shadow-xs | 0 1px 2px rgba(15,23,42,0.04) |

## Typography

### v3 Font Stack
| 용도 | 폰트 | 근거 |
|------|------|------|
| Display | **Outfit** | 현대적 기하학적 sans-serif. SaaS/분석 도구에 최적 |
| Body | **Pretendard** | 한글 가독성 최고. 데이터 레이블/설명에 최적화 |
| Mono | **JetBrains Mono** | 숫자 가독성 우수. 데이터 수치 표시에 최적 |

### Type Scale
| Level | Size | Weight | Line Height |
|-------|------|--------|-------------|
| h1 | 36px | 700 | 1.2 |
| h2 | 24px | 700 | 1.3 |
| h3 | 16px | 600 | 1.3 |
| body | 14px | 400 | 1.5 |
| caption | 12px | 400 | 1.4 |
| button | 14px | 600 | 1.0 |

## Spacing
- Base: 4px
- Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64

## Border Radius
| Token | Value | Usage |
|-------|-------|-------|
| --radius-sm | 6px | 배지, 작은 요소 |
| --radius-md | 10px | 입력, 드롭다운 |
| --radius-lg/--radius | 14px | 카드, 패널 |
| --radius-full | 999px | 버튼, 칩, 아바타 |

## Changes from v2 (Indigo → Teal)
- Primary: #4F46E5 (Indigo) → #0D9488 (Deep Teal)
- Background: #F8F9FC → #FAFBFC (미세 조정)
- Display Font: Sora → Outfit (더 현대적)
- Body Font: IBM Plex Sans KR → Pretendard (한글 가독성 최적화)
- Mono Font: IBM Plex Mono → JetBrains Mono (숫자 가독성)
- Radius: 16px → 14px (더 절제된 곡률)
- 하드코딩 색상 전부 CSS 변수로 교체

## Quality Checklist
- [x] 이모지 UI 아이콘 미사용 (SVG 인라인)
- [x] Tailwind 기본 파란색 미사용
- [x] Inter/Roboto 미사용 (Outfit + Pretendard)
- [x] 순수 Gray 미사용 (Slate 톤 사용)
- [x] WCAG AA 대비율 준수 (#0F172A on #FAFBFC = 16.7:1)
- [x] 하드코딩 색상 0개 (globals.css + login/page.tsx 전부 변수화)
