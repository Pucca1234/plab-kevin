import { NextResponse } from "next/server";
import { getAccessToken } from "../../lib/analytics/bigqueryClient";
import { getRawDataFromSource } from "../../lib/analytics/bigqueryProvider";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sheet1Data, periodUnit, measureUnit, filterValue, weeks, metrics, parentUnit, parentValue } = body;

    const token = await getAccessToken();

    // 1. 새 스프레드시트 생성
    const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        properties: {
          title: `Kevin 데이터 내보내기 ${new Date().toISOString().slice(0, 10)}`
        },
        sheets: [
          { properties: { title: "조회 데이터" } },
          { properties: { title: "원본 데이터" } }
        ]
      })
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      return NextResponse.json({ error: `스프레드시트 생성 실패: ${err}` }, { status: 500 });
    }

    const spreadsheet = await createRes.json();
    const spreadsheetId = spreadsheet.spreadsheetId;
    const spreadsheetUrl = spreadsheet.spreadsheetUrl;

    // 2. 시트1: 조회 데이터 입력
    if (sheet1Data?.length) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/조회 데이터!A1?valueInputOption=RAW`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ values: sheet1Data })
        }
      );
    }

    // 3. 시트2: 원본 로우 데이터
    try {
      const rows = await getRawDataFromSource({
        periodUnit: periodUnit || "week",
        measureUnit,
        filterValue: filterValue || null,
        periods: weeks,
        metricIds: metrics || [],
        parentUnit: parentUnit || null,
        parentValue: parentValue || null
      });

      if (rows.length) {
        const allKeys = Object.keys(rows[0]);
        const nonNullKeys = allKeys.filter((key) =>
          rows.some((row) => row[key] !== null && row[key] !== undefined)
        );
        const sheetValues = [
          nonNullKeys,
          ...rows.map((row) => nonNullKeys.map((key) => {
            const v = row[key];
            return v === null || v === undefined ? "" : v;
          }))
        ];

        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/원본 데이터!A1?valueInputOption=RAW`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ values: sheetValues })
          }
        );
      }
    } catch (e) {
      console.error("[export-sheets] Raw data error:", e);
    }

    return NextResponse.json({ url: spreadsheetUrl });
  } catch (error) {
    console.error("[export-sheets] Error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}
