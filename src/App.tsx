import { useEffect } from 'react'
import { Canvas } from './canvas/Canvas'
import { Toolbar } from './canvas/Toolbar'
import { FocusOverlay } from './canvas/FocusOverlay'
import { ContextMenu } from './canvas/ContextMenu'
import { useStore } from './store'

export default function App() {
  const groupSelection = useStore((s) => s.groupSelection)
  const selection = useStore((s) => s.selection)
  const deleteNote = useStore((s) => s.deleteNote)
  const focus = useStore((s) => s.focus)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
        <span className="brand-hint">double-click to add · scroll to pan · ⌘-scroll to zoom · shift-click + ⌘G to group</span>
      </div>
      <Canvas />
      <Toolbar />
      <FocusOverlay />
      <ContextMenu />
    </div>
  )
}
