import { useCallback, useEffect, useState } from 'react';
import { useCurrentLocation } from './lib/navigation.ts';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { FloatingWhatsApp } from './components/FloatingWhatsApp.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { CatalogPage } from './pages/CatalogPage.tsx';
import { ProductDetailPage } from './pages/ProductDetailPage.tsx';
import { AboutPage, ContactPage, PolicyPage } from './pages/InfoPages.tsx';
import { AdminDashboard } from './pages/AdminDashboard.tsx';
import type { Category, HomepageSettings } from './types/catalog.ts';

const INITIAL_SETTINGS: HomepageSettings = {
  heroEyebrow: 'Nikol · Ahmedabad · Heritage Couture',
  heroHeading: 'Elegance That Speaks Without Words.',
  heroSubheading:
    'Discover handwoven Kanjivarams, pure Banarasi Katan silks, bridal ensembles, and contemporary designer sarees curated at Safal Plaza, Nikol.',
  heroPrimaryCta: 'Explore Collection',
  heroSecondaryCta: 'Discover New Arrivals',
  heroBannerUrl: '',
  secondaryBannerUrl: '',
  brandIntroTitle: 'Discover Elegance. Celebrate Tradition.',
  brandIntroText:
    'Every drape at PATIDAR NX COLLECTION is hand-selected from master weaving clusters across India.',
  promoEyebrow: 'Bridal & Trousseau Edit',
  promoHeadline: 'Private Showroom Styling at Safal Plaza',
  promoDescription:
    'Visit Shops 1 to 6, Safal Plaza, Nikol, Ahmedabad or connect directly over WhatsApp.',
  aboutHeading: 'Crafted For Generations, Curated In Ahmedabad.',
  aboutBody:
    'Located in Nikol at Safal Plaza, PATIDAR NX COLLECTION brings together six showroom galleries dedicated to pure silk sarees and bridal wear.',
  aboutImageUrl: '',
  instagramHandle: '@patidarnxcollection',
  instagramUrl: 'https://www.instagram.com/patidarnxcollection/',
  whatsappNumber: '919825115185',
  phoneDisplay: '+91 9825115185',
  showroomAddress: 'Safal Plaza, Shops 1 to 6, Nikol, Ahmedabad, Gujarat, India',
  showroomHours: 'Monday – Sunday · 10:30 AM to 9:00 PM IST',
  emailAddress: 'concierge@patidarnxcollection.com',
  testimonials: [],
  privacyPolicy: '',
  termsConditions: '',
};

export default function App() {
  const { pathname, search } = useCurrentLocation();
  const [settings, setSettings] = useState<HomepageSettings>(INITIAL_SETTINGS);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  const loadStorefrontMeta = useCallback(async () => {
    try {
      const [settingsRes, categoriesRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/categories'),
      ]);
      if (settingsRes.ok) {
        setSettings(await settingsRes.json());
      }
      if (categoriesRes.ok) {
        setCategories(await categoriesRes.json());
      }
    } catch (err) {
      console.error('Failed to load storefront metadata:', err);
    }
  }, []);

  useEffect(() => {
    loadStorefrontMeta();
  }, [loadStorefrontMeta]);

  useEffect(() => {
    const onQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  const isAdminRoute = pathname.startsWith('/admin');

  if (isAdminRoute) {
    return <AdminDashboard onStorefrontDataChanged={loadStorefrontMeta} />;
  }

  let pageContent;
  if (pathname === '/' || pathname === '') {
    pageContent = <HomePage settings={settings} categories={categories} />;
  } else if (pathname === '/collections') {
    pageContent = (
      <CatalogPage
        mode="all"
        searchQueryString={search}
        categories={categories}
        settings={settings}
      />
    );
  } else if (pathname === '/sarees') {
    pageContent = (
      <CatalogPage
        mode="sarees"
        searchQueryString={search}
        categories={categories}
        settings={settings}
      />
    );
  } else if (pathname === '/new-arrivals') {
    pageContent = (
      <CatalogPage
        mode="new-arrivals"
        searchQueryString={search}
        categories={categories}
        settings={settings}
      />
    );
  } else if (pathname.startsWith('/product/')) {
    const identifier = decodeURIComponent(pathname.slice('/product/'.length));
    pageContent = <ProductDetailPage identifier={identifier} settings={settings} />;
  } else if (pathname === '/about') {
    pageContent = <AboutPage settings={settings} />;
  } else if (pathname === '/contact') {
    pageContent = <ContactPage settings={settings} />;
  } else if (pathname === '/privacy-policy') {
    pageContent = <PolicyPage type="privacy" settings={settings} />;
  } else if (pathname === '/terms') {
    pageContent = <PolicyPage type="terms" settings={settings} />;
  } else {
    pageContent = <HomePage settings={settings} categories={categories} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0E0E10] text-[#FAF7F0]">
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <Navbar currentPath={pathname} />
      <main className="flex-1">{pageContent}</main>
      <Footer settings={settings} />
      <FloatingWhatsApp whatsappNumber={settings.whatsappNumber} />
    </div>
  );
}
