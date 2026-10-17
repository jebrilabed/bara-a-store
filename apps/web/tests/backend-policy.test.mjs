import test from "node:test";
import assert from "node:assert/strict";
import {
  canTransitionOrder,
  InputError,
  normalizePhone,
  parseDeliveryZones,
  parseCartQuantity,
  parseCheckoutInput,
  parseProductInput,
  PRODUCT_TYPES,
  readDeliveryZones,
} from "../src/lib/backend-policy.mjs";

test("catalog accepts all store product families with optional product facts", () => {
  assert.deepEqual(PRODUCT_TYPES, ["SKINCARE", "PERSONAL_CARE", "HOME_CLEANING", "HOME_FRAGRANCE", "AIR_FRESHENER"]);
  for (const type of PRODUCT_TYPES) {
    const product = parseProductInput({
      name: "منتج تجريبي",
      type,
      price: "12.50",
      stock: "4",
      cat: "category-id",
      packageSize: "50 مل",
      features: ["ترطيب عميق", "مناسب للاستخدام اليومي"],
    });
    assert.equal(product.type, type);
    assert.equal(product.packageSize, "50 مل");
    assert.deepEqual(product.features, ["ترطيب عميق", "مناسب للاستخدام اليومي"]);
    assert.equal("color" in product, false);
    assert.equal("size" in product, false);
  }
});

test("product features are optional, trimmed and bounded", () => {
  const base = { name: "عطر", price: "25.00", stock: "2", cat: "category-id" };
  assert.deepEqual(parseProductInput(base).features, []);
  assert.deepEqual(parseProductInput({ ...base, features: [" ميزة أولى ", "", "ميزة ثانية"] }).features, ["ميزة أولى", "ميزة ثانية"]);
  assert.throws(() => parseProductInput({ ...base, features: ["x".repeat(121)] }), InputError);
  assert.throws(() => parseProductInput({ ...base, features: Array.from({ length: 21 }, () => "ميزة") }), InputError);
});

test("catalog validation rejects unsupported types, fractional cents and unsafe image URLs", () => {
  const base = { name: "عطر", price: "25.00", stock: "2", cat: "category-id" };
  assert.throws(() => parseProductInput({ ...base, type: "CLOTHING" }), InputError);
  assert.throws(() => parseProductInput({ ...base, price: "25.001" }), InputError);
  assert.throws(() => parseProductInput({ ...base, image: "http://example.com/image.png" }), InputError);
});

test("phone normalization accepts Arabic and Persian numerals without assuming a country", () => {
  assert.equal(normalizePhone("+٩٧٠ ٥٩ ١٢٣ ٤٥٦٧"), "970591234567");
  assert.equal(normalizePhone("+۹۷۰ (۵۹) ۱۲۳-۴۵۶۷"), "970591234567");
  assert.throws(() => normalizePhone("123"), InputError);
});

test("checkout parsing uses validated contact data and a retry key, not client prices or items", () => {
  const checkout = parseCheckoutInput({
    name: "سارة",
    phone: "٠٥٩١٢٣٤٥٦٧",
    city: "نابلس",
    address: "شارع رئيسي",
    deliveryZoneId: "west-bank",
    paymentMethod: "CASH_ON_DELIVERY",
    idempotencyKey: "f83f07b6-43a0-4d58-8bbb-d2f8f6f83b1a",
    total: 0.01,
    items: [{ id: "untrusted", qty: 99 }],
  });
  assert.deepEqual(checkout, {
    name: "سارة",
    phone: "0591234567",
    city: "نابلس",
    address: "شارع رئيسي",
    deliveryZoneId: "west-bank",
    paymentMethod: "CASH_ON_DELIVERY",
    idempotencyKey: "f83f07b6-43a0-4d58-8bbb-d2f8f6f83b1a",
  });
  assert.equal(parseCheckoutInput({
    name: "سارة",
    phone: "0591234567",
    city: "نابلس",
    address: "عنوان",
    deliveryZoneId: "west-bank",
    paymentMethod: "BANK_TRANSFER",
    idempotencyKey: "f83f07b6-43a0-4d58-8bbb-d2f8f6f83b1a",
  }).paymentMethod, "BANK_TRANSFER");
  assert.throws(() => parseCheckoutInput({ name: "سارة", phone: "0591234567", city: "نابلس", address: "عنوان", deliveryZoneId: "west-bank", paymentMethod: "CARD", idempotencyKey: "f83f07b6-43a0-4d58-8bbb-d2f8f6f83b1a" }), InputError);
  assert.throws(() => parseCheckoutInput({ name: "سارة", phone: "0591234567", city: "نابلس", address: "عنوان", deliveryZoneId: "west-bank", idempotencyKey: "short" }), InputError);
  assert.throws(() => parseCheckoutInput({ name: "سارة", phone: "0591234567", address: "عنوان", deliveryZoneId: "west-bank", idempotencyKey: "f83f07b6-43a0-4d58-8bbb-d2f8f6f83b1a" }), InputError);
});

test("delivery zones accept multiple unique named fees and reject invalid entries", () => {
  const zones = parseDeliveryZones(JSON.stringify([
    { id: "zone-one", name: "نابلس", fee: "12.50" },
    { id: "zone-two", name: "رام الله", fee: "20" },
  ]));
  assert.equal(zones.length, 2);
  assert.equal(zones[0].fee, "12.50");
  assert.throws(() => parseDeliveryZones(JSON.stringify([
    { id: "same", name: "نابلس", fee: "10" },
    { id: "same", name: "طولكرم", fee: "12" },
  ])), InputError);
  assert.throws(() => parseDeliveryZones(JSON.stringify([{ id: "x", name: "نابلس", fee: "10.123" }])), InputError);
});

test("delivery settings migrate legacy text lines when read", () => {
  const zones = readDeliveryZones("الضفة الغربية: 20 ₪ (1 - 3 أيام)\nالقدس: 30 ₪ (1 - 2 أيام)");
  assert.deepEqual(zones.map(({ name, fee }) => ({ name, fee })), [
    { name: "الضفة الغربية", fee: "20" },
    { name: "القدس", fee: "30" },
  ]);
});

test("order state changes follow the explicit transition graph", () => {
  assert.equal(canTransitionOrder("NEW", "PREPARING"), true);
  assert.equal(canTransitionOrder("NEW", "DONE"), true);
  assert.equal(canTransitionOrder("PREPARING", "CANCELLED"), true);
  assert.equal(canTransitionOrder("PREPARING", "DONE"), true);
  assert.equal(canTransitionOrder("SHIPPED", "CANCELLED"), false);
  assert.equal(canTransitionOrder("DONE", "PREPARING"), false);
  assert.equal(canTransitionOrder("UNKNOWN", "DONE"), false);
});

test("cart quantities are positive and bounded unless removing a line", () => {
  assert.equal(parseCartQuantity("5"), 5);
  assert.equal(parseCartQuantity(0, { allowZero: true }), 0);
  assert.throws(() => parseCartQuantity(0), InputError);
  assert.throws(() => parseCartQuantity(100), InputError);
  assert.throws(() => parseCartQuantity(1.5), InputError);
});
