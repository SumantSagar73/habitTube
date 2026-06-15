// Styled wrapper around a native <select>: appearance-none + custom chevron so
// it matches the app in both themes (native selects look broken, esp. on dark).
export default function Select({ value, onChange, children, compact = false, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={onChange}
        className={`w-full appearance-none rounded-xl border border-neutral-200 bg-white font-medium text-neutral-900 outline-none transition focus:border-neutral-900 dark:border-neutral-800 dark:bg-[#161616] dark:text-white dark:focus:border-white dark:[color-scheme:dark] ${
          compact ? 'py-1.5 pl-3 pr-8 text-xs font-semibold' : 'py-2.5 pl-4 pr-9'
        }`}
      >
        {children}
      </select>
      <svg
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-neutral-400 ${compact ? 'right-2.5 h-3.5 w-3.5' : 'right-3 h-4 w-4'}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  )
}
