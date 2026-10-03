import { useEffect, useRef } from 'react'
import { loadSyncConfig, saveSyncConfig, syncWithGist } from '../lib/sync'
import { useAccess } from '../lib/use-access'
import { useProgress } from '../lib/use-progress'

const SESSION_FLAG = 'azure-learning-hub.gist-synced-this-session'

/**
 * If "sync automatically when the app opens" is on, syncs once per browser
 * session. Silent on success; failures (e.g. offline) are left for the next
 * manual sync, since nothing is lost locally.
 */
export function AutoSync() {
  const { email } = useAccess()
  const { state, replaceState } = useProgress()
  const started = useRef(false)

  useEffect(() => {
    if (started.current || !email) return
    const config = loadSyncConfig(email)
    let already = false
    try {
      already = window.sessionStorage.getItem(SESSION_FLAG) === '1'
    } catch {
      /* no session storage: sync anyway */
    }
    if (!config?.auto || already || !navigator.onLine) return
    started.current = true
    try {
      window.sessionStorage.setItem(SESSION_FLAG, '1')
    } catch {
      /* ignore */
    }
    syncWithGist(state, config)
      .then((result) => {
        replaceState(result.state)
        saveSyncConfig(email, { ...config, gistId: result.gistId, lastSyncAt: Date.now() })
      })
      .catch((error: unknown) => console.warn('Automatic gist sync failed', error))
  }, [email, state, replaceState])

  return null
}
