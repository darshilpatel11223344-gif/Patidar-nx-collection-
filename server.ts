import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import { createServer as createViteServer } from 'vite';
import { db } from './src/db/index.ts';
import {
  adminUsers,
  categories,
  mediaAssets,
  productImages,
  products,
  siteSettings,
} from './src/db/schema.ts';
import {
  hashPassword,
  requireAdmin,
  signSessionToken,
  verifyConstantSecret,
  verifyPassword,
  type AuthRequest,
} from './src/middleware/auth.ts';
import {
  MEDIA_ROOT,
  deleteStoredMediaFiles,
  ensureMediaDirectories,
  processAndStoreImage,
  sanitizeSlug,
} from './src/server/media.ts';
import { DEFAULT_HOMEPAGE_SETTINGS, ensureSeeded } from './src/server/seed.ts';
import type { HomepageSettings, Product } from './src/types/catalog.ts';

const PORT = Number(process.env.PORT) || 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB per image
    files: 30, // Bulk upload up to 30 photos per batch
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are supported.'));
    }
  },
});

async function hydrateProducts(rawProducts: (typeof products.$inferSelect)[]): Promise<Product[]> {
  if (rawProducts.length === 0) return [];

  const productIds = rawProducts.map((p) => p.id);
  const categoryIds = Array.from(new Set(rawProducts.map((p) => p.categoryId)));

  const [catRows, imgRows] = await Promise.all([
    db.select().from(categories).where(inArray(categories.id, categoryIds)),
    db
      .select({
        id: productImages.id,
        productId: productImages.productId,
        mediaAssetId: productImages.mediaAssetId,
        sortOrder: productImages.sortOrder,
        isPrimary: productImages.isPrimary,
        thumbUrl: mediaAssets.thumbUrl,
        mediumUrl: mediaAssets.mediumUrl,
        largeUrl: mediaAssets.largeUrl,
        altText: mediaAssets.altText,
      })
      .from(productImages)
      .innerJoin(mediaAssets, eq(productImages.mediaAssetId, mediaAssets.id))
      .where(inArray(productImages.productId, productIds))
      .orderBy(desc(productImages.isPrimary), asc(productImages.sortOrder)),
  ]);

  const catMap = Object.fromEntries(catRows.map((c) => [c.id, c]));
  const imgsByProduct: Record<number, Product['images']> = {};
  for (const row of imgRows) {
    if (!imgsByProduct[row.productId]) {
      imgsByProduct[row.productId] = [];
    }
    imgsByProduct[row.productId].push({
      id: row.id,
      mediaAssetId: row.mediaAssetId,
      sortOrder: row.sortOrder,
      isPrimary: row.isPrimary,
      thumbUrl: row.thumbUrl,
      mediumUrl: row.mediumUrl,
      largeUrl: row.largeUrl,
      altText: row.altText,
    });
  }

  return rawProducts.map((p) => {
    const cat = catMap[p.categoryId];
    return {
      id: p.id,
      productCode: p.productCode,
      slug: p.slug,
      name: p.name,
      categoryId: p.categoryId,
      categoryName: cat?.name || 'Collection',
      categorySlug: cat?.slug || 'sarees',
      description: p.description,
      price: p.price,
      colour: p.colour,
      fabric: p.fabric,
      workDetails: p.workDetails,
      size: p.size,
      availability: p.availability,
      isFeatured: p.isFeatured,
      isNewArrival: p.isNewArrival,
      isBestSeller: p.isBestSeller,
      isTrending: p.isTrending,
      images: imgsByProduct[p.id] || [],
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  });
}

async function getHomepageSettings(): Promise<HomepageSettings> {
  await ensureSeeded();
  const rows = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, 'homepage'))
    .limit(1);

  if (!rows.length) return DEFAULT_HOMEPAGE_SETTINGS;
  return {
    ...DEFAULT_HOMEPAGE_SETTINGS,
    ...(rows[0].value as Partial<HomepageSettings>),
  };
}

async function startServer() {
  ensureMediaDirectories();
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // Cached static WebP media delivery
  app.use(
    '/media',
    express.static(MEDIA_ROOT, {
      maxAge: '365d',
      immutable: true,
    })
  );

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Dynamic robots.txt
  app.get('/robots.txt', (req, res) => {
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    res.type('text/plain').send(
      `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${baseUrl}/sitemap.xml\n`
    );
  });

  // Dynamic sitemap.xml
  app.get('/sitemap.xml', async (req, res) => {
    try {
      await ensureSeeded();
      const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
      const [catRows, prodRows] = await Promise.all([
        db.select({ slug: categories.slug }).from(categories),
        db.select({ slug: products.slug, updatedAt: products.updatedAt }).from(products),
      ]);

      const staticUrls = [
        '/',
        '/collections',
        '/sarees',
        '/new-arrivals',
        '/about',
        '/contact',
        '/privacy-policy',
        '/terms',
      ];

      const entries = [
        ...staticUrls.map(
          (u) => `<url><loc>${baseUrl}${u}</loc><changefreq>weekly</changefreq></url>`
        ),
        ...catRows.map(
          (c) =>
            `<url><loc>${baseUrl}/collections?category=${encodeURIComponent(c.slug)}</loc><changefreq>weekly</changefreq></url>`
        ),
        ...prodRows.map(
          (p) =>
            `<url><loc>${baseUrl}/product/${encodeURIComponent(p.slug)}</loc><lastmod>${p.updatedAt.toISOString().slice(0, 10)}</lastmod></url>`
        ),
      ];

      res
        .type('application/xml')
        .send(
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>`
        );
    } catch (error) {
      console.error('Sitemap error:', error);
      res.status(500).send('Unable to generate sitemap');
    }
  });

  // Public site settings
  app.get('/api/settings', async (_req, res) => {
    try {
      const settings = await getHomepageSettings();
      res.json(settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      res.status(500).json({ error: 'Unable to load storefront configuration' });
    }
  });

  // Public categories with product counts
  app.get('/api/categories', async (_req, res) => {
    try {
      await ensureSeeded();
      const catRows = await db
        .select()
        .from(categories)
        .orderBy(asc(categories.displayOrder), asc(categories.id));

      const countRows = await db
        .select({
          categoryId: products.categoryId,
          count: sql<number>`count(*)::int`,
        })
        .from(products)
        .groupBy(products.categoryId);

      const countMap = Object.fromEntries(
        countRows.map((r) => [r.categoryId, r.count])
      );

      res.json(
        catRows.map((c) => ({
          ...c,
          productCount: countMap[c.id] || 0,
        }))
      );
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      res.status(500).json({ error: 'Unable to load categories' });
    }
  });

  // Public paginated products with search & filters
  app.get('/api/products', async (req, res) => {
    try {
      await ensureSeeded();
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(48, Math.max(1, Number(req.query.limit) || 12));
      const q = String(req.query.q || '').trim();
      const categoryParam = String(req.query.category || '').trim();
      const colour = String(req.query.colour || '').trim();
      const availability = String(req.query.availability || '').trim();
      const minPrice = req.query.minPrice ? Number(req.query.minPrice) : null;
      const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : null;
      const featured = req.query.featured === 'true';
      const newArrival = req.query.newArrival === 'true';
      const bestSeller = req.query.bestSeller === 'true';
      const trending = req.query.trending === 'true';
      const sort = String(req.query.sort || 'newest');

      const conditions = [];

      if (q) {
        const pattern = `%${q}%`;
        conditions.push(
          or(
            ilike(products.name, pattern),
            ilike(products.productCode, pattern),
            ilike(products.fabric, pattern),
            ilike(products.colour, pattern),
            ilike(products.workDetails, pattern),
            ilike(products.description, pattern)
          )
        );
      }

      if (categoryParam && categoryParam !== 'all') {
        if (categoryParam === 'new-arrivals') {
          const [catMatch] = await db
            .select()
            .from(categories)
            .where(eq(categories.slug, 'new-arrivals'))
            .limit(1);
          if (catMatch) {
            conditions.push(
              or(
                eq(products.categoryId, catMatch.id),
                eq(products.isNewArrival, true)
              )
            );
          } else {
            conditions.push(eq(products.isNewArrival, true));
          }
        } else {
          const numericId = Number(categoryParam);
          if (Number.isInteger(numericId) && numericId > 0) {
            conditions.push(eq(products.categoryId, numericId));
          } else {
            const [catMatch] = await db
              .select()
              .from(categories)
              .where(eq(categories.slug, categoryParam))
              .limit(1);
            if (catMatch) {
              conditions.push(eq(products.categoryId, catMatch.id));
            } else {
              return res.json({
                items: [],
                total: 0,
                page,
                limit,
                totalPages: 1,
                facets: { colours: [] },
              });
            }
          }
        }
      }

      if (colour && colour !== 'all') {
        conditions.push(ilike(products.colour, colour));
      }

      if (availability && availability !== 'all') {
        conditions.push(eq(products.availability, availability));
      }

      if (minPrice !== null && !Number.isNaN(minPrice)) {
        conditions.push(gte(products.price, minPrice));
      }

      if (maxPrice !== null && !Number.isNaN(maxPrice)) {
        conditions.push(lte(products.price, maxPrice));
      }

      if (featured) conditions.push(eq(products.isFeatured, true));
      if (newArrival) conditions.push(eq(products.isNewArrival, true));
      if (bestSeller) conditions.push(eq(products.isBestSeller, true));
      if (trending) conditions.push(eq(products.isTrending, true));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      let orderByClause = [desc(products.createdAt), desc(products.id)];
      if (sort === 'price_asc') {
        orderByClause = [sql`${products.price} ASC NULLS LAST`, desc(products.id)];
      } else if (sort === 'price_desc') {
        orderByClause = [sql`${products.price} DESC NULLS LAST`, desc(products.id)];
      } else if (sort === 'name_asc') {
        orderByClause = [asc(products.name)];
      }

      const [countRes, rows, colourRows] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(products)
          .where(whereClause),
        db
          .select()
          .from(products)
          .where(whereClause)
          .orderBy(...orderByClause)
          .limit(limit)
          .offset((page - 1) * limit),
        db
          .selectDistinct({ colour: products.colour })
          .from(products)
          .where(sql`${products.colour} <> ''`)
          .orderBy(asc(products.colour)),
      ]);

      const total = countRes[0]?.count || 0;
      const hydrated = await hydrateProducts(rows);

      res.json({
        items: hydrated,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        facets: {
          colours: colourRows.map((c) => c.colour),
        },
      });
    } catch (error) {
      console.error('Failed to load products:', error);
      res.status(500).json({ error: 'Unable to load collection' });
    }
  });

  // Public single product by slug or unique productCode
  app.get('/api/products/:identifier', async (req, res) => {
    try {
      await ensureSeeded();
      const identifier = String(req.params.identifier || '').trim();
      if (!identifier) {
        return res.status(400).json({ error: 'Missing product identifier' });
      }

      const numericId = Number(identifier);
      const rows = await db
        .select()
        .from(products)
        .where(
          Number.isInteger(numericId) && numericId > 0
            ? or(
                eq(products.id, numericId),
                eq(products.slug, identifier),
                eq(products.productCode, identifier.toUpperCase())
              )
            : or(
                eq(products.slug, identifier),
                eq(products.productCode, identifier.toUpperCase())
              )
        )
        .limit(1);

      if (!rows.length) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const [product] = await hydrateProducts(rows);
      const relatedRaw = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.categoryId, product.categoryId),
            sql`${products.id} <> ${product.id}`
          )
        )
        .orderBy(desc(products.isFeatured), desc(products.createdAt))
        .limit(4);

      const related = await hydrateProducts(relatedRaw);
      res.json({ product, related });
    } catch (error) {
      console.error('Failed to fetch product details:', error);
      res.status(500).json({ error: 'Unable to load product details' });
    }
  });

  // ==================== ADMIN AUTH & USERS ====================

  app.get('/api/admin/auth/status', async (_req, res) => {
    try {
      const passcodeConfigured = Boolean((process.env.ADMIN_PASSCODE || '').trim());
      const ownersWithHash = await db
        .select({ id: adminUsers.id })
        .from(adminUsers)
        .where(isNotNull(adminUsers.passwordHash))
        .limit(1);
      res.json({
        hasOwner: ownersWithHash.length > 0,
        passcodeConfigured,
      });
    } catch (error) {
      console.error('Auth status check failed:', error);
      res.status(500).json({ error: 'Unable to inspect admin setup state' });
    }
  });

  app.post('/api/admin/auth/setup', async (req, res) => {
    try {
      if ((process.env.ADMIN_PASSCODE || '').trim()) {
        return res.status(403).json({
          error: 'First-run setup is locked because ADMIN_PASSCODE is configured.',
        });
      }

      const email = String(req.body.email || '').trim().toLowerCase();
      const displayName = String(req.body.displayName || 'Showroom Owner').trim();
      const password = String(req.body.password || '');

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Valid email address is required.' });
      }
      if (password.length < 8) {
        return res.status(400).json({
          error: 'Password must be at least 8 characters long.',
        });
      }

      const passwordHash = hashPassword(password);

      const createdOwner = await db.transaction(async (tx) => {
        const existingWithPass = await tx
          .select({ id: adminUsers.id })
          .from(adminUsers)
          .where(isNotNull(adminUsers.passwordHash))
          .limit(1);

        if (existingWithPass.length > 0) {
          return null;
        }

        const [owner] = await tx
          .insert(adminUsers)
          .values({
            uid: `local:${email}`,
            email,
            displayName: displayName || 'Showroom Owner',
            passwordHash,
            role: 'owner',
          })
          .onConflictDoUpdate({
            target: adminUsers.email,
            set: {
              uid: `local:${email}`,
              displayName: displayName || 'Showroom Owner',
              passwordHash,
              role: 'owner',
            },
          })
          .returning({
            id: adminUsers.id,
            uid: adminUsers.uid,
            email: adminUsers.email,
            displayName: adminUsers.displayName,
            role: adminUsers.role,
            createdAt: adminUsers.createdAt,
          });

        return owner;
      });

      if (!createdOwner) {
        return res.status(403).json({
          error: 'Showroom owner account is already claimed. Please sign in.',
        });
      }

      const token = signSessionToken(createdOwner);
      res.status(201).json({ token, currentUser: createdOwner });
    } catch (error) {
      console.error('Owner setup error:', error);
      res.status(500).json({ error: 'Unable to complete showroom owner setup.' });
    }
  });

  app.post('/api/admin/auth/login', async (req, res) => {
    try {
      const email = String(req.body.email || '').trim().toLowerCase();
      const password = String(req.body.password || '');
      const envPasscode = (process.env.ADMIN_PASSCODE || '').trim();

      if (!password) {
        return res.status(400).json({ error: 'Password or passcode is required.' });
      }

      if (envPasscode && verifyConstantSecret(password, envPasscode)) {
        const effectiveEmail =
          email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
            ? email
            : 'owner@patidarnx.com';

        const [existing] = await db
          .select({
            id: adminUsers.id,
            uid: adminUsers.uid,
            email: adminUsers.email,
            displayName: adminUsers.displayName,
            role: adminUsers.role,
            createdAt: adminUsers.createdAt,
          })
          .from(adminUsers)
          .where(eq(adminUsers.email, effectiveEmail))
          .limit(1);

        let adminUser = existing;
        if (!adminUser) {
          const [inserted] = await db
            .insert(adminUsers)
            .values({
              uid: `local:${effectiveEmail}`,
              email: effectiveEmail,
              displayName: 'Showroom Owner',
              role: 'owner',
            })
            .returning({
              id: adminUsers.id,
              uid: adminUsers.uid,
              email: adminUsers.email,
              displayName: adminUsers.displayName,
              role: adminUsers.role,
              createdAt: adminUsers.createdAt,
            });
          adminUser = inserted;
        }

        const token = signSessionToken(adminUser);
        return res.json({ token, currentUser: adminUser });
      }

      if (!email) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const [matched] = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.email, email))
        .limit(1);

      if (!matched || !matched.passwordHash || !verifyPassword(password, matched.passwordHash)) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const safeUser = {
        id: matched.id,
        uid: matched.uid,
        email: matched.email,
        displayName: matched.displayName,
        role: matched.role,
        createdAt: matched.createdAt,
      };
      const token = signSessionToken(safeUser);
      res.json({ token, currentUser: safeUser });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ error: 'Unable to sign in.' });
    }
  });

  app.post('/api/admin/auth/change-password', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const currentPassword = String(req.body.currentPassword || '');
      const newPassword = String(req.body.newPassword || '');
      if (newPassword.length < 8) {
        return res.status(400).json({
          error: 'New password must be at least 8 characters long.',
        });
      }

      const [record] = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.id, req.adminRecord!.id))
        .limit(1);

      if (!record) {
        return res.status(404).json({ error: 'Admin account not found.' });
      }

      if (record.passwordHash && !verifyPassword(currentPassword, record.passwordHash)) {
        return res.status(401).json({ error: 'Current password is incorrect.' });
      }

      await db
        .update(adminUsers)
        .set({ passwordHash: hashPassword(newPassword) })
        .where(eq(adminUsers.id, record.id));

      res.json({ ok: true });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Unable to update password.' });
    }
  });

  app.get('/api/admin/me', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const admins = await db
        .select({
          id: adminUsers.id,
          uid: adminUsers.uid,
          email: adminUsers.email,
          displayName: adminUsers.displayName,
          role: adminUsers.role,
          createdAt: adminUsers.createdAt,
        })
        .from(adminUsers)
        .orderBy(asc(adminUsers.createdAt));
      res.json({
        currentUser: req.adminRecord,
        admins,
      });
    } catch (error) {
      console.error('Admin profile error:', error);
      res.status(500).json({ error: 'Unable to load admin profile' });
    }
  });

  app.post('/api/admin/users', requireAdmin, async (req: AuthRequest, res) => {
    try {
      if (req.adminRecord?.role !== 'owner') {
        return res.status(403).json({
          error: 'Only the showroom owner can add administrator accounts.',
        });
      }

      const email = String(req.body.email || '').trim().toLowerCase();
      const displayName = String(req.body.displayName || '').trim();
      const password = String(req.body.password || '');

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Valid email address is required' });
      }
      if (password.length < 8) {
        return res.status(400).json({
          error: 'Initial password must be at least 8 characters',
        });
      }

      const [created] = await db
        .insert(adminUsers)
        .values({
          uid: `local:${email}`,
          email,
          displayName: displayName || email.split('@')[0],
          passwordHash: hashPassword(password),
          role: 'admin',
        })
        .onConflictDoNothing()
        .returning({
          id: adminUsers.id,
          uid: adminUsers.uid,
          email: adminUsers.email,
          displayName: adminUsers.displayName,
          role: adminUsers.role,
          createdAt: adminUsers.createdAt,
        });

      if (!created) {
        return res.status(409).json({ error: 'This email is already registered' });
      }

      res.status(201).json(created);
    } catch (error) {
      console.error('Add admin user error:', error);
      res.status(500).json({ error: 'Unable to create admin account' });
    }
  });

  app.delete('/api/admin/users/:id', requireAdmin, async (req: AuthRequest, res) => {
    try {
      if (req.adminRecord?.role !== 'owner') {
        return res.status(403).json({
          error: 'Only the showroom owner can remove administrator accounts.',
        });
      }
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid admin user ID' });
      }
      if (req.adminRecord?.id === id) {
        return res.status(400).json({ error: 'Cannot remove your own active session' });
      }
      await db.delete(adminUsers).where(eq(adminUsers.id, id));
      res.json({ ok: true });
    } catch (error) {
      console.error('Remove admin user error:', error);
      res.status(500).json({ error: 'Unable to remove admin user' });
    }
  });

  app.get('/api/admin/stats', requireAdmin, async (_req, res) => {
    try {
      await ensureSeeded();
      const [prodCount, catCount, imgCount, newCount, featCount] = await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(products),
        db.select({ count: sql<number>`count(*)::int` }).from(categories),
        db.select({ count: sql<number>`count(*)::int` }).from(mediaAssets),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(products)
          .where(eq(products.isNewArrival, true)),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(products)
          .where(eq(products.isFeatured, true)),
      ]);

      res.json({
        totalProducts: prodCount[0]?.count || 0,
        totalCategories: catCount[0]?.count || 0,
        totalImages: imgCount[0]?.count || 0,
        newArrivals: newCount[0]?.count || 0,
        featuredProducts: featCount[0]?.count || 0,
      });
    } catch (error) {
      console.error('Admin stats error:', error);
      res.status(500).json({ error: 'Unable to load showroom metrics' });
    }
  });

  // Categories CRUD
  app.post('/api/admin/categories', requireAdmin, async (req, res) => {
    try {
      const name = String(req.body.name || '').trim();
      if (!name) {
        return res.status(400).json({ error: 'Category name is required' });
      }
      const slug = sanitizeSlug(req.body.slug || name);
      const description = String(req.body.description || '').trim();
      const heroImageUrl = String(req.body.heroImageUrl || '').trim();
      const displayOrder = Number(req.body.displayOrder) || 0;

      const [created] = await db
        .insert(categories)
        .values({
          name,
          slug,
          description,
          heroImageUrl,
          displayOrder,
        })
        .returning();

      res.status(201).json(created);
    } catch (error: unknown) {
      console.error('Create category error:', error);
      res.status(400).json({ error: 'Category slug already exists or invalid payload' });
    }
  });

  app.patch('/api/admin/categories/:id', requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid category ID' });
      }
      const name = String(req.body.name || '').trim();
      if (!name) {
        return res.status(400).json({ error: 'Category name is required' });
      }

      const [updated] = await db
        .update(categories)
        .set({
          name,
          slug: sanitizeSlug(req.body.slug || name),
          description: String(req.body.description || '').trim(),
          heroImageUrl: String(req.body.heroImageUrl || '').trim(),
          displayOrder: Number(req.body.displayOrder) || 0,
          updatedAt: new Date(),
        })
        .where(eq(categories.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: 'Category not found' });
      }
      res.json(updated);
    } catch (error) {
      console.error('Update category error:', error);
      res.status(400).json({ error: 'Unable to update category' });
    }
  });

  app.delete('/api/admin/categories/:id', requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid category ID' });
      }
      const linked = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .where(eq(products.categoryId, id));

      if ((linked[0]?.count || 0) > 0) {
        return res.status(409).json({
          error: 'Reassign or delete products in this category before deleting it.',
        });
      }
      await db.delete(categories).where(eq(categories.id, id));
      res.json({ ok: true });
    } catch (error) {
      console.error('Delete category error:', error);
      res.status(500).json({ error: 'Unable to delete category' });
    }
  });

  // Next unique Product ID generator
  app.get('/api/admin/products/next-code', requireAdmin, async (_req, res) => {
    try {
      const rows = await db
        .select({ productCode: products.productCode })
        .from(products)
        .orderBy(desc(products.id))
        .limit(50);

      let maxNum = 1000;
      for (const row of rows) {
        const match = row.productCode.match(/(\d+)$/);
        if (match) {
          const val = Number(match[1]);
          if (val > maxNum) maxNum = val;
        }
      }
      res.json({ productCode: `PNX-${maxNum + 1}` });
    } catch (error) {
      console.error('Generate product code error:', error);
      res.status(500).json({ error: 'Unable to generate product code' });
    }
  });

  // Admin Products CRUD
  app.post('/api/admin/products', requireAdmin, async (req, res) => {
    try {
      const name = String(req.body.name || '').trim();
      const productCode = String(req.body.productCode || '')
        .trim()
        .toUpperCase();
      const categoryId = Number(req.body.categoryId);

      if (!name || !productCode || !Number.isInteger(categoryId)) {
        return res.status(400).json({
          error: 'Product name, unique Product ID, and category are required.',
        });
      }

      const rawPrice = req.body.price;
      const price =
        rawPrice === null || rawPrice === undefined || rawPrice === ''
          ? null
          : Math.max(0, Math.round(Number(rawPrice)));

      const slug = `${sanitizeSlug(name)}-${sanitizeSlug(productCode)}`;

      const [created] = await db
        .insert(products)
        .values({
          productCode,
          slug,
          name,
          categoryId,
          description: String(req.body.description || '').trim(),
          price: Number.isNaN(price as number) ? null : price,
          colour: String(req.body.colour || '').trim(),
          fabric: String(req.body.fabric || '').trim(),
          workDetails: String(req.body.workDetails || '').trim(),
          size: String(req.body.size || 'Free Size (5.5m Saree + 0.8m Blouse)').trim(),
          availability: String(req.body.availability || 'In Stock').trim(),
          isFeatured: Boolean(req.body.isFeatured),
          isNewArrival: Boolean(req.body.isNewArrival),
          isBestSeller: Boolean(req.body.isBestSeller),
          isTrending: Boolean(req.body.isTrending),
        })
        .returning();

      const imageIds: number[] = Array.isArray(req.body.imageIds)
        ? req.body.imageIds.map(Number).filter((n: number) => Number.isInteger(n))
        : [];

      for (let i = 0; i < imageIds.length; i++) {
        await db.insert(productImages).values({
          productId: created.id,
          mediaAssetId: imageIds[i],
          sortOrder: i,
          isPrimary: i === 0,
        });
      }

      const [hydrated] = await hydrateProducts([created]);
      res.status(201).json(hydrated);
    } catch (error) {
      console.error('Create product error:', error);
      res.status(400).json({
        error: 'Unable to save product. Ensure the Product ID is unique.',
      });
    }
  });

  app.patch('/api/admin/products/:id', requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid product ID' });
      }

      const name = String(req.body.name || '').trim();
      const productCode = String(req.body.productCode || '')
        .trim()
        .toUpperCase();
      const categoryId = Number(req.body.categoryId);

      if (!name || !productCode || !Number.isInteger(categoryId)) {
        return res.status(400).json({
          error: 'Product name, unique Product ID, and category are required.',
        });
      }

      const rawPrice = req.body.price;
      const price =
        rawPrice === null || rawPrice === undefined || rawPrice === ''
          ? null
          : Math.max(0, Math.round(Number(rawPrice)));

      const slug = `${sanitizeSlug(name)}-${sanitizeSlug(productCode)}`;

      const [updated] = await db
        .update(products)
        .set({
          productCode,
          slug,
          name,
          categoryId,
          description: String(req.body.description || '').trim(),
          price: Number.isNaN(price as number) ? null : price,
          colour: String(req.body.colour || '').trim(),
          fabric: String(req.body.fabric || '').trim(),
          workDetails: String(req.body.workDetails || '').trim(),
          size: String(req.body.size || 'Free Size (5.5m Saree + 0.8m Blouse)').trim(),
          availability: String(req.body.availability || 'In Stock').trim(),
          isFeatured: Boolean(req.body.isFeatured),
          isNewArrival: Boolean(req.body.isNewArrival),
          isBestSeller: Boolean(req.body.isBestSeller),
          isTrending: Boolean(req.body.isTrending),
          updatedAt: new Date(),
        })
        .where(eq(products.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: 'Product not found' });
      }

      if (Array.isArray(req.body.imageIds)) {
        const imageIds: number[] = req.body.imageIds
          .map(Number)
          .filter((n: number) => Number.isInteger(n));
        await db.delete(productImages).where(eq(productImages.productId, id));
        for (let i = 0; i < imageIds.length; i++) {
          await db.insert(productImages).values({
            productId: id,
            mediaAssetId: imageIds[i],
            sortOrder: i,
            isPrimary: i === 0,
          });
        }
      }

      const [hydrated] = await hydrateProducts([updated]);
      res.json(hydrated);
    } catch (error) {
      console.error('Update product error:', error);
      res.status(400).json({ error: 'Unable to update product' });
    }
  });

  app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid product ID' });
      }
      await db.delete(products).where(eq(products.id, id));
      res.json({ ok: true });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ error: 'Unable to delete product' });
    }
  });

  // Admin Media Library (Search, Paginate, Bulk Upload, Replace, Delete)
  app.get('/api/admin/media', requireAdmin, async (req, res) => {
    try {
      await ensureSeeded();
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(60, Math.max(1, Number(req.query.limit) || 24));
      const q = String(req.query.q || '').trim();
      const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;

      const conditions = [];
      if (q) {
        const pattern = `%${q}%`;
        conditions.push(
          or(ilike(mediaAssets.originalName, pattern), ilike(mediaAssets.altText, pattern))
        );
      }
      if (categoryId && Number.isInteger(categoryId)) {
        conditions.push(eq(mediaAssets.categoryId, categoryId));
      }

      const whereClause = conditions.length ? and(...conditions) : undefined;
      const [countRes, items] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(mediaAssets)
          .where(whereClause),
        db
          .select()
          .from(mediaAssets)
          .where(whereClause)
          .orderBy(desc(mediaAssets.createdAt), desc(mediaAssets.id))
          .limit(limit)
          .offset((page - 1) * limit),
      ]);

      const total = countRes[0]?.count || 0;
      res.json({
        items,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      });
    } catch (error) {
      console.error('Load media error:', error);
      res.status(500).json({ error: 'Unable to load media library' });
    }
  });

  app.post(
    '/api/admin/media/upload',
    requireAdmin,
    upload.array('files', 30),
    async (req: AuthRequest, res) => {
      try {
        const files = (req.files as Express.Multer.File[]) || [];
        if (files.length === 0) {
          return res.status(400).json({ error: 'Select one or more photographs to upload' });
        }

        const rawCategoryId = req.body.categoryId ? Number(req.body.categoryId) : null;
        const categoryId =
          rawCategoryId && Number.isInteger(rawCategoryId) ? rawCategoryId : null;
        const defaultAlt = String(req.body.altText || '').trim();

        const createdAssets = [];
        for (const file of files) {
          const processed = await processAndStoreImage(file.buffer, file.originalname);
          const cleanAlt =
            defaultAlt ||
            file.originalname
              .replace(/\.[^/.]+$/, '')
              .replace(/[-_]+/g, ' ')
              .trim();

          const [saved] = await db
            .insert(mediaAssets)
            .values({
              categoryId,
              originalName: file.originalname,
              altText: cleanAlt,
              thumbUrl: processed.thumbUrl,
              mediumUrl: processed.mediumUrl,
              largeUrl: processed.largeUrl,
              width: processed.width,
              height: processed.height,
              sizeBytes: processed.sizeBytes,
            })
            .returning();
          createdAssets.push(saved);
        }

        res.status(201).json({ items: createdAssets });
      } catch (error) {
        console.error('Bulk upload error:', error);
        res.status(500).json({ error: 'Image optimization and upload failed' });
      }
    }
  );

  app.post(
    '/api/admin/media/:id/replace',
    requireAdmin,
    upload.single('file'),
    async (req: AuthRequest, res) => {
      try {
        const id = Number(req.params.id);
        const file = req.file;
        if (!Number.isInteger(id) || !file) {
          return res.status(400).json({ error: 'Valid media ID and replacement image required' });
        }

        const [existing] = await db
          .select()
          .from(mediaAssets)
          .where(eq(mediaAssets.id, id))
          .limit(1);

        if (!existing) {
          return res.status(404).json({ error: 'Media record not found' });
        }

        const processed = await processAndStoreImage(file.buffer, file.originalname);
        const [updated] = await db
          .update(mediaAssets)
          .set({
            originalName: file.originalname,
            thumbUrl: processed.thumbUrl,
            mediumUrl: processed.mediumUrl,
            largeUrl: processed.largeUrl,
            width: processed.width,
            height: processed.height,
            sizeBytes: processed.sizeBytes,
          })
          .where(eq(mediaAssets.id, id))
          .returning();

        deleteStoredMediaFiles({
          thumbUrl: existing.thumbUrl,
          mediumUrl: existing.mediumUrl,
          largeUrl: existing.largeUrl,
        });

        res.json(updated);
      } catch (error) {
        console.error('Replace image error:', error);
        res.status(500).json({ error: 'Unable to replace image' });
      }
    }
  );

  app.patch('/api/admin/media/:id', requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid media ID' });
      }
      const altText = String(req.body.altText || '').trim();
      const rawCat = req.body.categoryId;
      const categoryId =
        rawCat === null || rawCat === '' || rawCat === undefined ? null : Number(rawCat);

      const [updated] = await db
        .update(mediaAssets)
        .set({
          altText,
          categoryId: categoryId && Number.isInteger(categoryId) ? categoryId : null,
        })
        .where(eq(mediaAssets.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: 'Media asset not found' });
      }
      res.json(updated);
    } catch (error) {
      console.error('Update media metadata error:', error);
      res.status(500).json({ error: 'Unable to update image details' });
    }
  });

  app.delete('/api/admin/media/:id', requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid media ID' });
      }

      const [existing] = await db
        .select()
        .from(mediaAssets)
        .where(eq(mediaAssets.id, id))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: 'Media asset not found' });
      }

      await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
      deleteStoredMediaFiles({
        thumbUrl: existing.thumbUrl,
        mediumUrl: existing.mediumUrl,
        largeUrl: existing.largeUrl,
      });

      res.json({ ok: true });
    } catch (error) {
      console.error('Delete media error:', error);
      res.status(500).json({ error: 'Unable to delete media asset' });
    }
  });

  // Homepage & Content Management
  app.put('/api/admin/settings/:key', requireAdmin, async (req, res) => {
    try {
      const key = String(req.params.key || '').trim();
      if (!key) {
        return res.status(400).json({ error: 'Settings key is required' });
      }
      const value = req.body;
      const [saved] = await db
        .insert(siteSettings)
        .values({ key, value, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: siteSettings.key,
          set: { value, updatedAt: new Date() },
        })
        .returning();

      res.json(saved.value);
    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({ error: 'Unable to save homepage configuration' });
    }
  });

  // Vite / Static SPA serving
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PATIDAR NX COLLECTION server running on port ${PORT}`);
  });
}

startServer();
