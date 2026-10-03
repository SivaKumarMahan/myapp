import { env, pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers'

/**
 * Semantic search (B4): on-device sentence embeddings, so "my pods keep
 * restarting" finds the CrashLoopBackOff question with no shared keywords.
 *
 * Only loaded when the learner switches Smart search on. The question vectors
 * are precomputed at build time (scripts/build-bot-embeddings.mjs, ~1 MB);
 * here only the query is embedded, with the same model, then ranked by
 * cosine similarity. The model (~23 MB) and the ONNX runtime are fetched once
 * and kept by the browser cache and the service worker, so it works offline
 * afterwards. Any failure leaves the bot on keyword search.
 */

const MODEL = 'Xenova/all-MiniLM-L6-v2'

// Never look for the model on our own origin: a GitHub Pages 404 there is the
// app's index.html, which would be parsed as a model file.
env.allowLocalModels = false
env.useBrowserCache = true

interface Index {
  ids: string[]
  dim: number
  scales: Float32Array
  values: Int8Array
}

let indexPromise: Promise<Index> | null = null
let modelPromise: Promise<FeatureExtractionPipeline> | null = null

function loadIndex(): Promise<Index> {
  indexPromise ??= (async () => {
    const base = import.meta.env.BASE_URL
    const [meta, bin] = await Promise.all([
      fetch(`${base}bot/embeddings.json`).then((response) => {
        if (!response.ok) throw new Error(`embeddings.json: HTTP ${response.status}`)
        return response.json() as Promise<{ ids: string[]; dim: number; count: number }>
      }),
      fetch(`${base}bot/embeddings.bin`).then((response) => {
        if (!response.ok) throw new Error(`embeddings.bin: HTTP ${response.status}`)
        return response.arrayBuffer()
      }),
    ])
    const count = meta.ids.length
    return {
      ids: meta.ids,
      dim: meta.dim,
      scales: new Float32Array(bin, 0, count),
      values: new Int8Array(bin, count * 4, count * meta.dim),
    }
  })().catch((error: unknown) => {
    indexPromise = null
    throw error
  })
  return indexPromise
}

function loadModel(onNote?: (note: string) => void): Promise<FeatureExtractionPipeline> {
  modelPromise ??= pipeline('feature-extraction', MODEL, {
    dtype: 'q8',
    progress_callback: (event: { status: string; file?: string; progress?: number }) => {
      if (
        event.status === 'progress' &&
        event.file?.endsWith('.onnx') &&
        event.progress !== undefined
      )
        onNote?.(`Downloading the search model… ${Math.round(event.progress)}%`)
    },
  }).catch((error: unknown) => {
    modelPromise = null
    throw error
  }) as Promise<FeatureExtractionPipeline>
  return modelPromise
}

/** Loads the vectors and the model. Reports download progress. */
export async function warmUp(onNote?: (note: string) => void): Promise<void> {
  await Promise.all([loadIndex(), loadModel(onNote)])
}

/** Cosine similarity of the query against every question (all unit vectors). */
export function rank(
  index: Index,
  query: Float32Array,
  limit: number,
): { id: string; score: number }[] {
  const { dim, values, scales, ids } = index
  const scores = new Float32Array(ids.length)
  for (let row = 0; row < ids.length; row += 1) {
    let dot = 0
    const offset = row * dim
    for (let d = 0; d < dim; d += 1) dot += query[d] * values[offset + d]
    scores[row] = dot * scales[row]
  }
  const order = Array.from(scores.keys()).sort((a, b) => scores[b] - scores[a])
  return order.slice(0, limit).map((row) => ({ id: ids[row], score: scores[row] }))
}

/** The best matches for a query, by meaning. Below ~0.3 is noise and dropped. */
export async function semanticSearch(
  query: string,
  limit = 8,
): Promise<{ id: string; score: number }[]> {
  const [index, extract] = await Promise.all([loadIndex(), loadModel()])
  const output = await extract(query, { pooling: 'mean', normalize: true })
  return rank(index, output.data as Float32Array, limit).filter((hit) => hit.score >= 0.3)
}
