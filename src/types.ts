import type { JSONContent } from '@tiptap/react'

export interface Note {
  id: string
  title: string
  content: JSONContent | null // TipTap document JSON for the body
  x: number // world coords (ignored while grouped — layout is derived)
  y: number
  width: number
  height: number | null // null = auto-grow with content; number = fixed (body scrolls)
  color: string // accent color of the card
  groupId: string | null
}

export interface Group {
  id: string
  label: string
  x: number
  y: number
  noteIds: string[] // ordered members (stacked vertically)
  color: string
}

export interface Camera {
  x: number
  y: number
  zoom: number
}

export type FocusTarget =
  | { kind: 'note'; id: string }
  | { kind: 'group'; id: string }
  | null
