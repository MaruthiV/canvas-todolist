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

  return (
    <div className="toolbar">
      <button className="tool-primary" onClick={addAtCenter} title="Add note (or double-click canvas)">
        + Note
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
