import { NextResponse } from "next/server";
import { getAvailableDrilldownUnits, getMeasurementUnitIds, getMeasurementUnitOptions } from "../../lib/dataQueries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const periodUnit = searchParams.get("periodUnit");
  const sourceUnit = searchParams.get("sourceUnit");
  const sourceValue = searchParams.get("sourceValue");
  const parentUnit = searchParams.get("parentUnit");
  const parentValue = searchParams.get("parentValue");
  const candidates = searchParams
    .getAll("candidate")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const weeks = searchParams
    .getAll("week")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const allowedUnits = new Set(await getMeasurementUnitIds());
  if (!sourceUnit || sourceUnit === "all" || !allowedUnits.has(sourceUnit)) {
    return NextResponse.json({ error: "Invalid sourceUnit." }, { status: 400 });
  }
  if (!sourceValue || sourceValue.trim().length === 0) {
    return NextResponse.json({ error: "Invalid sourceValue." }, { status: 400 });
  }
  const normalizedParentUnit =
    parentUnit && parentUnit !== "all" && allowedUnits.has(parentUnit) ? parentUnit : null;
  const normalizedParentValue = parentValue && parentValue.trim().length > 0 ? parentValue.trim() : null;
  const normalizedCandidates = candidates.filter((candidate) => candidate !== "all" && allowedUnits.has(candidate));
  if (normalizedCandidates.length === 0) {
    return NextResponse.json({ options: [] });
  }

  try {
    const [availableIds, allOptions] = await Promise.all([
      getAvailableDrilldownUnits({
        sourceUnit,
        sourceValue: sourceValue.trim(),
        candidateUnits: normalizedCandidates,
        parentUnit: normalizedParentUnit,
        parentValue: normalizedParentValue,
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
      { error: (error as Error).message || "Failed to load drilldown options." },
      { status: 500 }
    );
  }
}
