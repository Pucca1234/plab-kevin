import "server-only";
import { BigQuery } from "@google-cloud/bigquery";

const projectId = process.env.BIGQUERY_PROJECT_ID?.trim() || undefined;

export const bigqueryClient = new BigQuery({
  projectId
});

