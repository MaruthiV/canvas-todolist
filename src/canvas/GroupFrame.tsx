import { useRef } from 'react'
import type { Group, Note } from '../types'
import { NoteCard } from './NoteCard'
import { GROUP_GAP, GROUP_HEADER, GROUP_PAD, useStore } from '../store'

interface Props {
  group: Group
  notes: Note[] // members in order
  zoom: number
  selection: string[]
}

export function GroupFrame({ group, notes, zoom, selection }: Props) {
  const moveGroup = useStore((s) => s.moveGroup)
  const setGroupLabel = useStore((s) => s.setGroupLabel)
  const ungroup = useStore((s) => s.ungroup)
  const setFocus = useStore((s) => s.setFocus)
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null)

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { sx: e.clientX, sy: e.clientY, ox: group.x, oy: group.y }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    const dx = (e.clientX - drag.current.sx) / zoom
    const dy = (e.clientY - drag.current.sy) / zoom
    moveGroup(group.id, drag.current.ox + dx, drag.current.oy + dy)
  }
  const onPointerUp = () => {
    drag.current = null
  }

  const width = notes.reduce((m, n) => Math.max(m, n.width), 240) + GROUP_PAD * 2

  return (
    <div
      className="group-frame"
      style={{
        position: 'absolute',
        left: group.x,
        top: group.y,
        width,
        padding: GROUP_PAD,
        paddingTop: GROUP_HEADER,
        borderColor: group.color === '#ffffff' ? '#d7d7d2' : group.color,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="group-header"
        style={{ height: GROUP_HEADER }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <input
          className="group-label"
          value={group.label}
          spellCheck={false}
          onChange={(e) => setGroupLabel(group.id, e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder="Group"
        />
        <div className="group-actions" onPointerDown={(e) => e.stopPropagation()}>
          <button className="icon-btn" title="Focus group" onClick={() => setFocus({ kind: 'group', id: group.id })}>
            ⤢
          </button>
          <button className="icon-btn" title="Ungroup" onClick={() => ungroup(group.id)}>
            ⤴
          </button>
        </div>
      </div>
      <div className="group-stack" style={{ gap: GROUP_GAP }}>
        {notes.map((n) => (
          <NoteCard
            key={n.id}
            note={n}
            positioned={false}
            zoom={zoom}
            selected={selection.includes(n.id)}
          />
        ))}
      </div>
    </div>
  )
}
