import type { InterviewTopic } from '../../../types'
import { myAwsQuestions } from './questions'
import { myAwsArchitectureQuestions } from './architecture'

export const myAwsTopic: InterviewTopic = {
  id: 'my-aws',
  group: 'bank',
  title: 'My AWS questions',
  shortTitle: 'My AWS',
  icon: '🟧',
  order: 113,
  oneLiner:
    'My own AWS notes: S3 and IAM troubleshooting, EC2 and Lambda operations, networking, and three-tier, multi-region and DR designs.',
  headlines: [
    'A three-tier VPC spans AZs: public subnets for load balancers and NAT, private app subnets, isolated data subnets.',
    'Security groups reference tiers instead of broad CIDRs; the app reaches only the database or cache port it needs.',
    'One NAT gateway per AZ, and VPC endpoints for S3, ECR, Logs and Secrets Manager to cut NAT cost and dependency.',
    'For EC2 high CPU, find the process and the type of pressure before touching capacity; scaling out alone hides the cause.',
    'Every policy layer must allow an S3 request (IAM, bucket, SCP, boundary, endpoint, KMS) and an explicit deny anywhere wins.',
    'Terraform manages the ECR repository; Docker authenticates separately. Create, push and pull are separate authorisation paths.',
    'Roles with temporary credentials by default; IAM users with static keys are the legacy exception.',
  ],
  questions: [...myAwsQuestions, ...myAwsArchitectureQuestions],
}
