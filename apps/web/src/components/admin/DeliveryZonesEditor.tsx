"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

type DeliveryZone = { id: string; name: string; fee: string };

export default function DeliveryZonesEditor({ initialZones }: { initialZones: DeliveryZone[] }) {
  const [zones, setZones] = useState(initialZones);

  function updateZone(id: string, key: "name" | "fee", value: string) {
    setZones((current) => current.map((zone) => zone.id === id ? { ...zone, [key]: value } : zone));
  }

  function addZone() {
    setZones((current) => [...current, { id: crypto.randomUUID(), name: "", fee: "" }]);
  }

  function removeZone(id: string) {
    setZones((current) => current.filter((zone) => zone.id !== id));
  }

  return (
    <div className="delivery-zones-editor">
      <input type="hidden" name="delivery_zones" value={JSON.stringify(zones)} />
      {zones.length === 0 ? (
        <p className="delivery-zones-empty">أضيفي منطقة واحدة على الأقل لتفعيل التوصيل.</p>
      ) : (
        <div className="delivery-zones-list">
          {zones.map((zone, index) => (
            <div className="delivery-zone-row" key={zone.id}>
              <label>
                <span>المنطقة {index + 1}</span>
                <input
                  value={zone.name}
                  onChange={(event) => updateZone(zone.id, "name", event.target.value)}
                  maxLength={120}
                  placeholder="مثال: نابلس"
                  required
                />
              </label>
              <label>
                <span>تكلفة التوصيل (₪)</span>
                <input
                  value={zone.fee}
                  onChange={(event) => updateZone(zone.id, "fee", event.target.value)}
                  type="number"
                  min="0"
                  max="9999999999.99"
                  step="0.01"
                  placeholder="0.00"
                  required
                />
              </label>
              <button
                className="delivery-zone-remove"
                type="button"
                onClick={() => removeZone(zone.id)}
                aria-label={`حذف المنطقة ${zone.name || index + 1}`}
                title="حذف المنطقة"
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>
      )}
      <button className="delivery-zone-add" type="button" onClick={addZone}>
        <Plus size={17} />
        <span>إضافة منطقة</span>
      </button>
    </div>
  );
}