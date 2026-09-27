import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'
import { loadState, progressKey } from './lib/storage'
import { signInForTest } from './test/session'
import { az104Course } from './content/courses'

/** Lessons are looked up by id so a title edit does not break navigation tests. */
const lesson = (id: string) => {
  const found = az104Course.topics.find((topic) => topic.id === id)
  if (!found) throw new Error(`expected lesson ${id}`)
  return found
}
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const rbac = lesson('az1-rbac')
const rbacTitle = new RegExp(escape(rbac.title), 'i')
const vnets = lesson('az1-vnets-peering')
const vnetsTitle = new RegExp(escape(vnets.title), 'i')

const renderApp = () => {
  window.history.pushState({}, '', '/')
  return render(<App />)
}

describe('navigation', () => {
  beforeEach(() => {
    window.localStorage.clear()
    signInForTest()
  })

  it('renders the home page with the app name and the independence disclaimer', () => {
    renderApp()
    expect(screen.getByRole('heading', { level: 1, name: /azure learning hub/i })).toBeVisible()
    expect(screen.getByText(/independent learning tool/i)).toBeVisible()
    expect(screen.getByText(/not affiliated with, endorsed by/i)).toBeVisible()
  })

  it('shows the AZ-104 course card with its progress at zero', () => {
    renderApp()
    expect(screen.getByText(/Microsoft Azure Administrator/i)).toBeVisible()
    expect(screen.getAllByText(/0%/).length).toBeGreaterThan(0)
  })

  it('offers a Continue Learning action and an exam-readiness indicator', () => {
    renderApp()
    expect(screen.getByRole('link', { name: /start learning|continue learning/i })).toBeVisible()
    expect(screen.getByRole('heading', { name: /exam readiness/i })).toBeVisible()
    expect(screen.getByRole('heading', { name: /daily practice suggestion/i })).toBeVisible()
  })

  it('navigates from home to the AZ-900 dashboard and shows its three published ranges', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('link', { name: /^AZ-900 dashboard$/i }))

    expect(await screen.findByRole('heading', { level: 1, name: /AZ-900/i })).toBeVisible()
    for (const [title, weight] of [
      ['Describe cloud concepts', '25–30%'],
      ['Describe Azure architecture and services', '35–40%'],
      ['Describe Azure management and governance', '30–35%'],
    ]) {
      const heading = screen.getByRole('heading', { name: title as string })
      const section = heading.closest('section')
      expect(section, `section for ${title}`).not.toBeNull()
      expect(within(section as HTMLElement).getByText(`${weight} of exam`)).toBeVisible()
    }
  })

  it('navigates into a lesson and renders every required section', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', `/az104/topics/${rbac.id}`)
    render(<App />)

    expect(await screen.findByRole('heading', { level: 1, name: rbacTitle })).toBeVisible()

    for (const section of [
      /what this is, in plain language/i,
      /why you need this/i,
      /how it works/i,
      /important objects and fields/i,
      /real-world example/i,
      /code examples/i,
      /cli commands/i,
      /infrastructure as code/i,
      /verification commands/i,
      /troubleshooting commands/i,
      /common mistakes/i,
      /az-104 exam tips/i,
      /summary/i,
      /practice questions/i,
      /hands-on lab/i,
    ]) {
      // Scoped to <main> and tolerant of the word appearing more than once.
      const matches = within(screen.getByRole('main')).getAllByText(section)
      expect(matches.length, String(section)).toBeGreaterThan(0)
    }

    expect(screen.getByRole('button', { name: /mark as completed/i })).toBeVisible()
    await user.click(screen.getByRole('link', { name: /^Search the course$/i }))
    expect(
      await screen.findByRole('heading', { level: 1, name: /search the course/i }),
    ).toBeVisible()
  })

  it('hides practice answers until the learner reveals them', async () => {
    window.history.pushState({}, '', `/az104/topics/${rbac.id}`)
    render(<App />)
    await screen.findByRole('heading', { level: 1, name: rbacTitle })
    // Native <details> keeps the answer in the DOM but collapsed.
    const reveals = screen.getAllByText(/show answer/i)
    expect(reveals.length).toBeGreaterThanOrEqual(3)
    for (const reveal of reveals) {
      expect(reveal.closest('details')?.open).toBe(false)
    }
  })

  it('shows a helpful not-found page for an unknown route', async () => {
    window.history.pushState({}, '', '/az104/topics/does-not-exist')
    render(<App />)
    expect(
      await screen.findByRole('heading', { level: 1, name: /lesson not found/i }),
    ).toBeVisible()
  })

  it('shows a not-found page for an unknown path', async () => {
    window.history.pushState({}, '', '/nowhere')
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: /page not found/i })).toBeVisible()
  })

  it('exposes primary navigation for mobile and desktop', () => {
    renderApp()
    const navs = screen.getAllByRole('navigation', { name: /primary/i })
    expect(navs.length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByRole('link', { name: /^Practice$/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /^Exams$/ }).length).toBeGreaterThan(0)
  })

  it('marks only the current destination as the current page', async () => {
    window.history.pushState({}, '', `/az104/topics/${rbac.id}`)
    render(<App />)
    await screen.findByRole('heading', { level: 1, name: rbacTitle })

    // Sidebar curriculum links point at dashboard sections, so none of them -
    // and not the AZ-104 course link either - should claim to be the current
    // PAGE here.
    const current = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page')
    expect(current).toHaveLength(0)

    // The course switcher does mark which course you are inside, but as a
    // location rather than a page.
    const inCourse = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'location')
      .map((link) => link.textContent)
    expect(inCourse.length).toBeGreaterThan(0)
    expect(inCourse.every((text) => /AZ-104/i.test(text ?? ''))).toBe(true)

    // On the dashboard itself, the AZ-104 course link is current.
    window.history.pushState({}, '', '/az104')
    render(<App />)
    await screen.findAllByRole('heading', { level: 1, name: /AZ-104/i })
    const onDashboard = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page')
      .map((link) => link.textContent)
    expect(onDashboard.length).toBeGreaterThan(0)
    expect(onDashboard.every((text) => /AZ-104|Course/i.test(text ?? ''))).toBe(true)
  })

  it('leads with interview preparation, then courses, on the home page', () => {
    renderApp()
    const main = screen.getByRole('main')

    // The app is FOR two things. They come before the course-specific
    // detail cards, and interview preparation comes first.
    const sections = [...main.querySelectorAll('h2')].map((h) => h.textContent ?? '')
    const interview = sections.findIndex((text) => /interview preparation/i.test(text))
    const courses = sections.findIndex((text) => /certification courses/i.test(text))
    const readiness = sections.findIndex((text) => /exam readiness/i.test(text))

    expect(interview).toBeGreaterThanOrEqual(0)
    expect(interview).toBeLessThan(courses)
    expect(courses).toBeLessThan(readiness)
  })

  it('puts interview preparation and courses at the top of the sidebar', () => {
    renderApp()

    // Home first, then the two main sections, before any course tool.
    const links = [...document.querySelectorAll('.sidebar a')].map((a) => a.textContent ?? '')
    const home = links.findIndex((text) => /^\s*🏠?\s*Home\s*$/.test(text))
    const interview = links.findIndex((text) => /interview preparation/i.test(text))
    const firstCourse = links.findIndex((text) => /AZ-900/.test(text))
    const practice = links.findIndex((text) => /practice questions/i.test(text))

    expect(home).toBeLessThan(interview)
    expect(interview).toBeLessThan(firstCourse)
    expect(firstCourse).toBeLessThan(practice)
  })

  it('gives the two main sections more visual weight than the rest', () => {
    renderApp()
    const main = document.querySelector('.sidebar__section--main')
    expect(main).not.toBeNull()

    // Both live inside the emphasised block; the course tools do not.
    expect(main?.textContent).toMatch(/interview preparation/i)
    expect(main?.textContent).toMatch(/courses/i)
    expect(main?.textContent).not.toMatch(/command reference/i)
  })

  it('reaches interview preparation from the mobile tab bar', () => {
    renderApp()
    const tabs = screen.getByRole('navigation', { name: /primary/i })
    expect(within(tabs).getByRole('link', { name: /^Interview$/ })).toBeInTheDocument()
  })

  it('has a skip link for keyboard users', () => {
    renderApp()
    expect(screen.getByRole('link', { name: /skip to content/i })).toBeInTheDocument()
  })
})

describe('progress persistence', () => {
  beforeEach(() => {
    window.localStorage.clear()
    signInForTest()
  })

  it('records a visit to a lesson so Continue Learning has a target', async () => {
    window.history.pushState({}, '', `/az104/topics/${vnets.id}`)
    const { unmount } = render(<App />)
    await screen.findByRole('heading', { level: 1, name: vnetsTitle })

    // The visit is written to localStorage by the provider effect.
    await vi.waitFor(() => {
      expect(loadState().lastVisitedTopicId).toBe(vnets.id)
    })
    expect(loadState().topics[vnets.id].status).toBe('in-progress')
    unmount()
  })

  it('persists a completed lesson across a full remount', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', `/az104/topics/${vnets.id}`)
    const first = render(<App />)
    await screen.findByRole('heading', { level: 1, name: vnetsTitle })

    await user.click(screen.getByRole('button', { name: /^mark as completed$/i }))
    await vi.waitFor(() => {
      expect(loadState().topics[vnets.id].status).toBe('completed')
    })
    // Written under the signed-in learner's own key, not a shared one.
    expect(window.localStorage.getItem(progressKey())).toContain('completed')

    first.unmount()

    // A fresh mount reads the stored record back.
    window.history.pushState({}, '', `/az104/topics/${vnets.id}`)
    render(<App />)
    expect(
      await screen.findByRole('button', { name: /completed — mark as not done/i }),
    ).toBeVisible()
  })

  it('reflects completion in the dashboard percentage', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', `/az104/topics/${vnets.id}`)
    const first = render(<App />)
    await screen.findByRole('heading', { level: 1, name: vnetsTitle })
    await user.click(screen.getByRole('button', { name: /^mark as completed$/i }))
    await vi.waitFor(() => expect(loadState().topics[vnets.id].status).toBe('completed'))
    first.unmount()

    window.history.pushState({}, '', '/az104')
    render(<App />)
    const progress = await screen.findByRole('progressbar', { name: /1 of \d+ lessons complete/i })
    expect(progress).toBeVisible()
  })

  it('toggles a completed lesson back to in progress', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', `/az104/topics/${vnets.id}`)
    render(<App />)
    await screen.findByRole('heading', { level: 1, name: vnetsTitle })

    await user.click(screen.getByRole('button', { name: /^mark as completed$/i }))
    await vi.waitFor(() => expect(loadState().topics[vnets.id].status).toBe('completed'))

    await user.click(screen.getByRole('button', { name: /completed — mark as not done/i }))
    await vi.waitFor(() => expect(loadState().topics[vnets.id].status).toBe('in-progress'))
  })
})
