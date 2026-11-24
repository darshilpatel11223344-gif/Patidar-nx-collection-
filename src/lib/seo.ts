import type { Product } from '../types/catalog.ts';

export function updatePageSeo(params: {
  title: string;
  description: string;
  product?: Product;
}) {
  document.title = params.title;

  const setMeta = (selector: string, content: string) => {
    const el = document.querySelector<HTMLMetaElement>(selector);
    if (el) el.setAttribute('content', content);
  };

  setMeta('meta[name="description"]', params.description);
  setMeta('meta[property="og:title"]', params.title);
  setMeta('meta[property="og:description"]', params.description);
  setMeta('meta[name="twitter:title"]', params.title);
  setMeta('meta[name="twitter:description"]', params.description);

  const existingProductSchema = document.getElementById('pnx-product-jsonld');
  if (existingProductSchema) {
    existingProductSchema.remove();
  }

  if (params.product) {
    const script = document.createElement('script');
    script.id = 'pnx-product-jsonld';
    script.type = 'application/ld+json';
    const primaryImage = params.product.images[0]?.largeUrl || '';
    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: params.product.name,
      sku: params.product.productCode,
      category: params.product.categoryName,
      description: params.product.description,
      brand: {
        '@type': 'Brand',
        name: 'PATIDAR NX COLLECTION',
      },
      image: primaryImage ? [window.location.origin + primaryImage] : [],
    };
    if (params.product.price !== null) {
      schema.offers = {
        '@type': 'Offer',
        priceCurrency: 'INR',
        price: params.product.price,
        availability:
          params.product.availability === 'Out of Stock'
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock',
      };
    }
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }
}
