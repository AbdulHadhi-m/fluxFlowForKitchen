import React from "react";

export const LeftHeroIllustration: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <svg
      viewBox="0 0 340 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none pointer-events-none ${className}`}
    >
      {/* Hand-Drawn Bakery & Cafe Shopfront with Emerald & Mint Green Tints */}
      <g stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Soft Mint Tint Fills */}
        <path
          d="M20 90 L30 45 C32 38, 40 32, 48 32 L220 32 C228 32, 235 38, 238 45 L250 90 Z"
          fill="#ECFDF5"
          fillOpacity="0.8"
        />
        
        {/* Roof Awning Overhang */}
        <path d="M15 90 L28 42 C30 35, 38 30, 48 30 L220 30 C230 30, 238 35, 240 42 L255 90 Z" />
        
        {/* Scalloped Awning Fringe & Hanging Pennant Banners */}
        <path d="M15 90 C25 102, 35 102, 45 90 C55 102, 65 102, 75 90 C85 102, 95 102, 105 90 C115 102, 125 102, 135 90 C145 102, 155 102, 165 90 C175 102, 185 102, 195 90 C205 102, 215 102, 225 90 C235 102, 245 102, 255 90" />
        
        {/* Hanging Bunting Flags */}
        <path d="M35 105 L45 125 L55 105" fill="#D1FAE5" fillOpacity="0.9" />
        <path d="M75 105 L85 125 L95 105" fill="#A7F3D0" fillOpacity="0.9" />
        <path d="M115 105 L125 125 L135 105" fill="#D1FAE5" fillOpacity="0.9" />
        <path d="M155 105 L165 125 L175 105" fill="#A7F3D0" fillOpacity="0.9" />
        <path d="M195 105 L205 125 L215 105" fill="#D1FAE5" fillOpacity="0.9" />
        <line x1="25" y1="105" x2="235" y2="105" strokeWidth="1" strokeDasharray="4 2" />

        {/* Shop Building Walls & Door */}
        <line x1="25" y1="90" x2="25" y2="270" strokeWidth="1.6" />
        <line x1="245" y1="90" x2="245" y2="270" strokeWidth="1.6" />
        
        {/* Left Shop Door */}
        <rect x="35" y="115" width="45" height="150" rx="3" fill="#F0FDF4" fillOpacity="0.7" />
        <rect x="42" y="125" width="31" height="45" rx="2" strokeDasharray="3 2" />
        <circle cx="72" cy="195" r="3" fill="#059669" />

        {/* Large Display Window with Baked Goods / Bakery Shelves */}
        <rect x="90" y="120" width="135" height="110" rx="4" fill="#FFFFFF" fillOpacity="0.8" />
        <rect x="95" y="125" width="125" height="100" rx="2" strokeWidth="1.2" />
        
        {/* Window Shelves */}
        <line x1="95" y1="160" x2="220" y2="160" strokeWidth="1.4" />
        <line x1="95" y1="195" x2="220" y2="195" strokeWidth="1.4" />

        {/* Top Shelf Pastries / Croissants */}
        <path d="M105 155 C105 145, 118 145, 122 155 Z" fill="#A7F3D0" />
        <path d="M130 155 C130 145, 143 145, 147 155 Z" fill="#A7F3D0" />
        <path d="M155 155 C155 145, 168 145, 172 155 Z" fill="#A7F3D0" />
        <path d="M180 155 C180 145, 193 145, 197 155 Z" fill="#A7F3D0" />
        <path d="M203 155 C203 145, 215 145, 218 155 Z" fill="#A7F3D0" />

        {/* Middle Shelf Bread Loaves & Cakes */}
        <ellipse cx="115" cy="185" rx="10" ry="6" fill="#6EE7B7" />
        <ellipse cx="140" cy="185" rx="10" ry="6" fill="#6EE7B7" />
        <ellipse cx="165" cy="185" rx="10" ry="6" fill="#6EE7B7" />
        <ellipse cx="190" cy="185" rx="10" ry="6" fill="#6EE7B7" />

        {/* Bottom Shelf Jars & Display Boxes */}
        <rect x="105" y="202" width="16" height="18" rx="2" strokeWidth="1.2" />
        <rect x="128" y="202" width="16" height="18" rx="2" strokeWidth="1.2" />
        <rect x="150" y="202" width="22" height="18" rx="2" strokeWidth="1.2" />
        <rect x="180" y="202" width="16" height="18" rx="2" strokeWidth="1.2" />
        <rect x="200" y="202" width="14" height="18" rx="2" strokeWidth="1.2" />

        {/* Right Potted Flower Bush & Planter */}
        <path d="M245 220 L250 255 L280 255 L285 220 Z" fill="#ECFDF5" />
        {/* Bush Foliage */}
        <circle cx="255" cy="205" r="14" fill="#A7F3D0" fillOpacity="0.9" />
        <circle cx="275" cy="200" r="16" fill="#6EE7B7" fillOpacity="0.9" />
        <circle cx="265" cy="185" r="15" fill="#A7F3D0" fillOpacity="0.9" />
        <circle cx="250" cy="190" r="10" fill="#D1FAE5" fillOpacity="0.9" />

        {/* Perspective Cobblestone Ground Hatching */}
        <line x1="10" y1="270" x2="310" y2="270" strokeWidth="1.6" />
        <line x1="30" y1="282" x2="290" y2="282" strokeWidth="1.2" strokeDasharray="8 6" />
        <line x1="60" y1="292" x2="260" y2="292" strokeWidth="0.9" strokeDasharray="6 8" />
      </g>
    </svg>
  );
};

export const RightHeroIllustration: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <svg
      viewBox="0 0 340 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none pointer-events-none ${className}`}
    >
      {/* Hand-Drawn European Cafe Patio Scene with Parasol & Bistro Table in Emerald Green */}
      <g stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Background Bistro Building Facade & Canopy */}
        <path d="M80 30 L290 30 L310 75 L100 75 Z" fill="#ECFDF5" fillOpacity="0.7" />
        <line x1="80" y1="30" x2="80" y2="260" strokeWidth="1.4" />
        <line x1="290" y1="30" x2="290" y2="260" strokeWidth="1.4" />
        
        {/* Canopy Stripes */}
        <line x1="120" y1="30" x2="140" y2="75" strokeWidth="1.2" />
        <line x1="160" y1="30" x2="180" y2="75" strokeWidth="1.2" />
        <line x1="200" y1="30" x2="220" y2="75" strokeWidth="1.2" />
        <line x1="240" y1="30" x2="260" y2="75" strokeWidth="1.2" />
        
        {/* Background Arched French Door */}
        <path d="M120 230 L120 110 C120 85, 200 85, 200 110 L200 230" fill="#FFFFFF" fillOpacity="0.8" />
        <line x1="160" y1="90" x2="160" y2="230" strokeWidth="1.2" />
        <line x1="120" y1="140" x2="200" y2="140" strokeWidth="1.2" />
        <line x1="120" y1="180" x2="200" y2="180" strokeWidth="1.2" />

        {/* Large Parasol Patio Umbrella with Mint/Emerald Fill */}
        <path
          d="M20 145 C20 90, 160 90, 160 145 C145 155, 130 155, 115 145 C100 155, 85 155, 70 145 C55 155, 40 155, 20 145 Z"
          fill="#A7F3D0"
          fillOpacity="0.9"
        />
        {/* Umbrella Ribs */}
        <path d="M90 92 L90 148" strokeWidth="1.3" />
        <path d="M90 92 L45 146" strokeWidth="1.3" />
        <path d="M90 92 L135 146" strokeWidth="1.3" />
        
        {/* Umbrella Pole */}
        <line x1="90" y1="148" x2="90" y2="245" strokeWidth="2.5" />
        <path d="M75 245 L90 245 L105 245" strokeWidth="2" />

        {/* Round Bistro Dining Table */}
        <ellipse cx="90" cy="190" rx="42" ry="12" fill="#D1FAE5" />
        
        {/* Table Leg & Cast Iron Base */}
        <line x1="90" y1="202" x2="90" y2="245" strokeWidth="2" />
        <ellipse cx="90" cy="245" rx="18" ry="4" fill="#6EE7B7" />

        {/* Tabletop Wine Bottle & Glasses */}
        <path d="M85 186 L85 174 L88 174 L88 170 L92 170 L92 174 L95 174 L95 186 Z" strokeWidth="1" fill="#A7F3D0" />
        <path d="M72 184 L76 176 L80 184 Z" strokeWidth="0.9" />
        <line x1="76" y1="184" x2="76" y2="188" strokeWidth="0.9" />

        {/* Left Bistro Chair with Mint Cushions */}
        <path d="M35 185 C35 168, 55 168, 55 185 L55 225 L35 255" strokeWidth="1.3" fill="#ECFDF5" fillOpacity="0.8" />
        <ellipse cx="45" cy="210" rx="12" ry="5" fill="#A7F3D0" />
        <line x1="38" y1="213" x2="33" y2="255" strokeWidth="1.2" />
        <line x1="52" y1="213" x2="57" y2="255" strokeWidth="1.2" />

        {/* Right Bistro Chair with Mint Cushions */}
        <path d="M125 185 C125 168, 145 168, 145 185 L145 225 L125 255" strokeWidth="1.3" fill="#ECFDF5" fillOpacity="0.8" />
        <ellipse cx="135" cy="210" rx="12" ry="5" fill="#A7F3D0" />
        <line x1="128" y1="213" x2="123" y2="255" strokeWidth="1.2" />
        <line x1="142" y1="213" x2="147" y2="255" strokeWidth="1.2" />

        {/* Chalkboard 'MENU Special' Stand */}
        <path d="M210 200 L225 160 L240 200" strokeWidth="1.5" />
        <rect x="215" y="165" width="20" height="30" rx="2" fill="#D1FAE5" strokeWidth="1.2" />
        <line x1="219" y1="172" x2="231" y2="172" strokeWidth="1" />
        <line x1="219" y1="178" x2="228" y2="178" strokeWidth="1" />
        <line x1="219" y1="184" x2="230" y2="184" strokeWidth="1" />

        {/* Perspective Walkway Hatching */}
        <line x1="10" y1="255" x2="310" y2="255" strokeWidth="1.5" />
        <path d="M30 255 L65 285" strokeWidth="1" strokeDasharray="6 4" />
        <path d="M90 255 L130 285" strokeWidth="1" strokeDasharray="6 4" />
        <path d="M160 255 L205 285" strokeWidth="1" strokeDasharray="6 4" />
        <path d="M230 255 L275 285" strokeWidth="1" strokeDasharray="6 4" />
        <line x1="40" y1="270" x2="290" y2="270" strokeWidth="0.8" strokeDasharray="4 6" />
      </g>
    </svg>
  );
};
