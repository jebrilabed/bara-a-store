export default function AdminLoading() {
  return (
    <section className="admin-loading" role="status" aria-live="polite" aria-label="جار تحميل الصفحة">
      <p>جار تحميل الصفحة...</p>
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