import { useEffect, useState, type MouseEvent } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  MessageCircle,
  Phone,
  Share2,
  X,
} from 'lucide-react';
import { navigateTo } from '../lib/navigation.ts';
import { buildProductWhatsAppUrl, formatInrPrice } from '../lib/whatsapp.ts';
import { updatePageSeo } from '../lib/seo.ts';
import { ProductCard } from '../components/ProductCard.tsx';
import { ResilientImage } from '../components/ResilientImage.tsx';
import type { HomepageSettings, Product } from '../types/catalog.ts';

interface ProductDetailPageProps {
  identifier: string;
  settings: HomepageSettings;
}

export function ProductDetailPage({ identifier, settings }: ProductDetailPageProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeIdx, setActiveIdx] = useState(0);
  const [zoomActive, setZoomActive] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    let active = true;
    const loadProduct = async () => {
      setLoading(true);
      setError(null);
      setActiveIdx(0);
      try {
        const res = await fetch(`/api/products/${encodeURIComponent(identifier)}`);
        if (!res.ok) {
          throw new Error('This creation could not be found.');
        }
        const data: { product: Product; related: Product[] } = await res.json();
        if (!active) return;
        setProduct(data.product);
        setRelated(data.related || []);
        updatePageSeo({
          title: `${data.product.name} (${data.product.productCode}) — PATIDAR NX COLLECTION`,
          description:
            data.product.description ||
            `${data.product.name} in ${data.product.categoryName} at PATIDAR NX COLLECTION, Nikol, Ahmedabad.`,
          product: data.product,
        });
      } catch (err) {
        console.error(err);
        if (active) setError('We could not find this product in our showroom catalog.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProduct();
    return () => {
      active = false;
    };
  }, [identifier]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomOrigin({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-pulse">
          <div className="lg:col-span-6 aspect-[3/4] bg-[#18181C]" />
          <div className="lg:col-span-6 space-y-5 pt-4">
            <div className="h-4 w-1/3 bg-[#18181C]" />
            <div className="h-10 w-3/4 bg-[#18181C]" />
            <div className="h-24 w-full bg-[#18181C]" />
            <div className="h-12 w-full bg-[#18181C]" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 py-24 text-center space-y-5">
        <h1 className="font-display text-4xl text-[#FAF7F0]">Creation Not Found</h1>
        <p className="text-sm text-[#BEB3A2] max-w-md mx-auto">
          {error || 'This garment may have been moved or reserved.'}
        </p>
        <button
          type="button"
          onClick={() => navigateTo('/collections')}
          className="px-6 py-3 bg-[#C8A46B] text-[#0E0E10] text-xs font-semibold tracking-wider uppercase cursor-pointer"
        >
          Browse All Collections
        </button>
      </div>
    );
  }

  const images = product.images;
  const activeImage = images[activeIdx] || images[0];
  const formattedPrice = formatInrPrice(product.price);
  const whatsappUrl = buildProductWhatsAppUrl(product, settings.whatsappNumber);

  return (
    <div className="bg-[#0E0E10] py-10 lg:py-16">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#9C9488] pb-8">
          <button
            type="button"
            onClick={() => navigateTo('/collections')}
            className="inline-flex items-center gap-1.5 text-[#D6C9B6] hover:text-[#C8A46B] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Collections</span>
          </button>
          <span aria-hidden="true">/</span>
          <a
            href={`/collections?category=${encodeURIComponent(product.categorySlug)}`}
            onClick={(e) => {
              e.preventDefault();
              navigateTo(`/collections?category=${encodeURIComponent(product.categorySlug)}`);
            }}
            className="hover:text-[#C8A46B] transition-colors"
          >
            {product.categoryName}
          </a>
          <span aria-hidden="true">/</span>
          <span className="font-mono text-[#C8A46B]">{product.productCode}</span>
        </div>

        {/* Contiguous PDP Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Left Sticky Gallery */}
          <div className="lg:col-span-6 lg:sticky lg:top-28 space-y-4">
            <div
              onMouseEnter={() => setZoomActive(true)}
              onMouseLeave={() => setZoomActive(false)}
              onMouseMove={handleMouseMove}
              onClick={() => setLightboxOpen(true)}
              className="relative aspect-[3/4] w-full overflow-hidden bg-[#151518] border border-[#262522] cursor-zoom-in group"
            >
              {activeImage ? (
                <img
                  src={zoomActive ? activeImage.largeUrl : activeImage.mediumUrl}
                  alt={activeImage.altText || product.name}
                  referrerPolicy="no-referrer"
                  style={
                    zoomActive
                      ? {
                          transform: 'scale(1.85)',
                          transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                        }
                      : undefined
                  }
                  className="w-full h-full object-cover transition-transform duration-150 ease-out"
                />
              ) : (
                <ResilientImage alt={product.name} className="w-full h-full" />
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxOpen(true);
                }}
                aria-label="Open fullscreen zoom view"
                className="absolute bottom-4 right-4 inline-flex items-center gap-2 px-3.5 py-2 bg-[#0E0E10]/85 border border-[#C8A46B]/40 text-xs text-[#FAF7F0] hover:bg-[#C8A46B] hover:text-[#0E0E10] transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Zoom Photo</span>
              </button>
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {images.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveIdx(idx)}
                    className={`aspect-[3/4] overflow-hidden border transition-all cursor-pointer ${
                      idx === activeIdx
                        ? 'border-[#C8A46B] ring-1 ring-[#C8A46B]'
                        : 'border-[#262522] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <ResilientImage
                      src={img.thumbUrl}
                      thumbUrl={img.thumbUrl}
                      alt={img.altText || `${product.name} view ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Contiguous Inquiry Module */}
          <div className="lg:col-span-6 space-y-8">
            <div className="space-y-3 pb-6 border-b border-[#262522]">
              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <span className="uppercase tracking-[0.16em] text-[#C8A46B] font-medium">
                  {product.categoryName}
                </span>
                <span aria-hidden="true" className="text-[#6E6557]">
                  &middot;
                </span>
                <span className="font-mono tabular-nums text-[#FAF7F0]">
                  ID: {product.productCode}
                </span>
                <span aria-hidden="true" className="text-[#6E6557]">
                  &middot;
                </span>
                <span
                  className={
                    product.availability === 'Out of Stock'
                      ? 'text-amber-400'
                      : 'text-[#DFC391]'
                  }
                >
                  {product.availability}
                </span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-medium text-[#FAF7F0] leading-tight text-balance">
                {product.name}
              </h1>

              {/* Price ONLY displayed when entered by admin */}
              {formattedPrice ? (
                <p className="font-mono text-2xl sm:text-3xl font-medium text-[#DFC391] tabular-nums pt-2">
                  {formattedPrice}
                </p>
              ) : (
                <p className="text-sm text-[#BEB3A2] pt-2">
                  Private Showroom Pricing &mdash; Tap below for instant WhatsApp quote
                </p>
              )}
            </div>

            {product.description && (
              <p className="text-sm sm:text-base text-[#D6C9B6] leading-relaxed">
                {product.description}
              </p>
            )}

            {/* Structured Product Details */}
            <div className="bg-[#151518] border border-[#262522] divide-y divide-[#242320] text-sm">
              {[
                { label: 'Unique Product ID', value: product.productCode, mono: true },
                { label: 'Category', value: product.categoryName },
                { label: 'Fabric', value: product.fabric },
                { label: 'Work Details', value: product.workDetails },
                { label: 'Colour', value: product.colour },
                { label: 'Size & Drape', value: product.size },
                { label: 'Availability', value: product.availability },
              ]
                .filter((row) => Boolean(row.value))
                .map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center"
                  >
                    <span className="col-span-5 text-xs uppercase tracking-[0.12em] text-[#9C9488]">
                      {row.label}
                    </span>
                    <span
                      className={`col-span-7 text-[#FAF7F0] ${
                        row.mono ? 'font-mono tabular-nums text-[#DFC391]' : ''
                      }`}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
            </div>

            {/* Primary WhatsApp Inquiry Action */}
            <div className="space-y-3 pt-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full py-4 px-6 bg-[#176B45] hover:bg-[#1E8255] text-[#FAF7F0] border border-[#2CA36B]/50 text-xs sm:text-sm font-semibold tracking-[0.16em] uppercase transition-colors"
              >
                <MessageCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span>INQUIRE ON WHATSAPP</span>
              </a>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href={`tel:${settings.phoneDisplay.replace(/\s+/g, '')}`}
                  className="flex items-center justify-center gap-2 py-3 px-4 border border-[#2A2927] hover:border-[#C8A46B] text-xs font-semibold tracking-[0.14em] uppercase text-[#FAF7F0] transition-colors"
                >
                  <Phone className="w-4 h-4 text-[#C8A46B]" aria-hidden="true" />
                  <span>Call {settings.phoneDisplay}</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-2 py-3 px-4 border border-[#2A2927] hover:border-[#C8A46B] text-xs font-semibold tracking-[0.14em] uppercase text-[#FAF7F0] transition-colors cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-[#C8A46B]" aria-hidden="true" />
                      <span>Link Copied</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 text-[#C8A46B]" aria-hidden="true" />
                      <span>Share Product Link</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-[#9C9488] leading-relaxed pt-1">
                Showroom Pickup &amp; Video Shopping available from Safal Plaza, Shops 1 to 6,
                Nikol, Ahmedabad. No account registration required.
              </p>
            </div>
          </div>
        </div>

        {/* Related Creations */}
        {related.length > 0 && (
          <section className="mt-20 pt-14 border-t border-[#262522]">
            <h2 className="font-display text-3xl text-[#FAF7F0] mb-8">
              More From {product.categoryName}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {related.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  whatsappNumber={settings.whatsappNumber}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Mobile & Desktop Fullscreen Lightbox */}
      {lightboxOpen && activeImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Zoomed product photograph"
          className="fixed inset-0 z-50 bg-[#08080A]/95 flex flex-col items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="w-full max-w-5xl flex items-center justify-between pb-3 text-xs text-[#D6C9B6]">
            <span className="font-mono text-[#C8A46B]">
              {product.productCode} &middot; {activeIdx + 1} / {images.length}
            </span>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#2A2927] text-[#FAF7F0] hover:border-[#C8A46B] cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Close</span>
            </button>
          </div>

          <div
            className="relative max-h-[82vh] max-w-4xl w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activeImage.largeUrl}
              alt={activeImage.altText || product.name}
              referrerPolicy="no-referrer"
              className="max-h-[80vh] w-auto object-contain border border-[#262522]"
            />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous photograph"
                  onClick={() =>
                    setActiveIdx((prev) => (prev - 1 + images.length) % images.length)
                  }
                  className="absolute left-2 sm:left-4 p-2.5 bg-[#0E0E10]/85 border border-[#C8A46B]/40 text-[#FAF7F0] hover:bg-[#C8A46B] hover:text-[#0E0E10] cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  aria-label="Next photograph"
                  onClick={() => setActiveIdx((prev) => (prev + 1) % images.length)}
                  className="absolute right-2 sm:right-4 p-2.5 bg-[#0E0E10]/85 border border-[#C8A46B]/40 text-[#FAF7F0] hover:bg-[#C8A46B] hover:text-[#0E0E10] cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
