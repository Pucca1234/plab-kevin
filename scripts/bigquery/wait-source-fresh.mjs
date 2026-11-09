// Serving Rebuild 전에 소스 테이블(data_mart_1_social_match)이 "오늘자"로 갱신됐는지 확인하고,
// 아직이면 일정 시간 폴링하며 기다린다.
//
// 배경: 트리거를 GitHub 네이티브 schedule(1.5~5시간 지연)에서 외부 크론 dispatch(정시 실행)로
// 옮기면서, 그동안 지연이 우연히 만들어주던 "소스 갱신 후 충분한 버퍼"가 사라졌다. 소스
// 스케줄러가 늦는 날엔 어제 데이터로 rebuild하고 "완료" 알림이 나갈 수 있으므로 여기서 막는다.
//
// - 기준: 가장 최근의 SOURCE_FRESH_AFTER_KST(기본 05:00 KST) 이후에 수정됐으면 fresh.
//   (밤에 수동 실행하면 "어제 05:00 이후"가 기준이 되어 바로 통과한다)
// - 최대 SOURCE_WAIT_MINUTES(기본 60분) 동안 SOURCE_POLL_SECONDS(기본 120초) 간격으로 폴링.
// - 끝까지 갱신이 안 돼도 실패시키지 않는다(rebuild는 그대로 진행, 기존 데이터 유지). 대신
//   GITHUB_OUTPUT에 fresh=false를 남겨 Slack 알림에 경고를 붙인다.
// - tables.get 메타데이터 API만 사용 → 쿼리 비용 없음.
import { appendFileSync } from "node:fs";
import { GoogleAuth } from "google-auth-library";

const projectId = process.env.BIGQUERY_PROJECT_ID?.trim() || "plabfootball-51bf5";
const dataset = process.env.BIGQUERY_DATASET_SOURCE_DATA_MART?.trim() || "data_mart";
const table = process.env.SOURCE_TABLE?.trim() || "data_mart_1_social_match";
const freshAfterKst = process.env.SOURCE_FRESH_AFTER_KST?.trim() || "05:00";
const waitMinutes = Number(process.env.SOURCE_WAIT_MINUTES ?? 60);
const pollSeconds = Number(process.env.SOURCE_POLL_SECONDS ?? 120);

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const formatKst = (ms) => {
  const d = new Date(ms + KST_OFFSET_MS);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}.${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};

// 가장 최근의 "HH:MM KST" 시각(epoch ms)
const latestThresholdMs = (now) => {
  const [hh, mm] = freshAfterKst.split(":").map(Number);
  const kstNow = new Date(now + KST_OFFSET_MS);
  let thresholdKst = Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate(), hh, mm);
  let threshold = thresholdKst - KST_OFFSET_MS;
  if (threshold > now) threshold -= 24 * 60 * 60 * 1000;
  return threshold;
};

const parseCredentials = () => {
  const inline = process.env.BIGQUERY_SERVICE_ACCOUNT_JSON?.trim();
  if (inline) return JSON.parse(inline);
  const b64 = process.env.BIGQUERY_SERVICE_ACCOUNT_JSON_BASE64?.trim();
  if (b64) return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  return null;
};

const getToken = async () => {
  const envToken = process.env.BIGQUERY_ACCESS_TOKEN?.trim();
  const credentials = parseCredentials();
  if (!credentials && envToken) return envToken;
  if (!credentials) throw new Error("BIGQUERY_SERVICE_ACCOUNT_JSON(_BASE64) or BIGQUERY_ACCESS_TOKEN is required.");
  const auth = new GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/bigquery"] });
  const client = await auth.getClient();
  const res = await client.getAccessToken();
  return typeof res === "string" ? res : res.token;
};

const getLastModifiedMs = async () => {
  const token = await getToken();
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets/${dataset}/tables/${table}`; // view=BASIC은 lastModifiedTime을 빼고 줘서 쓰면 안 됨 (2026-11-09 확인)
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`tables.get failed (${res.status}): ${await res.text()}`);
  const body = await res.json();
  const ms = Number(body.lastModifiedTime);
  if (!Number.isFinite(ms) || ms <= 0) throw new Error(`lastModifiedTime 없음: ${JSON.stringify(body.lastModifiedTime)}`);
  return ms;
};

const writeOutput = (values) => {
  const path = process.env.GITHUB_OUTPUT;
  const lines = Object.entries(values).map(([k, v]) => `${k}=${v}`).join("\n") + "\n";
  if (path) appendFileSync(path, lines);
  else process.stdout.write(lines);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const main = async () => {
  const start = Date.now();
  const threshold = latestThresholdMs(start);
  const deadline = start + waitMinutes * 60 * 1000;
  console.log(`[source] ${dataset}.${table} 갱신 기준: ${formatKst(threshold)} KST 이후 (최대 ${waitMinutes}분 대기)`);

  let lastModified = 0;
  let consecutiveErrors = 0;
  while (true) {
    try {
      lastModified = await getLastModifiedMs();
      consecutiveErrors = 0;
      console.log(`[source] last_modified=${formatKst(lastModified)} KST`);
      if (lastModified >= threshold) {
        writeOutput({ fresh: "true", source_time: formatKst(lastModified) });
        return;
      }
    } catch (error) {
      consecutiveErrors += 1;
      console.warn(`[source] 메타데이터 조회 실패 (${consecutiveErrors}회): ${error.message}`);
      // 조회 자체가 안 되는 건 기다려도 해결되지 않으므로 오래 붙잡지 않는다.
      if (consecutiveErrors >= 3) {
        console.warn("[source] 조회가 3회 연속 실패 → 대기 중단, rebuild 진행");
        writeOutput({ fresh: "false", source_time: "조회 실패" });
        return;
      }
      await sleep(10_000);
      continue;
    }

    if (Date.now() + pollSeconds * 1000 > deadline) break;
    await sleep(pollSeconds * 1000);
  }

  console.warn(`[source] ${waitMinutes}분 대기했지만 소스가 갱신되지 않음 → 기존 소스로 rebuild 진행`);
  writeOutput({ fresh: "false", source_time: lastModified ? formatKst(lastModified) : "조회 실패" });
};

main().catch((error) => {
  // 이 단계 실패로 rebuild 자체를 막지 않는다.
  console.error(error);
  writeOutput({ fresh: "false", source_time: "조회 실패" });
});
