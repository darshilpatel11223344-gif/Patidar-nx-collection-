export interface MediaAsset {
  id: number;
  categoryId: number | null;
  originalName: string;
  altText: string;
  thumbUrl: string;
  mediumUrl: string;
  largeUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  heroImageUrl: string;
  displayOrder: number;
  productCount?: number;
}

export interface ProductImageItem {
  id: number;
  mediaAssetId: number;
  sortOrder: number;
  isPrimary: boolean;
  thumbUrl: string;
  mediumUrl: string;
  largeUrl: string;
  altText: string;
}

export interface Product {
  id: number;
  productCode: string;
  slug: string;
  name: string;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  description: string;
  price: number | null;
  colour: string;
  fabric: string;
  workDetails: string;
  size: string;
  availability: 'In Stock' | 'Made to Order' | 'Out of Stock' | string;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isTrending: boolean;
  images: ProductImageItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedProductsResponse {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  facets: {
    colours: string[];
  };
}

export interface TestimonialItem {
  id: string;
  name: string;
  city: string;
  occasion: string;
  quote: string;
}

export interface HomepageSettings {
  heroEyebrow: string;
  heroHeading: string;
  heroSubheading: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  heroBannerUrl: string;
  secondaryBannerUrl: string;
  brandIntroTitle: string;
  brandIntroText: string;
  promoEyebrow: string;
  promoHeadline: string;
  promoDescription: string;
  aboutHeading: string;
  aboutBody: string;
  aboutImageUrl: string;
  instagramHandle: string;
  instagramUrl: string;
  whatsappNumber: string;
  phoneDisplay: string;
  showroomAddress: string;
  showroomHours: string;
  emailAddress: string;
  testimonials: TestimonialItem[];
  privacyPolicy: string;
  termsConditions: string;
}

export interface AdminStats {
  totalProducts: number;
  totalCategories: number;
  totalImages: number;
  newArrivals: number;
  featuredProducts: number;
}

export interface AdminUserRecord {
  id: number;
  uid: string;
  email: string;
  displayName: string | null;
  role: string;
  createdAt: string;
}
