import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

export interface SlashItem {
  title: string
  subtitle: string
  icon: string
  command: (opts: { editor: any; range: any }) => void
}

interface Props {
  items: SlashItem[]
  command: (item: SlashItem) => void
}

export interface SlashMenuHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

export const SlashMenu = forwardRef<SlashMenuHandle, Props>(function SlashMenu(
  { items, command },
  ref,
) {
  const [selected, setSelected] = useState(0)

  useEffect(() => setSelected(0), [items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        setSelected((s) => (s + items.length - 1) % items.length)
        return true
      }
      if (event.key === 'ArrowDown') {
        setSelected((s) => (s + 1) % items.length)
        return true
      }
      if (event.key === 'Enter') {
        if (items[selected]) command(items[selected])
        return true
      }
      return false
    },
  }))

  if (items.length === 0) return null

  return (
    <div className="slash-menu">
      {items.map((item, i) => (
        <button
          key={item.title}
          className={'slash-item' + (i === selected ? ' is-selected' : '')}
          onMouseEnter={() => setSelected(i)}
          onMouseDown={(e) => {
            e.preventDefault()
            command(item)
          }}
        >
          <span className="slash-icon">{item.icon}</span>
          <span className="slash-text">
            <span className="slash-title">{item.title}</span>
            <span className="slash-sub">{item.subtitle}</span>
          </span>
        </button>
      ))}
    </div>
  )
})
