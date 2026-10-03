import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { courseIndexes } from '../content/registry'
import type { ThemePreference } from '../lib/storage'
import { loadSyncConfig, saveSyncConfig, syncWithGist, type SyncConfig } from '../lib/sync'
import { useAccess } from '../lib/use-access'
import { useProgress } from '../lib/use-progress'

const THEMES: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'Match my device' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

function GistSync() {
  const { state, replaceState } = useProgress()
  const { email } = useAccess()
  const owner = email ?? 'local'
  const [config, setConfig] = useState<SyncConfig | null>(() => loadSyncConfig(owner))
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const update = (next: SyncConfig | null) => {
    saveSyncConfig(owner, next)
    setConfig(next)
  }

  const sync = async (current: SyncConfig) => {
    setBusy(true)
    setMessage(null)
    try {
      const result = await syncWithGist(state, current)
      replaceState(result.state)
      update({ ...current, gistId: result.gistId, lastSyncAt: Date.now() })
      setMessage({
        ok: true,
        text: result.created
          ? 'Created your sync gist and uploaded your progress.'
          : `Synced. ${result.incomingNewer} item${result.incomingNewer === 1 ? '' : 's'} came from GitHub (newer there), ${result.localNewer} kept from this device (newer here).`,
      })
    } catch (error) {
      setMessage({
        ok: false,
        text: error instanceof Error ? error.message : 'Sync failed - are you online?',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card stack-sm" aria-labelledby="settings-sync">
      <h2 id="settings-sync" className="card__title">
        Sync with GitHub Gist <Badge>optional</Badge>
      </h2>
      <p style={{ margin: 0 }}>
        Keep your progress in step across devices through a <strong>secret gist</strong> in your
        GitHub account. Each sync downloads it, keeps the <strong>newest copy of every item</strong>{' '}
        (lessons, answers, flashcards, stories, designs…), and uploads the result.
      </p>
      <ul className="role-list subtle">
        <li>
          Create a token at github.com → Settings → Developer settings → Personal access tokens,
          with only the <code>gist</code> scope, and a short expiry.
        </li>
        <li>
          The token is stored only in this browser, for this sign-in. It is never put in your
          progress record or its export.
        </li>
        <li>
          Secret gists are unlisted, not private: anyone who has the gist&rsquo;s URL can read it.
          Don&rsquo;t share the link.
        </li>
        <li>
          Deleting something on one device does not delete it elsewhere - it can come back from the
          gist.
        </li>
      </ul>
      {config ? (
        <>
          <p style={{ margin: 0 }}>
            Token saved{config.gistId ? ' · gist linked' : ''}
            {config.lastSyncAt
              ? ` · last synced ${new Date(config.lastSyncAt).toLocaleString()}`
              : ' · not synced yet'}
            .
          </p>
          <label className="row">
            <input
              type="checkbox"
              checked={config.auto === true}
              onChange={(event) => update({ ...config, auto: event.target.checked })}
            />
            Sync automatically when the app opens
          </label>
          <div className="button-row">
            <button type="button" className="btn" disabled={busy} onClick={() => void sync(config)}>
              {busy ? 'Syncing…' : 'Sync now'}
            </button>
            {config.gistId && (
              <a
                className="btn btn--secondary"
                href={`https://gist.github.com/${config.gistId}`}
                target="_blank"
                rel="noreferrer"
              >
                Open the gist ↗
              </a>
            )}
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                update(null)
                setMessage({
                  ok: true,
                  text: 'Token removed from this browser. The gist itself is untouched.',
                })
              }}
            >
              Forget token
            </button>
          </div>
        </>
      ) : (
        <form
          className="row"
          onSubmit={(event) => {
            event.preventDefault()
            const next = { token: token.trim() }
            if (!next.token) return
            setToken('')
            update(next)
            void sync(next)
          }}
        >
          <label className="field" style={{ flex: '1 1 18rem' }}>
            <span className="field__label">Personal access token (gist scope)</span>
            <input
              className="search-input"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
          </label>
          <button
            type="submit"
            className="btn"
            style={{ alignSelf: 'end' }}
            disabled={!token.trim() || busy}
          >
            Save and sync
          </button>
        </form>
      )}
      {message && (
        <p role="status" className={message.ok ? 'viz-ok' : 'viz-bad'} style={{ margin: 0 }}>
          {message.text}
        </p>
      )}
    </section>
  )
}

/** Every setting in one place: study pace, exam dates, theme, sync and data. */
export function SettingsPage() {
  const { state, setDailyGoal, setNewCardsPerDay, setExamDate, setTheme, resetAll } = useProgress()
  const goal = state.settings.dailyGoal
  const [confirm, setConfirm] = useState('')

  return (
    <div className="page stack">
      <header className="page-header">
        <h1>Settings</h1>
        <p className="page-header__meta">Study pace, exam dates, appearance, sync and your data.</p>
      </header>

      <section className="card stack-sm" aria-labelledby="settings-study">
        <h2 id="settings-study" className="card__title">
          Study pace
        </h2>
        <div className="viz-form">
          <label className="field">
            <span className="field__label">Daily goal is measured in</span>
            <select
              className="select"
              value={goal.kind}
              onChange={(event) =>
                setDailyGoal({
                  kind: event.target.value as 'questions' | 'minutes',
                  target: event.target.value === 'minutes' ? 30 : 20,
                })
              }
            >
              <option value="questions">Questions answered</option>
              <option value="minutes">Minutes studied</option>
            </select>
          </label>
          <label className="field">
            <span className="field__label">Daily goal ({goal.kind})</span>
            <input
              className="search-input"
              type="number"
              min={1}
              max={1000}
              value={goal.target}
              onChange={(event) => {
                const target = Number(event.target.value)
                if (Number.isFinite(target) && target >= 1)
                  setDailyGoal({ ...goal, target: Math.min(1000, Math.round(target)) })
              }}
            />
          </label>
          <label className="field">
            <span className="field__label">New flashcards per day</span>
            <input
              className="search-input"
              type="number"
              min={0}
              max={500}
              value={state.settings.newCardsPerDay}
              onChange={(event) => {
                const count = Number(event.target.value)
                if (Number.isFinite(count) && count >= 0)
                  setNewCardsPerDay(Math.min(500, Math.round(count)))
              }}
            />
          </label>
        </div>
        <p className="subtle" style={{ margin: 0 }}>
          Meeting the daily goal keeps your streak. New cards per day controls how many unseen cards
          Due today introduces.
        </p>
      </section>

      <section className="card stack-sm" aria-labelledby="settings-exams">
        <h2 id="settings-exams" className="card__title">
          Exam dates
        </h2>
        <div className="viz-form">
          {courseIndexes.map(({ course }) => (
            <label key={course.id} className="field">
              <span className="field__label">{course.examCode}</span>
              <input
                className="search-input"
                type="date"
                value={state.settings.examDates[course.id] ?? ''}
                onChange={(event) => setExamDate(course.id, event.target.value || null)}
              />
            </label>
          ))}
        </div>
        <p className="subtle" style={{ margin: 0 }}>
          With a date set, <Link to="/stats">My stats</Link> shows how many lessons and cards a day
          keep you on track.
        </p>
      </section>

      <section className="card stack-sm" aria-labelledby="settings-theme">
        <h2 id="settings-theme" className="card__title">
          Appearance
        </h2>
        <div className="chip-row" role="group" aria-label="Theme">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className="chip"
              aria-pressed={state.theme === theme.id}
              onClick={() => setTheme(theme.id)}
            >
              {theme.label}
            </button>
          ))}
        </div>
        <p className="subtle" style={{ margin: 0 }}>
          Tip: press <kbd>Ctrl</kbd>+<kbd>K</kbd> (<kbd>⌘</kbd>+<kbd>K</kbd> on a Mac) anywhere to
          search everything.
        </p>
      </section>

      <GistSync />

      <section className="card stack-sm" aria-labelledby="settings-data">
        <h2 id="settings-data" className="card__title">
          Your data
        </h2>
        <p style={{ margin: 0 }}>
          Everything is stored in this browser. <Link to="/progress">Progress &amp; data</Link>{' '}
          exports it to a JSON file and imports it on another device (merge or replace).
          Mock-interview recordings stay in this browser only.
        </p>
        <form
          className="row"
          onSubmit={(event) => {
            event.preventDefault()
            if (confirm !== 'RESET') return
            resetAll()
            setConfirm('')
          }}
        >
          <label className="field" style={{ flex: '1 1 14rem' }}>
            <span className="field__label">Type RESET to delete all progress on this device</span>
            <input
              className="search-input"
              value={confirm}
              autoComplete="off"
              onChange={(event) => setConfirm(event.target.value)}
            />
          </label>
          <button
            type="submit"
            className="btn btn--danger"
            style={{ alignSelf: 'end' }}
            disabled={confirm !== 'RESET'}
          >
            Reset all progress
          </button>
        </form>
      </section>
    </div>
  )
}
