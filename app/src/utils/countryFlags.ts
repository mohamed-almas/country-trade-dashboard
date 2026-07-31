export function flagSrc(flagDataUri?: string | null): string | null {
  return flagDataUri || null;
}

interface CountryFlagProps {
  src?: string | null;
  alt: string;
  size?: number;
}

export function flagImgProps({ src, alt, size = 16 }: CountryFlagProps) {
  return {
    src: src || undefined,
    alt,
    width: size,
    height: Math.round(size * 0.75),
    style: {
      display: 'inline-block',
      objectFit: 'cover' as const,
      borderRadius: 2,
      border: '1px solid var(--border)',
      verticalAlign: 'middle' as const,
    },
    loading: 'lazy' as const,
  };
}
