import { useRef, useState } from 'react'
import type { Note } from '../types'
import { Editor } from '../editor/Editor'
import { MIN_NOTE_H, MIN_NOTE_W, PALETTE, useStore } from '../store'

type Corner = 'nw' | 'ne' | 'sw' | 'se'

// Which group frame (if any) sits under a screen point — used for drag-to-add.
function groupAtPoint(clientX: number, clientY: number): string | null {
  const frames = document.querySelectorAll<HTMLElement>('[data-group-id]')
  for (const el of frames) {
    const r = el.getBoundingClientRect()
    if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
      return el.getAttribute('data-group-id')
    }
  }
  return null
}

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
  const resizeNote = useStore((s) => s.resizeNote)
  const addNoteToGroup = useStore((s) => s.addNoteToGroup)
  const setHoverGroupId = useStore((s) => s.setHoverGroupId)
  const openContextMenu = useStore((s) => s.openContextMenu)

  const [showColors, setShowColors] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(
    null,
  )
  const resize = useRef<
    { corner: Corner; sx: number; sy: number; x: number; y: number; w: number; h: number } | null
  >(null)

  const onResizeDown = (corner: Corner) => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    const h = note.height ?? cardRef.current?.offsetHeight ?? MIN_NOTE_H
    resize.current = { corner, sx: e.clientX, sy: e.clientY, x: note.x, y: note.y, w: note.width, h }
  }

  const onResizeMove = (e: React.PointerEvent) => {
    const r = resize.current
    if (!r) return
    const dx = (e.clientX - r.sx) / zoom
    const dy = (e.clientY - r.sy) / zoom
    let { x, y, w, h } = { x: r.x, y: r.y, w: r.w, h: r.h }
    if (r.corner === 'se' || r.corner === 'ne') w = Math.max(MIN_NOTE_W, r.w + dx)
    if (r.corner === 'sw' || r.corner === 'nw') {
      w = Math.max(MIN_NOTE_W, r.w - dx)
      x = r.x + (r.w - w)
    }
    if (r.corner === 'se' || r.corner === 'sw') h = Math.max(MIN_NOTE_H, r.h + dy)
    if (r.corner === 'ne' || r.corner === 'nw') {
      h = Math.max(MIN_NOTE_H, r.h - dy)
      y = r.y + (r.h - h)
    }
    resizeNote(note.id, { x, y, width: w, height: h })
  }

  const onResizeUp = () => {
    resize.current = null
  }

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
    // Highlight a group the note is being dragged over (drop-to-add).
    setHoverGroupId(drag.current.moved ? groupAtPoint(e.clientX, e.clientY) : null)
  }

  const onHeaderPointerUp = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d || !d.moved) {
      toggleSelect(note.id, e.shiftKey)
      return
    }
    // Dropped onto a group → add it there.
    const gid = groupAtPoint(e.clientX, e.clientY)
    setHoverGroupId(null)
    if (gid) addNoteToGroup(note.id, gid)
  }

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    openContextMenu(e.clientX, e.clientY, note.id)
  }

  return (
    <div
      ref={cardRef}
      data-note-id={note.id}
      className={'note-card' + (selected ? ' is-selected' : '')}
      style={{
        ...(positioned
          ? { position: 'absolute', left: note.x, top: note.y }
          : { position: 'relative' }),
        width: note.width,
        height: positioned && note.height != null ? note.height : undefined,
        background: note.color,
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={onContextMenu}
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
      <div className="note-scroll">
        <Editor noteId={note.id} title={note.title} content={note.content} />
      </div>

      {positioned &&
        (['nw', 'ne', 'sw', 'se'] as Corner[]).map((corner) => (
          <div
            key={corner}
            className={'resize-handle rh-' + corner}
            onPointerDown={onResizeDown(corner)}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeUp}
          />
        ))}
    </div>
  )
}
