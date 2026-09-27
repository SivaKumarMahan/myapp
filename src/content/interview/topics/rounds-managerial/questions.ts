import type { InterviewQuestion } from '../../../types'

/** Behavioural and scenario questions from the managerial round. */
export const roundsManagerialQuestions: InterviewQuestion[] = [
  {
    id: 'itv-rmgr-1',
    level: 'basic',
    kind: 'open',
    prompt: 'Tell me about yourself.',
    probing: 'A crisp, structured summary of your experience, stack and the kind of work you own.',
    answer: [
      '"I have around 5.5 years of experience as a DevOps Engineer. I have worked on Azure, Azure DevOps, Terraform, Kubernetes, Docker, Jenkins, GitHub, Helm, and Linux."',
      '"My work involves building CI/CD pipelines, provisioning infrastructure using Terraform, deploying applications on AKS, monitoring environments, troubleshooting production issues, and automating repetitive tasks using Shell and Python. I also work closely with developers, QA, and infrastructure teams to ensure smooth application delivery."',
    ],
    tags: ['introduction'],
  },
  {
    id: 'itv-rmgr-2',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Tell me about a challenging production issue.',
    probing:
      'Structured troubleshooting under pressure, a real root cause, and what you changed so it would not recur.',
    answer: [
      '"We received alerts that an application deployed on AKS was unavailable. I checked pod status, logs, events, ingress, and service configuration. Pods were healthy, but ingress couldn\'t reach the backend because of a service port mismatch after deployment."',
      '"I corrected the configuration, validated the rollout, and restored the service. Later, we added deployment validation checks to prevent similar issues."',
    ],
    tags: ['production incident', 'troubleshooting'],
  },
  {
    id: 'itv-rmgr-3',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Have you ever made a mistake?',
    probing:
      'Honesty and ownership: admitting a real mistake, fixing it fast and preventing the repeat.',
    answer: [
      '"Yes. During a deployment, I approved a pipeline without verifying one configuration value. The deployment failed in staging."',
      '"I rolled back immediately, corrected the configuration, and added a mandatory validation step in the pipeline. Since then, similar issues have been avoided."',
    ],
    tags: ['ownership', 'mistakes'],
  },
  {
    id: 'itv-rmgr-4',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you handle pressure during production incidents?',
    probing:
      'Calm, fact-based incident handling with impact assessment, stakeholder updates and an RCA afterwards.',
    answer: [
      '"I stay calm and focus on facts. First, I assess the business impact, then collect logs and metrics to identify the root cause."',
      '"I keep stakeholders updated with regular progress while another team member investigates if needed. Once resolved, I conduct a root cause analysis and implement preventive measures."',
    ],
    tags: ['pressure', 'incident management'],
  },
  {
    id: 'itv-rmgr-5',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you prioritize multiple tasks?',
    probing:
      'Whether you prioritise by business impact and keep stakeholders aligned on what comes first.',
    answer: [
      '"I prioritize based on business impact. Production incidents come first, followed by release activities, security fixes, and then routine tasks or enhancements."',
      '"I communicate priorities clearly with stakeholders so expectations are aligned."',
    ],
    tags: ['prioritization'],
  },
  {
    id: 'itv-rmgr-6',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you handle conflicts with developers?',
    probing:
      'Collaboration and maturity: resolving disagreements with evidence rather than opinion.',
    answer: [
      '"I focus on the technical facts rather than opinions."',
      '"I understand their concern, explain the risks with evidence, and work together to find a solution that meets both delivery and operational requirements."',
    ],
    tags: ['conflict', 'collaboration'],
  },
  {
    id: 'itv-rmgr-7',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is your biggest achievement?',
    probing: 'A concrete achievement with measurable impact, not a list of tools.',
    answer: [
      '"I automated infrastructure provisioning using Terraform and standardized CI/CD pipelines."',
      '"This reduced manual effort, minimized configuration errors, and significantly reduced deployment time."',
    ],
    tags: ['achievement'],
  },
  {
    id: 'itv-rmgr-9',
    level: 'basic',
    kind: 'open',
    prompt: 'Why are you leaving your current company?',
    probing:
      'A positive, growth-driven reason for moving that does not criticise your current employer.',
    answer: [
      "**Short answer:** \"I'm looking for better technical exposure, opportunities to work on larger enterprise environments, and more challenging DevOps projects. I appreciate what I've learned in my current role, but I feel it's the right time for the next step.\"",
      '**Improved answer:** "I have gained good experience in my current organization and have worked on technologies such as Azure, Terraform, Kubernetes, Docker, and CI/CD automation. I\'m grateful for that experience.',
      "At this stage, I feel I need more exposure to enterprise-scale environments, complex projects, and larger responsibilities. I'm looking for an opportunity where I can use my existing experience while also challenging myself technically and taking more ownership.",
      'So my decision is mainly driven by career growth and the kind of work I want to take up in the next stage of my career."',
      '**If they ask: "Is there any problem with your current company?"**',
      '"No, there is no major issue with my current organization. I have had a good learning experience there.',
      "My decision is primarily about the next stage of my career. I want to work on larger environments, take more responsibility, and get broader exposure to enterprise DevOps practices. That's why I'm exploring this opportunity.\"",
      "**Important point about salary:** If salary is also a reason, don't lie if they ask directly. But don't make it your primary reason either.",
      'A strong sequence is: Current company gave me good experience -> I have reached the next stage -> I want larger responsibility and enterprise exposure -> Deloitte provides that opportunity.',
      'That sounds much more mature in a leadership discussion.',
    ],
    followUps: ['Is there any problem with your current company?', 'Is salary one of the reasons?'],
    tags: ['motivation', 'career'],
  },
  {
    id: 'itv-rmgr-10',
    level: 'basic',
    kind: 'open',
    prompt: 'Where do you see yourself in five years?',
    probing: 'Whether your ambitions are realistic and fit the growth path the role can offer.',
    answer: [
      '"I see myself as a Senior DevOps Engineer or Technical Lead, leading automation initiatives,',
      'mentoring team members, and designing scalable cloud infrastructure."',
    ],
    tags: ['career'],
  },
  {
    id: 'itv-rmgr-11',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you ensure quality in deployments?',
    probing:
      'Whether quality is built into your pipelines through automated gates, scans, approvals and health checks.',
    answer: [
      '"I use automated CI/CD pipelines with code reviews, Terraform validation, SonarQube analysis,',
      'security scanning using Trivy or Checkov, automated testing, deployment approvals for production, and post-deployment health checks."',
    ],
    tags: ['quality', 'ci/cd'],
  },
  {
    id: 'itv-rmgr-12',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Have you handled customer calls?',
    probing:
      'Client-facing communication during incidents and releases: updates, recovery plans, keeping people informed.',
    answer: [
      '"Yes. During production incidents and release windows, I have participated in bridge calls, provided technical updates,',
      'explained the issue, shared the recovery plan, and kept stakeholders informed until the incident was resolved."',
    ],
    tags: ['client communication', 'incident management'],
  },
  {
    id: 'itv-rmgr-13',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you learn new technologies?',
    probing:
      'A repeatable learning habit that goes from documentation to hands-on practice before production.',
    answer: [
      '"I start with official documentation, build small hands-on projects, read technical blogs,',
      'and apply the knowledge in lab environments before using it in production."',
    ],
    tags: ['learning'],
  },
  {
    id: 'itv-rmgr-14',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Why should we hire you?',
    probing: 'A confident summary of the value you bring, tied to the needs of the role.',
    answer: [
      '"I have practical experience with Azure DevOps, Terraform, Kubernetes, Docker, and CI/CD automation."',
      '"I can troubleshoot production issues, automate repetitive tasks, collaborate effectively with cross-functional teams, and take ownership from development through production support."',
    ],
    tags: ['value proposition'],
  },
  {
    id: 'itv-rmgr-15',
    level: 'basic',
    kind: 'open',
    prompt: 'Do you have any questions for us?',
    probing: 'Genuine interest in the role, the team and how success is measured.',
    answer: [
      'Ask thoughtful questions such as:',
      '- What are the major responsibilities for this role?\n- What cloud platforms and DevOps tools does the team primarily use?\n- How is success measured during the first six months?\n- What are the biggest challenges the team is currently facing?\n- What opportunities are available for learning and career growth?',
    ],
    tags: ['questions for interviewer'],
  },
  {
    id: 'itv-rmgr-17',
    level: 'basic',
    kind: 'open',
    prompt: 'What are your strengths and weaknesses?',
    probing:
      'Self-awareness: real strengths with evidence, and a genuine weakness you are actively working on.',
    answer: [
      '"My strengths are troubleshooting production issues quickly, automating repetitive tasks, and collaborating well with developers and infrastructure teams. I stay calm under pressure and focus on finding the root cause instead of applying a quick patch.',
      'One area I\'ve been actively working on is delegating more instead of trying to solve everything myself. Earlier, I used to take on tasks that could be shared with the team. Now I make it a point to distribute work and mentor others so the team scales, not just me."',
    ],
    tags: ['strengths', 'weaknesses'],
  },
  {
    id: 'itv-rmgr-18',
    level: 'basic',
    kind: 'open',
    prompt: 'What motivates you at work? (hard tasks, productivity)',
    probing: 'What drives you, and whether that fits the problems the team actually has.',
    answer: [
      '"I get motivated by solving hard technical problems — a production issue with an unclear root cause, or automating a process that used to take hours manually."',
      '"Seeing that a fix or automation directly improves the team\'s productivity and reduces manual effort is what keeps me engaged."',
    ],
    tags: ['motivation'],
  },
  {
    id: 'itv-rmgr-19',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Have you ever worked in a leadership position?',
    probing:
      'Evidence of informal leadership - ownership, mentoring, representing the team - even without a title.',
    answer: [
      '"I haven\'t held a formal leadership title, but I have taken end-to-end ownership of production incidents, guided junior engineers on Terraform and Kubernetes practices, and represented the team during client bridge calls."',
      '"I\'m comfortable taking the lead when needed and I\'m looking to grow further into a senior or lead role."',
    ],
    tags: ['leadership'],
  },
  {
    id: 'itv-rmgr-20',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Tell me about your project.',
    probing:
      'Whether you can describe your project, your responsibilities and your impact clearly and concretely.',
    answer: [
      '"In my current project, I work on [client/product name] where I manage Azure infrastructure using Terraform, build and maintain CI/CD pipelines in Azure DevOps, and deploy microservices to AKS using Helm. I\'m responsible for provisioning environments, monitoring application health, troubleshooting production issues, and automating repetitive operational tasks using Shell and Python scripts. I work closely with developers and QA to ensure smooth, reliable releases."',
      'Note: Replace the bracketed placeholder with your actual project/client details before using this answer.',
    ],
    tags: ['project'],
  },
  {
    id: 'itv-rmgr-21',
    level: 'basic',
    kind: 'open',
    prompt: 'Which model have you used? (Agile, Waterfall, Scrum)',
    probing: 'Familiarity with Agile/Scrum ceremonies and how DevOps work is tracked in sprints.',
    answer: [
      '"My teams have mostly followed Agile, specifically Scrum. We work in two-week sprints with daily stand-ups, sprint planning, and retrospectives."',
      '"Infrastructure and deployment tasks are tracked as sprint stories or tickets, which helps prioritize DevOps work alongside development work."',
    ],
    tags: ['agile', 'scrum'],
  },
  {
    id: 'itv-rmgr-22',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'What do you do if a requirement changes at the last minute?',
    probing:
      'Whether you assess impact, communicate risk and a revised timeline, and protect the current release.',
    answer: [
      '"I first understand the reason for the change and how urgent it is. If it affects infrastructure or deployment, I assess the impact on the current pipeline, timeline, and any dependencies."',
      '"I communicate the risk and a revised timeline to stakeholders rather than silently absorbing it. If the change is critical, I re-prioritize and adjust the plan; if it can wait, I schedule it for the next cycle so it doesn\'t destabilize the current release."',
    ],
    tags: ['change management', 'stakeholders'],
  },
  {
    id: 'itv-rmgr-23',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you manage conflicts with a colleague?',
    probing: 'Direct, private, fact-based conflict resolution with a sensible escalation path.',
    answer: [
      '"I try to address it directly and privately rather than letting it escalate."',
      '"I listen to their perspective, explain mine with facts, and focus on the shared goal — delivering a stable, working solution — rather than who is right. If we still can\'t agree, I involve a lead to make an objective call."',
    ],
    tags: ['conflict', 'collaboration'],
  },
  {
    id: 'itv-rmgr-24',
    level: 'basic',
    kind: 'open',
    prompt: 'Are you willing to learn new technologies?',
    probing: 'Adaptability and a track record of picking up new tools.',
    answer: [
      '"Yes, definitely. DevOps tools and cloud platforms keep evolving, so continuous learning is part of the job."',
      '"I regularly pick up new tools through documentation and hands-on labs — for example, that\'s how I learned Terraform and Helm — and I\'m comfortable adapting to whatever stack a project requires."',
    ],
    tags: ['learning'],
  },
  {
    id: 'itv-rmgr-25',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Describe a moment when there was a tight deadline and high pressure.',
    probing:
      'Composure and coordination under a hard deadline, plus a preventive improvement afterwards.',
    answer: [
      '"During a major release, we discovered a critical bug in the pipeline just hours before the client\'s go-live window. I quickly triaged the issue, coordinated with the developer on a fix, tested it in a lower environment, and deployed it with close monitoring."',
      '"I kept stakeholders updated throughout so there were no surprises. We went live on time, and afterward we added an extra validation gate before future releases to catch similar issues earlier."',
    ],
    tags: ['pressure', 'deadlines'],
  },
  {
    id: 'itv-rmgr-26',
    level: 'basic',
    kind: 'open',
    prompt: 'What did you like most in your previous job?',
    probing: 'What you value in a job, and whether it matches this role.',
    answer: [
      '"I liked the ownership I had — from provisioning infrastructure to deploying and supporting it in production."',
      '"I also valued the exposure to different tools and the collaborative environment where developers, QA, and DevOps worked closely together to ship reliably."',
    ],
    tags: ['motivation'],
  },
  {
    id: 'itv-rmgr-27',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'A production deployment fails during a client release. What do you do?',
    probing:
      'Ownership, incident management, rollback and communication - restore service first, then RCA and prevention.',
    answer: [
      '"First, I would take ownership and assess the impact. I would check whether the issue is affecting all users or only a specific component. I would immediately inform the client and relevant stakeholders about the issue and the current status.',
      'From the technical side, I would check the pipeline logs, deployment status, application logs, Kubernetes events, and recent configuration changes to identify the failure.',
      'If the issue cannot be fixed quickly, I would follow the rollback procedure and restore the last known stable version. My priority would be to restore service first rather than spending too much time troubleshooting in production.',
      'Once the service is stable, I would identify the root cause, document it, and implement preventive measures such as additional validation, automated testing, or deployment checks."',
      '**Key point:** Communicate -> Assess impact -> Troubleshoot -> Rollback if required -> Restore -> RCA -> Prevention',
    ],
    followUps: [
      'How do you decide between rolling back and fixing forward in the middle of a release?',
      'What goes into the RCA document you share with the client afterwards?',
    ],
    tags: ['production incident', 'rollback', 'client communication'],
  },
  {
    id: 'itv-rmgr-28',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'A developer disagrees with your deployment decision. How will you handle it?',
    probing:
      'Collaboration, maturity and fact-based decisions - separating the person from the problem.',
    answer: [
      '"I would first understand why the developer disagrees rather than immediately rejecting their opinion. I would ask them to explain their concerns and then compare both approaches based on technical facts, production risk, security, and business impact.',
      'If my approach has a higher risk, I would be open to changing it. If there is still disagreement, I would involve the appropriate technical lead or architect and make a decision based on evidence.',
      'My objective would not be to prove that my decision is correct. The objective is to choose the safest approach for the application and business."',
      '**Strong managerial line:** "I separate the person from the problem. Technical disagreements should be resolved using facts and risk, not personal opinions."',
    ],
    followUps: [
      'What if the technical lead sides with the developer and you still think it is risky?',
    ],
    tags: ['conflict', 'collaboration'],
  },
  {
    id: 'itv-rmgr-29',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      "Your manager asks you to deliver an urgent task while you're already handling a production issue. How do you prioritize?",
    probing: 'Business impact, prioritisation and delegation - not promising to do both at once.',
    answer: [
      '"I would first assess the severity and business impact of the production issue. If production is actively impacted, I would prioritize restoring production because it affects users and the business.',
      'I would immediately communicate to my manager that I am handling a production incident and explain the expected impact and timeline. I would ask whether the new task can be reassigned or whether its deadline can be adjusted.',
      'If both tasks are critical, I would involve another team member and divide the work rather than trying to handle everything myself.',
      'Once production is stable, I would move to the urgent task and provide regular updates to my manager."',
    ],
    traps: [
      'Do not say: "I will work on both simultaneously." That sounds unrealistic. A manager wants to hear prioritization and delegation.',
    ],
    followUps: ['How do you hand over a live incident to a colleague without losing context?'],
    tags: ['prioritization', 'delegation'],
  },
  {
    id: 'itv-rmgr-30',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'One team member is consistently missing deadlines. How would you address it?',
    probing:
      'Leadership, coaching and accountability - understand, support, set expectations, monitor, then escalate.',
    answer: [
      '"First, I would have a one-on-one discussion with the person privately. I would understand whether the problem is related to workload, technical skills, unclear requirements, dependencies, or time management.',
      'I would explain the impact of the missed deadlines and agree on clear expectations and achievable timelines.',
      'If they need technical support, I would arrange mentoring or pair them with an experienced team member. I would also break larger tasks into smaller milestones so progress can be tracked.',
      'I would monitor the situation for some time. If the problem continues despite providing support and clear expectations, I would escalate it to the manager with facts and documented examples."',
      '**Managerial principle:** Understand the reason -> Support -> Set expectations -> Monitor -> Escalate if necessary',
    ],
    traps: [
      'Do not immediately say, "I will report them to the manager." That sounds like poor leadership.',
    ],
    followUps: [
      'What would you document before escalating, and how would you tell the team member?',
    ],
    tags: ['leadership', 'coaching'],
  },
  {
    id: 'itv-rmgr-31',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'A client is unhappy even though the issue has been resolved. How would you manage the conversation?',
    probing:
      'Empathy, transparency and stakeholder management - rebuilding confidence, not just closing the ticket.',
    answer: [
      '"I would first listen to the client and understand why they are still unhappy. I wouldn\'t immediately defend our team or argue that the issue has already been fixed.',
      'I would acknowledge the impact the incident had on their business and clearly explain what happened, what we did to restore the service, and what we are doing to prevent it from happening again.',
      'If there was a delay or mistake from our side, I would be transparent about it. I would also provide a clear follow-up plan with owners and timelines for the preventive actions.',
      'The objective is not just to resolve the technical issue. It is to rebuild the client\'s confidence that we have control of the situation."',
      '**Strong closing statement:** "For me, client management is about transparency, ownership, and predictable communication. Even when the technical issue is resolved, the client needs confidence that the same problem will not happen again."',
    ],
    followUps: ['The client asks for compensation or a penalty clause. How do you respond?'],
    tags: ['client communication', 'stakeholders'],
  },
  {
    id: 'itv-rmgr-32',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the interviewer actually evaluating in the managerial scenario questions?',
    probing:
      'Whether you know the round is about behaviour when things go wrong, and pitch answers at the right length and depth.',
    answer: [
      'For each scenario question, the manager is looking for something specific:',
      '- **Production failure:** Ownership, incident management, rollback, communication\n- **Developer disagreement:** Collaboration, maturity, fact-based decisions\n- **Multiple priorities:** Business impact, prioritization, delegation\n- **Team member missing deadlines:** Leadership, coaching, accountability\n- **Unhappy client:** Empathy, transparency, stakeholder management',
      "For a Deloitte managerial round, keep answers around 60-90 seconds. Don't turn them into Kubernetes/Terraform explanations unless the interviewer asks for technical details. The manager is primarily evaluating how you behave when things go wrong, not whether you can explain kubectl commands.",
    ],
    tags: ['managerial round', 'preparation'],
  },
]
