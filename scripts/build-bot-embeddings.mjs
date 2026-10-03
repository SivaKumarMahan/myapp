/**
 * Precomputes the Study Bot's semantic-search vectors (B4).
 *
 *   npm run bot:embeddings
 *
 * Embeds "prompt + 30-second answer" of every interview question with
 * all-MiniLM-L6-v2 (quantized, the same model and settings the browser uses
 * for the query) and writes:
 *
 *   public/bot/embeddings.json  { model, dim, ids, ... }
 *   public/bot/embeddings.bin   n float32 scales, then n x dim int8 values
 *
 * Each vector is unit length, then stored as int8 with its own scale
 * (value = int8 * scale): a quarter of the float32 size, and cosine ranking
 * is unchanged to about two decimal places. Re-run after editing questions;
 * ids that have no vector simply fall back to keyword search.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { createServer } from 'vite'
import { pipeline } from '@huggingface/transformers'

const MODEL = 'Xenova/all-MiniLM-L6-v2'
const OUT = new URL('../public/bot/', import.meta.url)

// Load the TypeScript content through Vite, so import.meta.glob etc. work.
const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})
const { allInterviewQuestions } = await vite.ssrLoadModule('/src/content/interview/index.ts')
const { enriched } = await vite.ssrLoadModule('/src/lib/bot/enrich.ts')
const { plain } = await vite.ssrLoadModule('/src/lib/bot/text.ts')

const texts = []
const ids = []
for (const { question } of allInterviewQuestions) {
  const record = await enriched(question.id)
  ids.push(question.id)
  texts.push(plain(`${question.prompt}. ${record?.shortAnswer ?? ''}`).slice(0, 1200))
}
await vite.close()

console.log(`Embedding ${texts.length} questions with ${MODEL} (q8)…`)
const extract = await pipeline('feature-extraction', MODEL, { dtype: 'q8' })
const started = Date.now()
const BATCH = 32
let dim = 0
const vectors = []
for (let start = 0; start < texts.length; start += BATCH) {
  const output = await extract(texts.slice(start, start + BATCH), {
    pooling: 'mean',
    normalize: true,
  })
  dim = output.dims[1]
  const data = output.data
  for (let row = 0; row < output.dims[0]; row += 1)
    vectors.push(data.slice(row * dim, (row + 1) * dim))
  if (process.stdout.isTTY)
    process.stdout.write(`\r  ${Math.min(start + BATCH, texts.length)}/${texts.length}`)
}
process.stdout.write('\n')

const scales = new Float32Array(vectors.length)
const values = new Int8Array(vectors.length * dim)
vectors.forEach((vector, index) => {
  let max = 0
  for (const value of vector) max = Math.max(max, Math.abs(value))
  const scale = max / 127 || 1
  scales[index] = scale
  for (let d = 0; d < dim; d += 1) values[index * dim + d] = Math.round(vector[d] / scale)
})

await mkdir(OUT, { recursive: true })
const bin = Buffer.concat([Buffer.from(scales.buffer), Buffer.from(values.buffer)])
await writeFile(new URL('embeddings.bin', OUT), bin)
await writeFile(
  new URL('embeddings.json', OUT),
  `${JSON.stringify({ model: MODEL, dtype: 'q8', pooling: 'mean', dim, count: ids.length, ids })}\n`,
)
console.log(
  `Wrote ${ids.length} x ${dim} vectors: embeddings.bin ${(bin.length / 1024).toFixed(0)} KB in ${((Date.now() - started) / 1000).toFixed(1)} s`,
)
