import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Clock,
  Instagram,
  MapPin,
  MessageCircle,
  Phone,
} from 'lucide-react';
import { navigateTo } from '../lib/navigation.ts';
import { buildGeneralWhatsAppUrl } from '../lib/whatsapp.ts';
import { updatePageSeo } from '../lib/seo.ts';
import { ProductCard } from '../components/ProductCard.tsx';
import { ResilientImage } from '../components/ResilientImage.tsx';
import { ShowroomMap } from '../components/ShowroomMap.tsx';
import type { Category, HomepageSettings, Product } from '../types/catalog.ts';

interface HomePageProps {
  settings: HomepageSettings;
  categories: Category[];
}

export function HomePage({ settings, categories }: HomePageProps) {
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [sareeCollection, setSareeCollection] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [activeSpotlightTab, setActiveSpotlightTab] = useState<'trending' | 'featured'>(
    'trending'
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    updatePageSeo({
      title: 'PATIDAR NX COLLECTION — Luxury Ethnic Fashion & Sarees, Ahmedabad',
      description:
        'Discover Elegance. Celebrate Tradition. Explore designer sarees, bridal lehengas, Banarasi, and Kanjivaram silks at Safal Plaza, Nikol, Ahmedabad.',
    });

    let active = true;
    const loadCollections = async () => {
      try {
        const [newRes, sareeRes, trendRes, featRes, bestRes] = await Promise.all([
          fetch('/api/products?newArrival=true&limit=4').then((r) => r.json()),
          fetch('/api/products?category=sarees&limit=4').then((r) => r.json()),
          fetch('/api/products?trending=true&limit=4').then((r) => r.json()),
          fetch('/api/products?featured=true&limit=4').then((r) => r.json()),
          fetch('/api/products?bestSeller=true&limit=4').then((r) => r.json()),
        ]);

        if (!active) return;
        setNewArrivals(newRes.items || []);
        setSareeCollection(sareeRes.items || []);
        setTrendingProducts(trendRes.items || []);
        setFeaturedProducts(featRes.items || []);
        setBestSellers(bestRes.items || []);
      } catch (err) {
        console.error('Failed to load homepage collections:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadCollections();
    return () => {
      active = false;
    };
  }, []);

  const spotlightItems =
    activeSpotlightTab === 'trending' ? trendingProducts : featuredProducts;

  const galleryCandidates = [
    ...featuredProducts,
    ...newArrivals,
    ...bestSellers,
  ].filter(
    (item, index, self) =>
      item.images.length > 0 && self.findIndex((p) => p.id === item.id) === index
  );

  const visibleCategories = categories.slice(0, 10);

  return (
    <div>
      {/* 1. Large Full-Width Fashion Hero Banner */}
      <section className="relative min-h-[78vh] lg:min-h-[86vh] flex items-end bg-[#0E0E10] overflow-hidden">
        <div className="absolute inset-0">
          <ResilientImage
            src={settings.heroBannerUrl}
            largeUrl={settings.heroBannerUrl}
            alt="PATIDAR NX COLLECTION luxury bridal saree editorial"
            priority
            sizes="100vw"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E10] via-[#0E0E10]/55 to-[#0E0E10]/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0E0E10]/85 via-[#0E0E10]/35 to-transparent" />
        </div>

        <div className="relative z-10 max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-10 pb-14 pt-28 lg:pb-20">
          <div className="max-w-2xl space-y-6">
            <p className="text-xs font-medium tracking-[0.22em] uppercase text-[#DFC391]">
              {settings.heroEyebrow}
            </p>
            <h1 className="font-display text-[clamp(2.5rem,5vw,4.5rem)] leading-[1.04] font-medium text-[#FAF7F0] text-balance">
              {settings.heroHeading}
            </h1>
            <p className="text-base sm:text-lg text-[#D6C9B6] leading-relaxed max-w-xl">
              {settings.heroSubheading}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => navigateTo('/collections')}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-[#C8A46B] hover:bg-[#DFC391] text-[#0E0E10] text-xs font-semibold tracking-[0.16em] uppercase transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>{settings.heroPrimaryCta}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => navigateTo('/new-arrivals')}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 border border-[#FAF7F0]/35 hover:border-[#C8A46B] text-[#FAF7F0] hover:text-[#DFC391] text-xs font-semibold tracking-[0.16em] uppercase transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>{settings.heroSecondaryCta}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Brand Introduction */}
      <section className="bg-[#151518] border-y border-[#262522]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-5 space-y-3">
              <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#C8A46B]">
                The Showroom Heritage
              </p>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-medium text-[#FAF7F0] leading-tight text-balance">
                {settings.brandIntroTitle}
              </h2>
            </div>
            <div className="lg:col-span-7 space-y-5">
              <p className="text-base sm:text-lg text-[#D6C9B6] leading-relaxed">
                {settings.brandIntroText}
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-6 text-xs tracking-[0.14em] uppercase text-[#9C9488]">
                <span>Handwoven Silks</span>
                <span aria-hidden="true">&middot;</span>
                <span>Bridal Trousseaus</span>
                <span aria-hidden="true">&middot;</span>
                <span>Safal Plaza, Nikol</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. New Arrivals */}
      <section className="py-16 lg:py-24 bg-[#0E0E10]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 border-b border-[#262522] mb-10">
            <div className="space-y-2">
              <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#C8A46B]">
                Latest Atelier Editions
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-medium text-[#FAF7F0]">
                New Arrivals
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('/new-arrivals')}
              className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase text-[#DFC391] hover:text-[#FAF7F0] transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <span>View All New Arrivals</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          {loading ? (
            <ProductRowSkeleton />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-7">
              {newArrivals.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  whatsappNumber={settings.whatsappNumber}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. Exclusive Saree Collection */}
      <section className="py-16 lg:py-24 bg-[#151518] border-y border-[#262522]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            <div className="lg:col-span-5 flex flex-col justify-between bg-[#1B1B1F] border border-[#2A2927] p-8 sm:p-10">
              <div className="space-y-5">
                <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#C8A46B]">
                  Signature Weaves
                </p>
                <h2 className="font-display text-3xl sm:text-4xl lg:text-[42px] leading-tight text-[#FAF7F0] text-balance">
                  Exclusive Saree Collection
                </h2>
                <p className="text-sm sm:text-base text-[#D6C9B6] leading-relaxed">
                  From pure Katan Banarasi silks and Korvai Kanjivarams to double-ikat Patan
                  Patolas and fine Paithani heirlooms, explore drapes curated for weddings and
                  treasured celebrations.
                </p>
              </div>

              <div className="pt-8 space-y-6">
                <div className="aspect-[4/3] w-full overflow-hidden border border-[#2A2927]">
                  <ResilientImage
                    src={settings.secondaryBannerUrl}
                    mediumUrl={settings.secondaryBannerUrl}
                    alt="Exclusive handloom silk saree collection"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('/sarees')}
                  className="inline-flex items-center justify-between w-full px-6 py-3.5 bg-[#C8A46B] hover:bg-[#DFC391] text-[#0E0E10] text-xs font-semibold tracking-[0.16em] uppercase transition-colors cursor-pointer"
                >
                  <span>Explore Saree Collection</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {(sareeCollection.length > 0 ? sareeCollection : featuredProducts).slice(0, 4).map(
                (product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    whatsappNumber={settings.whatsappNumber}
                  />
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Shop By Category */}
      <section className="py-16 lg:py-24 bg-[#0E0E10]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 border-b border-[#262522] mb-10">
            <div className="space-y-2">
              <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#C8A46B]">
                Curated Departments
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-medium text-[#FAF7F0]">
                Shop By Category
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('/collections')}
              className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase text-[#DFC391] hover:text-[#FAF7F0] transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <span>Browse Full Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
            {visibleCategories.map((cat) => (
              <a
                key={cat.id}
                href={`/collections?category=${encodeURIComponent(cat.slug)}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo(`/collections?category=${encodeURIComponent(cat.slug)}`);
                }}
                className="group relative aspect-[3/4] overflow-hidden bg-[#151518] border border-[#262522] hover:border-[#C8A46B]/60 transition-colors block"
              >
                <ResilientImage
                  src={cat.heroImageUrl}
                  mediumUrl={cat.heroImageUrl}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E10]/95 via-[#0E0E10]/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 space-y-1">
                  <h3 className="font-display text-lg sm:text-xl font-medium text-[#FAF7F0] group-hover:text-[#DFC391] transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-[11px] font-mono tabular-nums text-[#BEB3A2]">
                    {cat.productCount ?? 0} Pieces
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Trending Collections & Featured Products */}
      <section className="py-16 lg:py-24 bg-[#151518] border-y border-[#262522]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[#262522] mb-10">
            <div className="space-y-2">
              <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#C8A46B]">
                Showroom Highlights
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-medium text-[#FAF7F0]">
                Trending &amp; Featured Edit
              </h2>
            </div>

            {/* Interactive Segmented Control */}
            <div className="inline-flex items-center p-1 bg-[#0E0E10] border border-[#2A2927] self-start md:self-auto">
              <button
                type="button"
                onClick={() => setActiveSpotlightTab('trending')}
                className={`px-4 py-2 text-xs font-semibold tracking-[0.14em] uppercase transition-colors cursor-pointer whitespace-nowrap ${
                  activeSpotlightTab === 'trending'
                    ? 'bg-[#C8A46B] text-[#0E0E10]'
                    : 'text-[#D6C9B6] hover:text-[#FAF7F0]'
                }`}
              >
                Trending Collections
              </button>
              <button
                type="button"
                onClick={() => setActiveSpotlightTab('featured')}
                className={`px-4 py-2 text-xs font-semibold tracking-[0.14em] uppercase transition-colors cursor-pointer whitespace-nowrap ${
                  activeSpotlightTab === 'featured'
                    ? 'bg-[#C8A46B] text-[#0E0E10]'
                    : 'text-[#D6C9B6] hover:text-[#FAF7F0]'
                }`}
              >
                Featured Products
              </button>
            </div>
          </div>

          {loading ? (
            <ProductRowSkeleton />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-7">
              {spotlightItems.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  whatsappNumber={settings.whatsappNumber}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 7. Private Styling / Promotional Highlight + Best Sellers */}
      <section className="py-16 lg:py-24 bg-[#0E0E10]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 space-y-16">
          {/* Editorial Promo Strip */}
          <div className="bg-[#18181C] border border-[#C8A46B]/30 p-8 sm:p-10 lg:p-12 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#C8A46B]">
                {settings.promoEyebrow}
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-medium text-[#FAF7F0]">
                {settings.promoHeadline}
              </h2>
              <p className="text-sm sm:text-base text-[#D6C9B6] leading-relaxed">
                {settings.promoDescription}
              </p>
            </div>
            <a
              href={buildGeneralWhatsAppUrl(
                settings.whatsappNumber,
                'Hello PATIDAR NX COLLECTION, I would like to book a private bridal/trousseau styling session at Safal Plaza, Nikol.'
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 px-7 py-4 bg-[#C8A46B] hover:bg-[#DFC391] text-[#0E0E10] text-xs font-semibold tracking-[0.16em] uppercase transition-colors whitespace-nowrap shrink-0"
            >
              <MessageCircle className="w-4 h-4" aria-hidden="true" />
              <span>Book WhatsApp Styling</span>
            </a>
          </div>

          {/* Best Sellers */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 border-b border-[#262522] mb-10">
              <div className="space-y-2">
                <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#C8A46B]">
                  Most Requested
                </p>
                <h2 className="font-display text-3xl sm:text-4xl font-medium text-[#FAF7F0]">
                  Best Sellers
                </h2>
              </div>
              <button
                type="button"
                onClick={() => navigateTo('/collections?sort=newest')}
                className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase text-[#DFC391] hover:text-[#FAF7F0] transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
              >
                <span>Shop All Best Sellers</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            {loading ? (
              <ProductRowSkeleton />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-7">
                {bestSellers.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    whatsappNumber={settings.whatsappNumber}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 8. Premium Fashion Gallery */}
      <section className="py-16 lg:py-24 bg-[#151518] border-y border-[#262522]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="max-w-xl space-y-2 mb-10">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#C8A46B]">
              Couture Lookbook
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-medium text-[#FAF7F0]">
              The Luxury Fashion Gallery
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
            {galleryCandidates.slice(0, 4).map((item, index) => (
              <a
                key={item.id}
                href={`/product/${item.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo(`/product/${item.slug}`);
                }}
                className={`group relative overflow-hidden border border-[#2A2927] bg-[#0E0E10] ${
                  index === 0 ? 'col-span-2 row-span-2 aspect-[4/4.5]' : 'aspect-[3/4]'
                }`}
              >
                <ResilientImage
                  thumbUrl={item.images[0]?.thumbUrl}
                  mediumUrl={item.images[0]?.mediumUrl}
                  largeUrl={item.images[0]?.largeUrl}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E10]/90 via-transparent to-transparent opacity-85" />
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                  <p className="text-[11px] font-mono text-[#C8A46B] uppercase tracking-widest">
                    {item.productCode}
                  </p>
                  <p className="font-display text-lg sm:text-xl text-[#FAF7F0] mt-0.5 line-clamp-1">
                    {item.name}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* 9. About Patidar NX Collection */}
      <section className="py-16 lg:py-24 bg-[#0E0E10]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-7 overflow-hidden border border-[#262522] min-h-[320px]">
              <ResilientImage
                src={settings.aboutImageUrl}
                largeUrl={settings.aboutImageUrl}
                alt="PATIDAR NX COLLECTION showroom at Safal Plaza, Nikol, Ahmedabad"
                sizes="(max-width: 1024px) 100vw, 58vw"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="lg:col-span-5 flex flex-col justify-center space-y-6 bg-[#151518] border border-[#262522] p-8 sm:p-10">
              <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#C8A46B]">
                About Patidar NX Collection
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-medium text-[#FAF7F0] leading-tight text-balance">
                {settings.aboutHeading}
              </h2>
              <p className="text-sm sm:text-base text-[#D6C9B6] leading-relaxed">
                {settings.aboutBody}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigateTo('/about')}
                  className="inline-flex items-center gap-2 px-6 py-3 border border-[#C8A46B]/60 text-[#FAF7F0] hover:bg-[#C8A46B] hover:text-[#0E0E10] text-xs font-semibold tracking-[0.16em] uppercase transition-colors cursor-pointer"
                >
                  <span>Read Our Story</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Customer Testimonials (Warm Ivory Contrast Band) */}
      <section className="py-16 lg:py-24 bg-[#F5EFE6] text-[#141413]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="max-w-2xl space-y-2 mb-12">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#8A6830]">
              Client Stories
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-medium text-[#141413]">
              Trusted By Brides &amp; Families Across Gujarat
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {settings.testimonials.map((t) => (
              <blockquote
                key={t.id}
                className="bg-[#FAF7F2] border border-[#DFD5C5] p-7 sm:p-8 flex flex-col justify-between gap-6"
              >
                <p className="text-sm sm:text-base text-[#2E2B26] leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <footer className="pt-4 border-t border-[#E6DDD0]">
                  <p className="font-display text-xl font-semibold text-[#141413]">
                    {t.name}
                  </p>
                  <p className="text-xs text-[#6E6557] mt-0.5">
                    {t.occasion} &middot; {t.city}
                  </p>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* 11. Instagram Section */}
      <section className="py-16 lg:py-20 bg-[#151518] border-b border-[#262522]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div className="space-y-2">
              <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#C8A46B]">
                Showroom Journal
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-medium text-[#FAF7F0]">
                Follow {settings.instagramHandle}
              </h2>
            </div>
            <a
              href={settings.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#C8A46B]/55 text-[#DFC391] hover:bg-[#C8A46B] hover:text-[#0E0E10] text-xs font-semibold tracking-[0.14em] uppercase transition-colors self-start sm:self-auto"
            >
              <Instagram className="w-4 h-4" aria-hidden="true" />
              <span>Visit Instagram</span>
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {galleryCandidates.slice(0, 6).map((item) => (
              <a
                key={`ig-${item.id}`}
                href={settings.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-square overflow-hidden border border-[#2A2927] bg-[#0E0E10]"
              >
                <ResilientImage
                  thumbUrl={item.images[0]?.thumbUrl}
                  mediumUrl={item.images[0]?.mediumUrl}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-[#0E0E10]/0 group-hover:bg-[#0E0E10]/45 transition-colors flex items-center justify-center">
                  <Instagram
                    className="w-5 h-5 text-[#FAF7F0] opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-hidden="true"
                  />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* 12. Contact & Google Maps Showroom Section */}
      <section className="py-16 lg:py-24 bg-[#0E0E10]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-5 flex flex-col justify-between bg-[#151518] border border-[#262522] p-8 sm:p-10 space-y-8">
              <div className="space-y-3">
                <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#C8A46B]">
                  Visit Our Flagship
                </p>
                <h2 className="font-display text-3xl sm:text-4xl font-medium text-[#FAF7F0]">
                  Experience Our Silk Galleries In Person
                </h2>
              </div>

              <div className="space-y-5 text-sm text-[#D6C9B6]">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#C8A46B] shrink-0 mt-1" aria-hidden="true" />
                  <div>
                    <p className="font-medium text-[#FAF7F0]">Showroom Address</p>
                    <p className="text-[#BEB3A2] mt-0.5 leading-relaxed">
                      {settings.showroomAddress}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-[#C8A46B] shrink-0 mt-1" aria-hidden="true" />
                  <div>
                    <p className="font-medium text-[#FAF7F0]">Showroom Hours</p>
                    <p className="text-[#BEB3A2] mt-0.5">{settings.showroomHours}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-[#C8A46B] shrink-0 mt-1" aria-hidden="true" />
                  <div>
                    <p className="font-medium text-[#FAF7F0]">Direct Showroom Line</p>
                    <a
                      href={`tel:${settings.phoneDisplay.replace(/\s+/g, '')}`}
                      className="text-[#DFC391] hover:underline mt-0.5 inline-block tabular-nums"
                    >
                      {settings.phoneDisplay}
                    </a>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <a
                  href={buildGeneralWhatsAppUrl(settings.whatsappNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#C8A46B] hover:bg-[#DFC391] text-[#0E0E10] text-xs font-semibold tracking-[0.14em] uppercase transition-colors flex-1 whitespace-nowrap"
                >
                  <MessageCircle className="w-4 h-4" aria-hidden="true" />
                  <span>WhatsApp Us</span>
                </a>
                <a
                  href={`tel:${settings.phoneDisplay.replace(/\s+/g, '')}`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 border border-[#FAF7F0]/30 hover:border-[#C8A46B] text-[#FAF7F0] text-xs font-semibold tracking-[0.14em] uppercase transition-colors flex-1 whitespace-nowrap"
                >
                  <Phone className="w-4 h-4" aria-hidden="true" />
                  <span>Call Showroom</span>
                </a>
              </div>
            </div>

            <div className="lg:col-span-7">
              <ShowroomMap address={settings.showroomAddress} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProductRowSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-7">
      {[1, 2, 3, 4].map((idx) => (
        <div
          key={idx}
          className="bg-[#151518] border border-[#262522] animate-pulse"
        >
          <div className="aspect-[3/4] bg-[#1C1C20]" />
          <div className="p-5 space-y-3">
            <div className="h-3 w-2/3 bg-[#242429]" />
            <div className="h-5 w-full bg-[#242429]" />
            <div className="h-9 w-full bg-[#242429] mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
