# 🌿 متجر براعة | Bara'a Store

> **منصة تجارة إلكترونية متكاملة وحديثة متخصصة في منتجات العناية بالبشرة، العناية الشخصية، العطور المنزلية، ومعطرات الجو والمنسوجات.**  
> مبنية بأحدث تقنيات الويب: **Next.js 14 (App Router)**، **TypeScript**، **Prisma ORM**، **PostgreSQL**، و **Auth.js (NextAuth v5)**.

---

## 📑 فهرس المحتويات

- [نظرة عامة عن المشروع](#-نظرة-عامة-عن-المشروع)
- [المميزات الرئيسية](#-المميزات-الرئيسية)
  - [واجهة المتجر وتجربة العميل (Storefront)](#1-واجهة-المتجر-وتجربة-العميل-storefront)
  - [نظام السلة والدفع المحمي (Cart & Checkout)](#2-نظام-السلة-والدفع-المحمي-cart--checkout)
  - [لوحة تحكم الإدارة (Admin Dashboard)](#3-لوحة-تحكم-الإدارة-admin-dashboard)
  - [الأمان والموثوقية (Security & Integrity)](#4-الأمان-والموثوقية-security--integrity)
- [التقنيات المستخدمة (Tech Stack)](#-التقنيات-المستخدمة-tech-stack)
- [هيكل المشروع (Directory Structure)](#-هيكل-المشروع-directory-structure)
- [مخطط قاعدة البيانات (Database Schema)](#-مخطط-قاعدة-البيانات-database-schema)
- [دليل الإعداد والتشغيل المحلي](#-دليل-الإعداد-والتشغيل-المحلي)
  - [المتطلبات الأساسية](#المتطلبات-الأساسية)
  - [خطوات التثبيت](#خطوات-التثبيت)
  - [إعداد متغيرات البيئة](#إعداد-متغيرات-البيئة)
  - [إعداد قاعدة البيانات](#إعداد-قاعدة-البيانات)
  - [إنشاء أول حساب مدير (Admin Bootstrap)](#إنشاء-أول-حساب-مدير-admin-bootstrap)
- [الأوامر المتاحة (Available Scripts)](#-الأوامر-المتاحة-available-scripts)
- [الاختبارات وضمان الجودة (Testing & QA)](#-الاختبارات-وضمان-الجودة-testing--qa)
- [الرخصة والمساهمة](#-الرخصة-والمساهمة)

---

## 🌟 نظرة عامة عن المشروع

**متجر براعة (Bara'a Store)** هو تطبيق ويب متطور للتجارة الإلكترونية مصمم لتوفير تجربة تسوق عربية أصيلة وسلسة (RTL-First). يركز المتجر على تقديم منتجات العناية بالبشرة، المستحضرات الشخصية، العطور والمعطرات، مع توفير نظام إدارة متكامل وقوي يمنح مديري المتجر تحكماً مطلقاً في المنتجات، المخزون، الطلبات، والعملاء.

تم بناء النظام مع التركيز على **الأمان المالي والمنطقي**؛ حيث تتم جميع عمليات احتساب الأسعار، والخصومات، وتحديث المخزون على خادم السيرفر (Server-Side) لمنع أي تلاعب محتمل، مع دعم سلات التسوق الدائمة لكل من الزوار والمستخدمين المسجلين.

---

## ✨ المميزات الرئيسية

### 1. واجهة المتجر وتجربة العميل (Storefront)
- **تصميم عربي متكامل (RTL & Responsive):** واجهة مستخدم فائقة الجمال والسلاسة متوافقة بالكامل مع الهواتف الذكية والأجهزة اللوحية والحواسيب.
- **تصفح وتصنيف ذكي للمنتجات:**
  - **العناية بالبشرة (Skincare)**
  - **العناية الشخصية (Personal Care)**
  - **المنظفات المنزلية (Home Cleaning)**
  - **العطور المنزلية (Home Fragrance)**
  - **معطرات الجو والمنسوجات (Air Freshener)**
- **بطاقة تفاصيل منتج شاملة وغنية بالمعلومات:**
  - المكونات النشطة (`ingredients`) وملاءمة نوع البشرة (`skinSuitability`).
  - درجات ونفحات العطر (`scentProfile`).
  - إرشادات الاستخدام (`usageInstructions`) والمساحات المناسبة (`usageArea`).
  - تحذيرات السلامة (`safetyWarnings`) وتعليمات الحفظ والتخزين (`storageInstructions`).
  - سعة العبوة والحجم (`packageSize`) والشركة المصنعة (`manufacturer`).
  - قائمة المميزات السريعة كعلامات واضحة (`features`).
  - رمز SKU فريد لكل وحدة قابلة للبيع.
- **البحث السريع والتصفية:** إمكانية البحث الفوري عن المنتجات حسب الاسم والتصنيف.
- **قائمة المفضلة (Wishlist):** إمكانية حفظ المنتجات المفضلة والرجوع إليها في أي وقت.
- **حسابات العملاء (Customer Portal):**
  - تسجيل الدخول والإنشاء باستخدام البريد الإلكتروني وكلمة المرور.
  - إدارة بيانات الملف الشخصي (الاسم، الهاتف، العنوان، المدينة).
  - سجل تتبع الطلبات السابقة وحالاتها الحالية.

### 2. نظام السلة والدفع المحمي (Cart & Checkout)
- **سلة تسوق هجينة ودائمة (Persistent Cart):**
  - **سلة الزائر (Guest Cart):** تعمل عبر رمز عشوائي آمن بطول 256-bit في كوكيز `HttpOnly`، مع حفظ الـ Hash المشفر فقط في قاعدة البيانات.
  - **سلة الحساب (User Cart):** دمج تلقائي (Cart Merge) لمحتويات سلة الزائر مع سلة الحساب فور تسجيل الدخول.
  - **حماية الأسعار:** تخزين لقطة سعرية فورية (`priceSnapshot`) ومقارنتها تلقائياً بالأسعار المحدثة عند إتمام الطلب لمنع أي تلاعب.
- **إتمام الطلب الموثوق (Atomic Checkout):**
  - فحص المخزون والخصم الذري (Atomic Decrement) ضمن معاملة قاعدة بيانات تفاعلية (Interactive Transaction) لمنع مشكلات البيع الزائد (Over-selling).
  - منع تكرار الطلبات باستخدام مفتاح فريد (`idempotencyKey`).
- **طرق الدفع والشحن:**
  - **الدفع عند الاستلام (Cash On Delivery - COD).**
  - **التحويل البنكي (Bank Transfer):** مع دعم رفع وتخزين لقطة إيصال الدفع.
  - حساب تلقائي لرسوم الشحن بناءً على مناطق التوصيل المحددة (`Delivery Zones`).

### 3. لوحة تحكم الإدارة (Admin Dashboard)
- **حماية مشددة:** وصول حصري للمديرين فقط محمي بـ Role-based middleware وServer actions guard.
- **إدارة المنتجات والتصنيفات:**
  - إنشاء وتعديل وأرشفة وحذف المنتجات.
  - دعم رفع وتعديل صور المنتجات ودمجها مع **Cloudinary**.
  - تعيين سمات المنتجات، الأسعار العادية والترويجية (`compareAtPrice`)، ورموز الـ SKU.
- **متابعة المخزون (Inventory Management):**
  - مراقبة مستويات المخزون الحالية وتحديد حد التنبيه بانخفاض المخزون (Low-stock threshold).
- **إدارة دورة حياة الطلبات (Order Lifecycle):**
  - استعراض شامل للطلبات والفرز حسب الحالة.
  - صفحة تفاصيل متكاملة لكل طلب (`/admin/orders/[id]`) تعرض بيانات العميل، عناوين التسليم، وبنود المنتجات المشتراة.
  - محرك حالات محكم (Order State Transitions):
    - `NEW` (جديد) ➔ `PREPARING` (قيد التجهيز) ➔ `SHIPPED` (تم الشحن) ➔ `DONE` (مكتمل).
    - إمكانية الإلغاء (`CANCELLED`) مع **إرجاع تلقائي وفوري للمخزون (Restock)** ضمن نفس المعاملة.
  - التحكم في حالة الدفع وتأكيد الإيصالات البنكية.
- **سجل تدقيق الإدارة (Admin Audit Log):** تسجيل تلقائي لأي تغيير أو إجراء حساس قام به المدير مع تفاصيل التوقيت ونوع الكيان.
- **إدارة الإشعارات وإعدادات المتجر:** تخصيص صفحات المحتوى الثابتة (من نحن، الأسئلة الشائعة، سياسات التوصيل).

### 4. الأمان والموثوقية (Security & Integrity)
- تجزئة كلمات المرور باستخدام **bcrypt** بمعامل تكلفة عالي (`cost = 12`).
- معالجة وتوحيد أرقام الهواتف (Phone Normalization) بما يقبل الأرقام العربية والفارسية والدولية دون افتراض مسبق للبلد.
- منع ثغرات تزوير الطلبات أو التلاعب بالكميات والأسعار من جهة العميل.
- إخفاء البيانات الحساسة وأسرار الاتصال عن سجلات الأخطاء.

---

## 🛠 التقنيات المستخدمة (Tech Stack)

| المجال | التقنية | الاستخدام |
| :--- | :--- | :--- |
| **Framework** | [Next.js 14](https://nextjs.org/) (App Router) | بناء الواجهات ومعالجة الخادم وServer Actions |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | ضمان سلامة الأنواع ومنع الأخطاء البرمجية |
| **UI Library** | [React 18](https://react.dev/) | بناء مكونات الواجهة التفاعلية |
| **Styling** | Vanilla CSS & CSS Modules | تخصيص كامل، مرونة قصوى، وسرعة تحميل استثنائية بدون أطر عمل ثقيلة |
| **Icons** | [Lucide React](https://lucide.dev/) | أيقونات حديثة وخفيفة متناسقة مع التصميم |
| **Database** | [PostgreSQL](https://www.postgresql.org/) | قاعدة بيانات علائقية قوية وموثوقة |
| **ORM** | [Prisma 5.20](https://www.prisma.io/) | نمذجة البيانات، الترحيلات (Migrations)، والاستعلامات الآمنة |
| **Authentication** | [Auth.js / NextAuth v5](https://authjs.dev/) | إدارة جلسات المستخدمين والمديرين عبر JWT |
| **Media Storage** | [Cloudinary](https://cloudinary.com/) | تخزين ورفع وتحسين صور المنتجات |
| **Testing** | Node.js Test Runner (`node --test`) | اختبارات سياسات الباك إند والمنطق التجاري |

---

## 📁 هيكل المشروع (Directory Structure)

```text
Bara'a Store/
├── apps/
│   └── web/                               # تطبيق الويب الأساسي (Next.js)
│       ├── public/                        # الملفات الثابتة والوسائط
│       ├── src/
│       │   ├── app/                       # توجيهات App Router
│       │   │   ├── (admin)/admin/         # لوحة تحكم الإدارة (منتجات، طلبات، مخزون، إعدادات)
│       │   │   ├── (landing)/             # الصفحة الرئيسية وتوجيه اللغة
│       │   │   ├── [locale]/              # صفحات المتجر المترجمة
│       │   │   │   ├── (store)/           # واجهة المتجر (الرئيسية، المنتجات، السلة، الدفع، الطلبات)
│       │   │   │   ├── account/           # صفحة حساب العميل وإدارة الملف الشخصي
│       │   │   │   ├── login/             # تسجيل دخول العملاء
│       │   │   │   └── register/          # إنشاء حساب عميل جديد
│       │   │   └── api/                   # مسارات واجهات البرمجة (NextAuth، رفع الصور)
│       │   ├── components/                # مكونات الواجهة
│       │   │   ├── admin/                 # مكونات لوحة الإدارة
│       │   │   ├── storefront/            # مكونات واجهة المتجر (Header, Footer, ProductCard, Cart)
│       │   │   └── ui/                    # مكونات عامة
│       │   ├── lib/                       # المنطق البرمجي والخدمات المشتركة
│       │   │   ├── admin/                 # وظائف التحقق والتحكم الخاصة بالإدارة
│       │   │   ├── auth/                  # معالجة الجلسات والتحقق من الصلاحيات
│       │   │   ├── backend-policy.mjs     # منطق السياسات التجاري الصارم
│       │   │   ├── cart.tsx               # سياق وإدارة سلة التسوق
│       │   │   ├── cloudinary.ts          # تكامل رفع الصور
│       │   │   └── db.ts                  # عميل Prisma المشترك
│       │   └── styles/
│       │       └── globals.css            # الأنماط والتنسيقات الشاملة
│       └── tests/
│           └── backend-policy.test.mjs    # اختبارات السياسات والتحقق البرمجي
├── docs/                                  # التوثيق والتقارير الفنية
│   ├── README.md
│   └── BACKEND_IMPLEMENTATION.md
├── prisma/                                # إدارة قاعدة البيانات
│   ├── migrations/                        # تاريخ ترحيلات PostgreSQL المنظمة
│   ├── schema.prisma                      # مخطط ونماذج الجداول والعلاقات
│   └── seed.ts                            # بيانات تجريبية للتطوير
├── scripts/
│   └── bootstrap-admin.ts                 # سكربت إنشاء أو تحديث أول حساب مدير بأمان
├── .env.example                           # نموذج المتغيرات البيئية
├── package.json                           # تعريف المشروع والتبعيات والأوامر
├── tsconfig.json                          # إعدادات TypeScript
└── vercel.json                            # إعدادات النشر على Vercel
```

---

## 🗄 مخطط قاعدة البيانات (Database Schema)

تعتمد قاعدة البيانات على النماذج الأساسية التالية:

```mermaid
erDiagram
    User ||--o{ Order : places
    User ||--o{ Cart : owns
    User ||--o{ AdminAuditLog : triggers
    Category ||--o{ Product : contains
    Product ||--o{ OrderItem : references
    Product ||--o{ CartItem : contains
    Cart ||--o{ CartItem : holds
    Order ||--o{ OrderItem : includes

    User {
        string id PK
        string email UK
        string name
        string role "CUSTOMER | ADMIN"
        string phone
        string city
        string address
    }

    Product {
        string id PK
        string slug UK
        string name
        ProductType type "SKINCARE | PERSONAL_CARE | HOME_CLEANING | HOME_FRAGRANCE | AIR_FRESHENER"
        decimal price
        decimal compareAtPrice
        int stock
        string skuCode UK
        string packageSize
        string ingredients
        string skinSuitability
        string scentProfile
        string usageInstructions
        string safetyWarnings
        boolean active
    }

    Cart {
        string id PK
        string userId FK
        string guestTokenHash UK
        CartStatus status "ACTIVE | CONVERTED | ABANDONED"
    }

    Order {
        string id PK
        string name
        string phone
        string address
        decimal total
        PaymentMethod paymentMethod "CASH_ON_DELIVERY | BANK_TRANSFER"
        string paymentStatus
        string status "NEW | PREPARING | SHIPPED | DONE | CANCELLED"
        string idempotencyKey UK
    }
```

---

## 🚀 دليل الإعداد والتشغيل المحلي

### المتطلبات الأساسية
- **Node.js**: الإصدار 18 أو 20 فما فوق.
- **npm** أو **pnpm**.
- قاعدة بيانات **PostgreSQL** جاهزة ومتاحة.

### خطوات التثبيت

1. **استنساخ المستودع والدخول للمجلد:**
   ```bash
   git clone <repo-url>
   cd "Bara'a Store"
   ```

2. **تثبيت الحزم والتبعيات:**
   ```bash
   npm install
   ```

### إعداد متغيرات البيئة

انسخ ملف `.env.example` إلى `.env`:
```bash
cp .env.example .env
```

قم بملء المتغيرات بالبيانات الخاصة بك:
```env
# رابط الاتصال المباشر والمجمع لقاعدة بيانات PostgreSQL
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/baraa_store?schema=public"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/baraa_store?schema=public"

# مفتاح سري عشوائي لتأمين الجلسات (يمكن إنشاؤه عبر: openssl rand -base64 32)
AUTH_SECRET="your-super-secret-random-key-at-least-32-chars"

# إعدادات Cloudinary لرفع صور المنتجات (اختياري للتطوير، مطلوب لرفع الصور)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

### إعداد قاعدة البيانات

1. **التحقق من صحة المخطط:**
   ```bash
   npm run db:validate
   ```

2. **توليد عميل Prisma Client:**
   ```bash
   npm run db:generate
   ```

3. **تطبيق الترحيلات (Migrations):**
   - في بيئة التطوير:
     ```bash
     npm run db:migrate:dev
     ```
   - في بيئة الإنتاج أو عند التهيئة لأول مرة:
     ```bash
     npm run db:migrate:deploy
     ```

4. **(اختياري) إضافة بيانات تجريبية:**
   > ⚠️ **ملاحظة:** لا تُشغل هذا الأمر في بيئة الإنتاج.
   ```bash
   # شغّل الأمر مع تفعيل SEED_DEMO_DATA
   SEED_DEMO_DATA=true npm run db:seed
   ```

### إنشاء أول حساب مدير (Admin Bootstrap)

لا يحتوي المشروع على أي حسابات أو كلمات مرور تجريبية افتراضية لضمان أعلى معايير الأمان. قم بإنشاء أول حساب مدير باستخدام السكربت الآمن عبر تمرير المتغيرات للأمر مباشرة:

```bash
ADMIN_BOOTSTRAP_EMAIL="admin@baraastore.com" ADMIN_BOOTSTRAP_PASSWORD="YourStrongPassword123" npm run admin:bootstrap
```

> **ملاحظة أمنية:** لا تقم بحفظ بيانات المدير في ملف `.env`، بل مررها كمتغيرات تنفيذ لمرة واحدة فقط.

---

## 💻 تشغيل خادم التطوير

بعد إتمام الخطوات السابقة، يمكنك تشغيل المتجر محلياً:

```bash
npm run dev
```

افتح المتصفح وتوجه إلى:
- **واجهة المتجر:** `http://localhost:3000/ar`
- **لوحة الإدارة:** `http://localhost:3000/admin` (قم بتسجيل الدخول بحساب المدير الذي أنشأته).

---

## 📜 الأوامر المتاحة (Available Scripts)

| الأمر | الوظيفة |
| :--- | :--- |
| `npm run dev` | تشغيل خادم التطوير لـ Next.js |
| `npm run build` | بناء نسخة الإنتاج المحسّنة |
| `npm run start` | تشغيل خادم الإنتاج |
| `npm run typecheck` | فحص أنواع TypeScript والتأكد من خلو المشروع من الأخطاء |
| `npm run test:backend` | تشغيل حزمة اختبارات منطق وسياسات الباك إند |
| `npm run db:validate` | التحقق من صحة ملف `prisma/schema.prisma` |
| `npm run db:generate` | توليد حزم Prisma Client |
| `npm run db:migrate:dev` | إنشاء وتطبيق ترحيلات قاعدة البيانات في بيئة التطوير |
| `npm run db:migrate:deploy`| تطبيق ترحيلات قاعدة البيانات المعتمدة في بيئة الإنتاج |
| `npm run db:seed` | إدخال التصنيفات والمنتجات التجريبية لقاعدة البيانات |
| `npm run admin:bootstrap` | إنشاء أو ترقية حساب المدير الأول بأمان |

---

## 🧪 الاختبارات وضمان الجودة (Testing & QA)

المشروع مزود باختبارات آلية تغطي أهم القواعد المالية والتجارية وقواعد الأمان:

```bash
npm run test:backend
```

تشمل الاختبارات التحقق من:
1. قبول عائلات منتجات المتجر المعتمدة مع سماتها المخصصة.
2. ضبط وحدود المميزات الخاصة بالمنتجات (`features`).
3. رفض الأنواع غير المدعومة، والكسور غير الصالحة في الأسعار، وروابط الصور غير الآمنة.
4. توحيد ومعايرة أرقام الهواتف (الأرقام العربية والفارسية).
5. التحقق الصارم من مدخلات إتمام الطلب ومفاتيح عدم التكرار (`idempotencyKey`).
6. التحقق من رسوم مناطق التوصيل وسلامتها.
7. صحة انتقال حالات الطلبات وفقاً لمخطط الحالات الصارم (Transition Graph).
8. التحقق من حدود كميات سلة التسوق وصحتها.

---

## 🔒 أمان الإنتاج والنشر (Production Checklist)

قبل نشر المتجر للإنتاج:
1. **قاعدة البيانات:** استخدام قاعدة بيانات PostgreSQL سحابية مستقلة وتطبيق `npm run db:migrate:deploy`.
2. **المفاتيح السرية:** التأكد من توليد `AUTH_SECRET` قوي وفريد وغير مستخدم في أي مشروع آخر.
3. **حساب الإدارة:** إنشاء حساب المدير باستخدام `admin:bootstrap` بكلمة مرور معقدة تتجاوز 12 خانة.
4. **وسائط التخزين:** ربط بيانات Cloudinary لتخزين صور المنتجات بشكل دائم وسريع.
5. **SSL/TLS:** تفعيل اتصال HTTPS الإجباري لحماية كوكيز المصادقة وسلة التسوق.

---

<p align="center">
  <b>متجر براعة (Bara'a Store)</b> • تم التطوير بعناية واحترافية ليقدم أرقى تجربة للتسوق وإدارة المتاجر الإلكترونية.
</p>
