import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { InterviewQuestionCard } from '../components/InterviewQuestionCard'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/StateBlock'
import { interviewQuestionById } from '../content/interview'
import { jdAreaTitle, type JdArea, type JdSkill } from '../content/jd/skills'
import {
  customSkill,
  detectSkills,
  jdPackTag,
  knownSkillFor,
  questionsForSkill,
  unrecognisedTerms,
  webSearchLinks,
} from '../lib/jd'
import { readJson, writeJson } from '../lib/local-json'
import { interviewCardId } from '../lib/srs'
import { useProgress } from '../lib/use-progress'

const DRAFT_KEY = 'azure-learning-hub.jd-draft'
/** Questions shown per skill before "Show more". */
const FIRST_SHOWN = 3
/** Questions per skill that go into a saved prep pack. */
const PACK_PER_SKILL = 10

interface Draft {
  text: string
  label: string
  added: string[]
  hidden: string[]
}

const emptyDraft: Draft = { text: '', label: '', added: [], hidden: [] }

interface Entry {
  skill: JdSkill
  mentions: number
  added: boolean
}

/**
 * Job description prep: paste a JD, get the questions and answers for every
 * skill it asks for. Skills the bank does not cover get web searches that
 * open in a new tab, and the whole set can be saved as a prep pack.
 */
export function JdPrepPage() {
  const { state, setQuestionTags } = useProgress()
  const [draft, setDraft] = useState<Draft>(() => ({
    ...emptyDraft,
    ...readJson<Partial<Draft>>(DRAFT_KEY, {}),
  }))
  const [newSkill, setNewSkill] = useState('')
  const [saved, setSaved] = useState<{ tag: string; count: number } | null>(null)
  const text = useDeferredValue(draft.text)

  useEffect(() => writeJson(DRAFT_KEY, draft), [draft])
  const update = (patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }))
    setSaved(null)
  }

  const matches = useMemo(() => detectSkills(text), [text])
  const entries = useMemo(() => {
    const list: Entry[] = matches.map((match) => ({
      skill: match.skill,
      mentions: match.mentions,
      added: false,
    }))
    for (const term of draft.added) {
      const skill = knownSkillFor(term) ?? customSkill(term)
      if (!list.some((entry) => entry.skill.id === skill.id))
        list.push({ skill, mentions: 0, added: true })
    }
    return list.filter((entry) => !draft.hidden.includes(entry.skill.id))
  }, [matches, draft.added, draft.hidden])
  const suggestions = useMemo(
    () =>
      unrecognisedTerms(text, matches).filter(
        (term) => !draft.added.some((added) => added.toLowerCase() === term.toLowerCase()),
      ),
    [text, matches, draft.added],
  )

  const coverage = entries.map((entry) => ({ entry, ...questionsForSkill(entry.skill) }))
  const covered = coverage.filter((item) => item.strongCount > 0).length
  const toRead = coverage.length - covered
  const byArea = (Object.keys(jdAreaTitle) as JdArea[])
    .map((area) => ({ area, items: coverage.filter((item) => item.entry.skill.area === area) }))
    .filter((group) => group.items.length > 0)

  const packIds = [
    ...new Set(coverage.flatMap((item) => item.questionIds.slice(0, PACK_PER_SKILL))),
  ]
  const savePack = () => {
    const tag = jdPackTag(draft.label)
    for (const id of packIds) {
      const tags = state.questionTags[id] ?? []
      if (!tags.includes(tag)) setQuestionTags(id, [...tags, tag])
    }
    setSaved({ tag, count: packIds.length })
  }

  const addSkill = (term: string) => {
    const clean = term.trim()
    if (!clean) return
    const skill = knownSkillFor(clean) ?? customSkill(clean)
    update({
      added: draft.added.includes(clean) ? draft.added : [...draft.added, clean],
      hidden: draft.hidden.filter((id) => id !== skill.id),
    })
    setNewSkill('')
  }

  return (
    <div className="page stack-lg">
      <header className="page-header">
        <p className="subtle" style={{ margin: 0 }}>
          <Link to="/interview">Interview preparation</Link>
        </p>
        <h1>Job description prep</h1>
        <p className="page-header__meta">
          Paste a job description. You get the questions and answers from your bank for every skill
          it asks for. Skills the app does not cover yet come with web searches that open in your
          browser.
        </p>
      </header>

      <section className="card stack-sm" aria-labelledby="jd-input">
        <h2 id="jd-input" className="visually-hidden">
          Job description
        </h2>
        <label className="field">
          <span className="field__label">Company and role (names the prep pack)</span>
          <input
            className="search-input"
            value={draft.label}
            placeholder="e.g. Contoso - Senior DevOps Engineer"
            onChange={(event) => update({ label: event.target.value })}
          />
        </label>
        <label className="field">
          <span className="field__label">Job description</span>
          <textarea
            className="mock-textarea"
            rows={10}
            value={draft.text}
            placeholder="Paste the whole job description here: responsibilities, required and nice-to-have skills."
            onChange={(event) => update({ text: event.target.value })}
          />
        </label>
        <div className="button-row">
          <button
            type="button"
            className="btn btn--ghost"
            disabled={!draft.text && draft.added.length === 0 && !draft.label}
            onClick={() => update(emptyDraft)}
          >
            Clear
          </button>
        </div>
      </section>

      {entries.length === 0 ? (
        <EmptyState
          icon="📄"
          title={
            draft.text.trim() ? 'No skills recognised yet' : 'Paste a job description to start'
          }
          description={
            draft.text.trim()
              ? 'Add the skills yourself below, one at a time.'
              : 'The skills it asks for, and your questions for each, appear here as you paste.'
          }
        />
      ) : (
        <section className="card stack-sm" aria-labelledby="jd-summary">
          <h2 id="jd-summary">
            {entries.length} skill{entries.length === 1 ? '' : 's'} in this job description
          </h2>
          <div className="page-header__meta">
            <Badge tone="success">{covered} with questions in your app</Badge>
            {toRead > 0 && <Badge tone="warning">{toRead} to read up on the web</Badge>}
            <Badge>{packIds.length} questions to prepare</Badge>
          </div>
          <nav className="chip-row" aria-label="Skills in this job description">
            {coverage.map((item) => (
              <a key={item.entry.skill.id} className="chip" href={`#jd-${item.entry.skill.id}`}>
                {item.strongCount > 0 ? '✓' : '🌐'} {item.entry.skill.name}
              </a>
            ))}
          </nav>
          <div className="button-row">
            <button
              type="button"
              className="btn"
              disabled={packIds.length === 0}
              onClick={savePack}
            >
              🏷 Save as prep pack
            </button>
          </div>
          {saved && (
            <div className="notice notice--success" role="status">
              <span className="notice__icon" aria-hidden="true">
                ✓
              </span>
              <p>
                Saved {saved.count} questions as the pack &ldquo;{saved.tag}&rdquo;.{' '}
                <Link to={`/interview/packs?pack=${encodeURIComponent(`tag:${saved.tag}`)}`}>
                  Open the pack
                </Link>{' '}
                or{' '}
                <Link to={`/interview/mock?pack=${encodeURIComponent(`tag:${saved.tag}`)}`}>
                  start a mock interview from it
                </Link>
                .
              </p>
            </div>
          )}
        </section>
      )}

      {(draft.text.trim() || entries.length > 0) && (
        <section className="stack-sm" aria-labelledby="jd-add">
          <h2 id="jd-add">Missing a skill?</h2>
          <form
            className="row"
            onSubmit={(event) => {
              event.preventDefault()
              addSkill(newSkill)
            }}
          >
            <label className="visually-hidden" htmlFor="jd-add-skill">
              Skill to add
            </label>
            <input
              id="jd-add-skill"
              className="search-input"
              value={newSkill}
              placeholder="e.g. Crossplane, Kafka, Windows Server"
              onChange={(event) => setNewSkill(event.target.value)}
            />
            <button type="submit" className="btn btn--secondary" disabled={!newSkill.trim()}>
              Add skill
            </button>
          </form>
          {suggestions.length > 0 && (
            <div className="stack-sm">
              <p className="subtle" style={{ margin: 0 }}>
                Also in the job description - add any that are skills:
              </p>
              <div className="chip-row" role="group" aria-label="Suggested skills">
                {suggestions.map((term) => (
                  <button key={term} type="button" className="chip" onClick={() => addSkill(term)}>
                    + {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {byArea.map((group) => (
        <section key={group.area} className="stack" aria-labelledby={`jd-area-${group.area}`}>
          <h2 id={`jd-area-${group.area}`}>{jdAreaTitle[group.area]}</h2>
          {group.items.map((item) => (
            <SkillSection
              key={item.entry.skill.id}
              entry={item.entry}
              onHide={() =>
                update({
                  hidden: [...draft.hidden, item.entry.skill.id],
                  added: draft.added.filter(
                    (term) => (knownSkillFor(term) ?? customSkill(term)).id !== item.entry.skill.id,
                  ),
                })
              }
            />
          ))}
        </section>
      ))}

      {draft.hidden.length > 0 && (
        <p className="subtle">
          {draft.hidden.length} skill{draft.hidden.length === 1 ? '' : 's'} hidden.{' '}
          <button type="button" className="linklike" onClick={() => update({ hidden: [] })}>
            Show them again
          </button>
        </p>
      )}
    </div>
  )
}

function SkillSection({ entry, onHide }: { entry: Entry; onHide: () => void }) {
  const { state, setInterviewStatus, rateCard } = useProgress()
  const [shown, setShown] = useState(FIRST_SHOWN)
  const { skill } = entry
  const { questionIds, strongCount, topics } = questionsForSkill(skill)
  const links = webSearchLinks(skill)
  const questions = questionIds
    .slice(0, shown)
    .map((id) => interviewQuestionById.get(id))
    .filter((found): found is NonNullable<typeof found> => Boolean(found))

  return (
    <article
      className="card stack-sm"
      id={`jd-${skill.id}`}
      aria-labelledby={`jd-${skill.id}-title`}
    >
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <h3 id={`jd-${skill.id}-title`} style={{ margin: 0, flex: '1 1 auto' }}>
          {skill.name}
        </h3>
        <button
          type="button"
          className="btn btn--ghost"
          aria-label={`Hide ${skill.name}`}
          onClick={onHide}
        >
          ✕
        </button>
      </div>
      <div className="page-header__meta">
        {entry.added ? (
          <Badge tone="info">Added by you</Badge>
        ) : (
          <Badge>
            Mentioned {entry.mentions} time{entry.mentions === 1 ? '' : 's'}
          </Badge>
        )}
        {strongCount > 0 ? (
          <Badge tone="success">
            {questionIds.length} question{questionIds.length === 1 ? '' : 's'} in your app
          </Badge>
        ) : questionIds.length > 0 ? (
          <Badge tone="warning">Only mentioned inside answers</Badge>
        ) : (
          <Badge tone="danger">Not in the app yet</Badge>
        )}
      </div>

      {strongCount === 0 && (
        <div className="notice notice--warning">
          <span className="notice__icon" aria-hidden="true">
            🌐
          </span>
          <div className="stack-sm">
            <p style={{ margin: 0 }}>
              {questionIds.length === 0
                ? `Your app has no questions on ${skill.name} yet. Find the answers on the web:`
                : `No question is about ${skill.name} directly; it comes up inside the answers below. Read up on the web too:`}
            </p>
            <div className="button-row">
              {links.map((link) => (
                <a
                  key={link.url}
                  className="btn btn--secondary"
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label} ↗
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {topics.length > 0 && strongCount > 0 && (
        <p className="subtle" style={{ margin: 0 }}>
          Most of these are in{' '}
          {topics.slice(0, 3).map((item, index) => (
            <span key={item.topic.id}>
              {index > 0 && ', '}
              <Link to={`/interview/${item.topic.id}`}>{item.topic.shortTitle}</Link> ({item.count})
            </span>
          ))}
          .
        </p>
      )}

      {questions.length > 0 && (
        <div className="itv-question-list">
          {questions.map((found, index) => (
            <div key={found.question.id} className="stack-sm">
              <p className="subtle" style={{ margin: 0 }}>
                <span aria-hidden="true">{found.topic.icon} </span>
                <Link to={`/interview/${found.topic.id}`}>{found.topic.title}</Link>
              </p>
              <InterviewQuestionCard
                question={found.question}
                index={index + 1}
                status={state.interview[found.question.id]?.status}
                onStatusChange={(next) => setInterviewStatus(found.question.id, next)}
                srsCard={state.srs[interviewCardId(found.question.id)]}
                onRate={(rating) => rateCard(interviewCardId(found.question.id), rating)}
              />
            </div>
          ))}
        </div>
      )}

      <div className="button-row">
        {shown < questionIds.length && (
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setShown((current) => current + 10)}
          >
            Show {Math.min(10, questionIds.length - shown)} more
          </button>
        )}
        {strongCount > 0 && (
          <span className="subtle">
            More on the web:{' '}
            {links.map((link, index) => (
              <span key={link.url}>
                {index > 0 && ' · '}
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  {link.label.split(':')[0]}
                </a>
              </span>
            ))}
          </span>
        )}
      </div>
    </article>
  )
}
