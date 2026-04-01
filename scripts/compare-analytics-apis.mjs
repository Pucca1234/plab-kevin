const baselineBaseUrl =
  process.env.BASELINE_APP_URL?.trim() || "https://social-match-dashboard-mvp.vercel.app";
const candidateBaseUrl = process.env.CANDIDATE_APP_URL?.trim() || "https://plab-kevin.vercel.app";

const fetchJson = async (baseUrl, path, init) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`[${baseUrl}${path}] ${response.status} ${text}`);
  }

  return text.length > 0 ? JSON.parse(text) : null;
};

const sortedUnique = (values) => Array.from(new Set(values)).sort((a, b) => String(a).localeCompare(String(b), "ko"));

const normalizeUnits = (units) =>
  [...units]
    .map((unit) => ({ value: String(unit.value), label: String(unit.label) }))
    .sort((a, b) => a.value.localeCompare(b.value, "ko"));

const normalizeMetrics = (metrics) =>
  [...metrics]
    .map((metric) => ({
      metric: String(metric.metric),
      korean_name: String(metric.korean_name ?? ""),
      category2: metric.category2 == null ? null : String(metric.category2),
      category3: metric.category3 == null ? null : String(metric.category3)
    }))
    .sort((a, b) => a.metric.localeCompare(b.metric, "ko"));

const normalizeRows = (rows) =>
  [...rows]
    .map((row) => ({
      entity: String(row.entity),
      week: String(row.week),
      metrics: Object.fromEntries(
        Object.entries(row.metrics ?? {})
          .map(([metricId, value]) => [metricId, Number(value ?? 0)])
          .sort(([a], [b]) => a.localeCompare(b, "ko"))
      )
    }))
    .sort((a, b) => {
      if (a.entity !== b.entity) return a.entity.localeCompare(b.entity, "ko");
      return a.week.localeCompare(b.week, "ko");
    });

const compareJson = (label, baselineValue, candidateValue) => {
  const baselineJson = JSON.stringify(baselineValue);
  const candidateJson = JSON.stringify(candidateValue);
  return {
    label,
    ok: baselineJson === candidateJson,
    baseline: baselineValue,
    candidate: candidateValue
  };
};

const run = async () => {
  console.log(`Baseline:  ${baselineBaseUrl}`);
  console.log(`Candidate: ${candidateBaseUrl}`);

  const results = [];

  const [baselineWeeksPayload, candidateWeeksPayload] = await Promise.all([
    fetchJson(baselineBaseUrl, "/api/weeks?n=8"),
    fetchJson(candidateBaseUrl, "/api/weeks?n=8")
  ]);
  const baselineWeeks = baselineWeeksPayload.weeks ?? [];
  const candidateWeeks = candidateWeeksPayload.weeks ?? [];
  results.push(compareJson("weeks", baselineWeeks, candidateWeeks));

  const effectiveWeeks = baselineWeeks.length > 0 ? baselineWeeks : candidateWeeks;
  const weekParams = effectiveWeeks.map((week) => `week=${encodeURIComponent(week)}`).join("&");

  const [baselineUnitsPayload, candidateUnitsPayload] = await Promise.all([
    fetchJson(baselineBaseUrl, "/api/measurement-units"),
    fetchJson(candidateBaseUrl, "/api/measurement-units")
  ]);
  results.push(
    compareJson(
      "measurement-units",
      normalizeUnits(baselineUnitsPayload.units ?? []),
      normalizeUnits(candidateUnitsPayload.units ?? [])
    )
  );

  const [baselineMetricsPayload, candidateMetricsPayload] = await Promise.all([
    fetchJson(baselineBaseUrl, "/api/metrics"),
    fetchJson(candidateBaseUrl, "/api/metrics")
  ]);
  results.push(
    compareJson(
      "metrics",
      normalizeMetrics(baselineMetricsPayload.metrics ?? []),
      normalizeMetrics(candidateMetricsPayload.metrics ?? [])
    )
  );

  const filterMeasureUnits = ["area_group", "area", "stadium_group", "time"];
  for (const measureUnit of filterMeasureUnits) {
    const path = `/api/filter-options?measureUnit=${encodeURIComponent(measureUnit)}${
      weekParams ? `&${weekParams}` : ""
    }`;
    const [baselinePayload, candidatePayload] = await Promise.all([
      fetchJson(baselineBaseUrl, path),
      fetchJson(candidateBaseUrl, path)
    ]);
    results.push(
      compareJson(
        `filter-options:${measureUnit}`,
        sortedUnique(baselinePayload.options ?? []),
        sortedUnique(candidatePayload.options ?? [])
      )
    );
  }

  const drilldownPath = `/api/drilldown-options?sourceUnit=area_group&sourceValue=${encodeURIComponent(
    "대전"
  )}&candidate=area&candidate=area_group_and_time&candidate=area_and_time&candidate=stadium_group&candidate=stadium&candidate=stadium_group_and_time&candidate=stadium_and_time${
    weekParams ? `&${weekParams}` : ""
  }`;
  const [baselineDrilldown, candidateDrilldown] = await Promise.all([
    fetchJson(baselineBaseUrl, drilldownPath),
    fetchJson(candidateBaseUrl, drilldownPath)
  ]);
  results.push(compareJson("drilldown-options:area_group:대전", baselineDrilldown.options, candidateDrilldown.options));

  const heatmapCases = [
    {
      label: "heatmap:all:manager_match_cnt",
      body: {
        measureUnit: "all",
        filterValue: null,
        weeks: effectiveWeeks,
        metrics: ["manager_match_cnt"]
      }
    },
    {
      label: "heatmap:area_group:manager_match_cnt",
      body: {
        measureUnit: "area_group",
        filterValue: null,
        weeks: effectiveWeeks,
        metrics: ["manager_match_cnt"]
      }
    },
    {
      label: "heatmap:area:manager_match_cnt:parent=대전",
      body: {
        measureUnit: "area",
        filterValue: null,
        parentUnit: "area_group",
        parentValue: "대전",
        weeks: effectiveWeeks,
        metrics: ["manager_match_cnt"]
      }
    }
  ];

  for (const testCase of heatmapCases) {
    const [baselinePayload, candidatePayload] = await Promise.all([
      fetchJson(baselineBaseUrl, "/api/heatmap", {
        method: "POST",
        body: JSON.stringify(testCase.body)
      }),
      fetchJson(candidateBaseUrl, "/api/heatmap", {
        method: "POST",
        body: JSON.stringify(testCase.body)
      })
    ]);
    results.push(
      compareJson(testCase.label, normalizeRows(baselinePayload.rows ?? []), normalizeRows(candidatePayload.rows ?? []))
    );
  }

  const failures = results.filter((result) => !result.ok);
  for (const result of results) {
    console.log(`${result.ok ? "PASS" : "FAIL"} ${result.label}`);
    if (!result.ok) {
      console.log(`  baseline: ${JSON.stringify(result.baseline).slice(0, 1200)}`);
      console.log(`  candidate: ${JSON.stringify(result.candidate).slice(0, 1200)}`);
    }
  }

  if (failures.length > 0) {
    console.error(`Comparison failed: ${failures.length} mismatches`);
    process.exit(1);
  }

  console.log(`Comparison passed: ${results.length} checks`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
