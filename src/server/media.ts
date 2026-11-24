import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';

export const MEDIA_ROOT = path.resolve(process.cwd(), 'media_storage');
const SIZES = {
  thumb: { width: 400, quality: 82 },
  medium: { width: 900, quality: 86 },
  large: { width: 1600, quality: 90 },
} as const;

export function ensureMediaDirectories(): void {
  for (const folder of ['thumb', 'medium', 'large']) {
    const dir = path.join(MEDIA_ROOT, folder);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

export function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'patidar-piece';
}

export interface ProcessedImageResult {
  thumbUrl: string;
  mediumUrl: string;
  largeUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export async function processAndStoreImage(
  buffer: Buffer,
  originalName: string
): Promise<ProcessedImageResult> {
  ensureMediaDirectories();

  const baseName = sanitizeSlug(originalName);
  const uniqueSuffix = `${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
  const filename = `${baseName}-${uniqueSuffix}.webp`;

  const rotatedPipeline = sharp(buffer).rotate();
  const metadata = await rotatedPipeline.metadata();

  const thumbPath = path.join(MEDIA_ROOT, 'thumb', filename);
  const mediumPath = path.join(MEDIA_ROOT, 'medium', filename);
  const largePath = path.join(MEDIA_ROOT, 'large', filename);

  await Promise.all([
    sharp(buffer)
      .rotate()
      .resize({ width: SIZES.thumb.width, withoutEnlargement: true })
      .webp({ quality: SIZES.thumb.quality, effort: 4 })
      .toFile(thumbPath),
    sharp(buffer)
      .rotate()
      .resize({ width: SIZES.medium.width, withoutEnlargement: true })
      .webp({ quality: SIZES.medium.quality, effort: 4 })
      .toFile(mediumPath),
    sharp(buffer)
      .rotate()
      .resize({ width: SIZES.large.width, withoutEnlargement: true })
      .webp({ quality: SIZES.large.quality, effort: 4 })
      .toFile(largePath),
  ]);

  const largeStat = fs.statSync(largePath);

  return {
    thumbUrl: `/media/thumb/${filename}`,
    mediumUrl: `/media/medium/${filename}`,
    largeUrl: `/media/large/${filename}`,
    width: metadata.width || 900,
    height: metadata.height || 1200,
    sizeBytes: largeStat.size,
  };
}

export function deleteStoredMediaFiles(urls: {
  thumbUrl: string;
  mediumUrl: string;
  largeUrl: string;
}): void {
  for (const url of [urls.thumbUrl, urls.mediumUrl, urls.largeUrl]) {
    if (!url || !url.startsWith('/media/')) continue;
    const relative = url.slice('/media/'.length);
    const fullPath = path.resolve(MEDIA_ROOT, relative);
    if (fullPath.startsWith(MEDIA_ROOT) && fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (err) {
        console.warn('Could not delete media file:', fullPath, err);
      }
    }
  }
}
