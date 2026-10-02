import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App'
import { labExercises } from '../content/configlab'
import { loadState } from '../lib/storage'
import { TEST_EMAIL, signInForTest } from '../test/session'

const goTo = (path: string) => {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('Config lab', () => {
  // The page is lazy-loaded with YAML, Ajv and CodeMirror; load it once up
  // front so no single test's wait has to cover that on a busy runner.
  beforeAll(async () => {
    await import('./ConfigLabPage')
  }, 20_000)

  beforeEach(() => {
    window.localStorage.clear()
    signInForTest()
  })

  it('reviews the example pipeline and draws its graph', async () => {
    goTo('/lab')
    expect(
      await screen.findByRole('heading', { level: 1, name: /config lab/i }, { timeout: 5000 }),
    ).toBeVisible()
    const review = screen.getByRole('region', { name: 'Review' })
    expect(
      within(review).getByRole('img', { name: /pipeline graph: 2 stages.*Deploy after Build/i }),
    ).toBeInTheDocument()
  })

  it('lists findings with explanations and fixes for a broken Dockerfile', async () => {
    const user = userEvent.setup()
    goTo('/lab?tab=dockerfile&exercise=df-node')
    const review = await screen.findByRole('region', { name: 'Review' })
    expect(within(review).getByText(/1 error/)).toBeVisible()
    await user.click(within(review).getByRole('button', { name: /node:latest/ }))
    expect(within(review).getByText(/changes whenever the image is republished/)).toBeVisible()
    expect(within(review).getByText('How to fix it')).toBeVisible()
    expect(within(review).getAllByRole('button', { name: /go to line/i }).length).toBeGreaterThan(5)
  })

  it('records an exercise once the file is clean', async () => {
    const exercise = labExercises.find((entry) => entry.id === 'k8s-cronjob')!
    window.localStorage.setItem(
      `azure-learning-hub.lab-draft.kubernetes.${exercise.id}`,
      JSON.stringify(exercise.solution),
    )
    goTo(`/lab?tab=kubernetes&exercise=${exercise.id}`)
    expect(await screen.findByText(/Every check passes/)).toBeVisible()
    expect(loadState(TEST_EMAIL).challenges['lab:k8s-cronjob'].solvedAt).toBeDefined()
  })

  it('switches tabs', async () => {
    const user = userEvent.setup()
    goTo('/lab')
    await user.click(await screen.findByRole('tab', { name: 'Kubernetes' }))
    expect(screen.getByText('deployment.yaml')).toBeVisible()
  })
})
