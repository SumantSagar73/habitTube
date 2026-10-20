// Turn text the user pasted (a Udemy curriculum, a playlist's titles, a book's table of
// contents, a README checklist, ...) into parts grouped by section. Pure code, no AI:
// this handles the common shapes, and the UI offers an AI pass only when it gives up.
//
//   parseOutline(raw) -> { parts: [{ title, section, minutes }], sections: [name], lowConfidence, reason }

const MAX_PARTS = 500
const MAX_TITLE = 160

const SECTION_WORD = /^(section|module|chapter|unit|week|day|part|phase|stage|level|book|act|volume)\b/i
const ITEM_PREFIX = /^(lecture|lesson|video|episode|ep\.?|tutorial|session|class)\s*#?\d+\s*[:.\-–—)]\s*/i
const BULLET = /^(?:[-*•·▪◦‣]\s+|\d+(?:\.\d+)*[.):]\s+|\(\d+\)\s+)/
const CHECKBOX = /^\[[ xX]\]\s*/
const NOISE = /^(preview|start|play|resources?|completed?|skip|download|show more|show less|expand all|collapse all|see more|\d+\s*lectures?\b.*|\d+\s*\/\s*\d+\b.*|new|free|quiz\s*\d*\s*questions?)$/i

// "12:34", "1:02:03", "12 min", "1.5 hr" at the end of a line -> minutes
function trailingMinutes(text) {
  let m = text.match(/\s*[([]?\s*(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s*[)\]]?\s*$/)
  if (m) {
    const h = m[1] ? Number(m[1]) : 0
    return { text: text.slice(0, m.index).trim(), minutes: Math.max(1, Math.round(h * 60 + Number(m[2]) + Number(m[3]) / 60)) }
  }
  m = text.match(/\s*[([]?\s*(\d+(?:\.\d+)?)\s*(hrs?|hours?)\s*[)\]]?\s*$/i)
  if (m) return { text: text.slice(0, m.index).trim(), minutes: Math.round(Number(m[1]) * 60) }
  m = text.match(/\s*[([]?\s*(\d+)\s*(mins?|minutes?)\s*[)\]]?\s*$/i)
  if (m) return { text: text.slice(0, m.index).trim(), minutes: Number(m[1]) }
  return { text, minutes: null }
}

function durationOnly(line) {
  const { text, minutes } = trailingMinutes(line)
  return text === '' && minutes != null ? minutes : null
}

const median = (xs) => {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

export function parseOutline(raw) {
  const lines = String(raw || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.replace(/\t/g, ' ').trim())
    .filter(Boolean)

  const parts = []
  const sections = []
  const headers = [] // section-looking lines, kept in case the whole paste is "chapters"
  let section = ''
  let longLines = 0

  for (let line of lines) {
    // links: [text](url) -> text; a bare URL on its own is not a part
    line = line.replace(/\[([^\]]+)\]\((?:https?:\/\/)[^)]*\)/g, '$1')
    if (/^https?:\/\/\S+$/i.test(line)) continue
    if (NOISE.test(line)) continue

    // a duration on its own line belongs to the part above it (Udemy style)
    const alone = durationOnly(line)
    if (alone != null) {
      if (parts.length && parts[parts.length - 1].minutes == null) parts[parts.length - 1].minutes = alone
      continue
    }

    // markdown headings, "Section 2: Basics", "Week 1", "Basics:" -> a section
    let isHeading = false
    const hash = line.match(/^#{1,4}\s+(.*)$/)
    if (hash) {
      line = hash[1].trim()
      isHeading = true
    }
    line = line.replace(/^>\s*/, '')
    const hadBullet = BULLET.test(line) || CHECKBOX.test(line)
    if (!isHeading && !hadBullet && (SECTION_WORD.test(line) || /^[^.!?]{2,80}:$/.test(line))) isHeading = true

    if (isHeading) {
      const { text } = trailingMinutes(line.replace(/\.{3,}\s*\d+\s*$/, '').replace(/:\s*$/, '').trim())
      const title = text.replace(/\s+/g, ' ').slice(0, MAX_TITLE)
      if (!title) continue
      headers.push({ title, at: parts.length })
      section = title
      if (!sections.includes(title)) sections.push(title)
      continue
    }

    // an ordinary item: strip bullets/numbering/checkboxes, "Lecture 3:" prefixes, dot leaders
    let text = line.replace(CHECKBOX, '').replace(BULLET, '').replace(CHECKBOX, '').replace(ITEM_PREFIX, '').replace(/\.{3,}\s*\d+\s*$/, '')
    const dur = trailingMinutes(text.trim())
    text = dur.text.replace(/\s+/g, ' ').replace(/[\s\-–—|•]+$/, '').trim()
    if (!text || NOISE.test(text)) continue
    if (text.length > 140) longLines++
    if (parts.length && parts[parts.length - 1].title === text && parts[parts.length - 1].section === section) continue
    parts.push({ title: text.slice(0, MAX_TITLE), section, minutes: dur.minutes })
    if (parts.length >= MAX_PARTS) break
  }

  // a book's table of contents is all "Chapter N" lines: those are the parts, not sections
  if (parts.length === 0 && headers.length > 0) {
    const flat = headers.slice(0, MAX_PARTS).map((h) => ({ title: h.title, section: '', minutes: null }))
    return { parts: flat, sections: [], lowConfidence: false, reason: '' }
  }

  // sections with nothing under them don't help
  const used = new Set(parts.map((p) => p.section).filter(Boolean))
  const cleanSections = sections.filter((s) => used.has(s))

  let reason = ''
  const totalLines = lines.length
  if (totalLines > 12 && parts.length <= 2) reason = 'Only a couple of items were found in a long paste.'
  else if (parts.length && longLines / parts.length > 0.3) reason = 'Many lines look like paragraphs, not titles.'
  else if (parts.length > 3 && median(parts.map((p) => p.title.length)) > 100) reason = 'The lines are very long for titles.'

  return { parts, sections: cleanSections, lowConfidence: Boolean(reason), reason }
}
