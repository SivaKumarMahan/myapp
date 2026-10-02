import harness from '../../content/python/harness.py?raw'
import { PYODIDE_INDEX_URL, type WorkerRequest, type WorkerMessage } from './protocol'

/**
 * Python in the browser (Pyodide), for the Python playground and as the code
 * playground's fallback. Loaded on first use; the service worker then keeps
 * the files, so later visits work offline.
 */

interface PyProxy {
  destroy(): void
}
interface Pyodide {
  setStdout(options: { batched: (text: string) => void }): void
  setStderr(options: { batched: (text: string) => void }): void
  setStdin(options: { stdin: () => string | undefined }): void
  runPython(code: string, options?: { globals?: PyProxy }): unknown
  runPythonAsync(code: string, options?: { globals?: PyProxy }): Promise<unknown>
  loadPackagesFromImports(
    code: string,
    options?: { messageCallback?: (message: string) => void },
  ): Promise<unknown>
  globals: { get(name: string): ((...args: unknown[]) => unknown) & PyProxy }
}

let pyodide: Promise<Pyodide> | null = null
const post = (message: WorkerMessage) => self.postMessage(message)

async function load(id: number): Promise<Pyodide> {
  post({ id, type: 'status', text: 'Downloading Python (about 10 MB, only the first time)…' })
  const module = (await import(/* @vite-ignore */ `${PYODIDE_INDEX_URL}pyodide.mjs`)) as {
    loadPyodide: (options: { indexURL: string }) => Promise<Pyodide>
  }
  const py = await module.loadPyodide({ indexURL: PYODIDE_INDEX_URL })
  py.runPython(harness)
  return py
}

/** Loads whatever the code imports (pandas, numpy ...), with progress. */
async function packagesFor(py: Pyodide, id: number, code: string) {
  await py.loadPackagesFromImports(code, {
    messageCallback: (message) => {
      if (/^Loading /.test(message)) post({ id, type: 'status', text: `${message}…` })
    },
  })
}

self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  const { id } = data
  const started = Date.now()
  try {
    pyodide ??= load(id)
    const py = await pyodide.catch((error: unknown) => {
      pyodide = null
      throw error
    })

    if (data.type === 'run') {
      await packagesFor(py, id, `${data.prelude ?? ''}\n${data.code}`)
      const lines = data.stdin.split('\n')
      py.setStdout({ batched: (text) => post({ id, type: 'stdout', data: `${text}\n` }) })
      py.setStderr({ batched: (text) => post({ id, type: 'stderr', data: `${text}\n` }) })
      py.setStdin({ stdin: () => lines.shift() })
      post({ id, type: 'ready' })
      // A fresh namespace per run, so one run's variables never leak into the next.
      const scope = py.globals.get('dict')() as unknown as PyProxy
      let code = 0
      try {
        if (data.prelude) py.runPython(data.prelude, { globals: scope })
        await py.runPythonAsync(data.code, { globals: scope })
      } catch (error) {
        code = 1
        post({ id, type: 'stderr', data: `${trimTraceback(error)}\n` })
      } finally {
        scope.destroy()
      }
      post({ id, type: 'exit', code, durationMs: Date.now() - started })
      return
    }

    await packagesFor(py, id, `${data.fixtures}\n${data.code}`)
    post({ id, type: 'ready' })
    const runTests = py.globals.get('__run_tests')
    const outcome = runTests(data.code, data.fixtures, JSON.stringify(data.calls)) as string
    runTests.destroy()
    post({ id, type: 'tests', outcome: JSON.parse(outcome), durationMs: Date.now() - started })
  } catch (error) {
    post({
      id,
      type: 'error',
      message: `Could not run Python: ${error instanceof Error ? error.message : String(error)}`,
    })
  }
}

/** Pyodide's tracebacks start with its own frames; keep only the user's. */
function trimTraceback(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error)
  const lines = text.split('\n')
  const start = lines.findIndex((line) => line.includes('File "<exec>"'))
  return start > 0
    ? ['Traceback (most recent call last):', ...lines.slice(start)].join('\n').trim()
    : text.trim()
}
