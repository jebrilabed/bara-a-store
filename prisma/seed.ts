import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production" || process.env.SEED_DEMO_DATA !== "true") {
    throw new Error("Demo seeding is disabled. Set SEED_DEMO_DATA=true in a disposable non-production database.");
  }

  const categories = [
    ["skin", "العناية بالبشرة"],
    ["personal-care", "العناية الشخصية"],
    ["home-fragrance", "العطور المنزلية"],
    ["air-fresheners", "معطرات الهواء"],
  ] as const;
  for (const [slug, name] of categories) {
    await db.category.upsert({ where: { slug }, update: {}, create: { slug, name } });
  }
  const categoryIds = Object.fromEntries((await db.category.findMany()).map((category) => [category.slug, category.id]));
  const products = [
    { category: "skin", slug: "gentle-face-cleanser", name: "غسول الوجه اللطيف", type: "SKINCARE" as const, price: "35.00", packageSize: "150 مل", ingredients: "", skinSuitability: "مناسب للاستخدام اليومي", usageInstructions: "يستخدم على بشرة مبللة ثم يشطف بالماء." },
    { category: "skin", slug: "daily-hydration-serum", name: "سيروم الترطيب اليومي", type: "SKINCARE" as const, price: "68.00", packageSize: "30 مل", ingredients: "", skinSuitability: "", usageInstructions: "توضع بضع قطرات على بشرة نظيفة." },
    { category: "personal-care", slug: "daily-hand-cream", name: "كريم اليدين اليومي", type: "PERSONAL_CARE" as const, price: "24.00", packageSize: "75 مل" },
    { category: "home-fragrance", slug: "vanilla-scented-candle", name: "شمعة معطرة بالفانيلا", type: "HOME_FRAGRANCE" as const, price: "45.00", packageSize: "200 غرام", scentProfile: "فانيلا دافئة" },
    { category: "home-fragrance", slug: "reed-diffuser", name: "موزع عطر بالعيدان", type: "HOME_FRAGRANCE" as const, price: "55.00", packageSize: "100 مل", scentProfile: "رائحة زهرية" },
    { category: "air-fresheners", slug: "linen-air-freshener", name: "معطر الهواء للمنسوجات", type: "AIR_FRESHENER" as const, price: "29.00", packageSize: "250 مل", usageArea: "الأقمشة والمنسوجات", safetyWarnings: "يختبر على جزء غير ظاهر قبل الاستخدام." },
  ];

  for (const product of products) {
    const { category, ...data } = product;
    const categoryId = categoryIds[category];
    if (!categoryId) throw new Error(`Missing demo category: ${category}`);
    await db.product.upsert({
      where: { slug: data.slug },
      update: {},
      create: { ...data, skuCode: `DEMO-${data.slug.toUpperCase()}`, description: "منتج تجريبي لمتجر براعة", stock: 20, categoryId },
    });
  }

  await db.page.upsert({
    where: { key: "faq" },
    update: {},
    create: { key: "faq", title: "الأسئلة الشائعة", body: "أضيفي معلومات التوصيل وسياسات المتجر قبل استخدام المحتوى التجريبي." },
  });
}

main().finally(() => db.$disconnect());
