import { MessageCircle } from 'lucide-react';
import { navigateTo } from '../lib/navigation.ts';
import { buildProductWhatsAppUrl, formatInrPrice } from '../lib/whatsapp.ts';
import { ResilientImage } from './ResilientImage.tsx';
import type { Product } from '../types/catalog.ts';

interface ProductCardProps {
  product: Product;
  whatsappNumber?: string;
}

export function ProductCard({ product, whatsappNumber }: ProductCardProps) {
  const primaryImage = product.images[0];
  const secondaryImage = product.images[1];
  const formattedPrice = formatInrPrice(product.price);

  const handleOpenProduct = () => {
    navigateTo(`/product/${product.slug}`);
  };

  return (
    <article className="group flex flex-col bg-[#151518] border border-[#262522] hover:border-[#C8A46B]/50 transition-all duration-200 hover:-translate-y-0.5">
      {/* Uniform 3:4 Portrait Imagery */}
      <a
        href={`/product/${product.slug}`}
        onClick={(e) => {
          e.preventDefault();
          handleOpenProduct();
        }}
        className="relative aspect-[3/4] w-full overflow-hidden bg-[#121214] block"
      >
        <ResilientImage
          thumbUrl={primaryImage?.thumbUrl}
          mediumUrl={primaryImage?.mediumUrl}
          largeUrl={primaryImage?.largeUrl}
          alt={primaryImage?.altText || `${product.name} — ${product.productCode}`}
          className={`w-full h-full object-cover transition-transform duration-500 ease-out ${
            secondaryImage ? 'group-hover:opacity-0' : 'group-hover:scale-[1.03]'
          }`}
        />

        {secondaryImage && (
          <ResilientImage
            thumbUrl={secondaryImage.thumbUrl}
            mediumUrl={secondaryImage.mediumUrl}
            largeUrl={secondaryImage.largeUrl}
            alt={secondaryImage.altText || product.name}
            className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-500 ease-out"
          />
        )}

        {/* Subtle editorial status kicker — max 1 unboxed tag, never pill spam */}
        {(product.isNewArrival || product.availability === 'Out of Stock') && (
          <span className="absolute top-3 left-3 bg-[#0E0E10]/85 backdrop-blur-sm px-2.5 py-1 text-[11px] font-medium tracking-[0.14em] uppercase text-[#DFC391] border border-[#C8A46B]/30">
            {product.availability === 'Out of Stock' ? 'Reserved' : 'New Arrival'}
          </span>
        )}
      </a>

      {/* Consistent Card Metadata Order */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-[#9C9488]">
            <span className="uppercase tracking-[0.1em] truncate">{product.categoryName}</span>
            <span aria-hidden="true">&middot;</span>
            <span className="font-mono tabular-nums text-[#C8A46B] shrink-0">
              {product.productCode}
            </span>
          </div>

          <h3 className="font-display text-lg sm:text-xl font-medium text-[#FAF7F0] leading-snug line-clamp-2">
            <a
              href={`/product/${product.slug}`}
              onClick={(e) => {
                e.preventDefault();
                handleOpenProduct();
              }}
              className="hover:text-[#DFC391] transition-colors"
            >
              {product.name}
            </a>
          </h3>

          <div className="pt-1 flex items-center justify-between gap-2 text-xs text-[#BEB3A2]">
            {formattedPrice ? (
              <span className="font-mono text-sm font-medium text-[#FAF7F0] tabular-nums">
                {formattedPrice}
              </span>
            ) : (
              <span className="text-[#9C9488]">Price on Inquiry</span>
            )}
            <span className="truncate text-[#9C9488]">{product.fabric || product.colour}</span>
          </div>
        </div>

        {/* Product-specific WhatsApp Inquiry CTA */}
        <a
          href={buildProductWhatsAppUrl(product, whatsappNumber)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-3 border border-[#C8A46B]/45 text-[#DFC391] hover:bg-[#C8A46B] hover:text-[#0E0E10] text-[11px] font-semibold tracking-[0.14em] uppercase transition-colors whitespace-nowrap"
        >
          <MessageCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>INQUIRE ON WHATSAPP</span>
        </a>
      </div>
    </article>
  );
}
