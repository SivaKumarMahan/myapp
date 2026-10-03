// @vitest-environment node
import { it } from 'vitest'
import { interviewTopics } from '../content/interview'
it('probe', () => {
  for (const id of ['azure-networking', 'azure-identity']) {
    const t = interviewTopics.find((x) => x.id === id)!
    for (const q of t.questions) {
      const bold = [...q.answer.join(' ').matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1])
      process.stdout.write(
        `${q.id} [${q.level}/${q.kind}] ${q.prompt}\n   bold: ${bold.slice(0, 10).join(' | ')}\n   follow: ${(q.followUps ?? []).join(' || ').slice(0, 220)}\n`,
      )
    }
  }
})
