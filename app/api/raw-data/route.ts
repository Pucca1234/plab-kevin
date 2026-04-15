import { NextResponse } from "next/server";
import { getRawDataFromSource } from "../../lib/analytics/bigqueryProvider";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { periodUnit, measureUnit, filterValue, weeks, metrics, parentUnit, parentValue } = body;

    if (!measureUnit || !weeks?.length) {
      return NextResponse.json({ error: "measureUnit and weeks are required" }, { status: 400 });
    }

    const rows = await getRawDataFromSource({
      periodUnit: periodUnit || "week",
      measureUnit,
      filterValue: filterValue || null,
      periods: weeks,
      metricIds: metrics || [],
      parentUnit: parentUnit || null,
      parentValue: parentValue || null
    });

    return NextResponse.json({ rows });
  } catch (error) {
    console.error("[raw-data] Error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}
