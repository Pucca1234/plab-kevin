import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { runBigQueryQuery } from "../../lib/analytics/bigqueryClient";

export const dynamic = "force-dynamic";

const CACHE_TTL = 300; // 5분 캐시

const projectId = process.env.BIGQUERY_PROJECT_ID?.trim() || "plabfootball-51bf5";
const servingDataset = process.env.BIGQUERY_DATASET_SERVING?.trim() || "kevin_serving";

const loadFreshness = unstable_cache(
  async () => {
    const rows = await runBigQueryQuery<{ last_updated: string | null }>(`
      SELECT FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%S+09:00', TIMESTAMP_ADD(TIMESTAMP_MILLIS(last_modified_time), INTERVAL 9 HOUR)) as last_updated
      FROM \`${projectId}.${servingDataset}.__TABLES__\`
      WHERE table_id = 'weekly_agg'
      LIMIT 1
    `);
    return rows[0]?.last_updated ?? null;
  },
  ["api-data-freshness-v1"],
  { revalidate: CACHE_TTL }
);

export async function GET() {
  try {
    const lastUpdatedAt = await loadFreshness();
    return NextResponse.json({ lastUpdatedAt });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to load data freshness." },
      { status: 500 }
    );
  }
}
