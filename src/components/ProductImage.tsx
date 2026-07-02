import { useState } from 'react';
import type { Material } from '../data/seed';
import { swatchStyle } from './Swatch';

interface ProductImageProps {
  src?: string;
  alt: string;
  material: Material;
  className?: string;
}

/** Product photo with the gradient Swatch as loading skeleton / missing-image fallback. */
export function ProductImage({ src, alt, material, className = '' }: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const showSwatch = !src || failed;

  return (
    <div className={`pimg ${className}`} style={showSwatch ? swatchStyle(material) : undefined}>
      {!showSwatch && (
        <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
      )}
    </div>
  );
}
