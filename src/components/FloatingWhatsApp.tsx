import { MessageCircle } from 'lucide-react';
import { buildGeneralWhatsAppUrl } from '../lib/whatsapp.ts';

interface FloatingWhatsAppProps {
  whatsappNumber: string;
}

export function FloatingWhatsApp({ whatsappNumber }: FloatingWhatsAppProps) {
  return (
    <a
      href={buildGeneralWhatsAppUrl(whatsappNumber)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Inquire with PATIDAR NX COLLECTION on WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 px-4 py-3 bg-[#176B45] hover:bg-[#1D8254] text-[#FAF7F0] shadow-xl border border-[#2CA36B]/40 rounded-full transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8A46B]"
    >
      <MessageCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
      <span className="hidden sm:inline text-xs font-semibold tracking-wider uppercase whitespace-nowrap">
        WhatsApp Stylist
      </span>
    </a>
  );
}
