"use client";

import { useMemo, useState } from "react";
import styles from "./prototypeDashboard.module.css";
import { drilldownOptions, entities, filterGroups, metrics, periods, type PrototypeMetric } from "./prototypeData";

type Variant = "operations" | "saas" | "command";

type PrototypeDashboardProps = {
  variant: Variant;
};

const variantCopy: Record<Variant, { label: string; title: string; description: string }> = {
  operations: {
    label: "A",
    title: "Dense Operations",
    description: "운영자가 많은 필터와 테이블을 빠르게 훑는 고밀도 업무형"
  },
  saas: {
    label: "B",
    title: "Modern SaaS Analytics",
    description: "넓은 여백, 부드러운 컨트롤, 읽기 쉬운 보고형"
  },
  command: {
    label: "C",
    title: "Command Center",
    description: "관제형 헤더와 강한 계층으로 상태 판단을 빠르게 하는 분석형"
  }
};

const formatValue = (value: number, format: PrototypeMetric["format"]) => {
  if (format === "percent") return `${(value * 100).toFixed(1)}%`;
  if (value < 10) return value.toFixed(1);
  return Math.round(value).toLocaleString("ko-KR");
};

const getDelta = (values: number[]) => values[values.length - 1] - values[values.length - 2];

function Icon({ name }: { name: "search" | "save" | "download" | "filter" | "ai" | "close" }) {
  const paths = {
    search: <><circle cx="10" cy="10" r="5.4" /><path d="m14.2 14.2 4.3 4.3" /></>,
    save: <><path d="M5 4h11l3 3v13H5z" /><path d="M8 4v6h8" /><path d="M8 20v-6h8v6" /></>,
    download: <><path d="M12 4v10" /><path d="m8 10 4 4 4-4" /><path d="M5 18h14" /></>,
    filter: <><path d="M4 5h16l-6 7v5l-4 2v-7z" /></>,
    ai: <><path d="M12 3l1.7 5.1L19 10l-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></>,
    close: <><path d="m6 6 12 12" /><path d="M18 6 6 18" /></>
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      {paths[name]}
    </svg>
  );
}

function MiniSparkline({ values }: { values: number[] }) {
  const width = 104;
  const height = 30;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max === min ? 1 : max - min;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });
  return (
    <svg className={styles.sparkline} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="trend">
      <polyline points={points.join(" ")} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1].split(",")[0]} cy={points[points.length - 1].split(",")[1]} r="2.5" fill="currentColor" />
    </svg>
  );
}

function HeatCell({ value, format, metricId }: { value: number; format: PrototypeMetric["format"]; metricId: string }) {
  const scale = metricId.includes("loss") ? 1 - Math.min(value / 0.2, 1) : format === "percent" ? value : Math.min(value / 450, 1);
  const level = Math.max(0.08, Math.min(scale, 1));
  return (
    <td>
      <span className={styles.heatCell} style={{ "--heat": level } as React.CSSProperties}>
        {formatValue(value, format)}
      </span>
    </td>
  );
}

export default function PrototypeDashboard({ variant }: PrototypeDashboardProps) {
  const [selectedMetricIds, setSelectedMetricIds] = useState(metrics.slice(0, 5).map((metric) => metric.id));
  const [isMetricPanelOpen, setMetricPanelOpen] = useState(true);
  const [openFilterId, setOpenFilterId] = useState<string | null>("area_group");
  const [drilldownEntity, setDrilldownEntity] = useState<string | null>("고양시");
  const [showDeltas, setShowDeltas] = useState(true);

  const selectedMetrics = useMemo(
    () => metrics.filter((metric) => selectedMetricIds.includes(metric.id)),
    [selectedMetricIds]
  );

  const heroMetrics = selectedMetrics.slice(0, 3).map((metric) => {
    const series = entities[0].values[metric.id];
    return { metric, latest: series[series.length - 1], delta: getDelta(series), values: series };
  });

  return (
    <main className={`${styles.prototypeShell} ${styles[variant]}`}>
      <header className={styles.prototypeHeader}>
        <a className={styles.backLink} href="/prototype">← Prototype</a>
        <div className={styles.brandBlock}>
          <span className={styles.brandMark}>K</span>
          <div>
            <h1>Kevin</h1>
            <p>{variantCopy[variant].title}</p>
          </div>
        </div>
        <div className={styles.headerMeta}>
          <span>{variantCopy[variant].description}</span>
          <button className={styles.iconButton} type="button" aria-label="Kevin AI">
            <Icon name="ai" />
          </button>
        </div>
      </header>

      <section className={styles.designIntro}>
        <div>
          <span className={styles.variantBadge}>Prototype {variantCopy[variant].label}</span>
          <h2>{variantCopy[variant].title}</h2>
        </div>
        <p>흰색 바탕과 맨시티 블루 포인트는 유지하고, 필터·지표 패널·테이블·드릴다운·AI 진입까지 같은 기능 표면을 더미데이터로 구성했습니다.</p>
      </section>

      <section className={styles.controlBand}>
        <div className={styles.templateTabs} aria-label="템플릿 탭">
          {["템플릿", "템플릿2", "템플릿3"].map((tab, index) => (
            <button key={tab} className={`${styles.templateTab} ${index === 0 ? styles.active : ""}`} type="button">
              {tab}
            </button>
          ))}
          <button className={styles.addTab} type="button" aria-label="템플릿 추가">+</button>
        </div>

        <div className={styles.filterRows}>
          <div className={styles.filterRow}>
            <button className={`${styles.selectButton} ${styles.primarySelect}`} type="button">지표 선택 ({selectedMetrics.length})</button>
            <button className={styles.selectButton} type="button">기간단위 : 월</button>
            <button className={styles.selectButton} type="button">기간범위 : 최근 6개월</button>
            {filterGroups.slice(0, 2).map((group) => (
              <div key={group.id} className={styles.dropdownWrap}>
                <button className={styles.selectButton} type="button" onClick={() => setOpenFilterId(openFilterId === group.id ? null : group.id)}>
                  {group.label} ({group.selected.length})
                </button>
                {openFilterId === group.id && (
                  <div className={styles.dropdownMenu}>
                    <button type="button">전체 선택</button>
                    <button type="button">전체 해제</button>
                    {group.values.map((value) => (
                      <label key={value}>
                        <input type="checkbox" defaultChecked={group.selected.includes(value)} />
                        <span>{value}</span>
                        <small>지정</small>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className={styles.filterRow}>
            <button className={styles.selectButton} type="button">측정단위 : 지역</button>
            {filterGroups.slice(2).map((group) => (
              <div key={group.id} className={styles.dropdownWrap}>
                <button className={styles.selectButton} type="button" onClick={() => setOpenFilterId(openFilterId === group.id ? null : group.id)}>
                  {group.label} ({group.selected.length})
                </button>
                {openFilterId === group.id && (
                  <div className={styles.dropdownMenu}>
                    <button type="button">전체 선택</button>
                    <button type="button">전체 해제</button>
                    {group.values.map((value) => (
                      <label key={value}>
                        <input type="checkbox" defaultChecked={group.selected.includes(value)} />
                        <span>{value}</span>
                        <small>지정</small>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className={styles.actionCluster}>
              <button className={styles.iconButton} type="button" aria-label="필터 초기화"><Icon name="filter" /></button>
              <button className={styles.iconButton} type="button" aria-label="템플릿 저장"><Icon name="save" /></button>
              <button className={styles.iconButton} type="button" aria-label="엑셀 다운로드"><Icon name="download" /></button>
              <button className={styles.searchButton} type="button"><Icon name="search" />조회</button>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.summaryStrip}>
        {heroMetrics.map(({ metric, latest, delta, values }) => (
          <article key={metric.id} className={styles.kpiCard}>
            <div>
              <span>{metric.category}</span>
              <strong>{metric.name}</strong>
            </div>
            <b>{formatValue(latest, metric.format)}</b>
            <MiniSparkline values={values} />
            {showDeltas && <em className={delta >= 0 ? styles.up : styles.down}>{delta >= 0 ? "+" : ""}{formatValue(delta, metric.format)}</em>}
          </article>
        ))}
      </section>

      <section className={styles.workspace}>
        {isMetricPanelOpen && (
          <aside className={styles.metricPanel}>
            <div className={styles.panelHeader}>
              <div>
                <h3>지표 선택</h3>
                <p>카테고리와 담당자는 연동 필터로 가정</p>
              </div>
              <button className={styles.iconButton} type="button" aria-label="닫기" onClick={() => setMetricPanelOpen(false)}><Icon name="close" /></button>
            </div>
            <div className={styles.metricFilters}>
              <button type="button">분류 전체</button>
              <button type="button">담당 전체</button>
            </div>
            <input className={styles.metricSearch} placeholder="지표명/ID/설명 검색" />
            <div className={styles.metricList}>
              {metrics.map((metric) => {
                const selected = selectedMetricIds.includes(metric.id);
                return (
                  <button
                    key={metric.id}
                    type="button"
                    className={`${styles.metricItem} ${selected ? styles.selected : ""}`}
                    onClick={() =>
                      setSelectedMetricIds((current) =>
                        selected ? current.filter((id) => id !== metric.id) : [...current, metric.id]
                      )
                    }
                  >
                    <strong>{metric.name}</strong>
                    <span>{metric.id}</span>
                    <p>{metric.description}</p>
                    <small>{metric.owner} · {metric.category}</small>
                  </button>
                );
              })}
            </div>
            <div className={styles.panelFooter}>
              <button type="button">선택 초기화</button>
              <button type="button" disabled={selectedMetrics.length === 0}>선택완료</button>
            </div>
          </aside>
        )}

        <section className={styles.tableArea}>
          <div className={styles.resultToolbar}>
            <div>
              <h3>지역별 월간 성과</h3>
              <p>지역그룹(전체) &gt; 지역(경기) 기준 더미 결과</p>
            </div>
            <label className={styles.toggleLabel}>
              <input type="checkbox" checked={showDeltas} onChange={(event) => setShowDeltas(event.target.checked)} />
              증감 노출
            </label>
          </div>
          <div className={styles.tableScroll}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>측정단위</th>
                  <th>엔티티</th>
                  <th>지표명</th>
                  <th>추세</th>
                  {periods.map((period) => <th key={period}>{period}</th>)}
                </tr>
              </thead>
              <tbody>
                {entities.flatMap((entity) =>
                  selectedMetrics.map((metric, metricIndex) => {
                    const values = entity.values[metric.id];
                    return (
                      <tr key={`${entity.name}-${metric.id}`}>
                        {metricIndex === 0 && <td rowSpan={selectedMetrics.length}>{entity.unit}</td>}
                        {metricIndex === 0 && (
                          <td rowSpan={selectedMetrics.length} className={styles.entityCell}>
                            <button type="button" onClick={() => setDrilldownEntity(drilldownEntity === entity.name ? null : entity.name)}>
                              {entity.name}
                            </button>
                            {drilldownEntity === entity.name && (
                              <div className={styles.drilldownMenu}>
                                <strong>{entity.name} 드릴다운</strong>
                                {drilldownOptions.map((option) => <button key={option} type="button">{option}</button>)}
                              </div>
                            )}
                          </td>
                        )}
                        <td>{metric.name}</td>
                        <td><MiniSparkline values={values} /></td>
                        {values.map((value, index) => (
                          <HeatCell key={`${entity.name}-${metric.id}-${periods[index]}`} value={value} format={metric.format} metricId={metric.id} />
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className={styles.aiPanel}>
          <div className={styles.panelHeader}>
            <div>
              <h3>Kevin AI</h3>
              <p>현재 조회 조건 기반 요약</p>
            </div>
            <span className={styles.aiBadge}>beta</span>
          </div>
          <div className={styles.aiMessage}>
            <strong>요약</strong>
            <p>강남구와 고양시는 진행률과 매칭률이 함께 상승했습니다. 계양구는 로스율 개선이 보이지만 전체 매치 수가 아직 낮습니다.</p>
          </div>
          <div className={styles.recoChips}>
            <button type="button">로스율 높은 지역 보기</button>
            <button type="button">월별 매칭률 비교</button>
          </div>
          <div className={styles.chatInput}>
            <input placeholder="Kevin에게 질문" />
            <button type="button">전송</button>
          </div>
        </aside>
      </section>
    </main>
  );
}
