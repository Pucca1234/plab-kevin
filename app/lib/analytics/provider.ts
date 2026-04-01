import "server-only";
import type { AnalyticsProvider } from "./types";
import { bigqueryAnalyticsProvider } from "./bigqueryProvider";
import { supabaseAnalyticsProvider } from "./supabaseProvider";

export const getAnalyticsProvider = (): AnalyticsProvider => {
  const backend = (process.env.ANALYTICS_BACKEND ?? "supabase").trim().toLowerCase();
  if (backend === "bigquery") {
    return bigqueryAnalyticsProvider;
  }
  return supabaseAnalyticsProvider;
};
