import { useEffect } from 'react';
import { Clock, Instagram, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { navigateTo } from '../lib/navigation.ts';
import { buildGeneralWhatsAppUrl } from '../lib/whatsapp.ts';
import { updatePageSeo } from '../lib/seo.ts';
import { ResilientImage } from '../components/ResilientImage.tsx';
import { ShowroomMap } from '../components/ShowroomMap.tsx';
import type { HomepageSettings } from '../types/catalog.ts';

export function AboutPage({ settings }: { settings: HomepageSettings }) {
  useEffect(() => {
    updatePageSeo({
      title: 'About Us — PATIDAR NX COLLECTION, Nikol, Ahmedabad',
      description:
        'Learn about PATIDAR NX COLLECTION at Safal Plaza, Shops 1 to 6, Nikol, Ahmedabad—our handloom heritage, bridal curation, and personalized showroom service.',
    });
  }, []);

  return (
    <div className="bg-[#0E0E10] py-14 lg:py-20">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 space-y-16">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#C8A46B]">
            Our Heritage &amp; Philosophy
          </p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-medium text-[#FAF7F0] text-balance">
            {settings.aboutHeading}
          </h1>
          <p className="text-base sm:text-lg text-[#C8A46B]">
            {settings.brandIntroTitle}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-7 border border-[#262522] overflow-hidden min-h-[360px]">
            <ResilientImage
              src={settings.aboutImageUrl}
              largeUrl={settings.aboutImageUrl}
              alt="PATIDAR NX COLLECTION luxury showroom interior"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="lg:col-span-5 bg-[#151518] border border-[#262522] p-8 sm:p-10 flex flex-col justify-between space-y-6">
            <div className="space-y-4 text-sm sm:text-base text-[#D6C9B6] leading-relaxed">
              <p>{settings.aboutBody}</p>
              <p>{settings.brandIntroText}</p>
            </div>
            <div className="pt-4 border-t border-[#262522] flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigateTo('/collections')}
                className="px-6 py-3 bg-[#C8A46B] hover:bg-[#DFC391] text-[#0E0E10] text-xs font-semibold tracking-[0.16em] uppercase transition-colors cursor-pointer"
              >
                Explore Collections
              </button>
              <button
                type="button"
                onClick={() => navigateTo('/contact')}
                className="px-6 py-3 border border-[#FAF7F0]/30 hover:border-[#C8A46B] text-[#FAF7F0] text-xs font-semibold tracking-[0.16em] uppercase transition-colors cursor-pointer"
              >
                Visit Showroom
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ContactPage({ settings }: { settings: HomepageSettings }) {
  useEffect(() => {
    updatePageSeo({
      title: 'Contact & Visit Showroom — PATIDAR NX COLLECTION, Ahmedabad',
      description:
        'Visit PATIDAR NX COLLECTION at Safal Plaza, Shops 1 to 6, Nikol, Ahmedabad or connect directly via phone and WhatsApp (+91 9825115185).',
    });
  }, []);

  return (
    <div className="bg-[#0E0E10] py-14 lg:py-20">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 space-y-12">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#C8A46B]">
            Showroom Concierge
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-medium text-[#FAF7F0]">
            Visit PATIDAR NX COLLECTION
          </h1>
          <p className="text-sm sm:text-base text-[#D6C9B6]">
            Connect with our bridal and saree stylists by WhatsApp, telephone, or in person at
            Safal Plaza, Nikol.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          <div className="lg:col-span-5 bg-[#151518] border border-[#262522] p-8 sm:p-10 space-y-6">
            <div className="space-y-5 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#C8A46B] shrink-0 mt-1" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-[#FAF7F0]">Showroom Address</p>
                  <p className="text-[#BEB3A2] mt-1 leading-relaxed">
                    {settings.showroomAddress}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-[#C8A46B] shrink-0 mt-1" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-[#FAF7F0]">Telephone &amp; WhatsApp</p>
                  <a
                    href={`tel:${settings.phoneDisplay.replace(/\s+/g, '')}`}
                    className="text-[#DFC391] hover:underline mt-1 inline-block tabular-nums"
                  >
                    {settings.phoneDisplay}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-[#C8A46B] shrink-0 mt-1" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-[#FAF7F0]">Hours</p>
                  <p className="text-[#BEB3A2] mt-1">{settings.showroomHours}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-[#C8A46B] shrink-0 mt-1" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-[#FAF7F0]">Email</p>
                  <a
                    href={`mailto:${settings.emailAddress}`}
                    className="text-[#BEB3A2] hover:text-[#DFC391] mt-1 inline-block"
                  >
                    {settings.emailAddress}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Instagram className="w-4 h-4 text-[#C8A46B] shrink-0 mt-1" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-[#FAF7F0]">Instagram</p>
                  <a
                    href={settings.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#DFC391] hover:underline mt-1 inline-block"
                  >
                    {settings.instagramHandle}
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#262522] flex flex-col gap-3">
              <a
                href={buildGeneralWhatsAppUrl(settings.whatsappNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 py-3.5 px-5 bg-[#176B45] hover:bg-[#1E8255] text-[#FAF7F0] text-xs font-semibold tracking-[0.16em] uppercase transition-colors"
              >
                <MessageCircle className="w-4 h-4" aria-hidden="true" />
                <span>Chat On WhatsApp</span>
              </a>
              <a
                href={`tel:${settings.phoneDisplay.replace(/\s+/g, '')}`}
                className="inline-flex items-center justify-center gap-2 py-3.5 px-5 border border-[#C8A46B]/50 hover:bg-[#C8A46B] hover:text-[#0E0E10] text-[#FAF7F0] text-xs font-semibold tracking-[0.16em] uppercase transition-colors"
              >
                <Phone className="w-4 h-4" aria-hidden="true" />
                <span>Call {settings.phoneDisplay}</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-7">
            <ShowroomMap address={settings.showroomAddress} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PolicyPage({
  type,
  settings,
}: {
  type: 'privacy' | 'terms';
  settings: HomepageSettings;
}) {
  const title = type === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions';
  const body = type === 'privacy' ? settings.privacyPolicy : settings.termsConditions;

  useEffect(() => {
    updatePageSeo({
      title: `${title} — PATIDAR NX COLLECTION`,
      description: `${title} for PATIDAR NX COLLECTION, Safal Plaza, Nikol, Ahmedabad.`,
    });
  }, [title]);

  return (
    <div className="bg-[#0E0E10] py-14 lg:py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#C8A46B]">
          PATIDAR NX COLLECTION
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-medium text-[#FAF7F0]">
          {title}
        </h1>
        <div className="bg-[#151518] border border-[#262522] p-8 sm:p-10 space-y-4 text-sm sm:text-base text-[#D6C9B6] leading-relaxed whitespace-pre-line">
          {body}
        </div>
      </div>
    </div>
  );
}
