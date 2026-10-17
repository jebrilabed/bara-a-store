export const PRODUCT_TYPES = Object.freeze([
  "SKINCARE",
  "PERSONAL_CARE",
  "HOME_CLEANING",
  "HOME_FRAGRANCE",
  "AIR_FRESHENER",
]);

export const DEFAULT_DELIVERY_ZONES = Object.freeze([
  { id: "west-bank", name: "الضفة الغربية", fee: "20" },
  { id: "jerusalem", name: "القدس", fee: "30" },
  { id: "inside", name: "مناطق الداخل", fee: "50" },
]);

export const ORDER_TRANSITIONS = Object.freeze({
  NEW: ["PREPARING", "CANCELLED"],
  PREPARING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DONE"],
  DONE: [],
  CANCELLED: [],
});

export class InputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "InputError";
    this.status = status;
  }
}

function valueOf(source, key) {
  const value = source?.get ? source.get(key) : source?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function boundedText(source, key, maxLength, { required = false } = {}) {
  const value = valueOf(source, key);
  if (required && !value) throw new InputError(`${key} is required`);
  if (value.length > maxLength) throw new InputError(`${key} is too long`);
  return value || null;
}

export function makeSlug(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export function parseProductInput(source) {
  const name = boundedText(source, "name", 160, { required: true });
  const description = boundedText(source, "description", 5000) ?? "";
  const type = valueOf(source, "type") || "PERSONAL_CARE";
  if (!PRODUCT_TYPES.includes(type)) throw new InputError("Unsupported product type");

  const price = valueOf(source, "price");
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(price)) {
    throw new InputError("Price must be a nonnegative amount with up to two decimal places");
  }

  const compareAtPrice = valueOf(source, "compareAtPrice");
  if (compareAtPrice && !/^\d{1,10}(?:\.\d{1,2})?$/.test(compareAtPrice)) {
    throw new InputError("السعر قبل الخصم يجب أن يكون رقماً موجباً");
  }

  const stockText = valueOf(source, "stock");
  if (!/^\d{1,10}$/.test(stockText) || Number(stockText) > 1_000_000_000) {
    throw new InputError("Stock must be a whole number between 0 and 1,000,000,000");
  }

  const image = valueOf(source, "image");
  if (image) {
    const isLocalPath = image.startsWith("/") && !image.startsWith("//");
    let isHttps = false;
    try {
      isHttps = new URL(image).protocol === "https:";
    } catch {}
    if (!isLocalPath && !isHttps) throw new InputError("Image must use HTTPS or a local path");
  }

  const skuCode = boundedText(source, "skuCode", 64);
  if (skuCode && !/^[A-Za-z0-9][A-Za-z0-9._-]{1,63}$/.test(skuCode)) {
    throw new InputError("SKU code contains unsupported characters");
  }

  const rawFeatures = typeof source?.getAll === "function"
    ? source.getAll("features")
    : Array.isArray(source?.features) ? source.features : source?.features == null ? [] : [source.features];
  if (rawFeatures.length > 20) throw new InputError("لا يمكن إضافة أكثر من 20 ميزة للمنتج");
  const features = rawFeatures.map((feature) => String(feature ?? "").trim()).filter(Boolean);
  if (features.some((feature) => feature.length > 120)) {
    throw new InputError("يجب ألا تتجاوز الميزة 120 حرفاً");
  }

  return {
    name,
    slug: makeSlug(name),
    description,
    type,
    skuCode: skuCode?.toUpperCase() ?? null,
    packageSize: boundedText(source, "packageSize", 80),
    ingredients: boundedText(source, "ingredients", 5000),
    skinSuitability: boundedText(source, "skinSuitability", 1000),
    scentProfile: boundedText(source, "scentProfile", 1000),
    usageInstructions: boundedText(source, "usageInstructions", 3000),
    usageArea: boundedText(source, "usageArea", 160),
    safetyWarnings: boundedText(source, "safetyWarnings", 3000),
    storageInstructions: boundedText(source, "storageInstructions", 1500),
    manufacturer: boundedText(source, "manufacturer", 160),
    features,
    price,
    compareAtPrice: compareAtPrice || null,
    stock: Number(stockText),
    image: image || null,
    categoryId: boundedText(source, "cat", 100, { required: true }),
  };
}

const DIGIT_RANGES = [
  [/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660)],
  [/[\u06f0-\u06f9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0)],
];

export function normalizePhone(value) {
  let normalized = String(value ?? "").trim();
  for (const [pattern, convert] of DIGIT_RANGES) normalized = normalized.replace(pattern, convert);
  const digits = normalized.replace(/[\s()+.-]/g, "");
  if (!/^\d{7,15}$/.test(digits)) throw new InputError("رقم الهاتف يجب أن يتكون من 7 إلى 15 رقماً");
  return digits;
}

export function parseCheckoutInput(source) {
  const city = valueOf(source, "city");
  const name = valueOf(source, "name");
  const address = valueOf(source, "address");
  if (!city) throw new InputError("المدينة مطلوبة");
  if (city.length > 120) throw new InputError("اسم المدينة طويل جداً");
  if (!name) throw new InputError("الاسم مطلوب");
  if (name.length > 120) throw new InputError("الاسم طويل جداً");
  if (!address) throw new InputError("العنوان مطلوب");
  if (address.length > 500) throw new InputError("العنوان طويل جداً");
  const phone = normalizePhone(valueOf(source, "phone"));
  const deliveryZoneId = valueOf(source, "deliveryZoneId");
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(deliveryZoneId)) {
    throw new InputError("اختاري منطقة توصيل صالحة");
  }
  const paymentMethod = valueOf(source, "paymentMethod") || "CASH_ON_DELIVERY";
  if (!["CASH_ON_DELIVERY", "BANK_TRANSFER"].includes(paymentMethod)) {
    throw new InputError("اختاري طريقة دفع صالحة");
  }
  const idempotencyKey = valueOf(source, "idempotencyKey");
  if (!/^[A-Za-z0-9._:-]{24,120}$/.test(idempotencyKey)) {
    throw new InputError("تعذر تأكيد محاولة الطلب. أعيدي تحميل الصفحة وحاولي مرة أخرى");
  }
  return { name, phone, city, address, deliveryZoneId, paymentMethod, idempotencyKey };
}

export function parseDeliveryZones(value) {
  let zones;
  try {
    zones = JSON.parse(String(value ?? ""));
  } catch {
    throw new InputError("بيانات مناطق التوصيل غير صالحة");
  }

  if (!Array.isArray(zones) || zones.length === 0) {
    throw new InputError("أضيفي منطقة توصيل واحدة على الأقل");
  }

  const ids = new Set();
  const names = new Set();
  return zones.map((zone) => {
    if (!zone || typeof zone !== "object" || Array.isArray(zone)) {
      throw new InputError("بيانات منطقة التوصيل غير صالحة");
    }
    const id = typeof zone.id === "string" ? zone.id.trim() : "";
    const name = typeof zone.name === "string" ? zone.name.trim() : "";
    const fee = typeof zone.fee === "number" ? String(zone.fee) : typeof zone.fee === "string" ? zone.fee.trim() : "";
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(id) || !name || name.length > 120) {
      throw new InputError("يرجى إدخال اسم صالح لكل منطقة توصيل");
    }
    if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(fee)) {
      throw new InputError("تكلفة التوصيل يجب أن تكون رقمًا موجبًا حتى منزلتين عشريتين");
    }
    const normalizedName = name.toLocaleLowerCase();
    if (ids.has(id) || names.has(normalizedName)) {
      throw new InputError("لا يمكن تكرار معرّف المنطقة أو اسمها");
    }
    ids.add(id);
    names.add(normalizedName);
    return { id, name, fee };
  });
}

export function readDeliveryZones(value) {
  const stored = String(value ?? "");
  try {
    return parseDeliveryZones(stored);
  } catch {
    const legacyZones = stored.split(/\r?\n/).flatMap((line, index) => {
      const match = line.match(/^\s*(.+?)\s*:\s*(\d{1,10}(?:\.\d{1,2})?)/);
      return match ? [{ id: `legacy-${index + 1}`, name: match[1].trim(), fee: match[2] }] : [];
    });
    return legacyZones.length ? legacyZones : DEFAULT_DELIVERY_ZONES.map((zone) => ({ ...zone }));
  }
}

export function canTransitionOrder(current, next) {
  return ORDER_TRANSITIONS[current]?.includes(next) ?? false;
}

export function parseCartQuantity(value, { allowZero = false } = {}) {
  const quantity = typeof value === "number" ? value : Number(value);
  const minimum = allowZero ? 0 : 1;
  if (!Number.isInteger(quantity) || quantity < minimum || quantity > 99) {
    throw new InputError(`الكمية يجب أن تكون بين ${minimum} و99`);
  }
  return quantity;
}
