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
    xs: {
      iconSize: "h-6 w-6",
      rounded: "rounded-lg",
      textSize: "text-xs",
      subSize: "text-[9px]",
    },
    sm: {
      iconSize: "h-7 w-7",
      rounded: "rounded-xl",
      textSize: "text-xs",
      subSize: "text-[10px]",
    },
    md: {
      iconSize: "h-8 w-8",
      rounded: "rounded-xl",
      textSize: "text-sm",
      subSize: "text-[10px]",
    },
    lg: {
      iconSize: "h-11 w-11",
      rounded: "rounded-2xl",
      textSize: "text-lg",
      subSize: "text-xs",
    },
    xl: {
      iconSize: "h-14 w-14",
      rounded: "rounded-3xl",
      textSize: "text-2xl",
      subSize: "text-sm",
    },
  };

  const { iconSize, rounded, textSize, subSize } = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Curved Culinary Emblem with Gloss Ambient Accent */}
      <div
        className={`${iconSize} ${rounded} bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30 ring-1 ring-white/30 flex-shrink-0 relative overflow-hidden group transition-all duration-300 hover:scale-105 hover:shadow-emerald-500/40`}
      >
        {/* Curved Top-Edge Glass Shine Overlay */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent pointer-events-none rounded-t-[inherit]" />

        {/* Ambient Bottom Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent pointer-events-none" />

        {/* Custom Vector Chef Hat with Smooth Curved Bounding */}
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[64%] h-[64%] text-white drop-shadow-md relative z-10 transition-transform duration-300 group-hover:scale-110"
        >
          {/* Chef Hat Puffs (Three-Tier Smooth Bezier Curve Puffs) */}
          <path
            d="M8 18.5C6.34 18.5 5 17.16 5 15.5C5 14.12 5.93 12.96 7.22 12.61C7.08 12.12 7 11.59 7 11.05C7 8.26 9.24 6 12 6C13.25 6 14.38 6.46 15.26 7.23C16.14 6.46 17.27 6 18.52 6C21.28 6 23.52 8.26 23.52 11.05C23.52 11.59 23.44 12.12 23.3 12.61C24.59 12.96 25.52 14.12 25.52 15.5C25.52 17.16 24.18 18.5 22.52 18.5H8Z"
            fill="currentColor"
            fillOpacity="0.15"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hat Crown Base Band */}
          <path
            d="M8.5 18.5H22C23.1 18.5 24 19.4 24 20.5V23.5C24 24.6 23.1 25.5 22 25.5H8.5C7.4 25.5 6.5 24.6 6.5 23.5V20.5C6.5 19.4 7.4 18.5 8.5 18.5Z"
            fill="currentColor"
            fillOpacity="0.2"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Central Culinary Ember Sparkle Lines */}
          <line
            x1="12"
            y1="20.5"
            x2="12"
            y2="23.5"
            stroke="#FDE047"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="15.25"
            y1="20.5"
            x2="15.25"
            y2="23.5"
            stroke="#FDE047"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="18.5"
            y1="20.5"
            x2="18.5"
            y2="23.5"
            stroke="#FDE047"
            strokeWidth="2"
            strokeLinecap="round"
          />
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
          <span className={`${subSize} font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 leading-none mt-0.5`}>
            Kitchen Suite
          </span>
        </div>
      )}
    </div>
  );
};
