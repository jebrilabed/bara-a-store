"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateProfileAction(formData: FormData) {
  const session: any = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "يجب تسجيل الدخول أولاً لتعديل البيانات." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  if (!name || name.length < 2) {
    return { success: false, error: "يُرجى إدخال اسم صحيح لا يقل عن حرفين." };
  }

  if (phone && phone.length > 20) {
    return { success: false, error: "رقم الهاتف غير صالح." };
  }

  try {
    await db.user.update({
      where: { id: session.user.id },
      data: {
        name,
        phone: phone || null,
        city: city || null,
        address: address || null,
      },
    });

    revalidatePath("/[locale]/account", "page");
    return { success: true };
  } catch (error) {
    return { success: false, error: "تعذر حفظ التغييرات حالياً. يُرجى المحاولة لاحقاً." };
  }
}
