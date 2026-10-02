import { Link } from 'react-router-dom'
import { courseIndexes } from '../content/registry'
import { useProgress } from '../lib/use-progress'
import { mistakesFor } from '../lib/review-deck'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/StateBlock'
import { RichText } from '../components/ui/RichText'

const formatDate = (time: number) =>
  new Date(time).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

/**
 * Every practice and mock-exam question you got wrong, collected
 * automatically, per course. Each course's list drills as its own deck.
 */
export function MistakesPage() {
  const { state, removeMistake } = useProgress()
  const perCourse = courseIndexes
    .map((course) => ({ course, questions: mistakesFor(state, course) }))
    .filter((entry) => entry.questions.length > 0)
  const total = perCourse.reduce((sum, entry) => sum + entry.questions.length, 0)

  return (
    <div className="page stack-lg">
      <header className="page-header">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span aria-hidden="true">/</span>
          <span>Mistake notebook</span>
        </nav>
        <h1>Mistake notebook</h1>
        <p className="muted">
          Every practice or mock-exam question you answered wrongly. A question leaves the notebook
          once you answer it correctly without picking &ldquo;Guessed&rdquo;.
        </p>
        <div className="page-header__meta">
          <Badge tone={total > 0 ? 'danger' : 'success'}>
            {total} {total === 1 ? 'mistake' : 'mistakes'}
          </Badge>
        </div>
      </header>

      {perCourse.length === 0 ? (
        <EmptyState
          icon="📓"
          title="No mistakes collected"
          description="Wrong answers in practice questions and mock exams are added here automatically."
          action={
            <Link className="btn" to="/review">
              Go to Due today
            </Link>
          }
        />
      ) : (
        perCourse.map(({ course, questions }) => (
          <section
            key={course.course.id}
            className="card stack"
            aria-label={course.course.examCode}
          >
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 className="card__title" style={{ margin: 0 }}>
                <span aria-hidden="true">{course.course.icon} </span>
                {course.course.examCode}
                <span className="subtle"> · {questions.length}</span>
              </h2>
              <Link className="btn" to={`${course.course.route}/practice/mistakes`}>
                Drill {questions.length} {questions.length === 1 ? 'mistake' : 'mistakes'}
              </Link>
            </div>
            <ul className="mistake-list">
              {questions.map((question) => {
                const entry = state.mistakes[question.id]
                return (
                  <li key={question.id} className="mistake-item">
                    <div className="mistake-item__body">
                      <RichText text={question.prompt} />
                      <span className="subtle">
                        Missed {entry.count}× · last {formatDate(entry.lastWrongAt)} in{' '}
                        {entry.source === 'exam' ? 'a mock exam' : 'practice'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => removeMistake(question.id)}
                      aria-label={`Remove from notebook: ${question.prompt.slice(0, 60)}`}
                    >
                      Remove
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
