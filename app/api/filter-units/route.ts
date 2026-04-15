import { NextResponse } from "next/server";
import { getAvailableFilterUnits, getMeasurementUnitIds, getMeasurementUnitOptions } from "../../lib/dataQueries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const measureUnit = searchParams.get("measureUnit");
  const periodUnit = searchParams.get("periodUnit");
  const parentUnit = searchParams.get("parentUnit");
  const parentValue = searchParams.get("parentValue");
  const weeks = searchParams
    .getAll("week")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const allowedUnits = new Set(await getMeasurementUnitIds());

  if (!measureUnit || !allowedUnits.has(measureUnit)) {
    return NextResponse.json({ error: "Invalid measureUnit." }, { status: 400 });
  }
  if (parentUnit && !allowedUnits.has(parentUnit)) {
    return NextResponse.json({ error: "Invalid parentUnit." }, { status: 400 });
  }

  try {
    const [availableIds, allOptions] = await Promise.all([
      getAvailableFilterUnits({
        measureUnit,
        parentUnit: parentUnit && parentUnit !== "all" ? parentUnit : null,
        parentValue: parentValue && parentValue.trim().length > 0 ? parentValue.trim() : null,
        weeks,
        periodUnit:
          periodUnit === "year" || periodUnit === "quarter" || periodUnit === "month" || periodUnit === "day"
            ? periodUnit
            : "week"
      }),
      getMeasurementUnitOptions()
    ]);

    const optionMap = new Map(allOptions.map((option) => [option.value, option]));
    const options = availableIds
      .map((id) => optionMap.get(id))
      .filter((option): option is { value: string; label: string } => Boolean(option));
    return NextResponse.json({ options });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to load filter units." },
      { status: 500 }
    );
  }
}
