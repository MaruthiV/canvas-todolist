import { useEffect, type ReactNode } from 'react'
import { useStore } from '../store'

export function ContextMenu() {
  const cm = useStore((s) => s.contextMenu)
  const notes = useStore((s) => s.notes)
  const groups = useStore((s) => s.groups)
  const close = useStore((s) => s.closeContextMenu)
  const addNoteToGroup = useStore((s) => s.addNoteToGroup)
  const removeFromGroup = useStore((s) => s.removeFromGroup)
  const addNote = useStore((s) => s.addNote)

  useEffect(() => {
    if (!cm) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cm, close])

  if (!cm) return null

  const MENU_W = 220
  const left = Math.min(cm.x, window.innerWidth - MENU_W - 8)
  const top = Math.min(cm.y, window.innerHeight - 260)

  let body: ReactNode = null

  if (cm.kind === 'canvas') {
    body = (
      <button
        className="ctx-item"
        onClick={() => {
          addNote(cm.worldX, cm.worldY)
          close()
        }}
      >
        <span className="ctx-glyph">+</span>
        <span className="ctx-item-label">Add note here</span>
      </button>
    )
  } else {
    const note = notes[cm.noteId]
    if (!note) return null
    const groupList = Object.values(groups)
    body = (
      <>
        <div className="ctx-label">Add to group</div>
        {groupList.length === 0 && (
          <div className="ctx-empty">No groups yet — select notes and press ⌘G</div>
        )}
        {groupList.map((g) => {
          const current = note.groupId === g.id
          return (
            <button
              key={g.id}
              className="ctx-item"
              disabled={current}
              onClick={() => {
                addNoteToGroup(note.id, g.id)
                close()
              }}
            >
              <span className="ctx-dot" style={{ background: g.color }} />
              <span className="ctx-item-label">{g.label || 'Untitled group'}</span>
              {current && <span className="ctx-check">✓</span>}
            </button>
          )
        })}
        {note.groupId && (
          <>
            <div className="ctx-divider" />
            <button
              className="ctx-item"
              onClick={() => {
                removeFromGroup(note.id)
                close()
              }}
            >
              <span className="ctx-item-label">Remove from group</span>
            </button>
          </>
        )}
      </>
    )
  }

  return (
    <div className="ctx-backdrop" onPointerDown={close} onContextMenu={(e) => e.preventDefault()}>
      <div
        className="ctx-menu"
        style={{ left, top, width: MENU_W }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {body}
      </div>
    </div>
  )
}
