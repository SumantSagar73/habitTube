import { BookOpen, CirclePlay, FileText, GitBranch, GraduationCap, Newspaper } from 'lucide-react'

export const TYPE_ICONS = {
  youtube: CirclePlay,
  github: GitBranch,
  udemy: GraduationCap,
  article: Newspaper,
  book: BookOpen,
  docs: FileText,
}

export function TypeIcon({ type, className = 'h-4 w-4' }) {
  const Icon = TYPE_ICONS[type] || FileText
  return <Icon className={className} strokeWidth={1.75} aria-hidden="true" />
}
