const prototypes = [
  {
    href: "/prototype/design-a",
    title: "A. Dense Operations",
    description: "Carbon/EUI 계열의 고밀도 운영 대시보드 스타일"
  },
  {
    href: "/prototype/design-b",
    title: "B. Modern SaaS Analytics",
    description: "Fluent/Atlassian 계열의 부드러운 분석 SaaS 스타일"
  },
  {
    href: "/prototype/design-c",
    title: "C. Command Center",
    description: "관제형 헤더와 강한 테이블 계층을 둔 분석 도구 스타일"
  }
];

export default function PrototypeIndexPage() {
  return (
    <main style={{ minHeight: "100vh", padding: 24, background: "#f7fbff", color: "#102033" }}>
      <section style={{ maxWidth: 960, margin: "0 auto", display: "grid", gap: 18 }}>
        <div>
          <a href="/" style={{ color: "#0d3b66", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
            ← Kevin
          </a>
          <h1 style={{ margin: "12px 0 6px", fontSize: 30 }}>Kevin Design System Prototypes</h1>
          <p style={{ margin: 0, color: "#617187", lineHeight: 1.6 }}>
            흰색 바탕과 맨시티 블루 포인트를 유지한 3가지 대시보드 스타일 샘플입니다.
            실제 API나 DB는 연결하지 않고, 더미데이터로 필터·지표 패널·테이블·드릴다운·AI 표면을 확인합니다.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {prototypes.map((prototype) => (
            <a
              key={prototype.href}
              href={prototype.href}
              style={{
                display: "grid",
                gap: 8,
                minHeight: 150,
                padding: 18,
                border: "1px solid #d8e4ee",
                borderRadius: 8,
                background: "#fff",
                color: "inherit",
                textDecoration: "none",
                boxShadow: "0 10px 26px rgba(31, 80, 120, 0.08)"
              }}
            >
              <strong style={{ color: "#0d3b66", fontSize: 18 }}>{prototype.title}</strong>
              <span style={{ color: "#617187", lineHeight: 1.45 }}>{prototype.description}</span>
              <span style={{ color: "#1c75bc", fontWeight: 800, alignSelf: "end" }}>열기 →</span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
