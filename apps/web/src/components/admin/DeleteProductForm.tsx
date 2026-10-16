"use client";

import type { FormEvent } from "react";
import { Trash2 } from "lucide-react";
import LoadingButton from "@/components/ui/LoadingButton";

type DeleteProductFormProps = {
  id: string;
  action: (formData: FormData) => Promise<void>;
};

export default function DeleteProductForm({ id, action }: DeleteProductFormProps) {
  function confirmDelete(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm("هل تريد حذف المنتج نهائياً؟ سيُحذف من السلات، مع بقاء سجل الطلبات السابقة.")) {
      event.preventDefault();
    }
  }

  return (
    <form action={action} onSubmit={confirmDelete}>
      <input type="hidden" name="id" value={id} />
      <LoadingButton type="submit" className="product-action product-action--delete" pendingText="جارٍ...">
        <Trash2 size={14} />
        <span>حذف</span>
      </LoadingButton>
    </form>
  );
}