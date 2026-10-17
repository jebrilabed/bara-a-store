"use client";

import type { FormEvent } from "react";
import { Trash2 } from "lucide-react";
import LoadingButton from "@/components/ui/LoadingButton";

type OrderAction = (formData: FormData) => void | Promise<void>;

type OrderRowActionsProps = {
  id: string;
  deleteOrder: OrderAction;
};

export default function OrderRowActions({ id, deleteOrder }: OrderRowActionsProps) {
  function confirmDelete(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm("هل تريد حذف الطلب نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.")) event.preventDefault();
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "7px", minWidth: "180px" }}>
      <form action={deleteOrder} onSubmit={confirmDelete}>
        <input type="hidden" name="id" value={id} />
        <LoadingButton type="submit" className="btn" pendingText="جارٍ الحذف..." style={{ padding: "7px 9px", fontSize: "0.82rem", background: "#b42318" }}>
          <Trash2 size={14} />
          <span>حذف الطلب</span>
        </LoadingButton>
      </form>
    </div>
  );
}