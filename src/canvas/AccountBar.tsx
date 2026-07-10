import { useStore } from '../store'
import { isCloudEnabled } from '../lib/supabase'
import { signInWithGoogle, signOut } from '../lib/sync'

const STATUS_TEXT: Record<string, string> = {
  syncing: 'Saving…',
  saved: 'All changes saved',
  offline: 'Offline — will sync',
  error: 'Sync error — retrying',
}

export function AccountBar() {
  const user = useStore((s) => s.user)
  const syncStatus = useStore((s) => s.syncStatus)

  if (!isCloudEnabled) {
    return (
      <div className="account-bar">
        <span className="sync-pill muted" title="Cloud not configured — data is saved locally in this browser">
          Local only
        </span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="account-bar">
        <button className="signin-btn" onClick={() => signInWithGoogle()}>
          <GoogleMark />
          Sign in to sync
        </button>
      </div>
    )
  }

  const dotClass =
    syncStatus === 'saved'
      ? 'ok'
      : syncStatus === 'offline' || syncStatus === 'error'
        ? 'warn'
        : 'busy'

  return (
    <div className="account-bar">
      <span className={'sync-pill ' + dotClass} title={user.email ?? ''}>
        <span className="sync-dot" />
        {STATUS_TEXT[syncStatus] ?? 'Synced'}
      </span>
      <button className="signout-btn" title={user.email ?? ''} onClick={() => signOut()}>
        Sign out
      </button>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.4 5.4 2.5 13.2l7.9 6.1C12.2 13.2 17.6 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.6 6.9l7.1 5.5c4.1-3.8 6.5-9.4 6.5-16.9z" />
      <path fill="#FBBC05" d="M10.4 28.3c-.5-1.4-.8-2.9-.8-4.3s.3-3 .8-4.3l-7.9-6.1C.9 16.9 0 20.3 0 24s.9 7.1 2.5 10.4l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.1-5.5c-2 1.4-4.6 2.2-8.1 2.2-6.4 0-11.8-3.7-13.6-8.9l-7.9 6.1C6.4 42.6 14.6 48 24 48z" />
    </svg>
  )
}
