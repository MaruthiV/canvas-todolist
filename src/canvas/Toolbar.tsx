import { useStore } from '../store'

export function Toolbar() {
  const camera = useStore((s) => s.camera)
  const setCamera = useStore((s) => s.setCamera)
  const addNote = useStore((s) => s.addNote)
  const selection = useStore((s) => s.selection)
  const groupSelection = useStore((s) => s.groupSelection)

  const addAtCenter = () => {
    const cam = camera
    const wx = (window.innerWidth / 2 - cam.x) / cam.zoom
    const wy = (window.innerHeight / 2 - cam.y) / cam.zoom
    addNote(wx, wy)
  }

  const zoomBy = (factor: number) => {
    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    const zoom = Math.max(0.2, Math.min(2.5, camera.zoom * factor))
    const wx = (cx - camera.x) / camera.zoom
    const wy = (cy - camera.y) / camera.zoom
    setCamera({ zoom, x: cx - wx * zoom, y: cy - wy * zoom })
  }

  // Frame every note + group so the whole canvas fits on screen at once.
  const fitToView = () => {
    const els = document.querySelectorAll<HTMLElement>('[data-note-id], [data-group-id]')
    if (els.length === 0) return
    const cam = camera
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    els.forEach((el) => {
      const r = el.getBoundingClientRect()
      // screen → world using the current camera transform
      const x0 = (r.left - cam.x) / cam.zoom
      const y0 = (r.top - cam.y) / cam.zoom
      const x1 = (r.right - cam.x) / cam.zoom
      const y1 = (r.bottom - cam.y) / cam.zoom
      minX = Math.min(minX, x0)
      minY = Math.min(minY, y0)
      maxX = Math.max(maxX, x1)
      maxY = Math.max(maxY, y1)
    })
    const contentW = Math.max(1, maxX - minX)
    const contentH = Math.max(1, maxY - minY)
    // Reserve room for the brand (top) and this toolbar (bottom).
    const mL = 60
    const mR = 60
    const mT = 84
    const mB = 108
    const availW = Math.max(1, window.innerWidth - mL - mR)
    const availH = Math.max(1, window.innerHeight - mT - mB)
    const zoom = Math.max(0.15, Math.min(1.4, Math.min(availW / contentW, availH / contentH)))
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    const screenCX = mL + availW / 2
    const screenCY = mT + availH / 2
    setCamera({ zoom, x: screenCX - cx * zoom, y: screenCY - cy * zoom })
  }

  return (
    <div className="toolbar">
      <button className="tool-primary" onClick={addAtCenter} title="Add note (or double-click canvas)">
        + Note
      </button>

      <button className="tool-btn icon" onClick={fitToView} title="Fit all notes to view">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 9V5a1 1 0 0 1 1-1h4" />
          <path d="M20 9V5a1 1 0 0 0-1-1h-4" />
          <path d="M4 15v4a1 1 0 0 0 1 1h4" />
          <path d="M20 15v4a1 1 0 0 1-1 1h-4" />
        </svg>
      </button>

      {selection.length >= 2 && (
        <button className="tool-btn accent" onClick={groupSelection} title="Group selected (⌘G)">
          ⧉ Group {selection.length}
        </button>
      )}

      <div className="tool-divider" />

      <button className="tool-btn" onClick={() => zoomBy(1 / 1.2)} title="Zoom out">
        −
      </button>
      <button className="tool-btn zoom-label" onClick={() => setCamera({ ...camera, zoom: 1 })} title="Reset zoom">
        {Math.round(camera.zoom * 100)}%
      </button>
      <button className="tool-btn" onClick={() => zoomBy(1.2)} title="Zoom in">
        +
      </button>
    </div>
  )
}
