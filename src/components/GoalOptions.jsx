import { LEVEL_LABEL, LEVELS, periodShort } from '../planUtils'

// <optgroup>-grouped <option>s for a goal-picker <select>, so Year / Quarter /
// Month / Week goals are visually separated instead of one flat stack.
// Optional `prefix` string is prepended to each value (e.g. "g_" for unified selectors).
export default function GoalOptions({ goals, prefix = '' }) {
  return LEVELS.map((level) => {
    const items = goals.filter((g) => g.level === level)
    if (items.length === 0) return null
    return (
      <optgroup key={level} label={`${LEVEL_LABEL[level]} Goals`}>
        {items.map((g) => (
          <option key={g.id} value={`${prefix}${g.id}`}>
            {g.title}
            {level !== 'year' ? ` · ${periodShort(level, g.period)}` : ''}
          </option>
        ))}
      </optgroup>
    )
  })
}
