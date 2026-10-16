"use client";

import type { FormEvent } from "react";
import { Trash2 } from "lucide-react";
import LoadingButton from "@/components/ui/LoadingButton";

type DeleteCategoryFormProps = {
  id: string;
  action: (formData: FormData) => Promise<void>;
  disabled: boolean;
};

export default function DeleteCategoryForm({ id, action, disabled }: DeleteCategoryFormProps) {
  function confirmDelete(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm("هل تريد حذف هذا القسم نهائيًا؟")) event.preventDefault();
  }

  return (
    <form action={action} onSubmit={confirmDelete}>
      <input type="hidden" name="id" value={id} />
      <LoadingButton
        type="submit"
        className="product-action product-action--delete"
        disabled={disabled}
        title={disabled ? "لا يمكن حذف قسم يحتوي على منتجات" : "حذف القسم"}
        pendingText="جارٍ..."
      >
        <Trash2 size={14} />
        <span>حذف</span>
      </LoadingButton>
    </form>
  );
}