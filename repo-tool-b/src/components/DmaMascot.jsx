import { useState } from 'react';

function SwiftIcon({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 350 320">
      <g transform="translate(0,320) scale(0.1,-0.1)">
        <path d="M265 2951 c11 -6 99 -41 195 -80 360 -143 577 -245 800 -374 248 -144 497 -354 588 -496 76 -117 102 -233 68 -300 -47 -91 -340 -292 -614 -422 -89 -42 -430 -189 -438 -189 -22 0 -104 -46 -104 -58 0 -12 12 -14 68 -10 53 4 87 15 163 52 64 31 133 54 207 70 60 14 136 36 168 49 33 13 97 37 144 52 47 15 115 43 152 61 36 19 113 51 170 73 57 22 148 61 203 86 55 26 143 66 195 89 53 23 134 65 180 93 77 46 175 97 390 204 41 20 109 58 150 83 41 26 91 51 111 56 19 5 60 28 90 49 30 22 77 52 104 67 l50 27 -72 13 c-39 6 -112 26 -162 43 -61 21 -108 31 -149 31 -65 0 -178 -30 -228 -61 -17 -10 -38 -19 -45 -19 -8 0 -31 35 -51 78 -43 90 -131 192 -221 256 -107 76 -446 227 -627 279 -302 87 -527 132 -895 177 -184 23 -627 38 -590 21z" fill="#4C6FFF" />
        <path d="M2870 1559 c-36 -27 -108 -75 -160 -105 -52 -31 -117 -70 -145 -87 -27 -17 -90 -52 -140 -79 -49 -27 -98 -58 -108 -67 -17 -17 -18 -21 -4 -47 8 -16 27 -67 42 -114 24 -72 28 -107 33 -231 4 -130 2 -158 -22 -270 -15 -68 -45 -176 -67 -239 -54 -152 -53 -150 -40 -150 23 0 259 242 345 355 186 243 298 472 341 700 15 76 21 338 9 369 -8 22 -10 21 -84 -35z" fill="#5ED996" />
      </g>
    </svg>
  );
}

export default function DmaMascot({ title, children }) {
  const [open, setOpen] = useState(false);
  const [hovering, setHovering] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {open && (
        <div
          className="rounded-2xl p-5 mb-3 w-80"
          style={{ background: 'linear-gradient(135deg, rgba(76,111,255,0.16), rgba(94,217,150,0.12))', border: '1px solid rgba(76,111,255,0.3)', boxShadow: '0 20px 40px -12px rgba(0,0,0,0.5)' }}
        >
          <div className="flex items-center justify-between mb-2.5">
            <p className="font-semibold text-[13.5px]">{title}</p>
            <button onClick={() => setOpen(false)} className="text-text-secondary hover:text-text-primary shrink-0 ml-2">×</button>
          </div>
          <div className="text-[11.5px] text-text-secondary leading-relaxed">{children}</div>
        </div>
      )}

      {hovering && !open && (
        <div className="rounded-lg px-3 py-1.5 mb-2 text-[11.5px] font-medium bg-surface-2 border border-border-apus shadow-lg whitespace-nowrap">
          {title}
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className="w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-105"
        style={{ background: '#100E15', border: '1px solid #2A2830', boxShadow: '0 10px 24px -6px rgba(0,0,0,0.5)' }}
      >
        <SwiftIcon />
      </button>
    </div>
  );
}
