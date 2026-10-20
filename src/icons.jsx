// One icon system for the whole app (lucide). Habits and templates store a short
// icon *key* in the existing `emoji` field. Older saved data and AI replies may
// still hold a real emoji, so everything goes through toIconKey() to stay compatible.
import {
  Activity,
  Annoyed,
  Apple,
  BedDouble,
  Bike,
  BookOpen,
  Brain,
  Briefcase,
  Brush,
  Camera,
  CigaretteOff,
  CircleCheck,
  Clock,
  Code,
  Coffee,
  Droplet,
  Dumbbell,
  Flame,
  Flower2,
  Footprints,
  Frown,
  GraduationCap,
  Guitar,
  HandHeart,
  Headphones,
  Heart,
  House,
  Languages,
  Laugh,
  Leaf,
  Lightbulb,
  Meh,
  Moon,
  Mountain,
  Music,
  NotebookPen,
  PenLine,
  Pencil,
  PersonStanding,
  Pill,
  PiggyBank,
  Podcast,
  Rocket,
  Salad,
  ShowerHead,
  Smartphone,
  PhoneOff,
  Smile,
  Sparkles,
  Star,
  Sun,
  Sunrise,
  Target,
  TreePine,
  Wallet,
  Wind,
  Zap,
  Award,
  CalendarCheck,
  Crown,
  Medal,
  Sprout,
  Timer,
  Trophy,
} from 'lucide-react'
import { EMOJI_TO_KEY, ICON_KEYS, toStoredEmoji } from './iconKeys'

export const ICONS = {
  dumbbell: Dumbbell,
  run: Footprints,
  walk: PersonStanding,
  stretch: Activity,
  bike: Bike,
  mountain: Mountain,
  book: BookOpen,
  study: GraduationCap,
  pen: PenLine,
  pencil: Pencil,
  journal: NotebookPen,
  brain: Brain,
  bulb: Lightbulb,
  language: Languages,
  code: Code,
  work: Briefcase,
  target: Target,
  rocket: Rocket,
  star: Star,
  zap: Zap,
  flame: Flame,
  sparkles: Sparkles,
  check: CircleCheck,
  clock: Clock,
  water: Droplet,
  salad: Salad,
  apple: Apple,
  coffee: Coffee,
  pill: Pill,
  heart: Heart,
  meditate: Flower2,
  gratitude: HandHeart,
  wind: Wind,
  leaf: Leaf,
  tree: TreePine,
  sunrise: Sunrise,
  sun: Sun,
  moon: Moon,
  bed: BedDouble,
  shower: ShowerHead,
  clean: Brush,
  home: House,
  money: Wallet,
  savings: PiggyBank,
  music: Music,
  guitar: Guitar,
  headphones: Headphones,
  podcast: Podcast,
  camera: Camera,
  phone: Smartphone,
  nophone: PhoneOff,
  nosmoke: CigaretteOff,
  smile: Smile,
  // badges
  sprout: Sprout,
  award: Award,
  medal: Medal,
  crown: Crown,
  trophy: Trophy,
  calendar: CalendarCheck,
  timer: Timer,
}

export { ICON_KEYS, toStoredEmoji }

export function toIconKey(value, fallback = 'sparkles') {
  if (!value) return fallback
  if (ICONS[value]) return value
  const bare = String(value).replace(/️/g, '').trim()
  return EMOJI_TO_KEY[bare] || fallback
}

// <HabitIcon value={habit.emoji} className="h-5 w-5" />
export function HabitIcon({ value, className = 'h-5 w-5', strokeWidth = 1.75 }) {
  const Icon = ICONS[toIconKey(value)] || Sparkles
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden="true" />
}

const MOODS = { 1: Frown, 2: Annoyed, 3: Meh, 4: Smile, 5: Laugh }
export const MOOD_LABELS = { 1: 'Rough', 2: 'Low', 3: 'Okay', 4: 'Good', 5: 'Great' }

export function MoodIcon({ level, className = 'h-6 w-6', strokeWidth = 1.75 }) {
  const Icon = MOODS[level]
  return Icon ? <Icon className={className} strokeWidth={strokeWidth} aria-hidden="true" /> : null
}
