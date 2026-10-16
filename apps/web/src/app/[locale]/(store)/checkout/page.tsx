import { getSetting } from "@/lib/settings";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { DEFAULT_DELIVERY_ZONES, readDeliveryZones } from "@/lib/backend-policy.mjs";
import CheckoutForm from "./CheckoutForm";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [deliveryZonesValue, session] = await Promise.all([
    getSetting("delivery_zones", JSON.stringify(DEFAULT_DELIVERY_ZONES)),
    auth(),
  ]);
  const deliveryZones = readDeliveryZones(deliveryZonesValue);
  const sessionUser = session?.user as { id?: string } | undefined;
  const profile = sessionUser?.id
    ? await db.user.findUnique({ where: { id: sessionUser.id }, select: { name: true, city: true, address: true } })
    : null;
  const initialDetails = profile
    ? { name: profile.name, city: profile.city ?? "", address: profile.address ?? "" }
    : undefined;
  return <CheckoutForm deliveryZones={deliveryZones} initialDetails={initialDetails} />;
}
