import { NextResponse } from "next/server";
import { getAvailablePeriodFilterUnits } from "../../lib/dataQueries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const periodUnit = searchParams.get("periodUnit");
  const periods = searchParams
    .getAll("period")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  try {
    const options = await getAvailablePeriodFilterUnits({
      periodUnit:
        periodUnit === "year" || periodUnit === "quarter" || periodUnit === "month" || periodUnit === "day"
          ? periodUnit
          : "week",
      periods
    });

    return NextResponse.json({ options });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to load period filter units." },
      { status: 500 }
    );
  }
}
