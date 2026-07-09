import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type { Camera, FocusTarget, Group, Note } from './types'

const STORAGE_KEY = 'canvas-todo-v1'

export const NOTE_WIDTH = 280
export const MIN_NOTE_W = 200
export const MIN_NOTE_H = 120
export const GROUP_PAD = 16
export const GROUP_HEADER = 40
export const GROUP_GAP = 14

export const PALETTE = [
  '#ffffff', // plain
  '#fff4e0', // amber
  '#e8f5e9', // green
  '#e3f2fd', // blue
  '#f3e5f5', // purple
  '#ffebee', // red
]

interface PersistShape {
  notes: Record<string, Note>
  groups: Record<string, Group>
  camera: Camera
}

function load(): PersistShape | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

interface Store {
  notes: Record<string, Note>
  groups: Record<string, Group>
  camera: Camera
  selection: string[] // selected note ids
  focus: FocusTarget

  // camera
  setCamera: (c: Camera) => void

  // notes
  addNote: (x: number, y: number) => string
  updateNoteContent: (id: string, content: Note['content'], title: string) => void
  moveNote: (id: string, x: number, y: number) => void
  setNoteWidth: (id: string, w: number) => void
  resizeNote: (id: string, rect: { x: number; y: number; width: number; height: number }) => void
  setNoteColor: (id: string, color: string) => void
  deleteNote: (id: string) => void

  // groups
  moveGroup: (id: string, x: number, y: number) => void
  setGroupLabel: (id: string, label: string) => void
  groupSelection: () => void
  ungroup: (id: string) => void
  reorderInGroup: (groupId: string, noteId: string, dir: -1 | 1) => void
  removeFromGroup: (noteId: string) => void

  // selection
  setSelection: (ids: string[]) => void
  toggleSelect: (id: string, additive: boolean) => void
  clearSelection: () => void

  // focus
  setFocus: (f: FocusTarget) => void
}

const initial = load()

export const useStore = create<Store>((set, get) => {
  const persist = () => {
    const { notes, groups, camera } = get()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ notes, groups, camera }))
  }

  return {
    notes: initial?.notes ?? {},
    groups: initial?.groups ?? {},
    camera: initial?.camera ?? { x: 0, y: 0, zoom: 1 },
    selection: [],
    focus: null,

    setCamera: (camera) => {
      set({ camera })
      persist()
    },

    addNote: (x, y) => {
      const id = nanoid(8)
      const note: Note = {
        id,
        title: '',
        content: null,
        x: x - NOTE_WIDTH / 2,
        y: y - 24,
        width: NOTE_WIDTH,
        height: null,
        color: PALETTE[0],
        groupId: null,
      }
      set((s) => ({ notes: { ...s.notes, [id]: note }, selection: [id] }))
      persist()
      return id
    },

    updateNoteContent: (id, content, title) => {
      set((s) => {
        const n = s.notes[id]
        if (!n) return s
        return { notes: { ...s.notes, [id]: { ...n, content, title } } }
      })
      persist()
    },

    moveNote: (id, x, y) => {
      set((s) => {
        const n = s.notes[id]
        if (!n) return s
        return { notes: { ...s.notes, [id]: { ...n, x, y } } }
      })
      persist()
    },

    setNoteWidth: (id, w) => {
      set((s) => {
        const n = s.notes[id]
        if (!n) return s
        return { notes: { ...s.notes, [id]: { ...n, width: Math.max(200, w) } } }
      })
      persist()
    },

    resizeNote: (id, rect) => {
      set((s) => {
        const n = s.notes[id]
        if (!n) return s
        return {
          notes: {
            ...s.notes,
            [id]: {
              ...n,
              x: rect.x,
              y: rect.y,
              width: Math.max(MIN_NOTE_W, rect.width),
              height: Math.max(MIN_NOTE_H, rect.height),
            },
          },
        }
      })
      persist()
    },

    setNoteColor: (id, color) => {
      set((s) => {
        const n = s.notes[id]
        if (!n) return s
        return { notes: { ...s.notes, [id]: { ...n, color } } }
      })
      persist()
    },

    deleteNote: (id) => {
      set((s) => {
        const notes = { ...s.notes }
        const n = notes[id]
        delete notes[id]
        const groups = { ...s.groups }
        if (n?.groupId && groups[n.groupId]) {
          const g = groups[n.groupId]
          const noteIds = g.noteIds.filter((x) => x !== id)
          if (noteIds.length === 0) delete groups[n.groupId]
          else groups[n.groupId] = { ...g, noteIds }
        }
        return { notes, groups, selection: s.selection.filter((x) => x !== id) }
      })
      persist()
    },

    moveGroup: (id, x, y) => {
      set((s) => {
        const g = s.groups[id]
        if (!g) return s
        return { groups: { ...s.groups, [id]: { ...g, x, y } } }
      })
      persist()
    },

    setGroupLabel: (id, label) => {
      set((s) => {
        const g = s.groups[id]
        if (!g) return s
        return { groups: { ...s.groups, [id]: { ...g, label } } }
      })
      persist()
    },

    groupSelection: () => {
      const { selection, notes } = get()
      const members = selection.filter((id) => notes[id] && !notes[id].groupId)
      if (members.length < 2) return
      // Anchor the group at the top-left-most selected note.
      const xs = members.map((id) => notes[id].x)
      const ys = members.map((id) => notes[id].y)
      const gx = Math.min(...xs) - GROUP_PAD
      const gy = Math.min(...ys) - GROUP_PAD - GROUP_HEADER
      // Order members top-to-bottom by their current y.
      const ordered = [...members].sort((a, b) => notes[a].y - notes[b].y)
      const id = nanoid(8)
      const color = notes[ordered[0]].color
      const group: Group = { id, label: 'Group', x: gx, y: gy, noteIds: ordered, color }
      set((s) => {
        const nextNotes = { ...s.notes }
        ordered.forEach((nid) => {
          nextNotes[nid] = { ...nextNotes[nid], groupId: id }
        })
        return { groups: { ...s.groups, [id]: group }, notes: nextNotes, selection: [] }
      })
      persist()
    },

    ungroup: (id) => {
      set((s) => {
        const g = s.groups[id]
        if (!g) return s
        const notes = { ...s.notes }
        // Scatter members back to absolute positions based on their stacked layout.
        let cursorY = g.y + GROUP_HEADER + GROUP_PAD
        g.noteIds.forEach((nid) => {
          const n = notes[nid]
          if (!n) return
          notes[nid] = { ...n, groupId: null, x: g.x + GROUP_PAD, y: cursorY }
          cursorY += estimateNoteHeight(n) + GROUP_GAP
        })
        const groups = { ...s.groups }
        delete groups[id]
        return { notes, groups }
      })
      persist()
    },

    reorderInGroup: (groupId, noteId, dir) => {
      set((s) => {
        const g = s.groups[groupId]
        if (!g) return s
        const idx = g.noteIds.indexOf(noteId)
        const j = idx + dir
        if (idx < 0 || j < 0 || j >= g.noteIds.length) return s
        const noteIds = [...g.noteIds]
        ;[noteIds[idx], noteIds[j]] = [noteIds[j], noteIds[idx]]
        return { groups: { ...s.groups, [groupId]: { ...g, noteIds } } }
      })
      persist()
    },

    removeFromGroup: (noteId) => {
      set((s) => {
        const n = s.notes[noteId]
        if (!n || !n.groupId) return s
        const g = s.groups[n.groupId]
        if (!g) return s
        const notes = {
          ...s.notes,
          [noteId]: { ...n, groupId: null, x: g.x + g.noteIds.length * 20 + 320, y: g.y },
        }
        const noteIds = g.noteIds.filter((x) => x !== noteId)
        const groups = { ...s.groups }
        if (noteIds.length < 1) delete groups[n.groupId]
        else groups[n.groupId] = { ...g, noteIds }
        return { notes, groups }
      })
      persist()
    },

    setSelection: (ids) => set({ selection: ids }),

    toggleSelect: (id, additive) => {
      set((s) => {
        if (!additive) return { selection: [id] }
        return s.selection.includes(id)
          ? { selection: s.selection.filter((x) => x !== id) }
          : { selection: [...s.selection, id] }
      })
    },

    clearSelection: () => set({ selection: [] }),

    setFocus: (focus) => set({ focus }),
  }
})

// Rough height estimate used only for ungroup scatter placement.
export function estimateNoteHeight(_n: Note): number {
  return 180
}
