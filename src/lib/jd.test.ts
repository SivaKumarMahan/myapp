import { describe, expect, it } from 'vitest'
import { interviewQuestionById, interviewTopicById } from '../content/interview'
import { jdSkills } from '../content/jd/skills'
import {
  customSkill,
  detectSkills,
  jdPackTag,
  knownSkillFor,
  questionsForSkill,
  unrecognisedTerms,
  webSearchLinks,
} from './jd'

const JD = `Senior DevOps Engineer

We are looking for an engineer with 5+ years of experience in Microsoft Azure.
- Build and maintain CI/CD pipelines in Azure DevOps and GitHub Actions.
- Deploy containerised workloads to AKS with Helm; Docker is a must.
- Infrastructure as Code using Terraform (Bicep is a plus).
- Monitoring with Prometheus, Grafana and Azure Monitor.
- Scripting in Python, Bash or PowerShell.
- Experience with Pulumi and Istio is nice to have.
- Familiarity with SOX controls and ServiceNow.`

describe('the JD skill list', () => {
  it('has unique ids, and every topic hint is a real interview topic', () => {
    const ids = jdSkills.map((skill) => skill.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const skill of jdSkills) {
      expect(skill.aliases.length, skill.id).toBeGreaterThan(0)
      for (const topic of skill.topics ?? [])
        expect(interviewTopicById.has(topic), topic).toBe(true)
    }
  })
})

describe('reading a job description', () => {
  const found = detectSkills(JD).map((match) => match.skill.id)

  it('finds the skills it asks for, in the order it mentions them', () => {
    for (const id of [
      'azure',
      'cicd',
      'azure-devops',
      'github-actions',
      'aks',
      'helm',
      'docker',
      'iac',
      'terraform',
      'bicep-arm',
      'prometheus',
      'grafana',
      'azure-monitor',
      'python',
      'shell',
      'powershell',
      'pulumi',
      'service-mesh',
      'itsm',
    ])
      expect(found, id).toContain(id)
    expect(found.indexOf('azure')).toBeLessThan(found.indexOf('terraform'))
  })

  it('does not count a word inside a longer skill name as a second skill', () => {
    expect(detectSkills('Azure DevOps pipelines').map((match) => match.skill.id)).not.toContain(
      'azure',
    )
    expect(detectSkills('GitHub Actions').map((match) => match.skill.id)).toEqual([
      'github-actions',
    ])
  })

  it('matches short ambiguous words only in capitals', () => {
    expect(detectSkills('We write services in Go.').map((match) => match.skill.id)).toContain('go')
    expect(detectSkills('ready to go live').map((match) => match.skill.id)).not.toContain('go')
  })

  it('suggests technical words it does not know, and skips ones it does', () => {
    const terms = unrecognisedTerms(JD, detectSkills(JD))
    expect(terms).toContain('SOX')
    expect(terms).not.toContain('AKS')
    expect(terms).not.toContain('CI')
  })
})

describe('questions for a skill', () => {
  it('finds questions that really mention the skill, best first', () => {
    const kubernetes = jdSkills.find((skill) => skill.id === 'kubernetes')!
    const { questionIds, topics } = questionsForSkill(kubernetes)
    expect(questionIds.length).toBeGreaterThan(20)
    expect(interviewQuestionById.get(questionIds[0])!.question.prompt).toMatch(
      /kubernetes|k8s|kubectl/i,
    )
    expect(topics[0].count).toBeGreaterThan(0)
  })

  it('reports nothing for a skill the bank does not cover', () => {
    expect(questionsForSkill(customSkill('Zzyzx Quantum Mesh')).questionIds).toEqual([])
  })

  it('maps a typed term to a known skill when there is one', () => {
    expect(knownSkillFor('k8s')?.id).toBe('kubernetes')
    expect(knownSkillFor('Zzyzx')).toBeUndefined()
    expect(customSkill('  Crossplane ').name).toBe('Crossplane')
  })

  it('builds web searches and a pack tag', () => {
    const links = webSearchLinks(customSkill('Crossplane'))
    expect(links[0].url).toBe(
      'https://www.google.com/search?q=Crossplane%20interview%20questions%20and%20answers',
    )
    expect(jdPackTag('Contoso - DevOps')).toBe('JD: Contoso - DevOps')
    expect(jdPackTag('  ')).toBe('JD: job description')
  })
})
