import type { InterviewQuestion } from '../../../types'

/** YAML questions and the YAML summary notes. */
export const myGeneralYamlQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mygen-62',
    level: 'basic',
    kind: 'open',
    prompt: 'What is YAML and where is it used?',
    probing: 'The definition plus the point that valid YAML is not valid configuration.',
    answer: [
      "YAML (YAML Ain't Markup Language) is a human-readable data serialization format used for configuration. It represents scalars, lists, and key-value mappings using indentation. Unlike JSON or XML, it favors a clean, minimal syntax that uses indentation for structure, much like Python does, while staying fully machine-parsable.",
      'Kubernetes manifests, Ansible playbooks, Helm values, Docker Compose, GitHub Actions, Azure Pipelines, and many application configurations use it.',
      'YAML describes data; the consuming tool decides what that data means. A syntactically valid YAML file can still be invalid for Kubernetes or a pipeline, so I validate both YAML syntax and the target schema.',
      'I also avoid putting secrets directly in YAML committed to Git.',
    ],
    code: [
      {
        title: 'Simple YAML document',
        language: 'yaml',
        code: `application:
  name: orders-api
  replicas: 3
  features:
    - payments
    - notifications`,
      },
    ],
    tags: ['yaml', 'basics'],
  },
  {
    id: 'itv-mygen-63',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the basic building blocks of YAML?',
    probing: 'Key-value pairs, lists and nesting.',
    answer: [
      '**1. Key-value pairs** — the simplest YAML structure: a label, then its value.',
      '**2. Lists / arrays** — created using hyphens; each item starts with a hyphen followed by a space.',
      '**3. Nested structures** — YAML shines when representing complex, nested data: maps inside maps, and lists inside maps.',
    ],
    code: [
      {
        title: 'Key-value pairs',
        language: 'yaml',
        code: `name: John Smith
age: 35
occupation: Software Engineer`,
      },
      {
        title: 'List',
        language: 'yaml',
        code: `hobbies:
  - Reading
  - Hiking
  - Photography
  - Cooking`,
      },
      {
        title: 'Nested structure',
        language: 'yaml',
        code: `person:
  name: Sarah Johnson
  age: 28
  contact:
    email: sarah.j@example.com
    phone: 555-123-4567
  skills:
    - Python
    - JavaScript
    - Docker`,
      },
    ],
    tags: ['yaml', 'basics'],
  },
  {
    id: 'itv-mygen-64',
    level: 'basic',
    kind: 'open',
    prompt: 'Why is indentation important in YAML, and what are the key syntax rules?',
    probing: 'Spaces not tabs, colon-space, quoting and block scalars.',
    answer: [
      'Indentation defines parent-child structure. YAML uses spaces rather than braces, so moving a line can change its meaning or make the document invalid. Tabs must not be used for indentation.',
      '- **Indentation**: use spaces, not tabs. Indentation shows structure.\n- **Colon + space**: always put a space after the colon in `key: value`.\n- **Quotes**: quote strings with special characters like `:` or `#`.\n- **`|` block**: keeps line breaks as-is.\n- **`>` block**: folds line breaks into spaces.\n- **Comments**: start with `#`.',
      'I stick to a consistent two-space convention, turn on whitespace display in my editor, and run `yamllint` plus tool-specific validation. When something breaks, I check the exact line the parser reports, and the parent keys around it.',
      'Copying YAML through chat or documents can introduce tabs or smart characters, so I validate the actual committed file.',
    ],
    code: [
      {
        title: 'Correct: ports belongs to the container',
        language: 'yaml',
        code: `containers:
  - name: api
    image: example/api:1.0
    ports:
      - containerPort: 8080`,
      },
      {
        title: 'Indentation and colon rules',
        language: 'text',
        code: `correct:
  nested_key: value

incorrect:
nested_key: value  # nested_key is no longer a child of "incorrect"

correct: value
incorrect:value    # missing space after the colon`,
      },
      {
        title: 'Quotes and comments',
        language: 'yaml',
        code: `# This is a comment
message: "This text has: colons, commas, and other symbols!"
name: John  # This is an inline comment`,
      },
    ],
    tags: ['yaml', 'syntax'],
  },
  {
    id: 'itv-mygen-65',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between a YAML list and a map?',
    probing: 'Type awareness and how schemas depend on it.',
    answer: [
      'A map stores named key-value pairs; a list stores ordered items. A list item starts with `-`.',
      'The distinction matters because schemas expect a specific type. Kubernetes `metadata.labels` is a map, while `spec.template.spec.containers` is a list.',
      'If I supply a map where a list is required, parsing may succeed but schema validation fails with a type error.',
    ],
    code: [
      {
        title: 'Map and list of maps',
        language: 'yaml',
        code: `# Map
labels:
  app: orders
  tier: backend

# List of maps
containers:
  - name: api
    image: example/api:1.0
  - name: log-agent
    image: example/agent:2.0`,
      },
    ],
    tags: ['yaml', 'syntax'],
  },
  {
    id: 'itv-mygen-66',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do strings and multi-line strings work in YAML?',
    probing: 'Implicit typing pitfalls and literal versus folded blocks.',
    answer: [
      'Strings can be plain, single-quoted, double-quoted, or written in block style. A plain value that looks like a boolean, number, date, or null can get interpreted as that type instead of a string — it depends on the YAML version and the parser.',
      'Single quotes keep most characters literal. Double quotes support escape sequences. I quote anything unclear — image tags, wildcard-like values, and any string with a `:`, `#`, or a leading special character.',
      'The pipe character (`|`) preserves line breaks; the greater-than symbol (`>`) folds line breaks into spaces.',
      "I confirm the consumer's expected type rather than quoting everything automatically.",
    ],
    code: [
      {
        title: 'String styles',
        language: 'yaml',
        code: `plain: hello
literal: |
  first line
  second line
folded: >
  this becomes one
  folded line
port_as_string: "8080"
special: "value:with:colons"`,
      },
      {
        title: 'Literal and folded blocks',
        language: 'yaml',
        code: `literal_description: |
  This is a longer description
  that spans multiple lines.
  Each line break is preserved.
folded_description: >
  This is a longer description
  that spans multiple lines.
  Line breaks become spaces.`,
      },
    ],
    tags: ['yaml', 'strings'],
  },
  {
    id: 'itv-mygen-67',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are YAML anchors and aliases?',
    probing: 'Reuse within a document and the limits of parser support.',
    answer: [
      'An anchor names a YAML node with `&name`, and an alias reuses it with `*name`. The merge key `<<` is commonly used to reuse mappings.',
      'Anchors reduce duplication within one YAML document, but support and merge behavior depend on the consuming parser. Kubernetes manifests do not provide a general cross-file templating system through anchors.',
      'For complex reuse I prefer Helm, Kustomize, or pipeline templates because they make environment composition more explicit.',
    ],
    code: [
      {
        title: 'Anchors, aliases and merge keys',
        language: 'yaml',
        code: `defaults: &defaults
  retries: 3
  timeout: 30

development:
  <<: *defaults
  endpoint: https://dev.example.com

production:
  <<: *defaults
  endpoint: https://prod.example.com
  retries: 5`,
      },
    ],
    tags: ['yaml', 'anchors'],
  },
  {
    id: 'itv-mygen-68',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How is YAML used in Kubernetes?',
    probing: 'The four top-level fields and validating before and after apply.',
    answer: [
      'Kubernetes YAML describes API objects and their desired state. The main fields are `apiVersion`, `kind`, `metadata`, and `spec`.',
      'I validate it with a schema tool and `kubectl apply --dry-run=server -f deployment.yaml`. After applying it for real, I check rollout status, the Pods, events, and the Service endpoint.',
      'I store manifests in Git, review changes, pin images, and keep secrets outside plaintext YAML.',
    ],
    code: [
      {
        title: 'Deployment manifest',
        language: 'yaml',
        code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: example/api:1.0.0
          ports:
            - containerPort: 8080`,
      },
    ],
    tags: ['yaml', 'kubernetes'],
  },
  {
    id: 'itv-mygen-69',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How is YAML used in CI/CD? Show a GitHub Actions workflow.',
    probing: 'Platform schemas on top of YAML, and safe pipeline practices.',
    answer: [
      'CI/CD YAML defines triggers, stages, jobs, dependencies, variables, artifacts, environments, and deployment rules. The syntax is always YAML, but each platform has its own schema on top of it.',
      'A safe setup runs CI on every pull request, and restricts production deployment to protected branches or environments.',
      'I keep build and deployment jobs separate. I build one artifact and reuse it everywhere rather than rebuilding per environment, since rebuilding risks producing a slightly different artifact each time. I use secret references instead of raw values, pin external tasks and actions to a specific version, and add timeouts and rollback checks.',
      "I validate using the platform's linter and a test branch. A YAML parser only proves the file parses correctly — it says nothing about whether the job permissions, conditions, or deployment logic are actually right.",
    ],
    code: [
      {
        title: 'GitHub Actions: build and test',
        language: 'yaml',
        code: `name: Build and Test Application

# Trigger on push to main branch
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

# Jobs to run
jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm install

    - name: Run tests
      run: npm test

    - name: Build application
      run: npm run build`,
      },
    ],
    tags: ['yaml', 'ci/cd', 'github actions'],
  },
  {
    id: 'itv-mygen-70',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you validate YAML files?',
    probing:
      'Layered validation: syntax, schema, tool and behaviour, including rendered templates.',
    answer: [
      'I validate at several levels: first syntax and style, then schema validation, then target-tool validation, and finally behavioral testing. For pipelines I use the GitHub/GitLab/Azure pipeline linter. Editor YAML linting extensions or an online validator help while writing. CI should fail on invalid YAML before deployment.',
      'If validation fails, I check indentation, duplicate keys, whether a list or map was expected, unavailable API versions, and values that templating may have altered. I inspect the rendered output too, since a correct template can still generate invalid YAML for certain input values.',
    ],
    code: [
      {
        title: 'Validation commands',
        language: 'bash',
        code: `yamllint config.yaml
yq '.' config.yaml >/dev/null
kubectl apply --dry-run=server -f deployment.yaml
helm lint ./chart
helm template test ./chart | kubeconform -strict`,
      },
    ],
    tags: ['yaml', 'validation'],
  },
  {
    id: 'itv-mygen-71',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are common YAML mistakes and how do you avoid them?',
    probing: 'Recognising syntax errors versus logical errors in Kubernetes YAML.',
    answer: [
      'Common mistakes: tabs, wrong indentation, duplicate keys, missing colons or missing spaces after colons, wrong list nesting, unclear unquoted special characters, inconsistent types, and multiline text using the wrong block style. In Kubernetes specifically, label-selector mismatches and placing a field under the wrong parent are common logical errors.',
      'Stick to consistent indentation — 2 spaces is the usual convention. YAML parsers reject tab characters used for indentation, so use spaces instead.',
      'A list written at the same indentation as its parent key is still valid YAML, but indenting list items under the key is clearer and matches most style guides. A missing space after the hyphen (`-Reading`) turns the item into a plain string instead of a list entry.',
      'To prevent these, I rely on editor YAML support, `yamllint`, schema validation, small reviewed changes, and rendered-output tests for templates. I avoid copy-pasting between environments by hand, and I never assume that a file parsing successfully means the application configuration is actually correct.',
    ],
    code: [
      {
        title: 'Wrong vs correct',
        language: 'text',
        code: `# WRONG - inconsistent indentation
user:
  name: John
 age: 30

# WRONG - missing space after colon
name:John

# WRONG - the second colon needs quotes
message: Hello: World
# Correct
message: "Hello: World"

# Clearer list formatting
hobbies:
  - Reading`,
      },
    ],
    tags: ['yaml', 'mistakes'],
  },
  {
    id: 'itv-mygen-72',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you manage environment-specific YAML?',
    probing: 'Base plus overlays, no copy-paste drift, and promotion of the same version.',
    answer: [
      'I keep a common base and store only differences per environment. The mechanism depends on the tool:\n- Helm: one chart with `values-dev.yaml`, `values-stage.yaml`, and `values-prod.yaml`\n- Kustomize: a base plus environment overlays\n- CI/CD: reusable templates plus protected environment variables\n- Applications: base configuration plus external configuration/secret references',
      'I do not duplicate entire manifests because fixes then drift between environments. Secrets stay in a secret manager.',
      'CI renders the final configuration, validates schemas and policies, displays a reviewable diff, and promotes the same application version. After deployment I verify the environment received the intended values without exposing sensitive output.',
    ],
    followUps: ['Helm values files or Kustomize overlays — when would you pick each?'],
    tags: ['yaml', 'environments', 'helm', 'kustomize'],
  },
  {
    id: 'itv-mygen-73',
    level: 'basic',
    kind: 'open',
    prompt:
      'Show realistic nested YAML examples, such as a family tree, a hobby tracker and a travel planner.',
    probing: 'Comfort reading deeply nested maps and lists of maps.',
    answer: [
      'Representing relationships and hierarchical data shows how YAML combines maps, lists and lists of maps. A family tree has a list of members, each with their own nested hobby list; a hobby tracker nests categories several levels deep; a travel planner mixes lists of days, nested activities, a budget map and packing lists.',
      'Note the quoted values such as `"22:45"`, `"14:00"` and `"2025-04-12"` — quoting stops the parser from treating them as numbers, times or dates.',
    ],
    code: [
      {
        title: 'Family tree',
        language: 'yaml',
        code: `family:
  name: The Smiths
  members:
    - name: James Smith
      role: Father
      age: 42
      hobbies:
        - Woodworking
        - Gardening
        - Chess

    - name: Maria Smith
      role: Mother
      age: 40
      hobbies:
        - Painting
        - Running
        - Cooking

    - name: Emma Smith
      role: Daughter
      age: 15
      hobbies:
        - Volleyball
        - Piano
        - Reading
      school: Lincoln High School

    - name: Alex Smith
      role: Son
      age: 10
      hobbies:
        - Soccer
        - Video games
        - Science experiments
      school: Washington Elementary

  pets:
    - name: Max
      type: Dog
      breed: Golden Retriever
      age: 5
    - name: Whiskers
      type: Cat
      breed: Maine Coon
      age: 3`,
      },
      {
        title: 'Hobby tracker',
        language: 'yaml',
        code: `hobby_tracker:
  user: taylor_garcia
  categories:
    books:
      currently_reading:
        - title: The Midnight Library
          author: Matt Haig
          pages: 304
          progress: 75%
      completed_this_year:
        - title: Project Hail Mary
          author: Andy Weir
          rating: 5
        - title: Educated
          author: Tara Westover
          rating: 4.5
      want_to_read:
        - Cloud Atlas
        - The Three-Body Problem
        - Klara and the Sun

    fitness:
      weekly_goals:
        running:
          distance_km: 20
          current_progress: 12.5
        strength_training:
          sessions: 3
          completed: 2
      personal_records:
        5k_time: "22:45"
        deadlift_kg: 120

    cooking:
      favorite_recipes:
        - name: Vegetable Curry
          cuisine: Indian
          last_made: "2025-04-12"
        - name: Sourdough Bread
          cuisine: Artisan
          last_made: "2025-04-30"
      recipes_to_try:
        - Ramen from scratch
        - Thai Green Curry
        - Homemade Pasta`,
      },
      {
        title: 'Travel planner',
        language: 'yaml',
        code: `travel_plans:
  destination: Japan
  duration_days: 14
  travelers:
    - name: Emma Wilson
      passport: AB123456
      dietary_restrictions: Vegetarian
    - name: Marcus Wilson
      passport: CD789012
      dietary_restrictions: None

  itinerary:
    - day: 1
      date: 2025-06-10
      location: Tokyo
      accommodations:
        name: Shibuya Excel Hotel
        confirmation: TMY6789
      activities:
        - time: "14:00"
          activity: Check-in at hotel
        - time: "16:00"
          activity: Explore Shibuya Crossing
        - time: "19:00"
          activity: Welcome dinner at Ichiran Ramen
          reservation: true
          confirmation: RMN4532

    - day: 2
      date: 2025-06-11
      location: Tokyo
      accommodations:
        name: Shibuya Excel Hotel
        confirmation: TMY6789
      activities:
        - time: "09:00"
          activity: Tsukiji Outer Market
        - time: "13:00"
          activity: Meiji Shrine
        - time: "16:00"
          activity: Harajuku shopping
        - time: "20:00"
          activity: Dinner at Gonpachi
          reservation: true
          confirmation: GPC7812

  budget:
    currency: USD
    categories:
      flights: 1800
      accommodations: 2200
      food: 1000
      activities: 800
      shopping: 500
      contingency: 700
    total: 7000

  packing_list:
    documents:
      - Passport
      - Flight tickets
      - Hotel reservations
      - Travel insurance
    clothing:
      - T-shirts: 7
      - Pants: 3
      - Dresses: 2
      - Jackets: 1
      - Walking shoes: 1
      - Formal shoes: 1
    electronics:
      - Camera
      - Smartphone
      - Universal adapter
      - Power bank`,
      },
    ],
    tags: ['yaml', 'examples'],
  },
  {
    id: 'itv-mygen-74',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you convert between YAML and JSON?',
    probing: 'Using safe loaders when parsing YAML in code.',
    answer: [
      'YAML converts easily to and from other data formats like JSON. In Python, `yaml.safe_load` parses YAML into Python objects and `json.dumps` serializes them; `json.load` plus `yaml.dump` goes the other way.',
      'YAML is simple and readable, which is why it is everywhere in configuration — and the same structure and syntax rules apply in Kubernetes, Docker, GitHub Actions, and most other modern DevOps tools.',
    ],
    code: [
      {
        title: 'YAML <-> JSON in Python',
        language: 'python',
        code: `import yaml
import json

# Convert YAML to JSON
with open('data.yaml', 'r') as yaml_file:
    yaml_data = yaml.safe_load(yaml_file)
    json_data = json.dumps(yaml_data)

# Convert JSON to YAML
with open('data.json', 'r') as json_file:
    json_data = json.load(json_file)
    yaml_data = yaml.dump(json_data)`,
      },
    ],
    tags: ['yaml', 'json', 'python'],
  },
]
