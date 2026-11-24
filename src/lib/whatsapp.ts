import type { Product } from '../types/catalog.ts';

export const DEFAULT_WHATSAPP_NUMBER = '919825115185';

export function getProductCanonicalUrl(product: Pick<Product, 'slug'>): string {
  if (typeof window === 'undefined') {
    return `/product/${product.slug}`;
  }
  return `${window.location.origin}/product/${product.slug}`;
}

export function buildProductWhatsAppUrl(
  product: Pick<Product, 'name' | 'productCode' | 'categoryName' | 'slug'>,
  whatsappNumber = DEFAULT_WHATSAPP_NUMBER
): string {
  const cleanPhone = whatsappNumber.replace(/[^0-9]/g, '') || DEFAULT_WHATSAPP_NUMBER;
  const productUrl = getProductCanonicalUrl(product);

  const message = [
    'Hello PATIDAR NX COLLECTION,',
    '',
    'I am interested in this product.',
    '',
    `Product Name: ${product.name}`,
    `Product ID: ${product.productCode}`,
    `Category: ${product.categoryName}`,
    `Product Link: ${productUrl}`,
    '',
    'Please share the price and availability details.',
    '',
    'Thank you.',
  ].join('\n');

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function buildGeneralWhatsAppUrl(
  whatsappNumber = DEFAULT_WHATSAPP_NUMBER,
  customPrompt = 'Hello PATIDAR NX COLLECTION, I would like assistance with your saree & bridal collection at Safal Plaza, Nikol.'
): string {
  const cleanPhone = whatsappNumber.replace(/[^0-9]/g, '') || DEFAULT_WHATSAPP_NUMBER;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(customPrompt)}`;
}

export function formatInrPrice(price: number | null | undefined): string | null {
  if (price === null || price === undefined || Number.isNaN(price)) {
    return null;
  }
  return `₹${price.toLocaleString('en-IN')}`;
}
