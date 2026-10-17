import { getSetting } from "@/lib/settings";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { DEFAULT_DELIVERY_ZONES, readDeliveryZones } from "@/lib/backend-policy.mjs";
import { redirect } from "next/navigation";
import CheckoutForm from "./CheckoutForm";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const session = await auth();
  const sessionUser = session?.user as { id?: string } | undefined;
  if (!sessionUser?.id) redirect("/ar/login?callbackUrl=%2Far%2Fcheckout");

  const [deliveryZonesValue, profile, bankName, bankBeneficiary, bankIban, bankNotes] = await Promise.all([
    getSetting("delivery_zones", JSON.stringify(DEFAULT_DELIVERY_ZONES)),
    db.user.findUnique({ where: { id: sessionUser.id } }),
    getSetting("bank_name", "بنك فلسطين"),
    getSetting("bank_beneficiary", "متجر براعة"),
    getSetting("bank_iban", ""),
    getSetting("bank_notes", ""),
  ]);
  if (!profile) redirect("/ar/login?callbackUrl=%2Far%2Fcheckout");
  const deliveryZones = readDeliveryZones(deliveryZonesValue);
  const userRecord = profile as any;
  const initialDetails = { name: userRecord.name, phone: userRecord.phone ?? "", city: userRecord.city ?? "", address: userRecord.address ?? "" };
  const bankDetails = { bankName, bankBeneficiary, bankIban, bankNotes };
  return <CheckoutForm deliveryZones={deliveryZones} initialDetails={initialDetails} bankDetails={bankDetails} />;
}
