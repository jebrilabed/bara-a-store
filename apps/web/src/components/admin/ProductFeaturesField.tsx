"use client";

import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import styles from "./ProductFeaturesField.module.css";

type FeatureRow = { id: number; value: string };

type ProductFeaturesFieldProps = { initialFeatures?: string[] };

export default function ProductFeaturesField({ initialFeatures = [] }: ProductFeaturesFieldProps) {
  const nextId = useRef(initialFeatures.length);
  const [features, setFeatures] = useState<FeatureRow[]>(() => initialFeatures.map((value, id) => ({ id, value })));

  function addFeature() {
    if (features.length >= 20) return;
    setFeatures((current) => [...current, { id: nextId.current++, value: "" }]);
  }

  function updateFeature(id: number, value: string) {
    setFeatures((current) => current.map((feature) => feature.id === id ? { ...feature, value } : feature));
  }

  function removeFeature(id: number) {
    setFeatures((current) => current.filter((feature) => feature.id !== id));
  }

  return (
    <section className={styles.field} aria-labelledby="product-features-heading">
      <header className={styles.header}>
        <div>
          <h3 id="product-features-heading">مميزات المنتج <span>(اختياري)</span></h3>
          <p>أضيفي النقاط التي تميّز المنتج، ويمكنك إضافة حتى 20 ميزة.</p>
        </div>
        <button type="button" className={styles.add} onClick={addFeature} disabled={features.length >= 20}>
          <Plus size={16} aria-hidden="true" />
          <span>إضافة ميزة</span>
        </button>
      </header>

      {features.length > 0 && (
        <div className={styles.list}>
          {features.map((feature, index) => (
            <div className={styles.row} key={feature.id}>
              <label className={styles.inputLabel}>
                <span>الميزة {index + 1}</span>
                <input
                  name="features"
                  value={feature.value}
                  onChange={(event) => updateFeature(feature.id, event.target.value)}
                  maxLength={120}
                  placeholder="مثال: مناسب للاستخدام اليومي"
                />
              </label>
              <button type="button" className={styles.remove} onClick={() => removeFeature(feature.id)} aria-label={`حذف الميزة ${index + 1}`} title="حذف الميزة">
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
