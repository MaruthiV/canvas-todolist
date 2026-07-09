import { useEffect, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import type { JSONContent } from '@tiptap/react'
import { SlashCommand } from './slashCommand'
import { useStore } from '../store'

interface Props {
  noteId: string
  title: string
  content: JSONContent | null
  autoFocus?: boolean
}

export function Editor({ noteId, title, content, autoFocus }: Props) {
  const updateNoteContent = useStore((s) => s.updateNoteContent)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const titleValue = useRef(title)
  titleValue.current = title

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') return 'Heading'
          return "Type '/' for commands…"
        },
      }),
      SlashCommand,
    ],
    content: content ?? '',
    onUpdate: ({ editor }) => {
      updateNoteContent(noteId, editor.getJSON(), titleValue.current)
    },
    editorProps: {
      attributes: { class: 'note-body' },
    },
  })

  useEffect(() => {
    if (autoFocus && titleRef.current) titleRef.current.focus()
  }, [autoFocus])

  // Sync in external edits (e.g. the same note edited in focus mode) without
  // clobbering the copy the user is actively typing into.
  useEffect(() => {
    if (!editor || editor.isFocused) return
    const incoming = JSON.stringify(content ?? { type: 'doc', content: [] })
    const current = JSON.stringify(editor.getJSON())
    if (incoming !== current) editor.commands.setContent(content ?? '', false)
  }, [content, editor])

  // Auto-grow the title textarea.
  useEffect(() => {
    const el = titleRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [title])

  return (
    <div className="editor">
      <textarea
        ref={titleRef}
        className="note-title"
        value={title}
        rows={1}
        placeholder="Untitled"
        spellCheck={false}
        onChange={(e) => {
          const el = e.target
          el.style.height = 'auto'
          el.style.height = el.scrollHeight + 'px'
          updateNoteContent(noteId, editor?.getJSON() ?? content, e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || (e.key === 'ArrowDown' && atEnd(e.currentTarget))) {
            e.preventDefault()
            editor?.chain().focus('start').run()
          }
        }}
      />
      <EditorContent editor={editor} />
    </div>
  )
}

function atEnd(el: HTMLTextAreaElement) {
  return el.selectionStart === el.value.length
}
