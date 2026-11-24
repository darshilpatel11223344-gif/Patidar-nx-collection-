import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const adminUsers = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  passwordHash: text('password_hash'),
  role: text('role').notNull().default('admin'), // 'owner' | 'admin'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').default('').notNull(),
  heroImageUrl: text('hero_image_url').default('').notNull(),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const mediaAssets = pgTable('media_assets', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').references(() => categories.id, {
    onDelete: 'set null',
  }),
  originalName: text('original_name').notNull(),
  altText: text('alt_text').default('').notNull(),
  thumbUrl: text('thumb_url').notNull(),
  mediumUrl: text('medium_url').notNull(),
  largeUrl: text('large_url').notNull(),
  width: integer('width').notNull().default(900),
  height: integer('height').notNull().default(1200),
  sizeBytes: integer('size_bytes').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  productCode: text('product_code').notNull().unique(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  categoryId: integer('category_id')
    .references(() => categories.id, { onDelete: 'restrict' })
    .notNull(),
  description: text('description').default('').notNull(),
  price: integer('price'), // Optional price in INR; null hides price on public site
  colour: text('colour').default('').notNull(),
  fabric: text('fabric').default('').notNull(),
  workDetails: text('work_details').default('').notNull(),
  size: text('size').default('Free Size (5.5m Saree + 0.8m Blouse)').notNull(),
  availability: text('availability').notNull().default('In Stock'),
  isFeatured: boolean('is_featured').notNull().default(false),
  isNewArrival: boolean('is_new_arrival').notNull().default(false),
  isBestSeller: boolean('is_best_seller').notNull().default(false),
  isTrending: boolean('is_trending').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const productImages = pgTable('product_images', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  mediaAssetId: integer('media_asset_id')
    .references(() => mediaAssets.id, { onDelete: 'cascade' })
    .notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isPrimary: boolean('is_primary').notNull().default(false),
});

export const siteSettings = pgTable('site_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
  mediaAssets: many(mediaAssets),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  images: many(productImages),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
  mediaAsset: one(mediaAssets, {
    fields: [productImages.mediaAssetId],
    references: [mediaAssets.id],
  }),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ one, many }) => ({
  category: one(categories, {
    fields: [mediaAssets.categoryId],
    references: [categories.id],
  }),
  productImages: many(productImages),
}));
