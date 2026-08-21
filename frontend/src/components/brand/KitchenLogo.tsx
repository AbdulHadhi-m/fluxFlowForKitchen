import React from "react";

interface KitchenLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

export const KitchenLogo: React.FC<KitchenLogoProps> = ({
  size = "md",
  showText = false,
  className = "",
}) => {
  const sizeMap = {
    xs: { iconSize: "h-6 w-6", rounded: "rounded-lg", iconSvg: "h-3.5 w-3.5", textSize: "text-xs", subSize: "text-[9px]" },
    sm: { iconSize: "h-7 w-7", rounded: "rounded-lg", iconSvg: "h-4 w-4", textSize: "text-xs", subSize: "text-[10px]" },
    md: { iconSize: "h-8 w-8", rounded: "rounded-xl", iconSvg: "h-4.5 w-4.5", textSize: "text-sm", subSize: "text-[10px]" },
    lg: { iconSize: "h-11 w-11", rounded: "rounded-2xl", iconSvg: "h-6 w-6", textSize: "text-lg", subSize: "text-xs" },
    xl: { iconSize: "h-14 w-14", rounded: "2xl", iconSvg: "h-8 w-8", textSize: "text-2xl", subSize: "text-sm" },
  };

  const { iconSize, rounded, textSize, subSize } = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Culinary Cooking Emblem */}
      <div
        className={`${iconSize} ${rounded} bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/25 ring-1 ring-white/20 flex-shrink-0 relative overflow-hidden group`}
      >
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />

        {/* Custom Culinary Chef & Flame Icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-[62%] h-[62%] text-white drop-shadow-sm transition-transform duration-300 group-hover:scale-105"
        >
          {/* Chef Hat Puffs & Contour */}
          <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
          {/* Chef Headband Base Line */}
          <line x1="6" y1="17" x2="18" y2="17" />
          {/* Center Culinary Heat Ember / Steam Accent */}
          <path d="M12 9v4" stroke="#FDE047" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M9.5 10.5v1.5" stroke="#FDE047" strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
          <path d="M14.5 10.5v1.5" stroke="#FDE047" strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
        </svg>
      </div>

      {/* Typography Branding */}
      {showText && (
        <div className="flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-1 leading-tight">
            <span className={`${textSize} font-black tracking-tight text-slate-900 dark:text-white`}>
              Fluxiflow
            </span>
          </div>
          <span
            className={`${subSize} font-bold uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent`}
          >
            Kitchen Suite
          </span>
        </div>
      )}
    </div>
  );
};
