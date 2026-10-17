export default function StoreLoading() {
  return (
    <div className="store-loading" role="status" aria-live="polite" aria-label="جارٍ تحميل الصفحة...">
      <div className="store-loading__header">
        <div className="store-loading__title skeleton-shimmer" />
        <div className="store-loading__subtitle skeleton-shimmer" />
      </div>

      <div className="store-loading__grid" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="store-loading__card">
            <div className="store-loading__card-img skeleton-shimmer" />
            <div className="store-loading__card-body">
              <div className="store-loading__card-line skeleton-shimmer" style={{ width: "80%" }} />
              <div className="store-loading__card-line skeleton-shimmer" style={{ width: "50%" }} />
              <div className="store-loading__card-price skeleton-shimmer" style={{ width: "35%" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}