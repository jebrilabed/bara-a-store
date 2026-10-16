"use client";

import { useEffect, useState } from "react";
import styles from "./ProductImageField.module.css";

type ProductImageFieldProps = {
  initialImage?: string | null;
  helpText?: string;
};

export default function ProductImageField({ initialImage, helpText = "JPG أو PNG أو WebP، بحد أقصى 5 ميجابايت." }: ProductImageFieldProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initialImage ?? null);

  useEffect(() => {
    if (!file) {
      setPreview(initialImage ?? null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, initialImage]);

  return (
    <div className={styles.field}>
      <label className={styles.label}>
        <span>{initialImage ? "تغيير صورة المنتج" : "صورة المنتج"}</span>
        <input
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
        />
      </label>
      <small className={styles.help}>{helpText}</small>
      {preview && (
        <figure className={styles.preview}>
          <img src={preview} alt="معاينة صورة المنتج" />
          <figcaption>{file ? file.name : "الصورة الحالية"}</figcaption>
        </figure>
      )}
    </div>
  );
}
