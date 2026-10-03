import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { RichText } from '../components/ui/RichText'
import { interviewTopics } from '../content/interview'
import { enriched } from '../lib/bot/enrich'
import { scoreAnswer, scoreSelf } from '../lib/bot/scoring'
import type { CommonMistake, EnrichedQuestion, KeyPoint } from '../lib/bot/types'
import {
  DEFAULT_SETTINGS,
  followUpsFor,
  formatClock,
  pickQuestions,
  type MockSettings,
} from '../lib/mock-interview'
import { allPacks } from '../lib/packs'
import {
  deleteAllRecordings,
  deleteRecording,
  listRecordings,
  recordingSupported,
  saveRecording,
  startRecording,
  startTranscription,
  transcriptionSupported,
  type ActiveRecording,
  type Recording,
} from '../lib/recordings'
import { interviewCardId, type Rating } from '../lib/srs'
import { useAccess } from '../lib/use-access'
import { useProgress } from '../lib/use-progress'

const RATING_LABEL = ['', 'Again', 'Hard', 'Good', 'Easy']

interface Turn {
  kind: 'main' | 'follow'
  prompt: string
  keyPoints: KeyPoint[]
  mistakes: CommonMistake[]
  modelAnswer?: string
}

interface TurnResult {
  transcript: string
  ticks: boolean[]
  audioUrl?: string
}

interface Played {
  questionId: string
  prompt: string
  score: number
  rating?: Rating
}

function AudioClip({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    const next = URL.createObjectURL(blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [blob])
  return url ? <audio controls src={url} preload="metadata" className="mock-audio" /> : null
}

function RecordingsList({ owner }: { owner: string }) {
  const [items, setItems] = useState<Recording[] | null>(null)
  const [error, setError] = useState('')
  const refresh = useCallback(() => {
    listRecordings(owner)
      .then(setItems)
      .catch(() => {
        setItems([])
        setError('Recordings are not available in this browser (IndexedDB is blocked).')
      })
  }, [owner])
  useEffect(refresh, [refresh])
  if (items === null) return <p className="subtle">Loading recordings…</p>
  const bytes = items.reduce((sum, item) => sum + item.blob.size, 0)
  return (
    <section className="card stack-sm" aria-labelledby="mock-recordings">
      <div className="row">
        <h2 id="mock-recordings" className="card__title" style={{ flex: '1 1 auto' }}>
          My recordings
        </h2>
        <span className="subtle">
          {items.length} · {(bytes / 1024 / 1024).toFixed(1)} MB
        </span>
        {items.length > 0 && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              if (window.confirm('Delete all your recordings on this device?'))
                void deleteAllRecordings(owner).then(refresh)
            }}
          >
            Delete all
          </button>
        )}
      </div>
      {error && <p className="viz-bad">{error}</p>}
      {items.length === 0 ? (
        <p className="subtle" style={{ margin: 0 }}>
          None yet. Recordings stay on this device (IndexedDB) and are not part of the progress
          export.
        </p>
      ) : (
        <ul className="mock-recordings">
          {items.map((item) => (
            <li key={item.id} className="stack-sm">
              <div className="row mock-rec-head">
                <strong style={{ flex: '1 1 auto' }}>
                  <RichText text={item.prompt} />
                </strong>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  aria-label={`Delete recording of ${item.prompt}`}
                  onClick={() => void deleteRecording(item.id).then(refresh)}
                >
                  ✕
                </button>
              </div>
              <span className="subtle">
                {item.label} · {new Date(item.createdAt).toLocaleString()} ·{' '}
                {formatClock(item.durationMs / 1000)}
              </span>
              <AudioClip blob={item.blob} />
              {item.transcript && (
                <p className="subtle mock-transcript-text">“{item.transcript}”</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * Timed mock interview: a random question, a clock, your spoken answer
 * recorded (and transcribed where the browser can), then the key points as a
 * checklist and a follow-up or two.
 */
export function MockInterviewPage() {
  const { state, rateCard } = useProgress()
  const { email } = useAccess()
  const owner = email ?? 'local'
  const [params] = useSearchParams()
  const [settings, setSettings] = useState<MockSettings>(() => ({
    ...DEFAULT_SETTINGS,
    pack: params.get('pack') ?? '',
  }))
  const [record, setRecord] = useState(false)
  const [transcribe, setTranscribe] = useState(false)
  const canRecord = recordingSupported()
  const canTranscribe = transcriptionSupported()
  const packs = allPacks(state)

  const [phase, setPhase] = useState<'setup' | 'running' | 'summary'>('setup')
  const [queue, setQueue] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [question, setQuestion] = useState<EnrichedQuestion | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [turnIndex, setTurnIndex] = useState(0)
  const [stage, setStage] = useState<'ready' | 'answering' | 'review'>('ready')
  const [result, setResult] = useState<TurnResult>({ transcript: '', ticks: [] })
  const [remaining, setRemaining] = useState(0)
  const [played, setPlayed] = useState<Played[]>([])
  const [rated, setRated] = useState<Rating | null>(null)
  const [error, setError] = useState('')
  const recorder = useRef<ActiveRecording | null>(null)
  const stopTranscript = useRef<() => void>(() => undefined)
  const deadline = useRef(0)
  const transcriptRef = useRef('')
  /** Set while an answer is being stopped and saved, so the clock cannot finish it twice. */
  const finishing = useRef(false)

  const turn = turns[turnIndex]
  const seconds = turn?.kind === 'follow' ? 60 : settings.minutes * 60

  const loadQuestion = useCallback(
    async (id: string) => {
      const record = await enriched(id)
      if (!record) return
      setQuestion(record)
      setTurns([
        {
          kind: 'main',
          prompt: record.prompt,
          keyPoints: record.keyPoints,
          mistakes: record.commonMistakes,
          modelAnswer: record.shortAnswer,
        },
        ...followUpsFor(record, settings.followUps).map((followUp): Turn => ({
          kind: 'follow',
          prompt: followUp.question,
          keyPoints: followUp.keyPoints,
          mistakes: [],
          modelAnswer: followUp.shortAnswer,
        })),
      ])
      setTurnIndex(0)
      setStage('ready')
      setRated(null)
      setResult({ transcript: '', ticks: [] })
    },
    [settings.followUps],
  )

  const start = () => {
    const ids = pickQuestions(settings, state)
    if (ids.length === 0) {
      setError('No questions match those settings - widen the level, topics or pack.')
      return
    }
    setError('')
    setQueue(ids)
    setIndex(0)
    setPlayed([])
    setPhase('running')
    void loadQuestion(ids[0])
  }

  const finishAnswer = useCallback(async () => {
    if (stage !== 'answering' || !turn || !question || finishing.current) return
    finishing.current = true
    stopTranscript.current()
    stopTranscript.current = () => undefined
    let audioUrl: string | undefined
    const text = transcriptRef.current
    if (recorder.current) {
      const active = recorder.current
      recorder.current = null
      try {
        const audio = await active.stop()
        audioUrl = URL.createObjectURL(audio.blob)
        await saveRecording({
          id: `rec-${Date.now().toString(36)}`,
          owner,
          questionId: question.id,
          prompt: question.prompt,
          label: turn.kind === 'main' ? 'Main answer' : `Follow-up: ${turn.prompt}`,
          createdAt: Date.now(),
          durationMs: audio.durationMs,
          mimeType: audio.mimeType,
          blob: audio.blob,
          transcript: text,
        })
      } catch {
        setError('The recording could not be saved on this device.')
      }
    }
    const score = scoreAnswer(text, turn.keyPoints, turn.mistakes)
    setResult({
      transcript: text,
      ticks: turn.keyPoints.map((point) => score.matched.includes(point)),
      audioUrl,
    })
    setStage('review')
    finishing.current = false
  }, [stage, turn, question, owner])

  // The clock: wall-clock based, ends the answer at zero.
  useEffect(() => {
    if (stage !== 'answering') return
    const tick = () => {
      const left = Math.max(0, Math.round((deadline.current - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) void finishAnswer()
    }
    tick()
    const handle = window.setInterval(tick, 250)
    return () => window.clearInterval(handle)
  }, [stage, finishAnswer])

  useEffect(
    () => () => {
      recorder.current?.cancel()
      stopTranscript.current()
    },
    [],
  )

  const beginAnswer = async () => {
    setError('')
    transcriptRef.current = ''
    setResult({ transcript: '', ticks: [] })
    if (record && canRecord) {
      try {
        recorder.current = await startRecording()
      } catch {
        setError(
          'Microphone permission was refused - type your answer instead, or allow the mic and try again.',
        )
      }
    }
    if (transcribe && canTranscribe) {
      stopTranscript.current = startTranscription((text) => {
        transcriptRef.current = text
        setResult((current) => ({ ...current, transcript: text }))
      })
    }
    deadline.current = Date.now() + seconds * 1000
    setRemaining(seconds)
    setStage('answering')
  }

  const selfScore = turn
    ? scoreSelf(
        turn.keyPoints,
        result.ticks.flatMap((tick, i) => (tick ? [i] : [])),
      )
    : null

  const next = () => {
    if (result.audioUrl) URL.revokeObjectURL(result.audioUrl)
    if (turn?.kind === 'main' && question && selfScore) {
      setPlayed((current) => [
        ...current,
        {
          questionId: question.id,
          prompt: question.prompt,
          score: selfScore.score,
          rating: rated ?? undefined,
        },
      ])
    }
    if (turnIndex + 1 < turns.length) {
      setTurnIndex(turnIndex + 1)
      setStage('ready')
      setResult({ transcript: '', ticks: [] })
      return
    }
    if (index + 1 < queue.length) {
      setIndex(index + 1)
      void loadQuestion(queue[index + 1])
      return
    }
    setPhase('summary')
  }

  /* ---------- Setup ---------- */
  if (phase === 'setup') {
    return (
      <div className="page stack">
        <header className="page-header">
          <p className="subtle" style={{ margin: 0 }}>
            <Link to="/interview">Interview preparation</Link>
          </p>
          <h1>Mock interview</h1>
          <p className="page-header__meta">
            Questions on a clock, answered out loud. Then tick the key points you actually said and
            face a follow-up or two - the way a real interviewer probes.
          </p>
        </header>
        <section className="card stack-sm" aria-labelledby="mock-setup">
          <h2 id="mock-setup" className="card__title">
            Set up
          </h2>
          <div className="viz-form">
            <label className="field">
              <span className="field__label">Level</span>
              <select
                className="select"
                value={settings.level}
                onChange={(event) =>
                  setSettings({ ...settings, level: event.target.value as MockSettings['level'] })
                }
              >
                <option value="">Any level</option>
                <option value="basic">Basic</option>
                <option value="intermediate">Intermediate</option>
                <option value="senior">Senior</option>
              </select>
            </label>
            <label className="field">
              <span className="field__label">Prep pack</span>
              <select
                className="select"
                value={settings.pack}
                onChange={(event) => setSettings({ ...settings, pack: event.target.value })}
              >
                <option value="">All questions</option>
                {packs.map((pack) => (
                  <option key={pack.key} value={pack.key}>
                    {pack.kind === 'company' ? '🏢' : '🏷'} {pack.name} ({pack.questionIds.length})
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Questions</span>
              <select
                className="select"
                value={settings.count}
                onChange={(event) =>
                  setSettings({ ...settings, count: Number(event.target.value) })
                }
              >
                {[1, 3, 5, 8].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Time per answer</span>
              <select
                className="select"
                value={settings.minutes}
                onChange={(event) =>
                  setSettings({ ...settings, minutes: Number(event.target.value) })
                }
              >
                {[1, 2, 3, 5].map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} min
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Follow-ups</span>
              <select
                className="select"
                value={settings.followUps}
                onChange={(event) =>
                  setSettings({ ...settings, followUps: Number(event.target.value) })
                }
              >
                {[0, 1, 2].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <fieldset className="mock-topics">
            <legend className="field__label">
              Topics {settings.topics.length === 0 ? '(all)' : `(${settings.topics.length})`}
            </legend>
            <div className="chip-row">
              {interviewTopics.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  className="chip"
                  aria-pressed={settings.topics.includes(topic.id)}
                  onClick={() =>
                    setSettings({
                      ...settings,
                      topics: settings.topics.includes(topic.id)
                        ? settings.topics.filter((id) => id !== topic.id)
                        : [...settings.topics, topic.id],
                    })
                  }
                >
                  {topic.title}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="row">
            <input
              type="checkbox"
              checked={record && canRecord}
              disabled={!canRecord}
              onChange={(event) => setRecord(event.target.checked)}
            />
            🎙️ Record my answers{' '}
            {canRecord ? '(saved on this device)' : '(not supported in this browser)'}
          </label>
          <label className="row">
            <input
              type="checkbox"
              checked={transcribe && canTranscribe}
              disabled={!canTranscribe}
              onChange={(event) => setTranscribe(event.target.checked)}
            />
            📝 Transcribe as I speak{' '}
            {canTranscribe
              ? '(uses the browser’s speech service, which may need the internet)'
              : '(not supported in this browser - you can type instead)'}
          </label>
          {error && <p className="viz-bad">{error}</p>}
          <button type="button" className="btn" style={{ justifySelf: 'start' }} onClick={start}>
            Start the interview
          </button>
        </section>
        <RecordingsList owner={owner} />
      </div>
    )
  }

  /* ---------- Summary ---------- */
  if (phase === 'summary') {
    const average = played.length
      ? Math.round(played.reduce((sum, item) => sum + item.score, 0) / played.length)
      : 0
    return (
      <div className="page stack">
        <header className="page-header">
          <h1>Mock interview: done</h1>
          <p className="page-header__meta">
            {played.length === 0
              ? 'You ended before scoring an answer.'
              : `Average ${average}% of key points across ${played.length} question${played.length === 1 ? '' : 's'}.`}
          </p>
        </header>
        <section className="card stack-sm">
          <table className="bot-report">
            <tbody>
              {played.map((item) => (
                <tr key={item.questionId}>
                  <td>
                    <RichText text={item.prompt} />
                  </td>
                  <td className="bot-report__score">
                    {item.score}%{item.rating ? ` · ${RATING_LABEL[item.rating]}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="button-row">
            <button type="button" className="btn" onClick={start}>
              Another round
            </button>
            <button type="button" className="btn btn--secondary" onClick={() => setPhase('setup')}>
              Change settings
            </button>
          </div>
        </section>
        <RecordingsList owner={owner} />
      </div>
    )
  }

  /* ---------- Running ---------- */
  return (
    <div className="page stack">
      <header className="page-header">
        <div className="row">
          <Badge tone="info">
            Question {index + 1} of {queue.length}
          </Badge>
          {turn?.kind === 'follow' && (
            <Badge tone="warning">
              Follow-up {turnIndex} of {turns.length - 1}
            </Badge>
          )}
          {question && <Badge>{question.level}</Badge>}
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            style={{ marginLeft: 'auto' }}
            onClick={() => setPhase('summary')}
          >
            End interview
          </button>
        </div>
        <h1 className="mock-question">{turn ? <RichText text={turn.prompt} /> : 'Loading…'}</h1>
      </header>

      {turn && stage === 'ready' && (
        <section className="card stack-sm">
          <p style={{ margin: 0 }}>
            You have <strong>{formatClock(seconds)}</strong>. Answer out loud as you would in the
            room
            {record && canRecord ? ' - it will be recorded' : ''}. Type key words below if you are
            not recording.
          </p>
          <button
            type="button"
            className="btn"
            style={{ justifySelf: 'start' }}
            onClick={() => void beginAnswer()}
          >
            ▶ Start answering
          </button>
        </section>
      )}

      {turn && stage === 'answering' && (
        <section className="card stack-sm" aria-live="polite">
          <div className="row">
            <span
              className={`mock-clock${remaining <= 15 ? ' is-low' : ''}`}
              role="timer"
              aria-label={`${remaining} seconds left`}
            >
              {formatClock(remaining)}
            </span>
            {recorder.current && <Badge tone="danger">● Recording</Badge>}
          </div>
          <label className="field">
            <span className="field__label">
              {transcribe && canTranscribe
                ? 'Transcript (live - you can correct it)'
                : 'Your answer (key words are enough)'}
            </span>
            <textarea
              className="mock-textarea"
              rows={5}
              value={result.transcript}
              onChange={(event) => {
                transcriptRef.current = event.target.value
                setResult({ ...result, transcript: event.target.value })
              }}
            />
          </label>
          <button
            type="button"
            className="btn"
            style={{ justifySelf: 'start' }}
            onClick={() => void finishAnswer()}
          >
            ■ Done
          </button>
        </section>
      )}

      {turn && stage === 'review' && selfScore && (
        <section className="card stack-sm" aria-labelledby="mock-review">
          <div className="row">
            <h2 id="mock-review" className="card__title" style={{ flex: '1 1 auto' }}>
              Which of these did you say?
            </h2>
            <Badge
              tone={
                selfScore.score >= 60 ? 'success' : selfScore.score >= 35 ? 'warning' : 'danger'
              }
            >
              {selfScore.score}%
            </Badge>
          </div>
          {result.audioUrl && <audio controls src={result.audioUrl} className="mock-audio" />}
          {result.transcript && (
            <p className="subtle mock-transcript-text">“{result.transcript}”</p>
          )}
          {turn.keyPoints.length === 0 ? (
            <p className="subtle">
              No key points are written for this follow-up - compare with the answer below.
            </p>
          ) : (
            <ul className="bot-score__points">
              {turn.keyPoints.map((point, i) => (
                <li key={point.point} className={result.ticks[i] ? 'is-hit' : 'is-miss'}>
                  <label>
                    <input
                      type="checkbox"
                      checked={result.ticks[i] ?? false}
                      onChange={() =>
                        setResult({
                          ...result,
                          ticks: turn.keyPoints.map((_, j) =>
                            j === i ? !result.ticks[j] : (result.ticks[j] ?? false),
                          ),
                        })
                      }
                    />
                    <span aria-hidden="true">{result.ticks[i] ? '✓' : '✗'}</span>{' '}
                    <RichText text={point.point} />
                  </label>
                </li>
              ))}
            </ul>
          )}
          {turn.mistakes
            .filter(
              (mistake) =>
                mistake.triggers.length &&
                scoreAnswer(result.transcript, [], [mistake]).mistakes.length,
            )
            .map((mistake) => (
              <p key={mistake.mistake} className="viz-bad" style={{ margin: 0 }}>
                ⚠️ {mistake.mistake} {mistake.correction}
              </p>
            ))}
          {turn.modelAnswer && (
            <details>
              <summary>Model answer</summary>
              <p>
                <RichText text={turn.modelAnswer} />
              </p>
            </details>
          )}
          {turn.kind === 'main' && question && (
            <div className="stack-sm">
              <span className="subtle">
                Schedule this question - suggested: {RATING_LABEL[selfScore.suggested]}
              </span>
              <div className="chip-row" role="group" aria-label="Rate your answer">
                {([1, 2, 3, 4] as Rating[]).map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    className={`chip${rating === selfScore.suggested ? ' chip--primary' : ''}`}
                    aria-pressed={rated === rating}
                    onClick={() => {
                      rateCard(interviewCardId(question.id), rating)
                      setRated(rating)
                    }}
                  >
                    {RATING_LABEL[rating]}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button type="button" className="btn" style={{ justifySelf: 'start' }} onClick={next}>
            {turnIndex + 1 < turns.length
              ? 'Next: follow-up →'
              : index + 1 < queue.length
                ? 'Next question →'
                : 'Finish'}
          </button>
        </section>
      )}
      {error && <p className="viz-bad">{error}</p>}
    </div>
  )
}
