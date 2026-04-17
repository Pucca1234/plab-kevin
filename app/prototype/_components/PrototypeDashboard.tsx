"use client";

import { useMemo, useState } from "react";
import styles from "./prototypeDashboard.module.css";
import { drilldownOptions, entities, filterGroups, metrics, periods, type PrototypeMetric } from "./prototypeData";

type Variant = "operations" | "saas" | "command";

type PrototypeDashboardProps = {
  variant: Variant;
};

const variantCopy: Record<Variant, { label: string; title: string; note: string }> = {
  operations: {
    label: "A",
    title: "Dense Operations",
    note: "기존 구성 유지 + 가장 compact한 밀도"
  },
  saas: {
    label: "B",
    title: "Modern SaaS Analytics",
    note: "기존 구성 유지 + 조금 더 부드러운 컨트롤"
  },
  command: {
    label: "C",
    title: "Command Center",
    note: "기존 구성 유지 + 헤더/테이블 대비 강화"
  }
};

const formatValue = (value: number, format: PrototypeMetric["format"]) => {
  if (format === "percent") return `${(value * 100).toFixed(1)}%`;
  if (value < 10) return value.toFixed(1);
  return Math.round(value).toLocaleString("ko-KR");
};

const formatDelta = (value: number, format: PrototypeMetric["format"]) => {
  const sign = value >= 0 ? "+" : "";
  if (format === "percent") return `${sign}${(value * 100).toFixed(1)}%p`;
  return `${sign}${Math.round(value).toLocaleString("ko-KR")}`;
};

function Icon({ name }: { name: "search" | "save" | "download" | "reset" | "ai" | "close" | "chevron" }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m16.5 16.5 4 4" /></>,
    save: <><path d="M5 4h11l3 3v13H5z" /><path d="M8 4v6h8" /><path d="M8 20v-6h8v6" /></>,
    download: <><path d="M12 4v10" /><path d="m8 10 4 4 4-4" /><path d="M5 20h14" /></>,
    reset: <><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8" /><path d="M4 4v4h4" /></>,
    ai: <><path d="M12 3l1.7 5.1L19 10l-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9z" /></>,
    close: <><path d="m6 6 12 12" /><path d="M18 6 6 18" /></>,
    chevron: <path d="m7 10 5 5 5-5" />
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      {paths[name]}
    </svg>
  );
}

function MiniSparkline({ values }: { values: number[] }) {
  const width = 104;
  const height = 28;
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
      <polyline points={points.join(" ")} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SelectBox({ label, active = false, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button className={`${styles.selectBox} ${active ? styles.primarySelect : ""}`} type="button" onClick={onClick} title={label}>
      <span>{label}</span>
      <Icon name="chevron" />
    </button>
  );
}

export default function PrototypeDashboard({ variant }: PrototypeDashboardProps) {
  const [selectedMetricIds, setSelectedMetricIds] = useState(metrics.slice(0, 5).map((metric) => metric.id));
  const [isMetricPickerOpen, setMetricPickerOpen] = useState(true);
  const [isAiOpen, setAiOpen] = useState(true);
  const [openFilterId, setOpenFilterId] = useState<string | null>("area_group");
  const [expandedEntity, setExpandedEntity] = useState<string | null>("고양시");
  const [showDeltas, setShowDeltas] = useState(true);

  const selectedMetrics = useMemo(
    () => metrics.filter((metric) => selectedMetricIds.includes(metric.id)),
    [selectedMetricIds]
  );

  return (
    <main className={`${styles.prototypeShell} ${styles[variant]} ${isAiOpen ? styles.chatOpen : ""}`}>
      <header className={styles.appHeader}>
        <div className={styles.brand}>
          <h1><a href="/prototype">Kevin</a></h1>
          <p>{variantCopy[variant].title}</p>
        </div>
        <div className={styles.headerMeta}>
          <span>Prototype {variantCopy[variant].label}</span>
          <span>{variantCopy[variant].note}</span>
          <a href="/" className={styles.logoutButton}>운영 화면</a>
        </div>
      </header>

      <section className={styles.topControlsWrap}>
        <div className={styles.controlBarWrap}>
          <div className={styles.templateTabs}>
            {["템플릿", "템플릿2", "템플릿3"].map((tab, index) => (
              <button key={tab} className={`${styles.templateTab} ${index === 0 ? styles.active : ""}`} type="button">
                {tab}
              </button>
            ))}
            <button className={`${styles.templateTab} ${styles.addTab}`} type="button" aria-label="템플릿 추가">+</button>
            <div className={styles.templateSpacer} />
          </div>

          <div className={styles.searchPanel}>
            <div className={styles.metricRow}>
              <button className={`${styles.secondaryButton} ${styles.metricPickerButton}`} type="button" onClick={() => setMetricPickerOpen(true)}>
                지표 선택
              </button>
              <div className={styles.metricChips}>
                {selectedMetrics.map((metric) => (
                  <button
                    key={metric.id}
                    type="button"
                    className={styles.metricChip}
                    onClick={() => setSelectedMetricIds((current) => current.filter((id) => id !== metric.id))}
                  >
                    {metric.name}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.searchRow}>
              <SelectBox label="기간단위 : 월" />
              <SelectBox label="기간범위 : 최근 6개월" />
              {filterGroups.slice(0, 2).map((group) => (
                <div key={group.id} className={styles.dropdownWrap}>
                  <SelectBox
                    label={group.selected.length === group.values.length ? group.label : `${group.label} (${group.selected.length})`}
                    onClick={() => setOpenFilterId(openFilterId === group.id ? null : group.id)}
                  />
                  {openFilterId === group.id && (
                    <div className={styles.dropdownMenu}>
                      <button type="button">전체 선택</button>
                      <button type="button">전체 해제</button>
                      {group.values.map((value) => (
                        <label key={value}>
                          <input type="checkbox" defaultChecked={group.selected.includes(value)} />
                          <span>{value}</span>
                          <small>지정된 값만 보기</small>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className={`${styles.searchRow} ${styles.secondaryRow}`}>
              <SelectBox label="측정단위 : 지역" />
              {filterGroups.slice(2).map((group) => (
                <div key={group.id} className={styles.dropdownWrap}>
                  <SelectBox
                    label={group.selected.length === group.values.length ? group.label : `${group.label} (${group.selected.length})`}
                    onClick={() => setOpenFilterId(openFilterId === group.id ? null : group.id)}
                  />
                  {openFilterId === group.id && (
                    <div className={styles.dropdownMenu}>
                      <button type="button">전체 선택</button>
                      <button type="button">전체 해제</button>
                      {group.values.map((value) => (
                        <label key={value}>
                          <input type="checkbox" defaultChecked={group.selected.includes(value)} />
                          <span>{value}</span>
                          <small>지정된 값만 보기</small>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className={styles.searchActions}>
                <button className={styles.iconButton} type="button" aria-label="필터 초기화"><Icon name="reset" /></button>
                <button className={styles.iconButton} type="button" aria-label="템플릿 저장"><Icon name="save" /></button>
                <button className={styles.iconButton} type="button" aria-label="엑셀 다운로드"><Icon name="download" /></button>
                <button className={styles.primaryButton} type="button" aria-label="조회"><Icon name="search" /></button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.mainPanel}>
        <div className={styles.resultStack}>
          <div className={styles.tableCard}>
            <div className={styles.tableHeadRow}>
              <div className={styles.drilldownPath}>
                <button type="button">지역그룹(전체)</button>
                <span>&gt;</span>
                <strong>지역(경기)</strong>
              </div>
              <label className={styles.tableToggle}>
                <input type="checkbox" checked={showDeltas} onChange={(event) => setShowDeltas(event.target.checked)} />
                증감 노출
              </label>
            </div>

            <div className={styles.tableScroll}>
              <div className={styles.dataGrid}>
                <div className={`${styles.dataRow} ${styles.dataHeader}`}>
                  <div className={`${styles.dataCell} ${styles.entityHeader}`}>측정단위</div>
                  <div className={`${styles.dataCell} ${styles.metricHeader}`}>지표명</div>
                  <div className={`${styles.dataCell} ${styles.sparkHeader}`}>추이</div>
                  {periods.map((period) => <div key={period} className={`${styles.dataCell} ${styles.weekHeader}`}>{period}</div>)}
                </div>

                {entities.flatMap((entity) =>
                  selectedMetrics.map((metric, metricIndex) => {
                    const values = entity.values[metric.id];
                    return (
                      <div key={`${entity.name}-${metric.id}`} className={styles.dataRow}>
                        <div className={`${styles.dataCell} ${styles.entityCell}`}>
                          {metricIndex === 0 ? (
                            <div className={styles.entityWrap}>
                              <button type="button" onClick={() => setExpandedEntity(expandedEntity === entity.name ? null : entity.name)}>
                                {entity.name}
                              </button>
                              {expandedEntity === entity.name && (
                                <div className={styles.drilldownMenu}>
                                  {drilldownOptions.map((option) => (
                                    <button key={option} type="button">{option}</button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                        <div className={`${styles.dataCell} ${styles.metricCell}`}>
                          <span>{metric.name}</span>
                          <button type="button" aria-label="히트맵 색상" className={styles.colorDot} />
                        </div>
                        <div className={`${styles.dataCell} ${styles.sparkCell}`}>
                          <MiniSparkline values={values} />
                        </div>
                        {values.map((value, valueIndex) => {
                          const previous = values[valueIndex - 1];
                          const delta = typeof previous === "number" ? value - previous : null;
                          const heat = metric.format === "percent" ? value : Math.min(value / 450, 1);
                          return (
                            <div
                              key={`${entity.name}-${metric.id}-${periods[valueIndex]}`}
                              className={`${styles.dataCell} ${styles.valueCell}`}
                              style={{ "--heat": Math.max(0.08, Math.min(heat, 1)) } as React.CSSProperties}
                            >
                              <span>{formatValue(value, metric.format)}</span>
                              {showDeltas && delta !== null && (
                                <small className={delta < 0 ? styles.negative : ""}>({formatDelta(delta, metric.format)})</small>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <button className={styles.aiToggle} type="button" aria-label="Kevin AI" onClick={() => setAiOpen((open) => !open)}>
        <Icon name="ai" />
      </button>

      {isAiOpen && (
        <aside className={styles.aiPanel}>
          <div className={styles.aiHeader}>
            <div>
              <h3>Kevin AI</h3>
              <p>현재 조회 조건 기반 요약</p>
            </div>
            <button className={styles.iconButton} type="button" aria-label="닫기" onClick={() => setAiOpen(false)}>
              <Icon name="close" />
            </button>
          </div>
          <div className={styles.aiBody}>
            <div className={styles.aiMessage}>
              <strong>요약</strong>
              <p>경기 지역은 매치 수와 진행률이 함께 상승했습니다. 고양시는 매칭률이 가장 안정적이고, 계양구는 로스율 개선 추세가 뚜렷합니다.</p>
            </div>
            <div className={styles.recoChips}>
              <button type="button">로스율 높은 지역 보기</button>
              <button type="button">월별 매칭률 비교</button>
            </div>
          </div>
          <div className={styles.chatInput}>
            <input placeholder="Kevin에게 질문" />
            <button type="button">전송</button>
          </div>
        </aside>
      )}

      {isMetricPickerOpen && (
        <div className={styles.metricPickerOverlay} onClick={() => setMetricPickerOpen(false)}>
          <aside className={styles.metricPickerPanel} onClick={(event) => event.stopPropagation()}>
            <div className={styles.metricPickerHeader}>
              <h3>지표 선택</h3>
              <button type="button" onClick={() => setMetricPickerOpen(false)}>닫기</button>
            </div>
            <div className={styles.metricPickerFilters}>
              <select defaultValue=""><option value="">분류 전체</option><option>전환</option><option>수익성</option></select>
              <select defaultValue=""><option value="">담당 전체</option><option>운영</option><option>매칭</option><option>PX</option></select>
            </div>
            <div className={styles.metricPickerSearch}>
              <input placeholder="지표명/ID/설명 검색" />
            </div>
            <div className={styles.metricPickerBody}>
              {["공급", "전환", "품질", "수요", "수익성"].map((category) => (
                <section key={category} className={styles.metricCategory}>
                  <h4>{category}</h4>
                  {metrics.filter((metric) => metric.category === category).map((metric) => {
                    const selected = selectedMetricIds.includes(metric.id);
                    return (
                      <button
                        key={metric.id}
                        type="button"
                        className={`${styles.metricPickItem} ${selected ? styles.selected : ""}`}
                        onClick={() =>
                          setSelectedMetricIds((current) =>
                            selected ? current.filter((id) => id !== metric.id) : [...current, metric.id]
                          )
                        }
                      >
                        <strong>{metric.name}</strong>
                        <span>{metric.id}</span>
                        <p>{metric.description}</p>
                        <em>쿼리 복사</em>
                      </button>
                    );
                  })}
                </section>
              ))}
            </div>
            <div className={styles.metricPickerFooter}>
              <button type="button">선택 초기화</button>
              <button type="button" disabled={selectedMetrics.length === 0} onClick={() => setMetricPickerOpen(false)}>선택완료</button>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
