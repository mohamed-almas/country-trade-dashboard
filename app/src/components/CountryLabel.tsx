import { flagImgProps } from '../utils/countryFlags';

interface CountryLabelProps {
  name: string;
  shortName?: string | null;
  flag?: string | null;
  size?: number;
  className?: string;
}

export function CountryLabel({ name, shortName, flag, size = 16, className = '' }: CountryLabelProps) {
  const label = shortName || name;
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {flag && <img {...flagImgProps({ src: flag, alt: name, size })} />}
      <span>{label}</span>
    </span>
  );
}
