import { expect, test } from '@playwright/test'
import { parseOutline } from '../../src/resourceParse.js'

const titles = (r) => r.parts.map((p) => p.title)

test('Udemy-style curriculum: sections, numbering, durations on their own lines, noise', () => {
  const r = parseOutline(`
Section 1: Introduction
2 / 4 | 6min
1. Welcome to the course
03:21
2. How the course works
02:45
Section 2: Basics
5 lectures • 32min
3. Variables
Preview
10:02
`)
  expect(r.sections).toEqual(['Section 1: Introduction', 'Section 2: Basics'])
  expect(titles(r)).toEqual(['Welcome to the course', 'How the course works', 'Variables'])
  expect(r.parts.map((p) => p.section)).toEqual(['Section 1: Introduction', 'Section 1: Introduction', 'Section 2: Basics'])
  expect(r.parts.map((p) => p.minutes)).toEqual([3, 3, 10])
  expect(r.lowConfidence).toBe(false)
})

test('plain list of video titles becomes parts with no sections', () => {
  const r = parseOutline('React in 100 seconds\nuseState explained\nuseEffect explained\nBuilding a todo app')
  expect(titles(r)).toEqual(['React in 100 seconds', 'useState explained', 'useEffect explained', 'Building a todo app'])
  expect(r.sections).toEqual([])
})

test('a table of contents of chapters makes each chapter a part (page numbers and dot leaders removed)', () => {
  const r = parseOutline(`Chapter 1: The Basics ........ 5
Chapter 2: Going Deeper ...... 21
Chapter 3: Wrap-up ........... 40`)
  expect(titles(r)).toEqual(['Chapter 1: The Basics', 'Chapter 2: Going Deeper', 'Chapter 3: Wrap-up'])
  expect(r.sections).toEqual([])
})

test('README-style markdown: headings are sections, checkboxes and links are cleaned, bare URLs dropped', () => {
  const r = parseOutline(`## Basics
- [ ] Read the docs
- [x] Build a todo app
[Awesome Guide](https://example.com/guide)
https://example.com/only-a-link
## Advanced
* Write a custom hook`)
  expect(r.sections).toEqual(['Basics', 'Advanced'])
  expect(titles(r)).toEqual(['Read the docs', 'Build a todo app', 'Awesome Guide', 'Write a custom hook'])
  expect(r.parts[3].section).toBe('Advanced')
})

test('inline durations are read and trailing separators removed', () => {
  const r = parseOutline('Intro to hooks (12:30)\nDeep dive - 1 hr\nQuick tip 5 min\nLong one 1:02:03')
  expect(titles(r)).toEqual(['Intro to hooks', 'Deep dive', 'Quick tip', 'Long one'])
  expect(r.parts.map((p) => p.minutes)).toEqual([13, 60, 5, 62])
})

test('"Lecture 3:" style prefixes are stripped, consecutive duplicates collapsed', () => {
  const r = parseOutline('Lecture 1: Setup\nLecture 2 - Routing\nLecture 2 - Routing\nVideo 3. State')
  expect(titles(r)).toEqual(['Setup', 'Routing', 'State'])
})

test('sections with nothing under them are dropped', () => {
  const r = parseOutline('Section 1: Empty\nSection 2: Real\nSome lecture')
  expect(r.sections).toEqual(['Section 2: Real'])
  expect(titles(r)).toEqual(['Some lecture'])
})

test('empty or whitespace input gives no parts', () => {
  expect(parseOutline('').parts).toEqual([])
  expect(parseOutline('   \n \n').parts).toEqual([])
  expect(parseOutline(undefined).parts).toEqual([])
})

test('a paragraph paste is flagged as low confidence so the UI can offer AI', () => {
  const para = 'This long paragraph describes the course in a lot of detail and goes on well past what any title would. '.repeat(3)
  const r = parseOutline(`${para}\n${para}\n${para}\n${para}`)
  expect(r.lowConfidence).toBe(true)
  expect(r.reason).not.toBe('')
})

test('a long paste that yields almost nothing is low confidence', () => {
  const r = parseOutline(Array.from({ length: 20 }, () => 'Resources').join('\n') + '\nOne real line')
  expect(r.parts.length).toBeLessThanOrEqual(2)
  expect(r.lowConfidence).toBe(true)
})

test('parts are capped so a huge paste cannot freeze the app', () => {
  const r = parseOutline(Array.from({ length: 900 }, (_, i) => `Lesson title ${i}`).join('\n'))
  expect(r.parts).toHaveLength(500)
})
