import React from "react";

export interface BrandLogoProps {
  className?: string;
}

export const NobuLogo: React.FC<BrandLogoProps> = ({ className = "h-7" }) => (
  <div className={`inline-flex items-center gap-2.5 ${className}`}>
    <svg viewBox="0 0 24 24" className="h-6 w-6 flex-shrink-0 fill-current" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M7 12 Q12 6 17 12 Q12 18 7 12 Z" fill="currentColor" />
    </svg>
    <span className="font-serif font-black text-base tracking-[0.25em] uppercase">NOBU</span>
  </div>
);

export const SweetgreenLogo: React.FC<BrandLogoProps> = ({ className = "h-7" }) => (
  <div className={`inline-flex items-center gap-2 ${className}`}>
    <svg viewBox="0 0 24 24" className="h-6 w-6 flex-shrink-0 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2 C6.5 2 2 6.5 2 12 C2 17.5 6.5 22 12 22 C12 22 18 17 18 10 C18 5 14 2 12 2 Z" />
      <path d="M12 22 C12 14 8 10 4 9" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
    <span className="font-sans font-extrabold text-sm tracking-tight lowercase">sweetgreen</span>
  </div>
);

export const MomofukuLogo: React.FC<BrandLogoProps> = ({ className = "h-7" }) => (
  <div className={`inline-flex items-center gap-2 ${className}`}>
    <svg viewBox="0 0 24 24" className="h-6 w-6 flex-shrink-0 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3 C10.5 3 9.5 4 9.5 5 C9.5 7 12 8 12 8 C12 8 14.5 7 14.5 5 C14.5 4 13.5 3 12 3 Z" />
      <path d="M6 14 C6 9 10 7 12 9 C14 7 18 9 18 14 C18 19 14 21 12 21 C10 21 6 19 6 14 Z" />
    </svg>
    <span className="font-sans font-bold text-sm tracking-[0.18em] lowercase">momofuku</span>
  </div>
);

export const ShakeShackLogo: React.FC<BrandLogoProps> = ({ className = "h-7" }) => (
  <div className={`inline-flex items-center gap-2 ${className}`}>
    <svg viewBox="0 0 24 24" className="h-6 w-6 flex-shrink-0 stroke-current fill-none stroke-[1.8]" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 10 C4 6 7 4 12 4 C17 4 20 6 20 10 Z" />
      <line x1="3" y1="13" x2="21" y2="13" />
      <path d="M4 16 Q8 14 12 16 Q16 18 20 16" />
      <path d="M4 18 C4 20 7 21 12 21 C17 21 20 20 20 18 Z" />
    </svg>
    <span className="font-sans font-black text-xs tracking-wider uppercase">SHAKE SHACK</span>
  </div>
);

export const OsteriaFrancescanaLogo: React.FC<BrandLogoProps> = ({ className = "h-7" }) => (
  <div className={`inline-flex items-center gap-2.5 ${className}`}>
    <svg viewBox="0 0 24 24" className="h-6 w-6 flex-shrink-0 stroke-current fill-none stroke-[1.5]" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7 L14 11 L18 12 L14 14 L12 18 L10 14 L6 12 L10 11 Z" fill="currentColor" />
    </svg>
    <span className="font-serif font-bold text-xs tracking-[0.15em] uppercase">OSTERIA FRANCESCANA</span>
  </div>
);

export const DisfrutarLogo: React.FC<BrandLogoProps> = ({ className = "h-7" }) => (
  <div className={`inline-flex items-center gap-2 ${className}`}>
    <svg viewBox="0 0 24 24" className="h-6 w-6 flex-shrink-0 fill-current" xmlns="http://www.w3.org/2000/svg">
      <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
    </svg>
    <span className="font-sans font-black text-sm tracking-[0.2em] uppercase">DISFRUTAR</span>
  </div>
);

export const TheFrenchLaundryLogo: React.FC<BrandLogoProps> = ({ className = "h-7" }) => (
  <div className={`inline-flex items-center gap-2 ${className}`}>
    <svg viewBox="0 0 24 24" className="h-6 w-6 flex-shrink-0 stroke-current fill-none stroke-[1.8]" xmlns="http://www.w3.org/2000/svg">
      <rect x="9" y="3" width="6" height="18" rx="2" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <circle cx="12" cy="6" r="1" fill="currentColor" />
    </svg>
    <span className="font-serif font-semibold text-xs tracking-[0.12em] uppercase">THE FRENCH LAUNDRY</span>
  </div>
);

export const ElevenMadisonParkLogo: React.FC<BrandLogoProps> = ({ className = "h-7" }) => (
  <div className={`inline-flex items-center gap-2.5 ${className}`}>
    <svg viewBox="0 0 24 24" className="h-6 w-6 flex-shrink-0 stroke-current fill-none stroke-[1.4]" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="4" fill="currentColor" fillOpacity="0.4" />
      <circle cx="16" cy="8" r="4" fill="currentColor" fillOpacity="0.4" />
      <circle cx="8" cy="16" r="4" fill="currentColor" fillOpacity="0.4" />
      <circle cx="16" cy="16" r="4" fill="currentColor" fillOpacity="0.4" />
    </svg>
    <span className="font-sans font-bold text-xs tracking-[0.16em] uppercase">ELEVEN MADISON PARK</span>
  </div>
);
