import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ProgressProvider } from '../lib/progress-provider'
import { loadState } from '../lib/storage'
import { TEST_EMAIL, signInForTest } from '../test/session'
import { K8sLabPage } from './K8sLabPage'

/**
 * The page is rendered on its own (the route is wired in App.tsx separately),
 * inside the progress provider the app gives it.
 */
const LAB_KEY = `azure-learning-hub.k8slab.user.${TEST_EMAIL}`

const open = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ProgressProvider userEmail={TEST_EMAIL}>
        <K8sLabPage />
      </ProgressProvider>
    </MemoryRouter>,
  )

const terminal = () => screen.getByRole('textbox', { name: 'Command' })

describe('Kubernetes troubleshooting lab', () => {
  beforeEach(() => {
    window.localStorage.clear()
    signInForTest()
  })

  it('lists the scenarios by category and opens the sandbox', () => {
    open('/k8s-lab')
    expect(
      screen.getByRole('heading', { level: 1, name: /kubernetes troubleshooting lab/i }),
    ).toBeVisible()
    expect(screen.getByText('Solved 0/15')).toBeVisible()
    const list = screen.getByRole('navigation', { name: 'Scenarios' })
    expect(within(list).getByText('15 of 15')).toBeVisible()
    expect(within(list).getByRole('heading', { name: 'Scheduling' })).toBeVisible()
    expect(screen.getByRole('heading', { name: /Sandbox cluster/ })).toBeVisible()
  })

  it('runs kubectl in the terminal with realistic output and history', async () => {
    const user = userEvent.setup()
    open('/k8s-lab?s=image-tag-typo')
    expect(screen.getByRole('heading', { name: 'Release stuck in ImagePullBackOff' })).toBeVisible()
    await user.type(terminal(), 'kubectl get pods{Enter}')
    expect(await screen.findByText(/ImagePullBackOff\s+0\s+15m/)).toBeVisible()
    await user.type(terminal(), '{ArrowUp}')
    expect(terminal()).toHaveValue('kubectl get pods')
    expect(
      JSON.parse(window.localStorage.getItem(LAB_KEY) ?? '{}').history['image-tag-typo'],
    ).toEqual(['kubectl get pods'])
  })

  it('completes with Tab', async () => {
    const user = userEvent.setup()
    open('/k8s-lab?s=oom-killed')
    await user.type(terminal(), 'kubectl desc')
    await user.keyboard('{Tab}')
    expect(terminal()).toHaveValue('kubectl describe ')
  })

  it('explains a failed check, then solves with the fix and the right root cause', async () => {
    const user = userEvent.setup()
    open('/k8s-lab?s=image-tag-typo')
    await user.click(screen.getByRole('button', { name: 'Check my fix' }))
    expect(screen.getByText(/Not fixed yet/)).toBeVisible()
    expect(screen.getAllByText(/ImagePullBackOff|ErrImagePull/).length).toBeGreaterThan(0)
    expect(loadState(TEST_EMAIL).challenges['k8s:image-tag-typo']?.solvedAt).toBeUndefined()

    await user.type(
      terminal(),
      'kubectl set image deployment/storefront storefront=acrshoplab.azurecr.io/shop/storefront:2.4.1{Enter}',
    )
    expect(await screen.findByText('deployment.apps/storefront image updated')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Check my fix' }))
    expect(screen.getByText(/Fixed - the cluster is healthy/)).toBeVisible()

    const question = screen.getByRole('group', { name: /Root cause/ })
    await user.click(within(question).getByLabelText(/nodes cannot reach the registry/))
    await user.click(within(question).getByRole('button', { name: 'Submit root cause' }))
    expect(screen.getByText(/Not quite/)).toBeVisible()
    expect(loadState(TEST_EMAIL).challenges['k8s:image-tag-typo']?.solvedAt).toBeUndefined()

    await user.click(within(question).getByLabelText(/does not exist in the registry/))
    await user.click(within(question).getByRole('button', { name: 'Submit root cause' }))
    expect(screen.getByText(/Solved: fixed and diagnosed/)).toBeVisible()
    expect(loadState(TEST_EMAIL).challenges['k8s:image-tag-typo'].solvedAt).toBeDefined()
    expect(
      JSON.parse(window.localStorage.getItem(LAB_KEY) ?? '{}').solvedAt['image-tag-typo'],
    ).toBeDefined()
    expect(screen.getByText('Solved 1/15')).toBeVisible()
  })

  it('writes kubectl output to a file, edits it in the Files tab and applies it', async () => {
    const user = userEvent.setup()
    open('/k8s-lab?s=pvc-storageclass')
    await user.type(terminal(), 'kubectl get pvc wiki-data -o yaml > wiki-data.yaml{Enter}')
    await user.click(screen.getByRole('button', { name: /Files \(1\)/ }))
    expect(screen.getByRole('combobox', { name: 'File' })).toHaveValue('wiki-data.yaml')
    expect(screen.getByRole('textbox', { name: 'wiki-data.yaml contents' })).toHaveTextContent(
      'managed-premium-ssd',
    )
    await user.click(screen.getByRole('button', { name: 'Apply ▶' }))
    expect(await screen.findByText(/persistentvolumeclaim\/wiki-data unchanged/)).toBeVisible()
  })

  it('reveals hints one at a time, the solution and related interview questions', async () => {
    const user = userEvent.setup()
    open('/k8s-lab?s=service-selector')
    await user.click(screen.getByRole('button', { name: 'Show hint 1 of 3' }))
    expect(screen.getByText(/Hint 1:/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Show hint 2 of 3' })).toBeVisible()
    await user.click(screen.getByText('Show solution'))
    expect(screen.getByText('Step by step')).toBeVisible()
    expect(screen.getByText(/Interview follow-up/)).toBeVisible()
    const link = screen.getByRole('link', { name: /How does a Service decide which Pods/ })
    expect(link).toHaveAttribute('href', '/interview/kubernetes#itv-k8s-3')
  })
})
