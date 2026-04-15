import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getFilterOptions, getMeasurementUnitIds } from "../../lib/dataQueries";

export const dynamic = "force-dynamic";

const FILTER_OPTIONS_CACHE_TTL = 600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const measureUnit = searchParams.get("measureUnit");
  const filterUnit = searchParams.get("filterUnit");
  const activeFilterUnits = searchParams.getAll("activeFilterUnit");
  const activeFilterValues = searchParams.getAll("activeFilterValue");
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
    const normalizedParentValue = parentValue && parentValue.trim().length > 0 ? parentValue.trim() : null;
    const normalizedParentUnit = parentUnit && parentUnit !== "all" ? parentUnit : null;
    const weeksKey = weeks.join("|") || "all-weeks";
    const cacheSuffix =
      normalizedParentUnit && normalizedParentValue
        ? `${periodUnit ?? "week"}:${filterUnit ?? measureUnit}:${normalizedParentUnit}:${normalizedParentValue}:${weeksKey}`
        : `${periodUnit ?? "week"}:${filterUnit ?? measureUnit}:none:${weeksKey}`;
    const getFilterOptionsCached = unstable_cache(
      async () => {
        const options = await getFilterOptions(measureUnit, {
          filterUnit: filterUnit && filterUnit !== "all" ? filterUnit : null,
          activeFilters: activeFilterUnits.reduce<{ unit: string; values: string[] }[]>((acc, unit, index) => {
            const value = activeFilterValues[index];
            if (!unit || !value || unit === filterUnit) return acc;
            const existing = acc.find((item) => item.unit === unit);
            if (existing) {
              existing.values.push(value);
            } else {
              acc.push({ unit, values: [value] });
            }
            return acc;
          }, []),
          parentUnit: normalizedParentUnit,
          parentValue: normalizedParentValue,
          weeks,
          periodUnit:
            periodUnit === "year" || periodUnit === "quarter" || periodUnit === "month" || periodUnit === "day"
              ? periodUnit
              : "week"
        });
        return { options, cachedAt: Date.now() };
      },
      ["api-filter-options-v3", measureUnit, cacheSuffix],
      { revalidate: FILTER_OPTIONS_CACHE_TTL }
    );

    const { options } = await getFilterOptionsCached();
    return NextResponse.json({ options });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to load filter options." },
      { status: 500 }
    );
  }
}
