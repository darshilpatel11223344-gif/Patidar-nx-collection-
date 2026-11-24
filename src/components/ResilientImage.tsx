import { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface ResilientImageProps {
  src?: string;
  thumbUrl?: string;
  mediumUrl?: string;
  largeUrl?: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fallbackLabel?: string;
}

export function ResilientImage({
  src,
  thumbUrl,
  mediumUrl,
  largeUrl,
  alt,
  className = '',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw',
  priority = false,
  fallbackLabel = 'PATIDAR NX COLLECTION',
}: ResilientImageProps) {
  const [hasError, setHasError] = useState(false);

  const primarySrc = mediumUrl || src || largeUrl || thumbUrl || '';
  const srcSetParts: string[] = [];
  if (thumbUrl) srcSetParts.push(`${thumbUrl} 400w`);
  if (mediumUrl) srcSetParts.push(`${mediumUrl} 900w`);
  if (largeUrl) srcSetParts.push(`${largeUrl} 1600w`);

  if (!primarySrc || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#1C1C20] via-[#151518] to-[#0E0E10] text-center p-6 border border-[#2A2927] ${className}`}
        role="img"
        aria-label={alt}
      >
        <Sparkles className="w-5 h-5 text-[#C8A46B]/70 mb-2" aria-hidden="true" />
        <span className="font-display text-sm tracking-widest uppercase text-[#C8A46B]">
          {fallbackLabel}
        </span>
      </div>
    );
  }

  return (
    <img
      src={primarySrc}
      srcSet={srcSetParts.length > 0 ? srcSetParts.join(', ') : undefined}
      sizes={srcSetParts.length > 0 ? sizes : undefined}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
