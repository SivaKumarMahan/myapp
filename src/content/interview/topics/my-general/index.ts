import type { InterviewTopic } from '../../../types'
import { myGeneralBehavioralQuestions } from './behavioral'
import { myGeneralCloudQuestions } from './cloud'
import { myGeneralDataCodeQuestions } from './data-code'
import { myGeneralYamlQuestions } from './yaml'

export const myGeneralTopic: InterviewTopic = {
  id: 'my-general',
  group: 'bank',
  title: 'My general, behavioural & YAML questions',
  shortTitle: 'My general',
  icon: '💼',
  order: 122,
  oneLiner:
    'Behavioural and leadership answers, interview-prep roadmap, cloud and microservices scenarios, databases, coding rounds and YAML — in your own words.',
  headlines: [
    'Use STAR with concrete, quantified results — and be clear about what you did versus what the team owned.',
    'In incidents, stabilise first (rollback, failover, traffic shift), communicate, then investigate and add a lasting control.',
    'Give a 60–90 second tailored introduction: role, domain and scale, stack, ownership, one measurable result.',
    'Microservices are not automatically better: every boundary adds latency, partial failure and operational cost.',
    'Database changes use expand-and-contract; an app rollback cannot undo a destructive schema change.',
    'Secrets live in a vault and are fetched at runtime with short-lived identity; rotate with overlap, then revoke.',
    'YAML: spaces not tabs, a space after every colon, quote ambiguous values — and valid YAML is not valid config.',
  ],
  questions: [
    ...myGeneralBehavioralQuestions,
    ...myGeneralCloudQuestions,
    ...myGeneralDataCodeQuestions,
    ...myGeneralYamlQuestions,
  ],
}
