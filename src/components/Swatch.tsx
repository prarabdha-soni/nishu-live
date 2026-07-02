import type { CSSProperties } from 'react';
import type { Material } from '../data/seed';

const TINTS: Record<Material, string> = {
  silver: '#AEB4BB',
  darksilver: '#6E767E',
  pearl: '#C9BBA6',
  amethyst: '#7B45C2',
  sapphire: '#2A57C2',
  emerald: '#159C66',
  ruby: '#C71E50',
  gold: '#C9A227',
};

export function swatchStyle(material: Material): CSSProperties {
  const tint = TINTS[material];
  return {
    background: `radial-gradient(70% 60% at 26% 22%, rgba(255,255,255,.75), rgba(255,255,255,0) 60%), linear-gradient(140deg, ${tint} 0%, ${tint}cc 55%, ${tint}88 100%)`,
    boxShadow: 'inset 0 -14px 28px rgba(0,0,0,.22), inset 0 6px 18px rgba(255,255,255,.28)',
  };
}

/** Gradient fallback/skeleton for missing product photos. */
export function Swatch({ material, className = '' }: { material: Material; className?: string }) {
  return <div className={`swatch ${className}`} style={swatchStyle(material)} aria-hidden="true" />;
}
