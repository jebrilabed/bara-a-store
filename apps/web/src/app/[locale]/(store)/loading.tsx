export default function StorefrontLoading() {
  return (
    <section role="status" aria-label="جار تحميل المتجر" style={{ display: "grid", gap: "24px" }}>
      <span style={{ color: "var(--soft)" }}>جار تحميل الصفحة...</span>
      <div className="grid" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <div className="card" key={index}>
            <div style={{ aspectRatio: "1", background: "var(--mist)" }} />
            <div className="in">
              <span style={{ display: "block", height: "18px", width: "72%", borderRadius: "6px", background: "var(--blush)" }} />
              <span style={{ display: "block", height: "16px", width: "38%", borderRadius: "6px", background: "var(--mist)" }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}