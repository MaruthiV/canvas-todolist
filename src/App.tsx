import { useEffect } from 'react'
import { Canvas } from './canvas/Canvas'
import { Toolbar } from './canvas/Toolbar'
import { FocusOverlay } from './canvas/FocusOverlay'
import { ContextMenu } from './canvas/ContextMenu'
import { AccountBar } from './canvas/AccountBar'
import { initSync } from './lib/sync'
import { useStore } from './store'

export default function App() {
  const groupSelection = useStore((s) => s.groupSelection)
  const selection = useStore((s) => s.selection)
  const deleteNote = useStore((s) => s.deleteNote)
  const focus = useStore((s) => s.focus)

  useEffect(() => {
    initSync()
  }, [])

  useEffect(() => {
    // Zoom the canvas (around screen center) instead of zooming the whole page.
    const zoomAround = (factor: number) => {
      const { camera, setCamera } = useStore.getState()
      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      const zoom = Math.max(0.2, Math.min(2.5, camera.zoom * factor))
      const wx = (cx - camera.x) / camera.zoom
      const wy = (cy - camera.y) / camera.zoom
      setCamera({ zoom, x: cx - wx * zoom, y: cy - wy * zoom })
    }

    const onKey = (e: KeyboardEvent) => {
      // Hijack the browser's ⌘/Ctrl +/−/0 page-zoom for canvas zoom.
      if (e.metaKey || e.ctrlKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault()
          zoomAround(1.2)
          return
        }
        if (e.key === '-' || e.key === '_') {
          e.preventDefault()
          zoomAround(1 / 1.2)
          return
        }
        if (e.key === '0') {
          e.preventDefault()
          zoomAround(1 / useStore.getState().camera.zoom) // reset to 100%
          return
        }
      }

      const typing =
        e.target instanceof HTMLElement &&
        (e.target.isContentEditable ||
          e.target.tagName === 'INPUT' ||
          e.target.tagName === 'TEXTAREA')

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        groupSelection()
        return
      }
      if ((e.key === 'Backspace' || e.key === 'Delete') && !typing && !focus) {
        if (selection.length) {
          e.preventDefault()
          selection.forEach((id) => deleteNote(id))
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [groupSelection, selection, deleteNote, focus])

  return (
    <div className="app">
      <div className="brand">
        <span className="brand-dot" /> canvas
        <span className="brand-hint">double-click to add · drag to pan · ⌘+/− to zoom · shift-drag to select · ⌘G to group</span>
      </div>
      <AccountBar />
      <Canvas />
      <Toolbar />
      <FocusOverlay />
      <ContextMenu />
    </div>
  )
}
