import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from 'node:util'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App'
import { loadState } from '../lib/storage'
import { TEST_EMAIL, signInForTest } from '../test/session'

const goTo = (path: string) => {
  window.history.pushState({}, '', path)
  return render(<App />)
}

const LAB_KEY = `azure-learning-hub.linuxlab.user.${TEST_EMAIL}`

describe('Linux & Bash lab', () => {
  beforeAll(async () => {
    // just-bash checks `instanceof Uint8Array`, and under jsdom TextEncoder's
    // arrays come from another realm. Re-wrap them before the lab is loaded.
    class SameRealmEncoder extends NodeTextEncoder {
      override encode(input?: string) {
        return new Uint8Array(super.encode(input))
      }
    }
    Object.assign(globalThis, { TextEncoder: SameRealmEncoder, TextDecoder: NodeTextDecoder })
    await import('./LinuxLabPage')
  }, 30_000)

  beforeEach(() => {
    window.localStorage.clear()
    signInForTest()
  })

  const terminal = async () => screen.findByRole('textbox', { name: 'Command' }, { timeout: 8000 })
  const waitForPrompt = async () => {
    const input = await terminal()
    await expect.poll(() => (input as HTMLInputElement).disabled, { timeout: 8000 }).toBe(false)
    return input
  }

  it('opens the sandbox and lists every challenge with filters', async () => {
    const user = userEvent.setup()
    goTo('/linux-lab')
    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: /linux & bash lab/i },
        { timeout: 8000 },
      ),
    ).toBeVisible()
    expect(screen.getByText('Solved 0/62')).toBeVisible()
    const list = screen.getByRole('navigation', { name: 'Challenges' })
    expect(within(list).getByText('62 of 62')).toBeVisible()
    await user.selectOptions(within(list).getByRole('combobox', { name: 'Category' }), 'JSON (jq)')
    expect(within(list).getByText('5 of 62')).toBeVisible()
  })

  it('runs commands in the terminal and keeps the working directory', async () => {
    const user = userEvent.setup()
    goTo('/linux-lab')
    const input = await waitForPrompt()
    await user.type(input, 'cd /etc && cat hostname{Enter}')
    expect(
      await screen.findByText('lab-01', { selector: '.cli-line' }, { timeout: 8000 }),
    ).toBeVisible()
    expect(await screen.findByText('root@lab-01:/etc#', { selector: 'label' })).toBeVisible()
  })

  it('checks a command challenge by its outcome and records it', async () => {
    const user = userEvent.setup()
    goTo('/linux-lab?c=count-errors')
    expect(
      await screen.findByRole('heading', { name: 'How many ERROR lines?' }, { timeout: 8000 }),
    ).toBeVisible()
    const input = await waitForPrompt()
    await user.type(input, 'grep -c ERROR /var/log/app/app.log{Enter}')
    await user.click(screen.getByRole('button', { name: 'Check my answer' }))
    expect(
      await screen.findByText(
        /Solved - it works on your data and on the hidden variant/,
        {},
        { timeout: 15000 },
      ),
    ).toBeVisible()
    expect(loadState(TEST_EMAIL).challenges['linux:count-errors'].solvedAt).toBeDefined()
    expect(
      JSON.parse(window.localStorage.getItem(LAB_KEY) ?? '{}').solvedAt['count-errors'],
    ).toBeDefined()
  }, 30_000)

  it('explains what is wrong with a script that hard-codes its answer', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(
      LAB_KEY,
      JSON.stringify({
        version: 1,
        drafts: { 'add-numbers': '#!/bin/bash\necho 7' },
        hints: {},
        attempts: {},
        solvedAt: {},
        last: null,
      }),
    )
    goTo('/linux-lab?c=add-numbers')
    await user.click(
      await screen.findByRole('button', { name: 'Check my answer' }, { timeout: 8000 }),
    )
    expect(await screen.findByText(/Not yet/, {}, { timeout: 15000 })).toBeVisible()
    expect(screen.getAllByText(/Line 1 should be “-15”, not “7”/).length).toBeGreaterThan(0)
    expect(loadState(TEST_EMAIL).challenges['linux:add-numbers']?.solvedAt).toBeUndefined()
  }, 30_000)

  it('reveals hints one at a time and shows the solution with an explanation', async () => {
    const user = userEvent.setup()
    goTo('/linux-lab?c=top-ips')
    await user.click(
      await screen.findByRole('button', { name: 'Show hint 1 of 3' }, { timeout: 8000 }),
    )
    expect(screen.getByText(/Hint 1:/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Show hint 2 of 3' })).toBeVisible()
    await user.click(screen.getByText('Show solution'))
    expect(screen.getByText('Line by line')).toBeVisible()
    expect(screen.getByText(/Interview follow-up/)).toBeVisible()
  })

  it('delivers alerts to the outbox instead of sending them', async () => {
    const user = userEvent.setup()
    goTo('/linux-lab')
    const input = await waitForPrompt()
    await user.type(input, 'echo "disk is full" | mail -s "Disk alert" ops@example.com{Enter}')
    await user.click(await screen.findByRole('button', { name: /Outbox \(1\)/ }, { timeout: 8000 }))
    expect(screen.getByText('Disk alert')).toBeVisible()
    expect(screen.getByText('to ops@example.com')).toBeVisible()
  }, 30_000)
})
