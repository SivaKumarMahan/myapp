/** Inline logo so the shell renders instantly and works offline. */
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg
      className="top-bar__brand-mark"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Azure Learning Hub logo"
    >
      <rect width="64" height="64" rx="14" fill="#12203c" />
      <path
        d="M18 46h28a9 9 0 0 0 1.6-17.86A14 14 0 0 0 20.3 26.4 10 10 0 0 0 18 46z"
        fill="#7dd3fc"
      />
      <path
        d="M24.5 36.5 32 29l7.5 7.5"
        fill="none"
        stroke="#12203c"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
