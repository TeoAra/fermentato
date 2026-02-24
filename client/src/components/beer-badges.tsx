interface BadgeProps {
  className?: string;
  size?: number;
}

export function GlutenFreeIcon({ className, size = 20 }: BadgeProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-label="Senza Glutine"
    >
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" />
      <g transform="translate(50,50) scale(0.7)" stroke="currentColor" fill="currentColor">
        <line x1="0" y1="30" x2="0" y2="-25" strokeWidth="3.5" fill="none" />
        <ellipse cx="-6" cy="-8" rx="5" ry="9" transform="rotate(15, -6, -8)" strokeWidth="1.5" fill="none" />
        <ellipse cx="6" cy="-8" rx="5" ry="9" transform="rotate(-15, 6, -8)" strokeWidth="1.5" fill="none" />
        <ellipse cx="-8" cy="5" rx="5" ry="9" transform="rotate(25, -8, 5)" strokeWidth="1.5" fill="none" />
        <ellipse cx="8" cy="5" rx="5" ry="9" transform="rotate(-25, 8, 5)" strokeWidth="1.5" fill="none" />
        <ellipse cx="-5" cy="-20" rx="4" ry="8" transform="rotate(10, -5, -20)" strokeWidth="1.5" fill="none" />
        <ellipse cx="5" cy="-20" rx="4" ry="8" transform="rotate(-10, 5, -20)" strokeWidth="1.5" fill="none" />
      </g>
      <line x1="20" y1="80" x2="80" y2="20" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function GlutenFreeBadge({ className, size }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400 border border-green-300 dark:border-green-700 ${className || ''}`}
      style={{ padding: '2px 8px', fontSize: size ? `${size}px` : undefined }}
      title="Senza Glutine"
    >
      <GlutenFreeIcon size={size || 14} />
      <span className="font-semibold" style={{ fontSize: 'inherit' }}>Senza Glutine</span>
    </span>
  );
}

export function GlutenFreeSmallBadge({ className, size }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400 border border-green-300 dark:border-green-700 ${className || ''}`}
      style={{ padding: '1px 6px', fontSize: size ? `${size}px` : undefined }}
      title="Senza Glutine"
    >
      <GlutenFreeIcon size={size || 12} />
    </span>
  );
}

export function AlcoholFreeBadge({ className, size }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-300 dark:border-blue-700 ${className || ''}`}
      style={{ padding: '1px 7px', fontSize: size ? `${size}px` : '12px' }}
      title="Analcolica"
    >
      0.0%
    </span>
  );
}
