interface BrandMarkProps {
  /** `dark` es la marca en bosque, para fondos claros; `light` es la marca en hueso, para fondos oscuros. */
  tone?: "dark" | "light";
  className?: string;
}

/**
 * El búmeran con su punto mostaza, sin el fondo del ícono de la app. El punto siempre es mostaza y la marca no se
 * deforma ni cambia de color: el tamaño mínimo es de 24 px.
 * @see docs/brand.md
 */
export function BrandMark({ tone = "dark", className }: BrandMarkProps) {
  return (
    <svg
      viewBox="240 210 570 560"
      role="img"
      aria-label="Búmeran"
      className={className}
    >
      <g transform="rotate(-15 512 512)">
        <path
          d="M610 318 Q 410 372 318 512 Q 410 652 610 706"
          fill="none"
          stroke={tone === "dark" ? "#10291F" : "#F1E9D8"}
          strokeWidth="150"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="752" cy="512" r="50" fill="#F2B33D" />
      </g>
    </svg>
  );
}
