"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatContext, SummaryPayload } from "../types";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type Props = {
  visible: boolean;
  summary: SummaryPayload | null;
  isSummaryLoading: boolean;
  context: ChatContext | null;
};

const SUGGESTIONS = [
  "이번 기간의 핵심 트렌드를 알려줘",
  "가장 변동이 큰 지표는?",
  "개선이 필요한 영역을 분석해줘",
];

export default function AiChat({ visible, summary, isSummaryLoading, context }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasPulse, setHasPulse] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevSummaryRef = useRef<SummaryPayload | null>(null);
  const summaryInsertedRef = useRef(false);

  // Pulse animation when new summary arrives
  useEffect(() => {
    if (summary && summary !== prevSummaryRef.current) {
      prevSummaryRef.current = summary;
      setHasPulse(true);
      const timer = setTimeout(() => setHasPulse(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [summary]);

  // Reset when not visible
  useEffect(() => {
    if (!visible) {
      setIsOpen(false);
      setMessages([]);
      setInput("");
      summaryInsertedRef.current = false;
    }
  }, [visible]);

  // Insert summary as first message when panel opens
  useEffect(() => {
    if (isOpen && summary && !summaryInsertedRef.current) {
      const summaryText = [
        `**${summary.title}**`,
        "",
        ...summary.bullets.map((b) => `- ${b}`),
        ...(summary.caution ? ["", `_${summary.caution}_`] : []),
      ].join("\n");

      setMessages([
        {
          id: "summary-initial",
          role: "assistant",
          content: summaryText,
        },
      ]);
      summaryInsertedRef.current = true;
    }
  }, [isOpen, summary]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading || !context) return;

      const userMsg: ChatMessage = {
        id: `${Date.now()}-user`,
        role: "user",
        content: text.trim(),
      };

      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setInput("");
      setIsLoading(true);

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            context,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || "응답 실패");
        }

        const data = (await res.json()) as { reply: string };
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-assistant`,
            role: "assistant",
            content: data.reply,
          },
        ]);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-error`,
            role: "assistant",
            content: `오류가 발생했습니다: ${(error as Error).message}`,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, context]
  );

  if (!visible) return null;

  return (
    <>
      {/* Floating avatar button */}
      <button
        type="button"
        className={`ai-avatar-btn${hasPulse ? " has-pulse" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="AI 채팅 열기"
      >
        <img
          src="/ai-avatar.png"
          alt="AI 어시스턴트"
          className="ai-avatar-img"
          width={40}
          height={40}
        />
        {hasPulse && <span className="ai-pulse-ring" />}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="ai-chat-panel">
          <div className="ai-chat-header">
            <div className="ai-chat-header-left">
              <img
                src="/ai-avatar.png"
                alt=""
                className="ai-chat-header-avatar"
                width={28}
                height={28}
              />
              <span className="ai-chat-header-title">KEVIN AI</span>
            </div>
            <button
              type="button"
              className="ai-chat-close"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="ai-chat-messages">
            {messages.length === 0 && !isSummaryLoading && (
              <div className="ai-chat-empty">
                데이터를 기반으로 질문해보세요.
              </div>
            )}

            {isSummaryLoading && messages.length === 0 && (
              <div className="ai-chat-bubble assistant">
                <img
                  src="/ai-avatar.png"
                  alt=""
                  className="ai-bubble-avatar"
                  width={24}
                  height={24}
                />
                <div className="ai-bubble-content">
                  <div className="ai-typing">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`ai-chat-bubble ${msg.role}`}
              >
                {msg.role === "assistant" && (
                  <img
                    src="/ai-avatar.png"
                    alt=""
                    className="ai-bubble-avatar"
                    width={24}
                    height={24}
                  />
                )}
                <div className="ai-bubble-content">
                  {msg.content.split("\n").map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < msg.content.split("\n").length - 1 && <br />}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="ai-chat-bubble assistant">
                <img
                  src="/ai-avatar.png"
                  alt=""
                  className="ai-bubble-avatar"
                  width={24}
                  height={24}
                />
                <div className="ai-bubble-content">
                  <div className="ai-typing">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion chips */}
          {messages.length <= 1 && !isLoading && (
            <div className="ai-suggestions">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="ai-suggestion-chip"
                  onClick={() => sendMessage(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="ai-chat-input-wrap">
            <input
              ref={inputRef}
              type="text"
              className="ai-chat-input"
              value={input}
              placeholder="질문을 입력하세요..."
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  sendMessage(input);
                }
              }}
              disabled={isLoading}
            />
            <button
              type="button"
              className="ai-chat-send"
              onClick={() => sendMessage(input)}
              disabled={isLoading || !input.trim()}
            >
              전송
            </button>
          </div>
        </div>
      )}
    </>
  );
}
