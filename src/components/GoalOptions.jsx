import { LEVEL_LABEL, LEVELS, periodShort } from '../planUtils'

// <optgroup>-grouped <option>s for a goal-picker <select>, so Year / Quarter /
// Month / Week goals are visually separated instead of one flat stack.
export default function GoalOptions({ goals }) {
  return LEVELS.map((level) => {
    const items = goals.filter((g) => g.level === level)
    if (items.length === 0) return null
    return (
      <optgroup key={level} label={LEVEL_LABEL[level]}>
        {items.map((g) => (
          <option key={g.id} value={g.id}>
            {g.title}
            {level !== 'year' ? ` · ${periodShort(level, g.period)}` : ''}
          </option>
        ))}
      </optgroup>
    )
  })
}
