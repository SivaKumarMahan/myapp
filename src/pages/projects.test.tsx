import { render, screen } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { App } from '../App'
import { interviewTopicById } from '../content/interview'
import { projects } from '../content/projects'
import { signInForTest } from '../test/session'

const goTo = (path: string) => {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('Projects', () => {
  beforeAll(async () => {
    await import('./ProjectsPages')
  }, 20_000)

  beforeEach(() => {
    window.localStorage.clear()
    signInForTest()
  })

  it('lists every project with a link to its page', async () => {
    goTo('/projects')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Projects' }, { timeout: 5000 }),
    ).toBeVisible()
    expect(screen.getAllByRole('link', { name: /Tenetic/ })[0]).toHaveAttribute(
      'href',
      '/projects/tenetic',
    )
    expect(screen.getAllByRole('link', { name: /AimsPlus/ })[0]).toHaveAttribute(
      'href',
      '/projects/aimsplus',
    )
  })

  it('shows what a project does, offers and how it works', async () => {
    goTo('/projects/tenetic')
    expect(
      await screen.findByRole('heading', { level: 1, name: /Tenetic/ }, { timeout: 5000 }),
    ).toBeVisible()
    for (const name of [
      'Overview',
      'What it does',
      'What it offers',
      'How it works',
      'What I owned',
      'How to explain it in an interview',
    ]) {
      expect(screen.getByRole('heading', { name })).toBeVisible()
    }
    expect(screen.getByText('200+ U.S. markets')).toBeVisible()
  })

  it('says so for an unknown project', async () => {
    goTo('/projects/nope')
    expect(
      await screen.findByRole('heading', { name: 'Project not found' }, { timeout: 5000 }),
    ).toBeVisible()
  })

  it('points related topics at interview topics that exist', () => {
    for (const project of projects) {
      expect(new Set(projects.map((entry) => entry.id)).size).toBe(projects.length)
      for (const id of project.relatedTopics) {
        expect(interviewTopicById.has(id), `${project.id} -> ${id}`).toBe(true)
      }
      expect(project.diagram.nodes.length, project.id).toBeLessThanOrEqual(8)
    }
  })
})
