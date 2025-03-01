'use client';

import { Send } from 'lucide-react';

const Logo = () => {
  // Using HSL - converted from #2CFECC
  // HSL values: hue: 171, saturation: 99%, lightness: 58%
  const logoColor = 'hsl(171, 99%, 58%)';

  return (
    <div className="flex items-center space-x-2">
      <Send className="h-6 w-6 rotate-[20deg]" color={logoColor} />
      <svg
        width="120"
        height="24"
        viewBox="0 0 120 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <text
          x="0"
          y="18"
          className="text-lg font-semibold"
          style={{
            fill: logoColor,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          Transendity
        </text>
      </svg>
    </div>
  );
};

export default Logo;
