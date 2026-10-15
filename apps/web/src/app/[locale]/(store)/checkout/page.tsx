import { getSetting } from "@/lib/settings";
import { DEFAULT_DELIVERY_ZONES, readDeliveryZones } from "@/lib/backend-policy.mjs";
import CheckoutForm from "./CheckoutForm";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const deliveryZonesValue = await getSetting("delivery_zones", JSON.stringify(DEFAULT_DELIVERY_ZONES));
  const deliveryZones = readDeliveryZones(deliveryZonesValue);
  return <CheckoutForm deliveryZones={deliveryZones} />;
}
