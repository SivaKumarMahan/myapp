import { describe, expect, it } from 'vitest'
import { analyseDockerfile, parseDockerfile } from './dockerfile'
import { analyseKubernetes } from './kubernetes'
import { analysePipeline } from './pipeline'

const rules = (findings: { rule: string }[]) => findings.map((finding) => finding.rule)
const find = (
  findings: { rule: string; line: number; title: string; message: string }[],
  rule: string,
) => findings.find((finding) => finding.rule === rule)

describe('pipeline YAML', () => {
  it('reports YAML syntax errors with their line', () => {
    const { findings } = analysePipeline(
      'trigger:\n  - main\nsteps:\n  - script: [unclosed\n  - script: two\n',
    )
    expect(findings[0]).toMatchObject({ rule: 'YAML', severity: 'error' })
  })

  it('suggests the key you meant, at the right line', () => {
    const { findings } = analysePipeline(
      'trigger: [main]\npool: { vmImage: ubuntu-latest }\nsteps:\n  - script: echo hi\n    displayname: Say hi\n',
    )
    expect(find(findings, 'SCHEMA')).toMatchObject({ title: "Unknown key 'displayname'", line: 5 })
    expect(find(findings, 'SCHEMA')?.message).toMatch(/Did you mean 'displayName'\?/)
  })

  it('finds unknown and circular dependencies', () => {
    const yaml = [
      'trigger: [main]',
      'pool: { vmImage: ubuntu-latest }',
      'stages:',
      '  - stage: A',
      '    dependsOn: C',
      '    jobs: [{ job: a, steps: [{ script: echo }] }]',
      '  - stage: B',
      '    dependsOn: A',
      '    jobs: [{ job: b, steps: [{ script: echo }] }]',
      '  - stage: C',
      '    dependsOn: [B, Bee]',
      '    jobs: [{ job: c, steps: [{ script: echo }] }]',
    ].join('\n')
    const { findings, facts } = analysePipeline(yaml)
    expect(find(findings, 'AZP-DEPENDS')).toMatchObject({
      title: "Stage 'C' depends on unknown 'Bee'",
      line: 11,
    })
    expect(find(findings, 'AZP-CYCLE')?.message).toMatch(
      /A → C → B → A|C → B → A → C|B → A → C → B/,
    )
    expect(facts.graph.map((node) => node.dependsOn)).toEqual([['C'], ['A'], ['B', 'Bee']])
  })

  it('treats stages without dependsOn as running in order', () => {
    const { facts } = analysePipeline(
      'trigger: [main]\npool: { vmImage: ubuntu-latest }\nstages:\n  - stage: One\n    jobs: [{ job: a, steps: [{ script: x }] }]\n  - stage: Two\n    jobs: [{ job: b, steps: [{ script: y }] }]\n',
    )
    expect(facts.graph[1]).toMatchObject({ id: 'Two', dependsOn: ['One'], implicit: true })
  })

  it('checks GitHub Actions workflows', () => {
    const workflow = [
      'on: [push, pul_request]',
      'permissions: { contents: read }',
      'jobs:',
      '  build:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: actions/checkout',
      '      - uses: some/action@0123456789abcdef0123456789abcdef01234567',
      '  deploy:',
      '    needs: build',
      '    runs-on: ubuntu-latest',
      '    steps: [{ run: ./go.sh }]',
    ].join('\n')
    const { findings, facts } = analysePipeline(workflow)
    expect(facts.kind).toBe('github')
    expect(rules(findings)).toContain('GHA-EVENT')
    expect(find(findings, 'GHA-PIN')).toMatchObject({ line: 7 })
    expect(rules(findings)).not.toContain('GHA-SHA')
    expect(facts.graph.find((node) => node.id === 'deploy')?.dependsOn).toEqual(['build'])
  })

  it('flags pull_request_target checking out the PR head', () => {
    const { findings } = analysePipeline(
      'on: pull_request_target\npermissions: { contents: read }\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          ref: ${{ github.event.pull_request.head.sha }}\n',
    )
    expect(find(findings, 'GHA-PRTARGET')?.line).toBe(9)
  })
})

describe('Dockerfile', () => {
  it('joins continuation lines and tracks stages', () => {
    const { instructions, stages } = parseDockerfile(
      'FROM golang:1.23 AS build\nRUN apt-get update \\\n    && apt-get install -y git\nFROM scratch\nCOPY --from=build /app /app\n',
    )
    expect(instructions.map((instruction) => [instruction.keyword, instruction.line])).toEqual([
      ['FROM', 1],
      ['RUN', 2],
      ['FROM', 4],
      ['COPY', 5],
    ])
    expect(stages).toEqual([
      { name: 'build', image: 'golang', tag: '1.23', digest: null, line: 1 },
      { name: null, image: 'scratch', tag: null, digest: null, line: 4 },
    ])
  })

  it('does not count a registry port as a tag', () => {
    const { findings } = analyseDockerfile(
      'FROM myregistry:5000/team/app\nUSER app\nHEALTHCHECK NONE\nCMD ["app"]\n',
    )
    expect(find(findings, 'DF001')?.title).toBe('myregistry:5000/team/app has no tag')
  })

  it('accepts a clean image', () => {
    const { findings } = analyseDockerfile(
      'FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nUSER node\nHEALTHCHECK CMD wget -qO- localhost:3000 || exit 1\nCMD ["node", "server.js"]\n',
    )
    expect(findings.filter((finding) => finding.severity !== 'info')).toEqual([])
  })
})

describe('Kubernetes', () => {
  it('checks every document in a multi-document file, with lines', () => {
    const manifest = [
      'apiVersion: v1',
      'kind: Pod',
      'metadata:',
      '  name: a',
      '  labels: { app: a }',
      'spec:',
      '  containers:',
      '    - name: c',
      '      image: busybox:1.36',
      '      securityContext:',
      '        privileged: true',
      '---',
      'apiVersion: v1',
      'kind: Service',
      'metadata: { name: s }',
      'spec:',
      '  selector: { app: b }',
      '  ports: [{ port: 80 }]',
    ].join('\n')
    const { findings, facts } = analyseKubernetes(manifest)
    expect(find(findings, 'K8S017')?.line).toBe(11)
    expect(find(findings, 'K8S025')).toMatchObject({ line: 17, title: 'Service s selects no pods' })
    expect(facts.resources.map((resource) => resource.kind)).toEqual(['Pod', 'Service'])
  })

  it('does not ask a Job for probes', () => {
    const { findings } = analyseKubernetes(
      'apiVersion: batch/v1\nkind: Job\nmetadata: { name: j, labels: { app: j } }\nspec:\n  template:\n    metadata: { labels: { app: j } }\n    spec:\n      containers: [{ name: j, image: "busybox:1.36" }]\n',
    )
    expect(rules(findings)).not.toContain('K8S015')
    expect(rules(findings)).not.toContain('K8S016')
  })
})
