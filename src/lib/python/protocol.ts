/** The Pyodide release, served (and then cached for offline use) from jsDelivr. */
export const PYODIDE_VERSION = '0.29.3'
export const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`

export type WorkerRequestBody =
  | { type: 'run'; code: string; stdin: string; prelude?: string }
  | { type: 'test'; code: string; fixtures: string; calls: string[] }

export type WorkerRequest = WorkerRequestBody & { id: number }

export interface TestOutcome {
  setupError: string | null
  output: string
  results: { value: unknown; error: string | null; output: string }[]
}

export type WorkerMessage =
  | { id: number; type: 'status'; text: string }
  | { id: number; type: 'ready' }
  | { id: number; type: 'stdout' | 'stderr'; data: string }
  | { id: number; type: 'exit'; code: number; durationMs: number }
  | { id: number; type: 'tests'; outcome: TestOutcome; durationMs: number }
  | { id: number; type: 'error'; message: string }
