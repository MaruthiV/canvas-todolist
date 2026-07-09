import { useRef, useState } from 'react'
import type { Note } from '../types'
import { Editor } from '../editor/Editor'
import { PALETTE, useStore } from '../store'

interface Props {
  note: Note
  positioned: boolean // true = absolute world placement (ungrouped)
  zoom: number
  selected: boolean
}

export function NoteCard({ note, positioned, zoom, selected }: Props) {
  const moveNote = useStore((s) => s.moveNote)
  const toggleSelect = useStore((s) => s.toggleSelect)
  const setFocus = useStore((s) => s.setFocus)
  const deleteNote = useStore((s) => s.deleteNote)
  const setNoteColor = useStore((s) => s.setNoteColor)
  const reorderInGroup = useStore((s) => s.reorderInGroup)
  const removeFromGroup = useStore((s) => s.removeFromGroup)

  const [showColors, setShowColors] = useState(false)
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(
    null,
  )

  const onHeaderPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    if (!positioned) {
      // Grouped notes aren't freely draggable; header click just selects.
      return
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { sx: e.clientX, sy: e.clientY, ox: note.x, oy: note.y, moved: false }
  }

  const onHeaderPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    const dx = (e.clientX - drag.current.sx) / zoom
    const dy = (e.clientY - drag.current.sy) / zoom
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) drag.current.moved = true
    moveNote(note.id, drag.current.ox + dx, drag.current.oy + dy)
  }

  const onHeaderPointerUp = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d || !d.moved) {
      toggleSelect(note.id, e.shiftKey)
    }
  }

  return (
    <div
      data-note-id={note.id}
      className={'note-card' + (selected ? ' is-selected' : '')}
      style={{
        ...(positioned
          ? { position: 'absolute', left: note.x, top: note.y }
          : { position: 'relative' }),
        width: note.width,
        background: note.color,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="note-header"
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
      >
        <span className="grip" aria-hidden>⠿</span>
        <div className="note-actions" onPointerDown={(e) => e.stopPropagation()}>
          {!positioned && (
            <>
              <button className="icon-btn" title="Move up" onClick={() => reorderInGroup(note.groupId!, note.id, -1)}>↑</button>
              <button className="icon-btn" title="Move down" onClick={() => reorderInGroup(note.groupId!, note.id, 1)}>↓</button>
              <button className="icon-btn" title="Pop out of group" onClick={() => removeFromGroup(note.id)}>⇱</button>
            </>
          )}
          <div className="color-wrap">
            <button
              className="icon-btn color-dot"
              title="Color"
              style={{ background: note.color }}
              onClick={() => setShowColors((v) => !v)}
            />
            {showColors && (
              <div className="color-pop" onMouseLeave={() => setShowColors(false)}>
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    className="swatch"
                    style={{ background: c }}
                    onClick={() => {
                      setNoteColor(note.id, c)
                      setShowColors(false)
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          <button
            className="icon-btn"
            title="Focus"
            onClick={() => setFocus({ kind: 'note', id: note.id })}
          >
            ⤢
          </button>
          <button className="icon-btn danger" title="Delete" onClick={() => deleteNote(note.id)}>
            ×
          </button>
        </div>
      </div>
      <Editor noteId={note.id} title={note.title} content={note.content} />
    </div>
  )
}
