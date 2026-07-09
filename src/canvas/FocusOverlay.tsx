import { useEffect } from 'react'
import { useStore } from '../store'
import { Editor } from '../editor/Editor'
import { NoteCard } from './NoteCard'

export function FocusOverlay() {
  const focus = useStore((s) => s.focus)
  const setFocus = useStore((s) => s.setFocus)
  const notes = useStore((s) => s.notes)
  const groups = useStore((s) => s.groups)
  const selection = useStore((s) => s.selection)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFocus(null)
    }
    if (focus) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focus, setFocus])

  if (!focus) return null

  const close = () => setFocus(null)

  return (
    <div className="focus-backdrop" onPointerDown={close}>
      <div className="focus-panel" onPointerDown={(e) => e.stopPropagation()}>
        <button className="focus-close" title="Exit focus (Esc)" onClick={close}>
          ×
        </button>

        {focus.kind === 'note' && notes[focus.id] && (
          <div className="focus-note" style={{ background: notes[focus.id].color }}>
            <Editor
              key={'focus-' + focus.id}
              noteId={focus.id}
              title={notes[focus.id].title}
              content={notes[focus.id].content}
              autoFocus
            />
          </div>
        )}

        {focus.kind === 'group' && groups[focus.id] && (
          <div className="focus-group">
            <h1 className="focus-group-title">{groups[focus.id].label || 'Group'}</h1>
            <div className="focus-group-stack">
              {groups[focus.id].noteIds
                .map((id) => notes[id])
                .filter(Boolean)
                .map((n) => (
                  <NoteCard
                    key={'focus-' + n.id}
                    note={n}
                    positioned={false}
                    zoom={1}
                    selected={selection.includes(n.id)}
                  />
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
