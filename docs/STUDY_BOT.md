# Study bot: how it works and how to add content

The Study bot (`/bot`) is an interview coach that runs entirely in the browser. **It makes no AI or LLM calls at run time.** All of its intelligence is in two places:

- **Rules.** These cover intents, keyword scoring, the spaced-repetition maths, and the coach's arithmetic over your progress.
- **Pre-written content.** This is JSON in `src/content/bot/`, together with the existing question bank.

The only optional download is **Smart search**, an on-device embedding model (see [Semantic search](#semantic-search-b4)).

## Contents

- [Modes](#modes)
- [Where the data comes from](#where-the-data-comes-from)
- [The enriched-question schema (B1)](#the-enriched-question-schema-b1)
- [Adding a topic's overlay (B3)](#adding-a-topics-overlay-b3)
- [Troubleshooting scenarios](#troubleshooting-scenarios)
- [Semantic search (B4)](#semantic-search-b4)
- [Code map](#code-map)

## Modes

Every mode is one file in `src/lib/bot/modes/`. `src/lib/bot/engine.ts` routes messages between them, and `src/lib/bot/intents.ts` turns what you type or tap into a command. The chips send the same slash commands that you can type.

| Mode             | Say or tap                                                                                    | What it does                                                                                                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mock interviewer | "interview me on AKS", `/mock senior`, `/mock due`                                            | Asks 6 open or scenario questions, with due cards first. It scores each answer against the key points, suggests an SRS rating, asks a follow-up, and ends with a report.         |
| Answer evaluator | `/evaluate <words>`, or **🤖 Practise with the bot** on any question card                     | Scores one answer. It shows which key points were covered or missed, flags common mistakes and suggests Again/Hard/Good/Easy.                                                    |
| Tutor            | "hint", "short", "long", "simpler", "analogy", "related", "mistakes", "follow-ups", "what if" | Gives other ways into the question that is currently open.                                                                                                                       |
| Search / Q&A     | anything else                                                                                 | Shows the best 3 matching questions with their 30-second answers. It uses MiniSearch (BM25 with fuzzy and prefix matching), fused with semantic ranking when Smart search is on. |
| Study coach      | "what should I study today", "weakest", "mistakes", "exam plan"                               | Reads your progress: due cards, the weakest interview topics (flagged cards and lapses), exam readiness, the mistake notebook and the exam-date plan.                            |
| Rapid-fire       | "rapid fire"                                                                                  | 8 questions at 25 seconds each, taken from the cards you are most likely to have forgotten. Ratings are saved automatically.                                                     |
| Troubleshooting  | "troubleshoot"                                                                                | Branching incident scenarios that end with the root cause, the lesson and a score.                                                                                               |

**Scoring.** A key point counts as covered when any of its keywords or synonyms appears in the answer (`src/lib/bot/scoring.ts` and `text.ts`). Matching tolerates:

- light stemming, so "routes", "routed" and "routing" match;
- one typo in words of 5 or more letters, and two typos in words of 9 or more;
- up to two extra words inside a phrase;
- the synonym groups in `src/content/bot/synonyms.json`.

The score is the weighted share of key points covered. A detected common mistake caps the suggested rating at **Hard**. If the keyword check misses something you said in other words, tick it on the self-score checklist and re-score.

**Voice input** (🎙️) uses the browser's own Web Speech API. Most browsers send the audio to an online speech service, so voice is the one part of the bot that may need the internet. Typing always works offline.

## Where the data comes from

The bank has 2,584 questions, too many to enrich by hand. `src/lib/bot/enrich.ts` builds a record for every question from the content that already exists:

| Field            | Derived from                                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `shortAnswer`    | The first 2-4 sentences of the answer, up to 75 words.                                                                                         |
| `keyPoints`      | The **bold** terms in the answer, weighted by paragraph. If there are none, `code` spans; if there are none of those, the most frequent words. |
| `commonMistakes` | The question's `traps`. Derived mistakes have no trigger phrases, so they are shown but never detected.                                        |
| `followUps`      | The question's follow-ups. Derived follow-ups have no model answers.                                                                           |
| `hints`          | The probing notes and clue keywords, then the opening words of the answer.                                                                     |

**Curated overlays** in `src/content/bot/topics/<topic-id>.json` are merged over the derived record, field by field. They exist today for `azure-networking` and `azure-identity`, which have 20 questions each. Overlays load lazily, one topic at a time.

## The enriched-question schema (B1)

The schema is `src/content/bot/enriched.schema.json` (JSON Schema draft-07), and the TypeScript types are in `src/lib/bot/types.ts`. An overlay file looks like this:

```json
{
  "topic": "azure-networking",
  "questions": [
    {
      "id": "itv-aznet-1",
      "shortAnswer": "30-second spoken answer…",
      "keyPoints": [
        {
          "point": "Address ranges must not overlap with on-premises or other VNets",
          "keywords": ["no overlap", "non-overlapping", "overlapping", "unique ranges", "clash"],
          "weight": 3
        }
      ],
      "commonMistakes": [
        {
          "mistake": "Saying Azure reserves 3 addresses per subnet",
          "triggers": ["reserves 3", "three reserved"],
          "correction": "Azure reserves 5: network, gateway, two for DNS, and broadcast."
        }
      ],
      "followUps": [
        {
          "question": "How many usable addresses in a /29?",
          "shortAnswer": "3 - eight minus the five Azure reserves.",
          "keyPoints": [
            {
              "point": "It has 3 usable addresses",
              "keywords": ["3 usable", "three usable"],
              "weight": 2
            }
          ]
        }
      ],
      "hints": [
        "Think about what else must connect.",
        "Ranges must be unique.",
        "Remember the reserved five."
      ],
      "analogy": "…",
      "simpleExplanation": "…",
      "related": ["itv-aznet-2"],
      "scenarioVariant": { "question": "What if…", "shortAnswer": "…" }
    }
  ]
}
```

The first three entries of `src/content/bot/topics/azure-networking.json` are the worked example.

Rules for each overlay entry:

| Field            | Rule                                                                                                                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `keyPoints`      | 4-8 points, each with a weight from 1 to 3, where 3 means "must say". Keywords are lower case and include synonyms, abbreviations and common phrasings. A keyword must be at least 2 characters and not a bare number, because a bare number matches far too much. |
| `commonMistakes` | 2-4 mistakes. Each `triggers` entry is a phrase that only someone making the mistake would say.                                                                                                                                                                    |
| `followUps`      | 2-3 follow-ups, each with a `shortAnswer` and 1-5 key points.                                                                                                                                                                                                      |
| `hints`          | Exactly 3, going from a gentle nudge to nearly the answer.                                                                                                                                                                                                         |
| `related`        | Must be ids that exist in the bank.                                                                                                                                                                                                                                |

## Adding a topic's overlay (B3)

1. **List the topic's questions.** Copy the `id`, `prompt` and existing answer of each question from `src/content/interview/topics/<topic>/…`.
2. **Write or generate the overlay.** You may draft it offline with any tool, including an LLM at authoring time, but a person must review it. Ask for:
   - valid JSON matching the schema above;
   - facts that are accurate for the current year;
   - synonyms in `keywords`;
   - a `"// uncertain"`-style note in the review, never in the JSON, for any fact you could not verify.
3. **Save it** as `src/content/bot/topics/<topic-id>.json`. The `topic` field must equal the file name. Overlay only the fields you are improving: anything left out still comes from the derived record.
4. **Validate it** with `npx vitest run src/lib/bot`. The content tests check every overlay file against the schema, check that every `id` and `related` id exists in the bank, and check that every scenario graph is well formed.
5. **Rebuild the embeddings** (optional) if you changed `shortAnswer`s: `npm run bot:embeddings`.

## Troubleshooting scenarios

`src/content/bot/scenarios.json` holds a list of scenarios. Each one looks like this:

```json
{
  "id": "acr-403",
  "title": "…",
  "topic": "…",
  "level": "intermediate",
  "intro": "…",
  "start": "n1",
  "nodes": {
    "n1": {
      "text": "…",
      "evidence": "optional log or command output",
      "choices": [{ "label": "…", "next": "n2", "score": 2, "feedback": "…" }]
    },
    "end-ok": { "text": "…", "end": { "rootCause": "…", "lesson": "…" } }
  }
}
```

The score is the sum of the chosen choices' scores, shown as a share of the best possible path. A wrong turn may loop back to an earlier node. The tests check that:

- every choice leads to an existing node;
- every node is reachable from the start;
- every node can still reach an ending.

## Semantic search (B4)

Keyword search cannot know that "my pods keep restarting" means the CrashLoopBackOff question. **Smart search** can. It is off by default and switched on under **Settings** on the bot page.

How it works:

1. **At build time**, `npm run bot:embeddings` (`scripts/build-bot-embeddings.mjs`) embeds the prompt and 30-second answer of every question. It uses [`Xenova/all-MiniLM-L6-v2`](https://huggingface.co/Xenova/all-MiniLM-L6-v2) in its quantized form, with mean pooling and normalized vectors, through transformers.js in Node. It writes two files:
   - `public/bot/embeddings.bin`: 2,584 × 384 int8 values with one float32 scale per vector, about 1 MB;
   - `public/bot/embeddings.json`: the question ids and model metadata.

   The run takes about 50 seconds.

2. **In the browser**, `src/lib/bot/semantic.ts` loads only when Smart search is on. It:
   - downloads the vectors and the same model;
   - embeds the query on the device;
   - ranks every question by cosine similarity;
   - fuses that ranking with the MiniSearch ranking (reciprocal-rank fusion, k = 60).

   Matches below a cosine of 0.3 are dropped.

3. **Offline.** transformers.js keeps the model files in its own browser cache (`transformers-cache`). The service worker caches the transformers.js chunk and the ONNX runtime (`bot-runtime`, cache-first) and the vectors (`bot-embeddings`).
4. **Fallback.** Any failure leaves the bot on keyword search and says so: no network on first use, an old browser, or no WebAssembly.

**Download size**, measured in Firefox on first switch-on:

| File                                    |  Transferred |    On disk |
| --------------------------------------- | -----------: | ---------: |
| `model_quantized.onnx` (Hugging Face)   |     22.97 MB |   22.97 MB |
| `tokenizer.json`, configs               |      0.71 MB |    0.71 MB |
| ONNX runtime wasm and loader (jsDelivr) |      5.57 MB |    26.9 MB |
| transformers.js chunk (this site)       | 0.16 MB gzip |    0.55 MB |
| Question vectors (this site)            |      1.01 MB |    1.04 MB |
| **Total, once**                         | **≈30.4 MB** | **≈52 MB** |

None of this is in the app's normal precache, so people who never switch Smart search on download nothing extra.

## Code map

| Path                                                | What it holds                                                  |
| --------------------------------------------------- | -------------------------------------------------------------- |
| `src/lib/bot/types.ts`                              | `EnrichedQuestion`, `KeyPoint`, `CommonMistake`, `FollowUp`    |
| `src/lib/bot/text.ts`                               | Normalise, stem, fuzzy match, phrase match, synonyms           |
| `src/lib/bot/scoring.ts`                            | `scoreAnswer`, `scoreSelf`, `ratingFor`                        |
| `src/lib/bot/enrich.ts`                             | Derived records, lazy overlay merge                            |
| `src/lib/bot/search.ts`                             | MiniSearch index, `relatedTo`, `fuse`                          |
| `src/lib/bot/semantic.ts`                           | On-device embeddings and cosine ranking                        |
| `src/lib/bot/intents.ts`                            | Rule-based intent detection                                    |
| `src/lib/bot/engine.ts`                             | `StudyBot` state machine and message blocks                    |
| `src/lib/bot/modes/*.ts`                            | One file per mode                                              |
| `src/pages/BotPage.tsx`                             | The chat UI                                                    |
| `src/lib/bot/bot.test.ts`, `src/pages/bot.test.tsx` | Tests for scoring, intents, content validity and conversations |
