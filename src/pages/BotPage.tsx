import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { RichAnswer, RichText } from '../components/ui/RichText'
import { StudyBot, linkTo, type Block, type BotMessage, type Chip } from '../lib/bot/engine'
import { useProgress } from '../lib/use-progress'

const SMART_KEY = 'alh.bot.smartSearch'

const readSmart = () => {
  try {
    return window.localStorage.getItem(SMART_KEY) === '1'
  } catch {
    return false
  }
}

const writeSmart = (on: boolean) => {
  try {
    window.localStorage.setItem(SMART_KEY, on ? '1' : '0')
  } catch {
    /* private mode: the toggle just isn't remembered */
  }
}

/** The bot's own text: paragraphs separated by blank lines, bullet lists allowed. */
const Prose = ({ text }: { text: string }) => <RichAnswer items={text.split(/\n{2,}/)} />

interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}

const speechRecognition = (): (new () => SpeechRecognitionLike) | null => {
  const scope = window as unknown as Record<string, unknown>
  return (scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null) as
    (new () => SpeechRecognitionLike) | null
}

function Countdown({
  seconds,
  active,
  onExpire,
}: {
  seconds: number
  active: boolean
  onExpire: () => void
}) {
  const [left, setLeft] = useState(seconds)
  const fired = useRef(false)
  useEffect(() => {
    if (!active) return
    const started = Date.now()
    const handle = window.setInterval(() => {
      const next = Math.max(0, seconds - Math.floor((Date.now() - started) / 1000))
      setLeft(next)
      if (next === 0 && !fired.current) {
        fired.current = true
        window.clearInterval(handle)
        onExpire()
      }
    }, 250)
    return () => window.clearInterval(handle)
  }, [active, seconds, onExpire])
  return (
    <div
      className={`bot-timer${left <= 5 && active ? ' bot-timer--low' : ''}`}
      role="timer"
      aria-live="off"
    >
      <div className="bot-timer__bar" style={{ width: `${(left / seconds) * 100}%` }} />
      <span>{active ? `${left}s` : 'done'}</span>
    </div>
  )
}

function ScoreCard({
  block,
  latest,
  onSelf,
}: {
  block: Extract<Block, { type: 'score' }>
  latest: boolean
  onSelf: (points: number[]) => void
}) {
  const { result, keyPoints } = block
  const [ticks, setTicks] = useState(() => keyPoints.map((point) => result.matched.includes(point)))
  const tone = result.score >= 60 ? 'success' : result.score >= 35 ? 'warning' : 'danger'
  return (
    <div className="bot-score">
      <div className="row">
        <strong style={{ flex: '1 1 auto' }}>{block.title}</strong>
        <Badge tone={tone}>{result.score}%</Badge>
      </div>
      <div className="bot-score__meter" aria-hidden="true">
        <span
          style={{ width: `${result.score}%` }}
          className={`bot-score__fill bot-score__fill--${tone}`}
        />
      </div>
      <p className="subtle bot-score__help">
        {latest && block.selfCheck
          ? 'Ticked = I found it in your answer. Tick any you did say in other words, then re-score.'
          : 'Key points'}
      </p>
      <ul className="bot-score__points">
        {keyPoints.map((point, index) => (
          <li key={point.point} className={ticks[index] ? 'is-hit' : 'is-miss'}>
            <label>
              <input
                type="checkbox"
                checked={ticks[index]}
                disabled={!latest || !block.selfCheck}
                onChange={() =>
                  setTicks((current) => current.map((tick, i) => (i === index ? !tick : tick)))
                }
              />
              <span aria-hidden="true">{ticks[index] ? '✓' : '✗'}</span>{' '}
              <RichText text={point.point} />
            </label>
          </li>
        ))}
      </ul>
      {latest && block.selfCheck && (
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={() => onSelf(ticks.flatMap((tick, index) => (tick ? [index] : [])))}
        >
          Re-score with my ticks
        </button>
      )}
    </div>
  )
}

function BlockView({
  block,
  latest,
  timerActive,
  onSelf,
  onTimeout,
}: {
  block: Block
  latest: boolean
  timerActive: boolean
  onSelf: (points: number[]) => void
  onTimeout: () => void
}) {
  switch (block.type) {
    case 'question':
      return (
        <div className="bot-question">
          <div className="row">
            {block.label && <Badge tone="info">{block.label}</Badge>}
            <Badge>{block.question.level}</Badge>
            <Link className="subtle bot-question__open" to={linkTo(block.question.id)}>
              Open in bank ↗
            </Link>
          </div>
          <p className="bot-question__prompt">
            <RichText text={block.question.prompt} />
          </p>
        </div>
      )
    case 'score':
      return <ScoreCard block={block} latest={latest} onSelf={onSelf} />
    case 'answer':
      return (
        <div className="bot-answer">
          <strong>{block.title}</strong>
          <Prose text={block.text} />
        </div>
      )
    case 'results':
      return (
        <ol className="bot-results">
          {block.hits.map((hit) => (
            <li key={hit.id}>
              <Link to={linkTo(hit.id)}>
                <RichText text={hit.prompt} />
              </Link>
              <span className="subtle"> · {hit.topicTitle}</span>
              {hit.shortAnswer && (
                <p>
                  <RichText text={hit.shortAnswer} />
                </p>
              )}
            </li>
          ))}
        </ol>
      )
    case 'report':
      return (
        <div className="bot-answer">
          <strong>{block.title}</strong>
          <table className="bot-report">
            <tbody>
              {block.rows.map((row, index) => (
                <tr key={index}>
                  <td>
                    <RichText text={row.prompt} />
                  </td>
                  <td className="bot-report__score">
                    {row.score === null ? (row.note ?? '—') : `${row.score}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginBottom: 0 }}>
            <RichText text={block.summary} />
          </p>
        </div>
      )
    case 'timer':
      return <Countdown seconds={block.seconds} active={timerActive} onExpire={onTimeout} />
    case 'scenario':
      return (
        <div className="bot-answer">
          <Prose text={block.text} />
          {block.evidence && <pre className="bot-evidence">{block.evidence}</pre>}
          <ol className="bot-choices">
            {block.choices.map((choice) => (
              <li key={choice}>{choice}</li>
            ))}
          </ol>
        </div>
      )
    case 'links':
      return (
        <ul className="bot-links">
          {block.items.map((item) => (
            <li key={item.to + item.label}>
              <Link to={item.to}>
                <RichText text={item.label} />
              </Link>
            </li>
          ))}
        </ul>
      )
  }
}

/**
 * The Study Bot: an offline tutor built from rules and pre-written content.
 * Nothing typed here is sent anywhere - except voice, which is the
 * browser's own speech service and may use the internet.
 */
export function BotPage() {
  const progress = useProgress()
  const stateRef = useRef(progress.state)
  stateRef.current = progress.state
  const rateRef = useRef(progress.rateCard)
  rateRef.current = progress.rateCard

  const [smart, setSmart] = useState(readSmart)
  const [smartStatus, setSmartStatus] = useState<string>('')
  const botRef = useRef<StudyBot | null>(null)
  if (!botRef.current) {
    botRef.current = new StudyBot({
      state: () => stateRef.current,
      rate: (cardId, rating) => rateRef.current(cardId, rating),
      now: () => Date.now(),
    })
  }
  const bot = botRef.current

  const [messages, setMessages] = useState<BotMessage[]>([])
  const [chips, setChips] = useState<Chip[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const [timerKey, setTimerKey] = useState<string | null>(null)
  const recognition = useRef<SpeechRecognitionLike | null>(null)
  const [params] = useSearchParams()

  const apply = useCallback((reply: { messages: BotMessage[]; chips: Chip[] }) => {
    setMessages((current) => [...current, ...reply.messages].slice(-200))
    setChips(reply.chips)
    const timer = [...reply.messages].reverse().find((message) => message.block?.type === 'timer')
    setTimerKey(timer?.block?.type === 'timer' ? timer.block.key : null)
  }, [])

  const send = useCallback(
    async (text: string, echo = text) => {
      setBusy(true)
      setTimerKey(null)
      try {
        apply(await bot.send(text, echo))
      } finally {
        setBusy(false)
      }
    },
    [apply, bot],
  )

  // Welcome, then an optional opening command from the link (?say=/mock networking).
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    apply(bot.welcome())
    const say = params.get('say')
    if (say) void send(say)
  }, [apply, bot, params, send])

  // Smart search: loads the on-device model only when switched on.
  useEffect(() => {
    if (!smart) {
      bot.context.semantic = undefined
      setSmartStatus('')
      return
    }
    let cancelled = false
    setSmartStatus('Loading the search model…')
    import('../lib/bot/semantic')
      .then(async ({ semanticSearch, warmUp }) => {
        await warmUp((note) => !cancelled && setSmartStatus(note))
        if (cancelled) return
        bot.context.semantic = semanticSearch
        setSmartStatus('Smart search is on - it works offline from now on.')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        bot.context.semantic = undefined
        setSmartStatus(
          `Smart search couldn't load (${error instanceof Error ? error.message : 'offline?'}). Keyword search still works.`,
        )
      })
    return () => {
      cancelled = true
    }
  }, [smart, bot])

  useEffect(() => {
    // To the very bottom, so the newest message sits just above the sticky input
    // rather than underneath it.
    if (messages.length > 0) window.scrollTo({ top: document.documentElement.scrollHeight })
  }, [messages])

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    void send(text)
  }

  const Speech = speechRecognition()
  const toggleMic = () => {
    if (!Speech) return
    if (listening) {
      recognition.current?.stop()
      return
    }
    const session = new Speech()
    session.lang = 'en-US'
    session.interimResults = false
    session.onresult = (event) => {
      const said = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(' ')
      setInput((current) => `${current}${current ? ' ' : ''}${said}`)
    }
    session.onend = () => setListening(false)
    session.onerror = () => setListening(false)
    recognition.current = session
    setListening(true)
    session.start()
  }

  const lastScoreId = [...messages].reverse().find((message) => message.block?.type === 'score')?.id

  return (
    <div className="page bot-page">
      <header className="page-header">
        <h1>Study bot</h1>
        <p className="page-header__meta">
          An offline interview coach. It runs on rules and your question bank - nothing you type
          leaves this device.
        </p>
      </header>

      <div className="bot-transcript" aria-live="polite" aria-label="Conversation">
        {messages.map((message) => (
          <div key={message.id} className={`bot-msg bot-msg--${message.from}`}>
            {message.text &&
              (message.from === 'user' ? <p>{message.text}</p> : <Prose text={message.text} />)}
            {message.block && (
              <BlockView
                block={message.block}
                latest={message.id === lastScoreId}
                timerActive={message.block.type === 'timer' && message.block.key === timerKey}
                onSelf={(points) =>
                  void send(`/self ${points.join(',')}`, 'Re-score with my ticks')
                }
                onTimeout={() => void send('/timeout', '')}
              />
            )}
          </div>
        ))}
      </div>

      <div className="bot-dock">
        {chips.length > 0 && (
          <div className="chip-row bot-chips" aria-label="Suggestions">
            {chips.map((chip) => (
              <button
                key={chip.send + chip.label}
                type="button"
                className={`chip${chip.primary ? ' chip--primary' : ''}`}
                disabled={busy}
                onClick={() => void send(chip.send, chip.label)}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}
        <form className="bot-input" onSubmit={onSubmit}>
          <label className="visually-hidden" htmlFor="bot-input">
            Message
          </label>
          <textarea
            id="bot-input"
            rows={2}
            value={input}
            placeholder={
              bot.awaiting
                ? 'Type your answer…'
                : 'Ask, or type a command like "interview me on AKS"'
            }
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                onSubmit(event)
              }
            }}
          />
          {Speech && (
            <button
              type="button"
              className={`btn btn--secondary bot-mic${listening ? ' is-on' : ''}`}
              aria-pressed={listening}
              aria-label={listening ? 'Stop voice input' : 'Voice input'}
              title="Voice input uses your browser's speech service, which may need the internet."
              onClick={toggleMic}
            >
              🎙️
            </button>
          )}
          <button type="submit" className="btn" disabled={busy || !input.trim()}>
            Send
          </button>
        </form>
        <details className="bot-settings">
          <summary className="subtle">Settings</summary>
          <label className="row">
            <input
              type="checkbox"
              checked={smart}
              onChange={(event) => {
                setSmart(event.target.checked)
                writeSmart(event.target.checked)
              }}
            />
            Smart search: understands questions phrased differently. Downloads a ~23 MB model once,
            then works offline.
          </label>
          {smartStatus && <p className="subtle">{smartStatus}</p>}
          {Speech && (
            <p className="subtle">
              🎙️ Voice input uses your browser&rsquo;s speech recognition, which in most browsers
              sends audio to an online service.
            </p>
          )}
        </details>
      </div>
    </div>
  )
}
