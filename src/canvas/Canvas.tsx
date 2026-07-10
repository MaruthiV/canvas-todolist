import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { NoteCard } from './NoteCard'
import { GroupFrame } from './GroupFrame'

const MIN_ZOOM = 0.2
const MAX_ZOOM = 2.5

interface Marquee {
  x0: number
  y0: number
  x1: number
  y1: number
}

export function Canvas() {
  const notes = useStore((s) => s.notes)
  const groups = useStore((s) => s.groups)
  const camera = useStore((s) => s.camera)
  const setCamera = useStore((s) => s.setCamera)
  const selection = useStore((s) => s.selection)
  const setSelection = useStore((s) => s.setSelection)
  const clearSelection = useStore((s) => s.clearSelection)
  const addNote = useStore((s) => s.addNote)

  const viewportRef = useRef<HTMLDivElement>(null)
  const camRef = useRef(camera)
  camRef.current = camera

  const [marquee, setMarquee] = useState<Marquee | null>(null)
  const pan = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(
    null,
  )
  const marq = useRef<{ sx: number; sy: number } | null>(null)
  const spaceDown = useRef(false)

  // Wheel: pan by default, zoom with ctrl/cmd (also trackpad pinch → ctrlKey).
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const cam = camRef.current
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect()
        const cx = e.clientX - rect.left
        const cy = e.clientY - rect.top
        const factor = Math.exp(-e.deltaY * 0.0015)
        const zoom = clamp(cam.zoom * factor, MIN_ZOOM, MAX_ZOOM)
        const wx = (cx - cam.x) / cam.zoom
        const wy = (cy - cam.y) / cam.zoom
        setCamera({ zoom, x: cx - wx * zoom, y: cy - wy * zoom })
      } else {
        setCamera({ ...cam, x: cam.x - e.deltaX, y: cam.y - e.deltaY })
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [setCamera])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceDown.current = true
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceDown.current = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    const isBackground = !(e.target as HTMLElement).closest('.note-card, .group-frame')
    if (!isBackground) return
    if (e.button === 2) return // right-click does nothing on the canvas
    const cam = camRef.current

    // Shift + left-drag = marquee region select.
    if (e.button === 0 && e.shiftKey) {
      const rect = viewportRef.current!.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      marq.current = { sx: px, sy: py }
      setMarquee({ x0: px, y0: py, x1: px, y1: py })
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      return
    }

    // Otherwise left-drag (or space/middle-drag) pans the canvas like a map.
    if (e.button === 0 || e.button === 1 || spaceDown.current) {
      pan.current = { sx: e.clientX, sy: e.clientY, ox: cam.x, oy: cam.y, moved: false }
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (pan.current) {
      const ddx = e.clientX - pan.current.sx
      const ddy = e.clientY - pan.current.sy
      if (Math.abs(ddx) > 2 || Math.abs(ddy) > 2) pan.current.moved = true
      setCamera({ ...camRef.current, x: pan.current.ox + ddx, y: pan.current.oy + ddy })
      return
    }
    if (marq.current) {
      const rect = viewportRef.current!.getBoundingClientRect()
      setMarquee({
        x0: marq.current.sx,
        y0: marq.current.sy,
        x1: e.clientX - rect.left,
        y1: e.clientY - rect.top,
      })
    }
  }

  const onPointerUp = () => {
    if (marq.current && marquee) {
      const box = normalize(marquee)
      // Only select if the marquee is a real drag (not a click).
      if (box.w > 4 || box.h > 4) {
        const rect = viewportRef.current!.getBoundingClientRect()
        const hits: string[] = []
        Object.values(notes).forEach((n) => {
          if (n.groupId) return
          const el = document.querySelector<HTMLElement>(`[data-note-id="${n.id}"]`)
          if (!el) return
          const r = el.getBoundingClientRect()
          const nx = r.left - rect.left
          const ny = r.top - rect.top
          if (nx < box.x + box.w && nx + r.width > box.x && ny < box.y + box.h && ny + r.height > box.y) {
            hits.push(n.id)
          }
        })
        // Shift-marquee adds to the current selection.
        setSelection([...new Set([...selection, ...hits])])
      }
    }
    // A plain click (pan that never moved) clears the selection.
    if (pan.current && !pan.current.moved) clearSelection()
    marq.current = null
    pan.current = null
    setMarquee(null)
  }

  const onDoubleClick = (e: React.MouseEvent) => {
    const isBackground = !(e.target as HTMLElement).closest('.note-card, .group-frame')
    if (!isBackground) return
    const cam = camRef.current
    const rect = viewportRef.current!.getBoundingClientRect()
    const wx = (e.clientX - rect.left - cam.x) / cam.zoom
    const wy = (e.clientY - rect.top - cam.y) / cam.zoom
    addNote(wx, wy)
  }

  const ungrouped = Object.values(notes).filter((n) => !n.groupId)

  return (
    <div
      ref={viewportRef}
      className="viewport"
      style={{
        backgroundSize: `${24 * camera.zoom}px ${24 * camera.zoom}px`,
        backgroundPosition: `${camera.x}px ${camera.y}px`,
        cursor: pan.current?.moved ? 'grabbing' : 'grab',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="world"
        style={{
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {Object.values(groups).map((g) => (
          <GroupFrame
            key={g.id}
            group={g}
            notes={g.noteIds.map((id) => notes[id]).filter(Boolean)}
            zoom={camera.zoom}
            selection={selection}
          />
        ))}
        {ungrouped.map((n) => (
          <NoteCard key={n.id} note={n} positioned zoom={camera.zoom} selected={selection.includes(n.id)} />
        ))}
      </div>

      {marquee && (
        <div
          className="marquee"
          style={{
            left: Math.min(marquee.x0, marquee.x1),
            top: Math.min(marquee.y0, marquee.y1),
            width: Math.abs(marquee.x1 - marquee.x0),
            height: Math.abs(marquee.y1 - marquee.y0),
          }}
        />
      )}
    </div>
  )
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}
function normalize(m: Marquee) {
  return {
    x: Math.min(m.x0, m.x1),
    y: Math.min(m.y0, m.y1),
    w: Math.abs(m.x1 - m.x0),
    h: Math.abs(m.y1 - m.y0),
  }
}
