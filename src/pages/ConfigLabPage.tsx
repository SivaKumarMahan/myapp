import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { StreamLanguage } from '@codemirror/language'
import { yaml } from '@codemirror/lang-yaml'
import { dockerFile } from '@codemirror/legacy-modes/mode/dockerfile'
import { linter, lintGutter, type Diagnostic } from '@codemirror/lint'
import type { Extension } from '@codemirror/state'
import { labExerciseKey, labExercises, type LabExercise, type LabTab } from '../content/configlab'
import { analyse, exerciseStatus } from '../lib/configlab'
import type { PipelineFacts } from '../lib/configlab/pipeline'
import type { Finding, Severity } from '../lib/configlab/types'
import { readJson, writeJson } from '../lib/local-json'
import { useProgress } from '../lib/use-progress'
import { CodeEditor } from '../components/CodeEditor'
import { PipelineGraph } from '../components/PipelineGraph'
import { Badge } from '../components/ui/Badge'
import { CodeBlock } from '../components/ui/CodeBlock'
import { RichText } from '../components/ui/RichText'

const DRAFT_KEY = 'azure-learning-hub.lab-draft'

const TABS: { id: LabTab; label: string; file: string }[] = [
  { id: 'pipeline', label: 'Pipeline YAML', file: 'azure-pipelines.yml' },
  { id: 'dockerfile', label: 'Dockerfile', file: 'Dockerfile' },
  { id: 'kubernetes', label: 'Kubernetes', file: 'deployment.yaml' },
]

const FREE: Record<LabTab, string> = {
  pipeline: `# Paste an Azure Pipelines or GitHub Actions file.
trigger:
  - main

pool:
  vmImage: ubuntu-latest

stages:
  - stage: Build
    jobs:
      - job: Build
        steps:
          - script: npm ci && npm run build
            displayName: Build
          - task: PublishPipelineArtifact@1
            inputs:
              targetPath: dist
              artifact: web

  - stage: Deploy
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: Web
        environment: production
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo deploying
`,
  dockerfile: `# Paste a Dockerfile.
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
USER node
EXPOSE 3000
HEALTHCHECK CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "server.js"]
`,
  kubernetes: `# Paste Kubernetes manifests (several documents separated by ---).
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  labels:
    app.kubernetes.io/name: web
spec:
  replicas: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: web
  template:
    metadata:
      labels:
        app.kubernetes.io/name: web
    spec:
      containers:
        - name: web
          image: nginx:1.27
`,
}

const LANGUAGES: Record<LabTab, Extension> = {
  pipeline: yaml(),
  dockerfile: StreamLanguage.define(dockerFile),
  kubernetes: yaml(),
}

const SEVERITY: Record<
  Severity,
  { icon: string; label: string; tone: 'danger' | 'warning' | 'info' }
> = {
  error: { icon: '✖', label: 'Error', tone: 'danger' },
  warning: { icon: '⚠', label: 'Warning', tone: 'warning' },
  info: { icon: 'ⓘ', label: 'Tip', tone: 'info' },
}

/** Findings as CodeMirror diagnostics, for the squiggles and gutter markers. */
const lintFor = (tab: LabTab) =>
  [
    lintGutter(),
    linter(
      (view) => {
        const doc = view.state.doc
        return analyse(tab, doc.toString()).findings.map((finding): Diagnostic => {
          const line = doc.line(Math.min(Math.max(1, finding.line), doc.lines))
          return {
            from: line.from,
            to: line.to,
            severity: finding.severity,
            message: `${finding.title}. ${finding.message}`,
            source: finding.rule,
          }
        })
      },
      { delay: 400 },
    ),
  ] as Extension

export function ConfigLabPage() {
  const [params, setParams] = useSearchParams()
  const tab = (TABS.find((entry) => entry.id === params.get('tab'))?.id ?? 'pipeline') as LabTab
  const exerciseId = params.get('exercise')
  const exercise =
    labExercises.find((entry) => entry.id === exerciseId && entry.tab === tab) ?? null

  const select = (next: { tab?: LabTab; exercise?: string | null }) => {
    const values: Record<string, string> = { tab: next.tab ?? tab }
    const target = next.exercise === undefined ? exerciseId : next.exercise
    if (target && (next.tab === undefined || next.tab === tab)) values.exercise = target
    setParams(values, { replace: true })
  }

  return (
    <div className="page page--wide stack">
      <header className="page-header">
        <h1>Config lab</h1>
        <p className="page-header__meta">
          Paste a pipeline, Dockerfile or Kubernetes manifest and get a review as you type - or fix
          a broken file until it is clean.
        </p>
      </header>
      <div className="chip-row" role="tablist" aria-label="File type">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            className="chip"
            aria-selected={tab === entry.id}
            onClick={() => select({ tab: entry.id, exercise: null })}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <Lab
        key={`${tab}:${exercise?.id ?? 'free'}`}
        tab={tab}
        exercise={exercise}
        onExercise={(id) => select({ exercise: id })}
      />
    </div>
  )
}

function Lab({
  tab,
  exercise,
  onExercise,
}: {
  tab: LabTab
  exercise: LabExercise | null
  onExercise: (id: string | null) => void
}) {
  const { state, recordChallengeCheck } = useProgress()
  const draftKey = `${DRAFT_KEY}.${tab}.${exercise?.id ?? 'free'}`
  const [text, setText] = useState(
    () => readJson<string | null>(draftKey, null) ?? exercise?.file ?? FREE[tab],
  )
  const [jump, setJump] = useState<{ line: number; nonce: number } | undefined>()
  const [open, setOpen] = useState<string | null>(null)
  const deferred = useDeferredValue(text)
  const analysis = useMemo(() => analyse(tab, deferred), [tab, deferred])
  const status = exercise ? exerciseStatus(exercise, analysis) : null
  const extensions = useMemo(() => lintFor(tab), [tab])
  const solved = exercise ? Boolean(state.challenges[labExerciseKey(exercise.id)]?.solvedAt) : false

  useEffect(() => writeJson(draftKey, text), [draftKey, text])
  useEffect(() => {
    if (exercise && status?.solved && !solved)
      recordChallengeCheck(labExerciseKey(exercise.id), true)
  }, [exercise, status?.solved, solved, recordChallengeCheck])

  const counts = { error: 0, warning: 0, info: 0 }
  for (const finding of analysis.findings) counts[finding.severity] += 1
  const exercises = labExercises.filter((entry) => entry.tab === tab)
  const file = TABS.find((entry) => entry.id === tab)?.file ?? ''
  const pipeline = tab === 'pipeline' ? (analysis.facts as PipelineFacts) : null

  return (
    <div className="cli-layout">
      <section className="stack-sm" aria-label="Editor">
        <label className="field">
          <span className="field__label">Exercise</span>
          <select
            className="select"
            value={exercise?.id ?? ''}
            onChange={(event) => onExercise(event.target.value || null)}
          >
            <option value="">Free editing - paste your own file</option>
            {exercises.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {state.challenges[labExerciseKey(entry.id)]?.solvedAt ? '✓ ' : ''}
                {entry.title}
              </option>
            ))}
          </select>
        </label>
        {exercise && (
          <div className="card stack-sm">
            <p style={{ margin: 0 }}>
              <RichText text={exercise.description} />
            </p>
            <ul className="cli-checks" aria-label="Requirements">
              <li className={status?.clean ? 'cli-check--pass' : 'cli-check--todo'}>
                <span aria-hidden="true">{status?.clean ? '✓' : '○'}</span> No errors or warnings
                (tips are fine)
              </li>
              {status?.requirements.map((requirement) => (
                <li
                  key={requirement.description}
                  className={requirement.passed ? 'cli-check--pass' : 'cli-check--todo'}
                >
                  <span aria-hidden="true">{requirement.passed ? '✓' : '○'}</span>{' '}
                  {requirement.description}
                </li>
              ))}
            </ul>
            {status?.solved && (
              <div className="notice notice--success" role="status">
                <span className="notice__icon" aria-hidden="true">
                  🎉
                </span>
                <p style={{ margin: 0 }}>
                  <strong>Clean.</strong> Every check passes.
                </p>
              </div>
            )}
          </div>
        )}
        <div className="code-block sql-editor-block">
          <div className="code-block__header">
            <span className="code-block__title">{file}</span>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setText(exercise?.file ?? FREE[tab])}
            >
              {exercise ? 'Start over' : 'Reset example'}
            </button>
          </div>
          <CodeEditor
            value={text}
            onChange={setText}
            onRun={() => undefined}
            language={LANGUAGES[tab]}
            extensions={extensions}
            languageKey={tab}
            label={`${file} contents`}
            minLines={18}
            jumpTo={jump}
          />
        </div>
        {exercise && (
          <details className="reveal">
            <summary className="reveal__summary">Show a reference solution</summary>
            <div className="reveal__body">
              <CodeBlock
                code={exercise.solution}
                language={tab === 'dockerfile' ? 'dockerfile' : 'yaml'}
                title="One clean version"
              />
            </div>
          </details>
        )}
      </section>

      <section className="stack-sm" aria-label="Review">
        <div className="lab-summary" role="status">
          {analysis.findings.length === 0 ? (
            <Badge tone="success">✓ No findings</Badge>
          ) : (
            (['error', 'warning', 'info'] as const).map((severity) =>
              counts[severity] > 0 ? (
                <Badge key={severity} tone={SEVERITY[severity].tone}>
                  {SEVERITY[severity].icon} {counts[severity]}{' '}
                  {severity === 'info'
                    ? counts.info === 1
                      ? 'tip'
                      : 'tips'
                    : `${severity}${counts[severity] === 1 ? '' : 's'}`}
                </Badge>
              ) : null,
            )
          )}
        </div>
        <ul className="lab-findings">
          {analysis.findings.map((finding, index) => (
            <FindingItem
              key={`${finding.rule}-${finding.line}-${index}`}
              finding={finding}
              open={open === `${finding.rule}-${finding.line}-${index}`}
              onToggle={() =>
                setOpen((current) =>
                  current === `${finding.rule}-${finding.line}-${index}`
                    ? null
                    : `${finding.rule}-${finding.line}-${index}`,
                )
              }
              onJump={() => setJump({ line: finding.line, nonce: Date.now() })}
            />
          ))}
        </ul>
        {pipeline && pipeline.graph.length > 0 && (
          <section className="card stack-sm" aria-labelledby="graph-heading">
            <h2 id="graph-heading" className="card__title" style={{ margin: 0 }}>
              Pipeline graph
            </h2>
            <PipelineGraph nodes={pipeline.graph} kind={pipeline.kind} />
          </section>
        )}
      </section>
    </div>
  )
}

function FindingItem({
  finding,
  open,
  onToggle,
  onJump,
}: {
  finding: Finding
  open: boolean
  onToggle: () => void
  onJump: () => void
}) {
  const severity = SEVERITY[finding.severity]
  return (
    <li className={`lab-finding lab-finding--${finding.severity}`}>
      <div className="lab-finding__head">
        <span className="lab-finding__icon" aria-hidden="true">
          {severity.icon}
        </span>
        <button
          type="button"
          className="lab-finding__title"
          onClick={onToggle}
          aria-expanded={open}
        >
          <span className="visually-hidden">{severity.label}: </span>
          {finding.title}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm lab-finding__line"
          onClick={onJump}
          aria-label={`Go to line ${finding.line}`}
        >
          line {finding.line}
        </button>
      </div>
      {open && (
        <div className="lab-finding__body">
          <p style={{ margin: 0 }}>
            <RichText text={finding.message} />
          </p>
          {finding.fix && (
            <CodeBlock
              code={finding.fix.snippet}
              language={finding.fix.language}
              title="How to fix it"
            />
          )}
          <p className="subtle" style={{ margin: 0, fontSize: '0.75rem' }}>
            {severity.label} · rule {finding.rule}
          </p>
        </div>
      )}
    </li>
  )
}
