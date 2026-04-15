import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getFilterOptions, getMeasurementUnitIds } from "../../lib/dataQueries";

export const dynamic = "force-dynamic";

const FILTER_OPTIONS_BATCH_CACHE_TTL = 300;

type ActiveFilter = { unit: string; values: string[] };

const parseActiveFilters = (
  activeFilterUnits: string[],
  activeFilterValues: string[],
  allowedUnits: Set<string>
) =>
  activeFilterUnits.reduce<ActiveFilter[]>((acc, unit, index) => {
    const value = activeFilterValues[index];
    if (!unit || !value || !allowedUnits.has(unit)) return acc;
    const existing = acc.find((item) => item.unit === unit);
    const normalizedValue = value === "__NONE__" ? null : value;
    if (existing) {
      if (normalizedValue) {
        existing.values.push(normalizedValue);
      } else {
        existing.values = [];
      }
    } else {
      acc.push({ unit, values: normalizedValue ? [normalizedValue] : [] });
    }
    return acc;
  }, []);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const measureUnit = searchParams.get("measureUnit");
  const filterUnits = searchParams.getAll("filterUnit").filter((value) => value.trim().length > 0);
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
  if (filterUnits.some((unit) => !allowedUnits.has(unit))) {
    return NextResponse.json({ error: "Invalid filterUnit." }, { status: 400 });
  }
  if (parentUnit && !allowedUnits.has(parentUnit)) {
    return NextResponse.json({ error: "Invalid parentUnit." }, { status: 400 });
  }

  try {
    const normalizedParentUnit = parentUnit && parentUnit !== "all" ? parentUnit : null;
    const normalizedParentValue = parentValue && parentValue.trim().length > 0 ? parentValue.trim() : null;
    const normalizedFilterUnits = Array.from(new Set(filterUnits));
    const activeFilters = parseActiveFilters(activeFilterUnits, activeFilterValues, allowedUnits);
    const cacheKey = [
      measureUnit,
      periodUnit ?? "week",
      normalizedParentUnit ?? "none",
      normalizedParentValue ?? "none",
      weeks.join("|") || "all-weeks",
      normalizedFilterUnits.join("|") || "no-filters",
      activeFilters
        .map((filter) => `${filter.unit}:${filter.values.join(",")}`)
        .sort()
        .join("|") || "no-active"
    ];

    const loadBatch = unstable_cache(
      async () => {
        const entries = await Promise.all(
          normalizedFilterUnits.map(async (filterUnit) => {
            const options = await getFilterOptions(measureUnit, {
              filterUnit,
              activeFilters,
              parentUnit: normalizedParentUnit,
              parentValue: normalizedParentValue,
              weeks,
              periodUnit:
                periodUnit === "year" || periodUnit === "quarter" || periodUnit === "month" || periodUnit === "day"
                  ? periodUnit
                  : "week"
            });
            return [filterUnit, options] as const;
          })
        );
        return { optionsByUnit: Object.fromEntries(entries) as Record<string, string[]> };
      },
      ["api-filter-options-batch-v1", ...cacheKey],
      { revalidate: FILTER_OPTIONS_BATCH_CACHE_TTL }
    );

    return NextResponse.json(await loadBatch());
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to load filter options batch." },
      { status: 500 }
    );
  }
}
