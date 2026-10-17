"use client";

import { useWishlist, type WishlistItem } from "@/lib/wishlist";
import { Heart } from "lucide-react";
import styles from "./FavoriteButton.module.css";

type FavoriteButtonProps = {
  product: WishlistItem;
  variant?: "floating" | "inline";
  className?: string;
};

export default function FavoriteButton({ product, variant = "floating", className = "" }: FavoriteButtonProps) {
  const { isFavorite, toggle } = useWishlist();
  const favorite = isFavorite(product.id);

  return (
    <button
      type="button"
      className={`${styles.button} ${variant === "floating" ? styles.floating : styles.inline} ${favorite ? styles.active : ""} ${className}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(product);
      }}
      aria-label={favorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
      title={favorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
    >
      <Heart
        size={variant === "floating" ? 18 : 20}
        className={styles.icon}
        fill={favorite ? "#e11d48" : "none"}
        color={favorite ? "#e11d48" : "currentColor"}
        aria-hidden="true"
      />
      {variant === "inline" && (
        <span>{favorite ? "في المفضلة" : "أضف للمفضلة"}</span>
      )}
    </button>
  );
}
