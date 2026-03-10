import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getFilterOptions } from "../../lib/dataQueries";

export const dynamic = "force-dynamic";

const allowedUnits = ["all", "area_group", "area", "stadium_group", "stadium"] as const;
const FILTER_OPTIONS_CACHE_TTL = 600;
const isAllowedUnit = (value: string): value is (typeof allowedUnits)[number] =>
  allowedUnits.includes(value as (typeof allowedUnits)[number]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const measureUnit = searchParams.get("measureUnit");
  const parentUnit = searchParams.get("parentUnit");
  const parentValue = searchParams.get("parentValue");

  if (!measureUnit || !isAllowedUnit(measureUnit)) {
    return NextResponse.json({ error: "Invalid measureUnit." }, { status: 400 });
  }
  if (parentUnit && !isAllowedUnit(parentUnit)) {
    return NextResponse.json({ error: "Invalid parentUnit." }, { status: 400 });
  }

  try {
    const unit = measureUnit as (typeof allowedUnits)[number];
    const normalizedParentValue = parentValue && parentValue.trim().length > 0 ? parentValue.trim() : null;
    const normalizedParentUnit =
      parentUnit && parentUnit !== "all" ? (parentUnit as Exclude<(typeof allowedUnits)[number], "all">) : null;
    const cacheSuffix =
      normalizedParentUnit && normalizedParentValue
        ? `${normalizedParentUnit}:${normalizedParentValue}`
        : "none";
    const getFilterOptionsCached = unstable_cache(
      async () => {
        const options = await getFilterOptions(unit, {
          parentUnit: normalizedParentUnit,
          parentValue: normalizedParentValue
        });
        return { options, cachedAt: Date.now() };
      },
      ["api-filter-options-v2", unit, cacheSuffix],
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
