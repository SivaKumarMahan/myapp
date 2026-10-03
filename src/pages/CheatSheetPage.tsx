import { useSearchParams } from 'react-router-dom'
import { UnknownCourse } from '../components/UnknownCourse'
import { RichText } from '../components/ui/RichText'
import type { Course, Domain } from '../content/types'
import { useCourseIndex } from '../lib/use-course'

const weightOf = (domain: Domain) =>
  domain.examWeight !== null
    ? `${domain.examWeight}% of the exam`
    : (domain.weightLabel ?? 'Supporting section')

function DomainSheet({ course, domain }: { course: Course; domain: Domain }) {
  const topics = course.topics
    .filter((topic) => topic.domainId === domain.id)
    .sort((a, b) => a.order - b.order)
  return (
    <article className="cheat-sheet" aria-labelledby={`cheat-${domain.id}`}>
      <header className="cheat-sheet__head">
        <h2 id={`cheat-${domain.id}`}>
          {course.examCode} · {domain.title}
        </h2>
        <span>{weightOf(domain)}</span>
      </header>
      <div className="cheat-sheet__cols">
        {topics.map((topic) => (
          <section key={topic.id} className="cheat-block">
            <h3>{topic.title}</h3>
            <p className="cheat-one">
              <RichText text={topic.oneLiner} />
            </p>
            <ul>
              {topic.summary.slice(0, 4).map((point) => (
                <li key={point}>
                  <RichText text={point} />
                </li>
              ))}
            </ul>
            {topic.examTips.length > 0 && (
              <p className="cheat-tip">
                <strong>Exam tip:</strong> <RichText text={topic.examTips[0]} />
              </p>
            )}
            {topic.imperative.slice(0, 2).map((example) => (
              <code key={example.command} className="cheat-cmd">
                {example.command}
              </code>
            ))}
          </section>
        ))}
      </div>
      <footer className="cheat-sheet__foot">
        Azure Learning Hub · {course.targetVersion} · generated {new Date().toLocaleDateString()}
      </footer>
    </article>
  )
}

/**
 * Printable cheat sheets: one page per exam domain, built from the lessons'
 * summaries, exam tips and key commands. Print or save as PDF from the browser.
 */
export function CheatSheetPage() {
  const index = useCourseIndex()
  const [params, setParams] = useSearchParams()
  if (!index) return <UnknownCourse />
  const { course } = index
  const domains = [...course.domains].sort((a, b) => a.order - b.order)
  const selected = params.get('domain') ?? domains[0]?.id ?? ''
  const shown = selected === 'all' ? domains : domains.filter((domain) => domain.id === selected)

  return (
    <div className="page page--wide stack cheat-page">
      <header className="page-header no-print">
        <h1>{course.examCode} cheat sheets</h1>
        <p className="page-header__meta">
          One page per exam domain, from the lessons&rsquo; summaries, exam tips and key commands.
          Use Print, then &ldquo;Save as PDF&rdquo; to keep a copy.
        </p>
      </header>
      <div className="row no-print">
        <label className="field" style={{ flex: '1 1 16rem' }}>
          <span className="field__label">Domain</span>
          <select
            className="select"
            value={selected}
            onChange={(event) => setParams({ domain: event.target.value }, { replace: true })}
          >
            {domains.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.title}
              </option>
            ))}
            <option value="all">All domains (one page each)</option>
          </select>
        </label>
        <button
          type="button"
          className="btn"
          style={{ alignSelf: 'end' }}
          onClick={() => window.print()}
        >
          🖨️ Print / save as PDF
        </button>
      </div>
      {shown.map((domain) => (
        <DomainSheet key={domain.id} course={course} domain={domain} />
      ))}
    </div>
  )
}
