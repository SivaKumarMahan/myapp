import { Link, useSearchParams } from 'react-router-dom'
import { InterviewQuestionCard } from '../components/InterviewQuestionCard'
import { Badge } from '../components/ui/Badge'
import { interviewQuestionById } from '../content/interview'
import { allPacks, findPack } from '../lib/packs'
import { interviewCardId } from '../lib/srs'
import { useProgress } from '../lib/use-progress'

/**
 * Company / round prep packs: the real interview rounds in the bank, plus
 * any tag you put on questions. Open one to revise it or run a mock interview
 * from just those questions.
 */
export function PacksPage() {
  const { state, setInterviewStatus, rateCard, setQuestionTags } = useProgress()
  const [params, setParams] = useSearchParams()
  const packs = allPacks(state)
  const pack = findPack(params.get('pack'), state)

  if (!pack) {
    const yours = packs.filter((entry) => entry.kind === 'tag')
    const companies = packs.filter((entry) => entry.kind === 'company')
    const card = (entry: (typeof packs)[number]) => {
      const known = entry.questionIds.filter((id) => state.interview[id]?.status === 'known').length
      return (
        <button
          key={entry.key}
          type="button"
          className="card card--interactive stack-sm incident-card"
          onClick={() => setParams({ pack: entry.key })}
        >
          <div className="row">
            <span aria-hidden="true">{entry.kind === 'company' ? '🏢' : '🏷'}</span>
            <strong className="card__title" style={{ flex: '1 1 auto' }}>
              {entry.name}
            </strong>
            <Badge>{entry.questionIds.length} questions</Badge>
          </div>
          <span className="subtle">
            {known} known · {entry.questionIds.length - known} to go
          </span>
        </button>
      )
    }
    return (
      <div className="page stack">
        <header className="page-header">
          <p className="subtle" style={{ margin: 0 }}>
            <Link to="/interview">Interview preparation</Link>
          </p>
          <h1>Prep packs</h1>
          <p className="page-header__meta">
            Build a pack for each company or round: tag any question with 🏷 Tag (on every question
            card) and it collects here. The real interview rounds in your bank are packs already.
          </p>
        </header>
        <section className="stack-sm" aria-labelledby="packs-yours">
          <h2 id="packs-yours">Your packs</h2>
          {yours.length === 0 ? (
            <p className="subtle">
              No tags yet. Open any <Link to="/interview">topic</Link> and use 🏷 Tag on a question -
              e.g. &ldquo;Microsoft&rdquo; or &ldquo;Round 2 - system design&rdquo;.
            </p>
          ) : (
            <div className="card-grid card-grid--2">{yours.map(card)}</div>
          )}
        </section>
        <section className="stack-sm" aria-labelledby="packs-companies">
          <h2 id="packs-companies">From real interview rounds</h2>
          <div className="card-grid card-grid--2">{companies.map(card)}</div>
        </section>
      </div>
    )
  }

  const entries = pack.questionIds
    .map((id) => interviewQuestionById.get(id))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
  return (
    <div className="page stack">
      <header className="page-header">
        <p className="subtle" style={{ margin: 0 }}>
          <button type="button" className="linklike" onClick={() => setParams({})}>
            ← All prep packs
          </button>
        </p>
        <h1>
          {pack.kind === 'company' ? '🏢' : '🏷'} {pack.name}
        </h1>
        <div className="button-row">
          <Link className="btn" to={`/interview/mock?pack=${encodeURIComponent(pack.key)}`}>
            🎤 Mock interview from this pack
          </Link>
          {pack.kind === 'tag' && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                if (
                  !window.confirm(
                    `Remove the tag "${pack.name}" from ${pack.questionIds.length} questions?`,
                  )
                )
                  return
                for (const id of pack.questionIds)
                  setQuestionTags(
                    id,
                    (state.questionTags[id] ?? []).filter((tag) => tag !== pack.name),
                  )
                setParams({})
              }}
            >
              Delete this pack
            </button>
          )}
        </div>
      </header>
      <div className="itv-question-list">
        {entries.map((entry, index) => (
          <div key={entry.question.id} className="stack-sm">
            <p className="subtle" style={{ margin: 0 }}>
              <span aria-hidden="true">{entry.topic.icon} </span>
              <Link to={`/interview/${entry.topic.id}`}>{entry.topic.title}</Link>
            </p>
            <InterviewQuestionCard
              question={entry.question}
              index={index + 1}
              status={state.interview[entry.question.id]?.status}
              onStatusChange={(next) => setInterviewStatus(entry.question.id, next)}
              srsCard={state.srs[interviewCardId(entry.question.id)]}
              onRate={(rating) => rateCard(interviewCardId(entry.question.id), rating)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
