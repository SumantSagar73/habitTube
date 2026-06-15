// Minimal renderer for the small markdown the model returns (bold, bullets,
// paragraphs). Avoids pulling in a markdown dependency.
function inline(text, keyBase) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? (
      <strong key={`${keyBase}-${i}`} className="font-bold text-neutral-900 dark:text-white">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={`${keyBase}-${i}`}>{p}</span>
    )
  )
}

export default function AIText({ text }) {
  const lines = text.split('\n').filter((l) => l.trim())
  return (
    <div className="space-y-1.5 text-sm leading-relaxed font-medium text-neutral-600 dark:text-neutral-300">
      {lines.map((line, i) => {
        const bullet = line.match(/^\s*[-*•]\s+(.*)/)
        if (bullet) {
          return (
            <div key={i} className="flex gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-neutral-400" />
              <p>{inline(bullet[1], i)}</p>
            </div>
          )
        }
        return <p key={i}>{inline(line, i)}</p>
      })}
    </div>
  )
}
