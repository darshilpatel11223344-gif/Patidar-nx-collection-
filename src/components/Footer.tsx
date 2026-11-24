import { Instagram, MapPin, Phone } from 'lucide-react';
import { navigateTo } from '../lib/navigation.ts';
import type { HomepageSettings } from '../types/catalog.ts';

interface FooterProps {
  settings: HomepageSettings;
}

export function Footer({ settings }: FooterProps) {
  return (
    <footer className="bg-[#0B0B0D] border-t border-[#262522] text-[#D6C9B6]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 py-14 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-[#22211E]">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('/');
              }}
              className="inline-block font-display text-2xl font-semibold tracking-[0.16em] text-[#FAF7F0] uppercase"
            >
              PATIDAR NX COLLECTION
            </a>
            <p className="text-sm text-[#C8A46B] tracking-wide">
              Discover Elegance. Celebrate Tradition.
            </p>
            <p className="text-sm text-[#9C9488] max-w-md leading-relaxed">
              Luxury ethnic fashion boutique showcasing pure silk sarees, bridal trousseaus,
              and curated designer drapes from India&apos;s heritage weaving clusters.
            </p>
          </div>

          {/* Collections & Pages */}
          <div className="space-y-3">
            <h3 className="font-display text-lg text-[#FAF7F0]">Collections &amp; Info</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: 'All Collections', href: '/collections' },
                { label: 'Saree Collection', href: '/sarees' },
                { label: 'New Arrivals', href: '/new-arrivals' },
                { label: 'About Us', href: '/about' },
                { label: 'Contact & Visit', href: '/contact' },
              ].map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={(e) => {
                      e.preventDefault();
                      navigateTo(link.href);
                    }}
                    className="text-[#BEB3A2] hover:text-[#C8A46B] transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Showroom Details */}
          <div className="space-y-3">
            <h3 className="font-display text-lg text-[#FAF7F0]">Nikol Showroom</h3>
            <div className="space-y-3 text-sm text-[#BEB3A2]">
              <p className="flex items-start gap-2.5 leading-relaxed">
                <MapPin className="w-4 h-4 text-[#C8A46B] shrink-0 mt-0.5" aria-hidden="true" />
                <span>{settings.showroomAddress}</span>
              </p>
              <p className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#C8A46B] shrink-0" aria-hidden="true" />
                <a
                  href={`tel:${settings.phoneDisplay.replace(/\s+/g, '')}`}
                  className="hover:text-[#FAF7F0] transition-colors tabular-nums"
                >
                  {settings.phoneDisplay}
                </a>
              </p>
              <p className="flex items-center gap-2.5">
                <Instagram className="w-4 h-4 text-[#C8A46B] shrink-0" aria-hidden="true" />
                <a
                  href={settings.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#C8A46B] transition-colors"
                >
                  {settings.instagramHandle}
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Legal & Admin Row */}
        <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#8E877D]">
          <p>
            &copy; {new Date().getFullYear()} PATIDAR NX COLLECTION. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <a
              href="/privacy-policy"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('/privacy-policy');
              }}
              className="hover:text-[#D6C9B6] transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('/terms');
              }}
              className="hover:text-[#D6C9B6] transition-colors"
            >
              Terms &amp; Conditions
            </a>
            <a
              href="/admin"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('/admin');
              }}
              className="hover:text-[#C8A46B] transition-colors"
            >
              Showroom Admin
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
