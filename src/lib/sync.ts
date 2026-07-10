import { supabase } from './supabase'
import { useStore, type SyncStatus } from '../store'

// ---------------------------------------------------------------------------
// Local-first cloud sync.
//
// Durability model:
//   • Every content change is already written to localStorage synchronously by
//     the store (survives tab/browser close and being offline).
//   • This module layers cloud backup on top: it stamps a content timestamp,
//     debounces a push to Supabase, and retries until it succeeds — so nothing
//     is ever lost, it just syncs late if you're offline.
//   • On sign-in it pulls the cloud copy and keeps whichever side is newer
//     (last-write-wins by timestamp). Camera/pan is intentionally NOT synced
//     (it's per-device and would spam writes on every pan).
// ---------------------------------------------------------------------------

const META_KEY = 'canvas-todo-meta' // { updatedAt: number }
const PUSH_DEBOUNCE = 1000
const RETRY_INTERVAL = 4000

let localUpdatedAt = readMeta()
let dirty = false
let pushing = false
let applyingRemote = false
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let started = false

function readMeta(): number {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (raw) return JSON.parse(raw).updatedAt ?? 0
  } catch {
    /* ignore */
  }
  // No meta yet: if there's already local content, treat it as current so it
  // gets pushed; otherwise start from zero.
  const s = useStore.getState()
  return Object.keys(s.notes).length || Object.keys(s.groups).length ? Date.now() : 0
}

function writeMeta(ts: number) {
  localUpdatedAt = ts
  try {
    localStorage.setItem(META_KEY, JSON.stringify({ updatedAt: ts }))
  } catch {
    /* ignore */
  }
}

function status(s: SyncStatus) {
  useStore.getState().setSyncStatus(s)
}

function currentUserId(): string | null {
  return useStore.getState().user?.id ?? null
}

export function initSync() {
  if (started) return
  started = true

  if (!supabase) {
    useStore.getState().setSyncStatus('disabled')
    return
  }

  // React to sign-in / sign-out.
  supabase.auth.getSession().then(({ data }) => handleSession(data.session))
  supabase.auth.onAuthStateChange((_event, session) => handleSession(session))

  // Watch content (notes/groups) changes; ignore selection/camera/etc.
  useStore.subscribe((state, prev) => {
    if (applyingRemote) return
    if (state.notes !== prev.notes || state.groups !== prev.groups) {
      onContentChanged()
    }
  })

  window.addEventListener('online', () => {
    if (dirty) schedulePush(0)
  })
  window.addEventListener('offline', () => {
    if (currentUserId()) status('offline')
  })

  // Safety-net flusher: retry any pending changes.
  setInterval(() => {
    if (dirty && !pushing && navigator.onLine && currentUserId()) pushNow()
  }, RETRY_INTERVAL)
}

async function handleSession(session: any) {
  const store = useStore.getState()
  if (!session?.user) {
    store.setUser(null)
    store.setSyncStatus(supabase ? 'signedOut' : 'disabled')
    return
  }
  store.setUser({ id: session.user.id, email: session.user.email ?? null })
  await pullAndReconcile()
}

async function pullAndReconcile() {
  if (!supabase) return
  const userId = currentUserId()
  if (!userId) return
  status('syncing')
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('data, updated_at')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error

    if (data) {
      const remoteUpdated = new Date(data.updated_at).getTime()
      if (remoteUpdated > localUpdatedAt) {
        // Cloud is newer → adopt it.
        applyingRemote = true
        useStore.getState().applyRemote(data.data ?? {})
        applyingRemote = false
        writeMeta(remoteUpdated)
        dirty = false
        status('saved')
        return
      }
      if (localUpdatedAt > remoteUpdated) dirty = true // local newer → push
      else {
        status('saved')
        return
      }
    } else {
      dirty = true // nothing in cloud yet → seed it with local
    }
  } catch {
    status('error')
    return
  }
  if (dirty) await pushNow()
  else status('saved')
}

function onContentChanged() {
  writeMeta(Date.now())
  if (!supabase || !currentUserId()) return
  dirty = true
  schedulePush(PUSH_DEBOUNCE)
}

function schedulePush(delay: number) {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(pushNow, delay)
}

async function pushNow() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (!supabase || pushing) return
  const userId = currentUserId()
  if (!userId || !dirty) return
  if (!navigator.onLine) {
    status('offline')
    return
  }
  pushing = true
  status('syncing')
  const { notes, groups } = useStore.getState()
  const stamp = localUpdatedAt
  try {
    const { error } = await supabase.from('documents').upsert({
      user_id: userId,
      data: { notes, groups },
      updated_at: new Date(stamp).toISOString(),
    })
    if (error) throw error
    // If nothing changed while we were pushing, we're clean.
    if (localUpdatedAt === stamp) {
      dirty = false
      status('saved')
    } else {
      status('syncing')
      schedulePush(PUSH_DEBOUNCE)
    }
  } catch {
    status('error')
    schedulePush(RETRY_INTERVAL)
  } finally {
    pushing = false
  }
}

export async function signInWithGoogle() {
  if (!supabase) return
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}
