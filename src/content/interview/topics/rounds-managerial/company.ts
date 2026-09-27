import type { InterviewQuestion } from '../../../types'

/** Company research for the Deloitte managerial round: why Deloitte, and the facts to draw on. */
export const roundsManagerialCompanyQuestions: InterviewQuestion[] = [
  {
    id: 'itv-rmgr-8',
    level: 'basic',
    kind: 'open',
    prompt: 'Why do you want to join Deloitte?',
    probing:
      'Whether your reason is specific to Deloitte - enterprise scale, client variety, cloud and AI depth - and tied to your own growth.',
    answer: [
      '**Short answer:** "I want to work on larger enterprise projects with modern cloud and DevOps practices. Deloitte\'s exposure to different clients, complex environments, and opportunities to learn new technologies align well with my career goals."',
      '**Improved answer:** "I want to join Deloitte because I see it as an opportunity to work on larger enterprise environments and more complex DevOps challenges.',
      'In my current experience, I have worked with Azure, Terraform, Kubernetes, Docker, CI/CD, and automation. Now I want to take that experience to a larger environment where I can work on enterprise-scale infrastructure, improve my technical depth, and interact with different teams and stakeholders.',
      'I also like the fact that Deloitte works with different clients and technologies. I believe that exposure will help me grow both technically and professionally, and over time I would like to take more ownership and move towards a senior or lead DevOps role."',
      '**If they ask: "Why Deloitte and not another company?"**',
      '"What interests me about Deloitte is the combination of enterprise-scale projects, client exposure, and opportunities to work across different technologies and environments.',
      "I'm not looking at this only as a company change. I'm looking for an environment where I can take more ownership, solve larger technical problems, and grow into a stronger DevOps professional. That's what makes this opportunity relevant to my career at this stage.\"",
      '**Using the company facts:** "What draws me to Deloitte is the scale of enterprise and global clients — from Microsoft to Morgan Stanley to Boeing — the depth of investment in cloud and AI through partnerships with Azure, AWS, and Google Cloud, and the recognition it has as a top employer, like being named a World\'s Best Workplace. As someone working in Azure, Terraform, and Kubernetes, I see Deloitte as a place where I can apply that experience at enterprise scale, work across different technologies and industries, and grow into a senior or lead DevOps role."',
    ],
    followUps: ['Why Deloitte and not another company?'],
    tags: ['motivation', 'deloitte'],
  },
  {
    id: 'itv-rmgr-16',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What do you know about the company? Why do you want to join us? (CEO, headquarters, founded when, policies, growth, reviews)',
    probing:
      'Whether you researched the company - leadership, HQ, history, clients, growth and culture - and can tie it to your own goals.',
    answer: [
      '"Before an interview, I research the company across a few areas: leadership (who the CEO/leadership team is), headquarters and global presence, when the company was founded and its major milestones, the kind of clients and industries it serves, its growth trajectory and recent achievements, and employee reviews on platforms like Glassdoor to understand culture and work environment.',
      "For example, for Deloitte — it's one of the Big Four professional services firms, headquartered in London, serving clients across consulting, technology, and enterprise transformation globally. What draws me to it is the scale of enterprise projects, the variety of clients and technologies, and the strong learning and growth culture reflected in employee reviews.",
      'I make sure I can speak to this specifically for whichever company I\'m interviewing with, because it shows genuine interest rather than a generic answer."',
      "Note: Update the leadership, HQ, founding year, and specifics above with current facts for the exact company you're interviewing with — this is a template to fill in, not a static answer. The company-facts questions in this topic (from About_Deloitte_Company_Info.md) have detailed Deloitte-specific facts (leadership, HQ, revenue, clients, India operations) to draw from.",
      '**Deloitte version, using the company facts:** "Deloitte is one of the Big Four professional services firms, founded in 1845 in London, and headquartered there today under Deloitte Touche Tohmatsu Limited. It operates in 150+ countries with 470,000+ employees and serves nearly 90% of the Fortune Global 500. While it\'s known for audit and tax, its largest and fastest-growing business is actually Consulting — ranked No.1 globally by Gartner — with deep alliances with Microsoft, AWS, Google Cloud, and NVIDIA on cloud and AI. In India specifically, Deloitte operates both a domestic practice and Deloitte USI, a large offshore delivery arm with its biggest campus in Hyderabad, and the leadership has announced plans to grow the India workforce toward 200,000."',
    ],
    tags: ['company research', 'deloitte'],
  },
  {
    id: 'itv-rmgr-33',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key facts about Deloitte (founding, structure, size, leadership)?',
    probing:
      'Basic company research: history, structure, scale and leadership, ready to drop 2-3 facts into an answer.',
    answer: [
      'Use this as reference material when answering "What do you know about the company?" / "Why do you want to join us?" — pull in 2-3 relevant facts rather than reciting everything.',
      'Deloitte is a global giant in professional services, offering audit, tax, consulting, and financial advisory services to major clients worldwide. It is one of the **"Big Four"** accounting firms, alongside PwC, EY, and KPMG.',
      '- **Founded**: 1845, in London, by William Welch Deloitte\n- **Global structure**: Operates as **Deloitte Touche Tohmatsu Limited (DTTL)**, a UK private company\n- **Network**: Independent member firms working in **150+ countries**\n- **Global headquarters**: London, United Kingdom\n- **Global employees**: 470,000+ professionals worldwide\n- **Global revenue**: US$70.5 billion (FY2025, ~5% YoY growth)\n- **Market reach**: Serves nearly **90% of Fortune Global 500** companies\n- **Global CEO**: Joe Ucuzoglu\n- **Global Chair**: Anna Marks',
    ],
    tags: ['deloitte', 'company research'],
  },
  {
    id: 'itv-rmgr-34',
    level: 'basic',
    kind: 'open',
    prompt: 'What should you know about Deloitte India operations and Deloitte USI?',
    probing:
      'Whether you understand the India footprint - domestic practice versus the USI offshore delivery arm - and where you would sit.',
    answer: [
      'Deloitte in India, the details worth knowing for an interview:',
      "- **India headquarters:** Mumbai, Maharashtra — registered national HQ at One International Center (Tower 3, 32nd Floor), Senapati Bapat Marg, Prabhadevi.\n- **India employee count:** ~150,000 across 13 major cities.\n- **Expansion:** Deloitte South Asia CEO **Romal Shetty** announced plans to hire an additional 50,000 professionals in India, aiming to scale toward ~200,000.\n- **Dual presence in India** (good detail to mention in an interview):\n- **Deloitte India** — services domestic clients within the Indian economy.\n- **Deloitte USI (U.S. India Offices)** — an offshore delivery arm serving global clients, particularly in the US. Its largest global campus is in **Hyderabad (Deloitte Towers, Gachibowli)**.\n- Tech consulting generates **over 50%** of the firm's total revenue in India.",
    ],
    tags: ['deloitte', 'company research', 'india'],
  },
  {
    id: 'itv-rmgr-35',
    level: 'basic',
    kind: 'open',
    prompt: "What are Deloitte's core service lines, ranked by revenue?",
    probing:
      'Whether you know Deloitte is primarily a consulting and technology firm, not just an accounting firm.',
    answer: [
      'When asked what Deloitte does, don\'t just say "accounting" — it\'s primarily a consulting and technology powerhouse.',
      '1. **Consulting (~$34.5B)** — the largest business unit. Deloitte is ranked the **No. 1 Consulting Service Provider worldwide** by Gartner. Covers digital transformation, cloud strategy, operations, human capital, and AI implementation.\n2. **Audit & Assurance (~$21.2B)** — the foundational pillar; verifying and signing off on financial accuracy and internal controls of corporate giants.\n3. **Tax & Legal (~$9.1B)** — helping multinational corporations navigate global tax structuring, regulations, and legal compliance.\n4. **Financial Advisory (~$5.7B)** — guiding M&A, buyouts, asset valuations, forensic investigations, and restructuring.',
    ],
    tags: ['deloitte', 'company research'],
  },
  {
    id: 'itv-rmgr-36',
    level: 'basic',
    kind: 'open',
    prompt: 'What technology alliances, products and sub-brands does Deloitte have?',
    probing:
      "Whether you can connect Deloitte's cloud and AI alliances to the DevOps work you would be doing.",
    answer: [
      'Deloitte handles major enterprise tech products and global alliances, not just standalone software:',
      '- **Generative AI & Cloud partnerships:** deeply embedded with **NVIDIA, Microsoft (Azure), Google Cloud, and AWS** — building enterprise-grade AI frameworks on these platforms.\n- **Enterprise software:** large-scale implementations of **Salesforce, SAP, Oracle, and Workday**.\n- **Sub-brands:** **Deloitte Digital** (creative consultancy for customer experience and digital product design) and **Monitor Deloitte** (high-level executive strategy).\n- **Cybersecurity:** ranked **No. 1 globally in security services** by Gartner, managing cyber threat defense for corporate infrastructure.',
    ],
    tags: ['deloitte', 'company research', 'cloud'],
  },
  {
    id: 'itv-rmgr-37',
    level: 'basic',
    kind: 'open',
    prompt: "Who are Deloitte's biggest clients, by industry sector?",
    probing:
      'Awareness of the scale and variety of the client base, which you can cite when explaining why you want to join.',
    answer: [
      'Deloitte serves nearly 90% of the Fortune Global 500 and holds a 15% market share of the SEC audit market — the largest among the Big Four.',
      "- **Technology & Telecom (TMT):** Microsoft (one of Deloitte's most historic, largest clients); strategic alliances with Apple and Alphabet.\n- **Financial Services (largest sector, ~$18B/year):** Morgan Stanley, MetLife (largest insurance client), Berkshire Hathaway, Blackstone Group, Apollo Global Management.\n- **Consumer & Industrials:** Boeing, General Motors (GM), Procter & Gamble (P&G), Starbucks.\n- **Government & Public Sector:** brings in more government contracting revenue than any other Big Four competitor — e.g., $4 billion in US federal contracts in a single year, dominant in defense, civil, and healthcare consulting.",
    ],
    tags: ['deloitte', 'company research'],
  },
  {
    id: 'itv-rmgr-38',
    level: 'basic',
    kind: 'open',
    prompt: 'What awards and recognition does Deloitte have as an employer?',
    probing: 'Whether you have looked at the employer brand and culture, not just the business.',
    answer: [
      'Recent employer-brand recognition worth mentioning:',
      "- **World's Best Workplaces 2022** — Great Place to Work® and Fortune® magazine\n- **LinkedIn Top Companies 2022**\n- **Most Attractive Employers (World) 2021** — Universum\n- **Disability Equality Index (DEI)** — Best Place to Work for Disability Inclusion",
      'Deloitte\'s stated values emphasize innovation, inclusion, and "making an impact that matters."',
    ],
    tags: ['deloitte', 'company research', 'culture'],
  },
]
