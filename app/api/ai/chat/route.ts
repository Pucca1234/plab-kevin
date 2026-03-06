import { NextResponse } from "next/server";
import type { ChatContext } from "@/app/types";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

const MAX_BYTES = 200_000;
const MAX_HISTORY = 20;

const formatValue = (value: number | null, format: "number" | "percent") => {
  if (value === null || Number.isNaN(value)) return "-";
  if (format === "percent") return `${(value * 100).toFixed(1)}%`;
  return value.toLocaleString("ko-KR");
};

const formatDelta = (value: number | null, format: "number" | "percent") => {
  if (value === null || Number.isNaN(value)) return "-";
  const sign = value >= 0 ? "+" : "";
  if (format === "percent") return `${sign}${(value * 100).toFixed(1)}%p`;
  return `${sign}${value.toLocaleString("ko-KR")}`;
};

function buildSystemPrompt(context: ChatContext): string {
  const { weeks, metricSummaries, primaryMetricId, unit, filter } = context;
  const rangeLabel = weeks.length ? `${weeks[0]} ~ ${weeks[weeks.length - 1]}` : "선택 기간";

  const metricsBlock = metricSummaries
    .map(
      (m) =>
        `- ${m.name} (${m.metricId}): 최신값 ${formatValue(m.latest, m.format)}, 전주 대비 ${formatDelta(m.delta, m.format)}`
    )
    .join("\n");

  return `당신은 플랩풋볼(PLAB) 대시보드의 데이터 분석 AI 어시스턴트입니다.
사용자가 조회한 데이터를 기반으로 인사이트를 제공하세요.

## 현재 대시보드 컨텍스트
- 기간: ${rangeLabel} (${weeks.length}주)
- 분석 단위: ${unit}
- 필터: ${filter}
- 주요 지표 ID: ${primaryMetricId}

## 지표 현황
${metricsBlock}

## 응답 가이드
- 한국어로 답변하세요
- 데이터에 기반한 구체적인 인사이트를 제공하세요
- 추세, 변동 원인 추정, 액션 아이템을 포함하세요
- 간결하고 명확하게 답변하세요`;
}

function buildTemplateFallback(context: ChatContext, message: string): string {
  const { weeks, metricSummaries, primaryMetricId, unit, filter } = context;
  const rangeLabel = weeks.length ? `${weeks[0]} ~ ${weeks[weeks.length - 1]}` : "선택 기간";
  const primary = metricSummaries.find((m) => m.metricId === primaryMetricId) ?? metricSummaries[0];

  const parts: string[] = [];
  parts.push(
    `질문을 확인했습니다. 현재 데이터 범위는 ${rangeLabel} (${weeks.length}주)이며 단위는 ${unit} · ${filter}입니다.`
  );

  if (primary) {
    parts.push(
      `핵심 지표 ${primary.name}의 최신값은 ${formatValue(primary.latest, primary.format)}이고 전주 대비 ${formatDelta(primary.delta, primary.format)} 변화가 있습니다.`
    );
  }

  const movers = metricSummaries
    .filter((m) => typeof m.delta === "number")
    .sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0))
    .slice(0, 2);

  if (movers.length) {
    parts.push(
      `변동 폭이 큰 지표로는 ${movers.map((m) => m.name).join(", ")} 등이 보이며, 원인은 추가 분석이 필요합니다.`
    );
  }

  parts.push("추가로 궁금한 지표나 기간을 알려주시면 더 구체적으로 살펴보겠습니다.");
  return parts.join(" ");
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    if (rawBody.length > MAX_BYTES) {
      return NextResponse.json({ error: "Payload too large." }, { status: 413 });
    }

    const parsed = JSON.parse(rawBody) as {
      messages?: ChatMessage[];
      message?: string;
      context?: ChatContext;
    };

    const context = parsed.context;
    if (!context) {
      return NextResponse.json({ error: "Missing context." }, { status: 400 });
    }

    // Support both new (messages array) and legacy (single message) format
    const messages: ChatMessage[] = parsed.messages
      ? parsed.messages.slice(-MAX_HISTORY)
      : parsed.message
        ? [{ role: "user" as const, content: parsed.message }]
        : [];

    if (!messages.length) {
      return NextResponse.json({ error: "Missing messages." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    // If no API key, use template fallback
    if (!apiKey) {
      const lastUserMsg = messages.filter((m) => m.role === "user").pop();
      const reply = buildTemplateFallback(context, lastUserMsg?.content ?? "");
      return NextResponse.json({ reply });
    }

    // OpenAI GPT call
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey });

    const systemPrompt = buildSystemPrompt(context);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      max_tokens: 1024,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content ?? "응답을 생성하지 못했습니다.";
    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to build reply." },
      { status: 500 }
    );
  }
}
