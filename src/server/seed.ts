import fs from 'fs';
import path from 'path';
import { db } from '../db/index.ts';
import {
  categories,
  mediaAssets,
  productImages,
  products,
  siteSettings,
} from '../db/schema.ts';
import { processAndStoreImage } from './media.ts';
import type { HomepageSettings } from '../types/catalog.ts';

let seedPromise: Promise<void> | null = null;

const STARTER_FILES = {
  heroBridal: 'pnx_hero_bridal_1795542202169.jpg',
  banarasiCrimson: 'pnx_banarasi_crimson_1795542201811.jpg',
  champagneOrganza: 'pnx_champagne_organza_1795542202451.jpg',
  ivoryKanjivaram: 'pnx_ivory_kanjivaram_1795542203420.jpg',
  emeraldPatola: 'pnx_emerald_patola_1795542203767.jpg',
  midnightSequin: 'pnx_midnight_sequin_1795542203862.jpg',
  roseTissue: 'pnx_rose_tissue_1795542205514.jpg',
  royalPaithani: 'pnx_royal_paithani_1795542205009.jpg',
  showroomAtelier: 'pnx_showroom_atelier_1795542206150.jpg',
} as const;

export const DEFAULT_HOMEPAGE_SETTINGS: HomepageSettings = {
  heroEyebrow: 'Nikol · Ahmedabad · Est. Heritage Couture',
  heroHeading: 'Elegance That Speaks Without Words.',
  heroSubheading:
    'Discover handwoven Kanjivarams, pure Banarasi Katan silks, bridal ensembles, and contemporary designer sarees curated at Safal Plaza, Nikol.',
  heroPrimaryCta: 'Explore Collection',
  heroSecondaryCta: 'Discover New Arrivals',
  heroBannerUrl: '',
  secondaryBannerUrl: '',
  brandIntroTitle: 'Discover Elegance. Celebrate Tradition.',
  brandIntroText:
    'Every drape at PATIDAR NX COLLECTION is hand-selected from master weaving clusters across Banaras, Kanchipuram, Patan, and Yeola—honouring heirloom craftsmanship while embracing modern silhouettes for weddings, receptions, and celebratory evenings.',
  promoEyebrow: 'Bridal & Trousseau Edit 2026',
  promoHeadline: 'Private Showroom Styling at Safal Plaza',
  promoDescription:
    'Reserve a personal styling session at Shops 1 to 6, Safal Plaza, Nikol, or connect instantly over WhatsApp for close-up fabric videos, zari verification, and pricing.',
  aboutHeading: 'Crafted For Generations, Curated In Ahmedabad.',
  aboutBody:
    'Located in the heart of Nikol at Safal Plaza, PATIDAR NX COLLECTION brings together six expansive showroom galleries dedicated to pure silk sarees, bridal trousseaus, party-wear drapes, and festive couture. Our stylists guide brides and families through weave authenticity, custom blouse tailoring, and colour coordination.',
  aboutImageUrl: '',
  instagramHandle: '@patidarnxcollection',
  instagramUrl: 'https://www.instagram.com/patidarnxcollection/',
  whatsappNumber: '919825115185',
  phoneDisplay: '+91 9825115185',
  showroomAddress: 'Safal Plaza, Shops 1 to 6, Nikol, Ahmedabad, Gujarat, India',
  showroomHours: 'Monday – Sunday · 10:30 AM to 9:00 PM IST',
  emailAddress: 'concierge@patidarnxcollection.com',
  testimonials: [
    {
      id: 't1',
      name: 'Kruti Patel',
      city: 'Ahmedabad',
      occasion: 'Bridal Trousseau',
      quote:
        'I selected three pure Banarasi and Kanjivaram sarees for my wedding ceremonies at PATIDAR NX COLLECTION. Their staff understood the exact antique gold tone I wanted and even coordinated WhatsApp video previews for my family.',
    },
    {
      id: 't2',
      name: 'Meera Desai',
      city: 'Gandhinagar',
      occasion: 'Sangeet & Reception',
      quote:
        'The champagne organza and midnight sequin sarees felt bespoke without losing traditional grace. Every weave and zari border was verified right at the Safal Plaza showroom.',
    },
    {
      id: 't3',
      name: 'Hetalbhai & Nidhi Shah',
      city: 'Nikol, Ahmedabad',
      occasion: 'Family Wedding Shopping',
      quote:
        'Having Shops 1 to 6 under one roof made our entire family trousseau effortless—from heirloom Patola sarees for elders to contemporary party drapes.',
    },
  ],
  privacyPolicy: `PATIDAR NX COLLECTION respects your privacy. This website allows visitors to browse our ethnic fashion catalog and initiate direct product inquiries via WhatsApp without mandatory account registration. When you contact us over WhatsApp or phone (+91 9825115185), your inquiry details are used solely to respond with product pricing, availability, and showroom styling assistance. We never sell or rent customer contact information to third parties. Location views integrate Google Maps to help you navigate to Safal Plaza, Shops 1 to 6, Nikol, Ahmedabad.`,
  termsConditions: `All garments, sarees, and couture weaves showcased on PATIDAR NX COLLECTION are subject to showroom availability and handloom batch variations. Product colours may appear slightly warmer or deeper depending on screen calibration and natural silk sheen. Displayed prices—where shown—are indicative showroom prices in Indian Rupees (INR); final customization, fall-pico finishing, or bridal tailoring charges are confirmed on WhatsApp or in person at Safal Plaza, Nikol, Ahmedabad.`,
};

async function ingestStarterAsset(
  filename: string,
  altText: string,
  categoryId: number | null
) {
  const sourcePath = path.resolve(process.cwd(), 'src/assets/images', filename);
  if (!fs.existsSync(sourcePath)) {
    return null;
  }
  const buffer = fs.readFileSync(sourcePath);
  const processed = await processAndStoreImage(buffer, filename);
  const [inserted] = await db
    .insert(mediaAssets)
    .values({
      categoryId,
      originalName: filename,
      altText,
      thumbUrl: processed.thumbUrl,
      mediumUrl: processed.mediumUrl,
      largeUrl: processed.largeUrl,
      width: processed.width,
      height: processed.height,
      sizeBytes: processed.sizeBytes,
    })
    .returning();
  return inserted;
}

async function runSeed(): Promise<void> {
  const existingCategories = await db.select().from(categories).limit(1);
  if (existingCategories.length > 0) {
    return;
  }

  console.log('Seeding PATIDAR NX COLLECTION starter catalog & WebP media...');

  const categorySeeds = [
    {
      name: 'Sarees',
      slug: 'sarees',
      description: 'Timeless woven silk, tissue, and handloom sarees curated for refined occasions.',
      displayOrder: 1,
    },
    {
      name: 'Designer Sarees',
      slug: 'designer-sarees',
      description: 'Hand-embroidered organza, zardozi, and couture silhouettes for modern celebrations.',
      displayOrder: 2,
    },
    {
      name: 'Bridal Collection',
      slug: 'bridal-collection',
      description: 'Regal crimson Banarasis, temple-border Kanjivarams, and heirloom wedding drapes.',
      displayOrder: 3,
    },
    {
      name: 'Party Wear Sarees',
      slug: 'party-wear-sarees',
      description: 'Midnight georgettes, champagne shimmer, and cocktail-ready artisanal drapes.',
      displayOrder: 4,
    },
    {
      name: 'Traditional Sarees',
      slug: 'traditional-sarees',
      description: 'Authentic Patan Patola, Paithani, and regional Indian handloom heritage.',
      displayOrder: 5,
    },
    {
      name: 'Fancy Sarees',
      slug: 'fancy-sarees',
      description: 'Lightweight tissue, pastel zari, and effortless festive occasion wear.',
      displayOrder: 6,
    },
    {
      name: 'Wedding Collection',
      slug: 'wedding-collection',
      description: 'Curated ensembles for pheras, sangeet nights, and family wedding ceremonies.',
      displayOrder: 7,
    },
    {
      name: 'Exclusive Collection',
      slug: 'exclusive-collection',
      description: 'Single-edition master weaver creations reserved for collectors and patrons.',
      displayOrder: 8,
    },
    {
      name: 'New Arrivals',
      slug: 'new-arrivals',
      description: 'Freshly arrived showroom edits straight from our partner weaving ateliers.',
      displayOrder: 9,
    },
    {
      name: 'Other Collections',
      slug: 'other-collections',
      description: 'Festive lehengas, embroidered dupattas, and bespoke unstitched ethnic sets.',
      displayOrder: 10,
    },
  ];

  const insertedCategories = await db
    .insert(categories)
    .values(categorySeeds)
    .returning();

  const catBySlug = Object.fromEntries(
    insertedCategories.map((c) => [c.slug, c])
  );

  const assetHero = await ingestStarterAsset(
    STARTER_FILES.heroBridal,
    'PATIDAR NX COLLECTION wine crimson and champagne gold Zari Banarasi bridal saree',
    catBySlug['bridal-collection'].id
  );
  const assetBanarasi = await ingestStarterAsset(
    STARTER_FILES.banarasiCrimson,
    'Crimson pure Banarasi Katan silk saree with antique gold zari border',
    catBySlug['sarees'].id
  );
  const assetOrganza = await ingestStarterAsset(
    STARTER_FILES.champagneOrganza,
    'Champagne gold hand-embroidered zardozi organza designer saree',
    catBySlug['designer-sarees'].id
  );
  const assetKanjivaram = await ingestStarterAsset(
    STARTER_FILES.ivoryKanjivaram,
    'Ivory and pure gold zari Kanjivaram silk bridal saree',
    catBySlug['wedding-collection'].id
  );
  const assetPatola = await ingestStarterAsset(
    STARTER_FILES.emeraldPatola,
    'Emerald green Gujarati Patan Patola silk saree with traditional double-ikat border',
    catBySlug['traditional-sarees'].id
  );
  const assetMidnight = await ingestStarterAsset(
    STARTER_FILES.midnightSequin,
    'Midnight charcoal black georgette party wear saree with champagne cutdana border',
    catBySlug['party-wear-sarees'].id
  );
  const assetRoseTissue = await ingestStarterAsset(
    STARTER_FILES.roseTissue,
    'Warm beige and dusty rose tissue silk saree with resham floral embroidery',
    catBySlug['fancy-sarees'].id
  );
  const assetPaithani = await ingestStarterAsset(
    STARTER_FILES.royalPaithani,
    'Deep plum maroon royal Paithani silk saree with peacock pallu weaving',
    catBySlug['exclusive-collection'].id
  );
  const assetShowroom = await ingestStarterAsset(
    STARTER_FILES.showroomAtelier,
    'PATIDAR NX COLLECTION luxury saree showroom interior at Safal Plaza, Nikol, Ahmedabad',
    null
  );

  // Update category hero thumbnails
  const categoryHeroMap: Record<string, string | undefined> = {
    sarees: assetBanarasi?.mediumUrl,
    'designer-sarees': assetOrganza?.mediumUrl,
    'bridal-collection': assetHero?.mediumUrl,
    'party-wear-sarees': assetMidnight?.mediumUrl,
    'traditional-sarees': assetPatola?.mediumUrl,
    'fancy-sarees': assetRoseTissue?.mediumUrl,
    'wedding-collection': assetKanjivaram?.mediumUrl,
    'exclusive-collection': assetPaithani?.mediumUrl,
    'new-arrivals': assetOrganza?.mediumUrl,
    'other-collections': assetShowroom?.mediumUrl,
  };

  for (const cat of insertedCategories) {
    const heroImageUrl = categoryHeroMap[cat.slug] || assetBanarasi?.mediumUrl || '';
    if (heroImageUrl) {
      await db
        .update(categories)
        .set({ heroImageUrl })
        .where((await import('drizzle-orm')).eq(categories.id, cat.id));
    }
  }

  const starterProducts = [
    {
      productCode: 'PNX-1001',
      slug: 'royal-crimson-katan-banarasi-bridal-saree-pnx-1001',
      name: 'Royal Crimson Katan Banarasi Saree',
      categorySlug: 'bridal-collection',
      description:
        'Handwoven pure Katan silk Banarasi bridal drape illuminated with kadhua antique gold zari motifs and an heirloom paisley pallu.',
      price: 38500,
      colour: 'Crimson Red',
      fabric: 'Pure Katan Silk',
      workDetails: 'Kadhua Antique Gold Zari Weaving',
      size: 'Free Size (5.5m Saree + 0.9m Unstitched Blouse)',
      availability: 'In Stock',
      isFeatured: true,
      isNewArrival: true,
      isBestSeller: true,
      isTrending: true,
      assets: [assetBanarasi, assetHero],
    },
    {
      productCode: 'PNX-1002',
      slug: 'champagne-zardozi-scallop-organza-saree-pnx-1002',
      name: 'Champagne Zardozi Scallop Organza Saree',
      categorySlug: 'designer-sarees',
      description:
        'Featherlight pure silk organza sculpted with tonal champagne zardozi, French knots, and pearl scallop borders for reception evenings.',
      price: 29500,
      colour: 'Champagne Gold',
      fabric: 'Pure Silk Organza',
      workDetails: 'Hand Zardozi, Pearl & Cutdana Scallop Border',
      size: 'Free Size (5.5m Saree + 0.9m Raw Silk Blouse)',
      availability: 'In Stock',
      isFeatured: true,
      isNewArrival: true,
      isBestSeller: true,
      isTrending: true,
      assets: [assetOrganza, assetRoseTissue],
    },
    {
      productCode: 'PNX-1003',
      slug: 'ivory-temple-zari-kanjivaram-silk-saree-pnx-1003',
      name: 'Ivory Temple Zari Kanjivaram Silk Saree',
      categorySlug: 'wedding-collection',
      description:
        'Luminous bridal ivory mulberry silk woven in Kanchipuram with pure gold-dipped silver zari temple borders and classic mango buttis.',
      price: null, // Demonstrates optional pricing hidden until showroom quotes
      colour: 'Ivory Gold',
      fabric: 'Pure Mulberry Kanjivaram Silk',
      workDetails: 'Traditional Korvai Temple Zari Border',
      size: 'Free Size (5.5m Saree + 0.9m Contrast/Self Blouse)',
      availability: 'In Stock',
      isFeatured: true,
      isNewArrival: false,
      isBestSeller: true,
      isTrending: false,
      assets: [assetKanjivaram, assetOrganza],
    },
    {
      productCode: 'PNX-1004',
      slug: 'emerald-patan-patola-heritage-silk-saree-pnx-1004',
      name: 'Emerald Patan Patola Heritage Silk Saree',
      categorySlug: 'traditional-sarees',
      description:
        'Vibrant jewel emerald Gujarati Patola weave featuring geometric navratna ikat patterns framed by an opulent zari pallu.',
      price: 44000,
      colour: 'Emerald Green',
      fabric: 'Pure Patan Patola Silk',
      workDetails: 'Double-Ikat Geometric Weave & Gold Zari Pallu',
      size: 'Free Size (5.5m Saree + 0.85m Blouse)',
      availability: 'In Stock',
      isFeatured: true,
      isNewArrival: true,
      isBestSeller: false,
      isTrending: true,
      assets: [assetPatola, assetPaithani],
    },
    {
      productCode: 'PNX-1005',
      slug: 'midnight-noir-cutdana-georgette-saree-pnx-1005',
      name: 'Midnight Noir Cutdana Georgette Saree',
      categorySlug: 'party-wear-sarees',
      description:
        'Fluid obsidian black pure viscose georgette accented by shimmering champagne cutdana embroidery and a sculpted statement blouse.',
      price: 22800,
      colour: 'Obsidian Black',
      fabric: 'Pure Viscose Georgette',
      workDetails: 'Hand Cutdana & Champagne Sequin Scallop Work',
      size: 'Free Size (5.5m Saree + 1.0m Embroidered Blouse)',
      availability: 'In Stock',
      isFeatured: false,
      isNewArrival: true,
      isBestSeller: true,
      isTrending: true,
      assets: [assetMidnight, assetOrganza],
    },
    {
      productCode: 'PNX-1006',
      slug: 'warm-beige-rose-tissue-silk-saree-pnx-1006',
      name: 'Warm Beige Rose Tissue Silk Saree',
      categorySlug: 'fancy-sarees',
      description:
        'Soft metallic rose-beige tissue silk delicately finished with tonal resham botanicals and antique zari floral borders.',
      price: 19400,
      colour: 'Warm Beige',
      fabric: 'Pure Crushed Tissue Silk',
      workDetails: 'Resham Floral Threadwork & Antique Zari',
      size: 'Free Size (5.5m Saree + 0.85m Tissue Blouse)',
      availability: 'In Stock',
      isFeatured: false,
      isNewArrival: true,
      isBestSeller: false,
      isTrending: true,
      assets: [assetRoseTissue, assetOrganza],
    },
    {
      productCode: 'PNX-1007',
      slug: 'royal-plum-peacock-paithani-saree-pnx-1007',
      name: 'Royal Plum Peacock Paithani Saree',
      categorySlug: 'exclusive-collection',
      description:
        'Collector-grade Yeola Paithani in deep plum wine featuring hand-tapped lotus vine borders and an intricate muniya peacock pallu.',
      price: null,
      colour: 'Plum Maroon',
      fabric: 'Handloom Mulberry Paithani Silk',
      workDetails: 'Handwoven Tapestry Peacock & Lotus Zari Pallu',
      size: 'Free Size (5.5m Saree + 0.9m Bordered Blouse)',
      availability: 'Made to Order',
      isFeatured: true,
      isNewArrival: false,
      isBestSeller: true,
      isTrending: false,
      assets: [assetPaithani, assetHero],
    },
    {
      productCode: 'PNX-1008',
      slug: 'maharani-wine-zari-banarasi-couture-pnx-1008',
      name: 'Maharani Wine Zari Banarasi Couture',
      categorySlug: 'sarees',
      description:
        'Signature PATIDAR NX deep wine Banarasi ensemble woven with dense floral jaal across the body and bridal-weight brocade borders.',
      price: 46500,
      colour: 'Wine Crimson',
      fabric: 'Pure Katan Silk',
      workDetails: 'All-Over Shikargah & Floral Zari Jaal',
      size: 'Free Size (5.5m Saree + 0.9m Brocade Blouse)',
      availability: 'In Stock',
      isFeatured: true,
      isNewArrival: false,
      isBestSeller: true,
      isTrending: true,
      assets: [assetHero, assetBanarasi],
    },
    {
      productCode: 'PNX-1009',
      slug: 'champagne-gold-trousseau-kanjivaram-pnx-1009',
      name: 'Champagne Gold Trousseau Kanjivaram',
      categorySlug: 'bridal-collection',
      description:
        'Subtle ivory-champagne weave crafted for daytime pheras and engagements, paired with a rich geometric tissue gold border.',
      price: 34900,
      colour: 'Ivory Gold',
      fabric: 'Pure Kanjivaram Silk',
      workDetails: 'Fine Tissue Zari & Rudraksha Border',
      size: 'Free Size (5.5m Saree + 0.9m Blouse)',
      availability: 'In Stock',
      isFeatured: false,
      isNewArrival: true,
      isBestSeller: false,
      isTrending: false,
      assets: [assetKanjivaram, assetRoseTissue],
    },
    {
      productCode: 'PNX-1010',
      slug: 'gulabi-tissue-festive-handwork-saree-pnx-1010',
      name: 'Gulabi Tissue Festive Handwork Saree',
      categorySlug: 'new-arrivals',
      description:
        'Lightweight metallic beige-rose drape designed for effortless grace at haldi, mehendi, and intimate family festivities.',
      price: 16800,
      colour: 'Warm Beige',
      fabric: 'Tissue Organza Silk',
      workDetails: 'Dabka & French Knot Floral Border',
      size: 'Free Size (5.5m Saree + 0.85m Blouse)',
      availability: 'In Stock',
      isFeatured: false,
      isNewArrival: true,
      isBestSeller: false,
      isTrending: true,
      assets: [assetRoseTissue, assetChampagneFallback(assetOrganza)],
    },
    {
      productCode: 'PNX-1011',
      slug: 'emerald-bridal-border-katan-saree-pnx-1011',
      name: 'Emerald Bridal Border Katan Saree',
      categorySlug: 'wedding-collection',
      description:
        'Regal forest emerald silk adorned with heritage Gujarati-inspired border weaving and crisp gold zari detailing.',
      price: 31200,
      colour: 'Emerald Green',
      fabric: 'Pure Handloom Silk',
      workDetails: 'Traditional Zari Border & Woven Butti',
      size: 'Free Size (5.5m Saree + 0.9m Blouse)',
      availability: 'In Stock',
      isFeatured: false,
      isNewArrival: false,
      isBestSeller: true,
      isTrending: false,
      assets: [assetPatola, assetBanarasi],
    },
    {
      productCode: 'PNX-1012',
      slug: 'obsidian-evening-drape-designer-saree-pnx-1012',
      name: 'Obsidian Evening Drape Designer Saree',
      categorySlug: 'other-collections',
      description:
        'Pre-pleated ready-to-drape couture evening saree in deep charcoal black with hand-sewn champagne metallic beadwork.',
      price: 25400,
      colour: 'Obsidian Black',
      fabric: 'Imported Crêpe Georgette',
      workDetails: 'Hand Beaded Zari & Sequin Hemline',
      size: 'Custom Fit / Free Size (Pre-Draped Option)',
      availability: 'Made to Order',
      isFeatured: false,
      isNewArrival: true,
      isBestSeller: false,
      isTrending: true,
      assets: [assetMidnight, assetPaithani],
    },
  ];

  for (const item of starterProducts) {
    const category = catBySlug[item.categorySlug];
    if (!category) continue;

    const [createdProduct] = await db
      .insert(products)
      .values({
        productCode: item.productCode,
        slug: item.slug,
        name: item.name,
        categoryId: category.id,
        description: item.description,
        price: item.price,
        colour: item.colour,
        fabric: item.fabric,
        workDetails: item.workDetails,
        size: item.size,
        availability: item.availability,
        isFeatured: item.isFeatured,
        isNewArrival: item.isNewArrival,
        isBestSeller: item.isBestSeller,
        isTrending: item.isTrending,
      })
      .returning();

    const validAssets = item.assets.filter(Boolean);
    for (let idx = 0; idx < validAssets.length; idx++) {
      const asset = validAssets[idx]!;
      await db.insert(productImages).values({
        productId: createdProduct.id,
        mediaAssetId: asset.id,
        sortOrder: idx,
        isPrimary: idx === 0,
      });
    }
  }

  const initialHomepage: HomepageSettings = {
    ...DEFAULT_HOMEPAGE_SETTINGS,
    heroBannerUrl: assetHero?.largeUrl || '',
    secondaryBannerUrl: assetKanjivaram?.largeUrl || '',
    aboutImageUrl: assetShowroom?.largeUrl || '',
  };

  await db
    .insert(siteSettings)
    .values({
      key: 'homepage',
      value: initialHomepage,
    })
    .onConflictDoNothing();

  console.log('PATIDAR NX COLLECTION starter database seeded.');
}

function assetChampagneFallback<T>(asset: T): T {
  return asset;
}

export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}
