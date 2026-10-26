import { Link, useParams } from 'react-router-dom'
import { DiagramFigure } from '../components/ui/Diagram'
import { RichText } from '../components/ui/RichText'
import { interviewTopicById } from '../content/interview'
import { projectById, projects } from '../content/projects'

const askBot = (text: string) => `/bot?say=${encodeURIComponent(text)}`

/* ---------- Overview ---------- */

export function ProjectsOverviewPage() {
  return (
    <div className="page page--wide stack">
      <header className="page-header">
        <h1>Projects</h1>
        <p className="page-header__meta">
          The products you have worked on: what each one does, what it offers its customers, how it
          works end to end, and what you owned - written so you can explain it in an interview.
        </p>
      </header>
      <div className="card-grid card-grid--2">
        {projects.map((project) => (
          <Link
            key={project.id}
            to={`/projects/${project.id}`}
            className="card card--interactive stack-sm"
          >
            <div className="row">
              <span aria-hidden="true" style={{ fontSize: '1.5rem' }}>
                {project.icon}
              </span>
              <strong className="card__title" style={{ flex: '1 1 auto' }}>
                {project.name}
              </strong>
            </div>
            <p style={{ margin: 0 }}>{project.tagline}</p>
            <p className="subtle" style={{ margin: 0 }}>
              {project.role}
            </p>
            <div className="chip-row">
              {project.techStack.slice(0, 6).map((tool) => (
                <span key={tool} className="tool-chip">
                  {tool}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
      <p className="subtle">
        Edit <code>src/content/projects/index.ts</code> to change a project or add another.
      </p>
    </div>
  )
}

/* ---------- Detail ---------- */

export function ProjectDetailPage() {
  const { projectId } = useParams()
  const project = projectById.get(projectId ?? '')
  if (!project) {
    return (
      <div className="page stack">
        <header className="page-header">
          <h1>Project not found</h1>
          <p className="page-header__meta">That project is not in the list.</p>
        </header>
        <Link to="/projects">All projects</Link>
      </div>
    )
  }
  const topics = project.relatedTopics.flatMap((id) => {
    const topic = interviewTopicById.get(id)
    return topic ? [topic] : []
  })

  return (
    <div className="page page--wide stack">
      <header className="page-header">
        <p className="subtle" style={{ margin: 0 }}>
          <Link to="/projects">Projects</Link>
        </p>
        <h1>
          <span aria-hidden="true">{project.icon}</span> {project.name}
        </h1>
        <p className="page-header__meta">{project.tagline}</p>
      </header>

      <section className="card stack-sm" aria-labelledby="overview">
        <h2 id="overview" className="card__title">
          Overview
        </h2>
        <p style={{ margin: 0 }}>{project.summary}</p>
        <p className="subtle" style={{ margin: 0 }}>
          My role: {project.role}
        </p>
      </section>

      <div className="stat-grid">
        {project.facts.map((fact) => (
          <div key={fact.label} className="stat">
            <div className="stat__value" style={{ fontSize: '1.05rem' }}>
              {fact.value}
            </div>
            <div className="stat__label">{fact.label}</div>
          </div>
        ))}
      </div>

      <div className="card-grid card-grid--2">
        <section className="card stack-sm">
          <h2 className="card__title">What it does</h2>
          <ul className="role-list">
            {project.whatItDoes.map((item) => (
              <li key={item}>
                <RichText text={item} />
              </li>
            ))}
          </ul>
        </section>
        <section className="card stack-sm">
          <h2 className="card__title">Who it is for</h2>
          <ul className="role-list">
            {project.customers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="stack-sm" aria-labelledby="offers">
        <h2 id="offers">What it offers</h2>
        <div className="card-grid card-grid--3">
          {project.offerings.map((offer) => (
            <div key={offer.title} className="card stack-sm">
              <h3 className="card__title" style={{ margin: 0 }}>
                {offer.title}
              </h3>
              <p className="subtle" style={{ margin: 0 }}>
                <RichText text={offer.detail} />
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="stack-sm" aria-labelledby="how">
        <h2 id="how">How it works</h2>
        <DiagramFigure diagram={project.diagram} />
        <ol className="role-list">
          {project.howItWorks.map((step) => (
            <li key={step.title}>
              <strong>{step.title}:</strong> <RichText text={step.detail} />
            </li>
          ))}
        </ol>
      </section>

      <section className="stack-sm" aria-labelledby="platform">
        <h2 id="platform">The platform behind it</h2>
        <div className="card-grid card-grid--3">
          {project.platform.map((area) => (
            <div key={area.title} className="card stack-sm">
              <h3 className="card__title" style={{ margin: 0 }}>
                {area.title}
              </h3>
              <ul className="role-list">
                {area.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="card stack-sm" aria-labelledby="owned">
        <h2 id="owned" className="card__title">
          What I owned
        </h2>
        <ul className="role-list">
          {project.responsibilities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="stack-sm" aria-labelledby="stack">
        <h2 id="stack">Tech stack</h2>
        <div className="chip-row">
          {project.techStack.map((tool) => (
            <span key={tool} className="tool-chip">
              {tool}
            </span>
          ))}
        </div>
      </section>

      <section className="card stack-sm" aria-labelledby="pitch">
        <h2 id="pitch" className="card__title">
          How to explain it in an interview
        </h2>
        <p style={{ margin: 0 }}>
          <strong>In 30 seconds:</strong> {project.pitch.short}
        </p>
        {project.pitch.long.map((paragraph) => (
          <p key={paragraph} style={{ margin: 0 }}>
            <RichText text={paragraph} />
          </p>
        ))}
      </section>

      <div className="card-grid card-grid--2">
        <section className="card stack-sm">
          <h2 className="card__title">Questions they will ask about it</h2>
          <ul className="role-list">
            {project.likelyQuestions.map((question) => (
              <li key={question}>
                {question}{' '}
                <Link className="subtle" to={askBot(question)}>
                  practise →
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="card stack-sm">
          <h2 className="card__title">Topics to revise</h2>
          <ul className="role-list">
            {topics.map((topic) => (
              <li key={topic.id}>
                <Link to={`/interview/${topic.id}`}>
                  {topic.icon} {topic.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
