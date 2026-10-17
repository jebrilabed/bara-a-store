"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ProductImageField.module.css";

type ProductImageFieldProps = {
  initialImage?: string | null;
  helpText?: string;
};

async function compressImageFile(file: File): Promise<File> {
  // If file is already small (<= 400KB), return as is
  if (file.size <= 400 * 1024) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDim = 1200;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(file);

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) return resolve(file);
          const compressed = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, ".webp"),
            { type: "image/webp", lastModified: Date.now() },
          );
          resolve(compressed);
        },
        "image/webp",
        0.85,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

export default function ProductImageField({
  initialImage,
  helpText = "JPG أو PNG أو WebP، بحد أقصى 5 ميجابايت.",
}: ProductImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initialImage ?? null);
  const [isCompressing, setIsCompressing] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview(initialImage ?? null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, initialImage]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = event.currentTarget.files?.[0];
    if (!rawFile) {
      setFile(null);
      return;
    }

    if (rawFile.type.startsWith("image/") && rawFile.size > 400 * 1024) {
      try {
        setIsCompressing(true);
        const optimized = await compressImageFile(rawFile);
        setFile(optimized);

        // Update the input files via DataTransfer so the form submits the optimized file
        if (typeof DataTransfer !== "undefined" && inputRef.current) {
          const dt = new DataTransfer();
          dt.items.add(optimized);
          inputRef.current.files = dt.files;
        }
      } catch (e) {
        console.warn("Image compression fallback to original:", e);
        setFile(rawFile);
      } finally {
        setIsCompressing(false);
      }
    } else {
      setFile(rawFile);
    }
  };

  return (
    <div className={styles.field}>
      <label className={styles.label}>
        <span>
          {isCompressing
            ? "جارٍ تحسين الصورة..."
            : initialImage
            ? "تغيير صورة المنتج"
            : "صورة المنتج"}
        </span>
        <input
          ref={inputRef}
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
        />
      </label>
      <small className={styles.help}>
        {isCompressing ? "يتم تقليل حجم الصورة لتسريع الرفع..." : helpText}
      </small>
      {preview && (
        <figure className={styles.preview}>
          <img src={preview} alt="معاينة صورة المنتج" />
          <figcaption>
            {file
              ? `${file.name} (${(file.size / 1024).toFixed(0)} KB)`
              : "الصورة الحالية"}
          </figcaption>
        </figure>
      )}
    </div>
  );
}
