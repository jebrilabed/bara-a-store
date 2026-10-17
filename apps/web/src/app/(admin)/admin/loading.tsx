export default function AdminPageLoading() {
  return (
    <section className="admin-loading" role="status" aria-live="polite" aria-label="جار تحميل الصفحة">
      <p style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, color: "var(--rose-d)" }}>
        <span
          className="loading-button__spinner"
          style={{
            width: "18px",
            height: "18px",
            border: "2.5px solid var(--line)",
            borderTopColor: "var(--rose-d)",
            borderRadius: "50%",
            display: "inline-block",
          }}
        />
        <span>جارٍ تجهيز الصفحة...</span>
      </p>
      <div className="admin-loading__stats" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="admin-loading__content" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}
