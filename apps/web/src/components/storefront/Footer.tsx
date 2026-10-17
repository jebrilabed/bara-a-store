import Link from "next/link";
import { MapPin, Mail, MessageCircle, Heart } from "lucide-react";
import "./Footer.css";

type FooterProps = {
  locale: string;
  storeName: string;
  storeDescription: string;
  storeAddress: string;
  whatsapp: string;
  storeEmail: string;
};

export default function Footer({
  locale,
  storeName,
  storeDescription,
  storeAddress,
  whatsapp,
  storeEmail,
}: FooterProps) {
  const currentYear = new Date().getFullYear();
  const cleanWhatsapp = whatsapp.replace(/\D/g, "");
  const waLink = cleanWhatsapp
    ? `https://wa.me/${cleanWhatsapp.startsWith("0") ? "970" + cleanWhatsapp.slice(1) : cleanWhatsapp}`
    : null;

  return (
    <footer className="store-footer">
      <div className="wrap store-footer__content">
        {/* Brand & Description */}
        <div className="store-footer__col store-footer__col--brand">
          <Link href={`/${locale}`} className="store-footer__brand">
            <img src="/logo.png" alt={storeName} width={48} height={48} />
            <span>{storeName}</span>
          </Link>
          <p className="store-footer__desc">
            {storeDescription || "وجهتك الأولى لمنتجات العناية بالبشرة والمنظفات والمعطرات المنزلية بأعلى معايير الجودة."}
          </p>
        </div>

        {/* Quick Links */}
        <div className="store-footer__col">
          <h3 className="store-footer__title">روابط سريعة</h3>
          <ul className="store-footer__links">
            <li><Link href={`/${locale}`}>الرئيسية</Link></li>
            <li><Link href={`/${locale}/products`}>جميع المنتجات</Link></li>
            <li><Link href={`/${locale}/categories`}>الأقسام والتصنيفات</Link></li>
            <li><Link href={`/${locale}/search`}>البحث في المتجر</Link></li>
            <li><Link href={`/${locale}/cart`}>سلة المشتريات</Link></li>
            <li><Link href={`/${locale}/account`}>حسابي والطلبات</Link></li>
          </ul>
        </div>

        {/* Contact & Store Info */}
        <div className="store-footer__col">
          <h3 className="store-footer__title">بيانات وتواصل المتجر</h3>
          <ul className="store-footer__contact">
            {storeAddress && (
              <li>
                <span className="store-footer__contact-icon">
                  <MapPin size={18} aria-hidden="true" />
                </span>
                <span>{storeAddress}</span>
              </li>
            )}
            {whatsapp && (
              <li>
                <a
                  href={waLink ?? `tel:${whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="store-footer__contact-link"
                >
                  <span className="store-footer__contact-icon store-footer__contact-icon--wa">
                    <MessageCircle size={18} aria-hidden="true" />
                  </span>
                  <span dir="ltr">{whatsapp}</span>
                </a>
              </li>
            )}
            {storeEmail && (
              <li>
                <a href={`mailto:${storeEmail}`} className="store-footer__contact-link">
                  <span className="store-footer__contact-icon">
                    <Mail size={18} aria-hidden="true" />
                  </span>
                  <span>{storeEmail}</span>
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="store-footer__bottom">
        <div className="wrap store-footer__bottom-wrap">
          <p>© {currentYear} جميع الحقوق محفوظة لـ <strong>{storeName}</strong>.</p>
          <p className="store-footer__love">
            <span>صُنع بحب</span>
            <Heart size={14} className="store-footer__heart" aria-hidden="true" />
          </p>
        </div>
      </div>
    </footer>
  );
}
