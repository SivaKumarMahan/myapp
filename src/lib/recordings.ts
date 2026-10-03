/**
 * Mock-interview recordings in IndexedDB - audio is too big for the
 * localStorage progress record, so it stays on this device only (and is not
 * part of the progress export). Each recording carries its owner's email, so
 * people sharing a device see only their own.
 */

export interface Recording {
  id: string
  owner: string
  questionId: string
  prompt: string
  /** "Main answer" or the follow-up asked. */
  label: string
  createdAt: number
  durationMs: number
  mimeType: string
  blob: Blob
  transcript: string
}

const DB = 'azure-learning-hub-recordings'
const STORE = 'recordings'

export const recordingSupported = () =>
  typeof window !== 'undefined' &&
  typeof window.MediaRecorder !== 'undefined' &&
  typeof navigator.mediaDevices?.getUserMedia === 'function' &&
  typeof indexedDB !== 'undefined'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1)
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: 'id' })
      store.createIndex('owner', 'owner')
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB unavailable'))
  })
}

async function run<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open()
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode)
      const request = work(transaction.objectStore(STORE))
      transaction.oncomplete = () => resolve(request.result)
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB error'))
    })
  } finally {
    db.close()
  }
}

export const saveRecording = (recording: Recording) =>
  run('readwrite', (store) => store.put(recording)).then(() => undefined)

export async function listRecordings(owner: string): Promise<Recording[]> {
  const all = await run<Recording[]>('readonly', (store) => store.index('owner').getAll(owner))
  return all.sort((a, b) => b.createdAt - a.createdAt)
}

export const deleteRecording = (id: string) =>
  run('readwrite', (store) => store.delete(id)).then(() => undefined)

export async function deleteAllRecordings(owner: string): Promise<void> {
  const mine = await listRecordings(owner)
  for (const recording of mine) await deleteRecording(recording.id)
}

/** A started microphone recording; `stop()` resolves with the audio. */
export interface ActiveRecording {
  stop: () => Promise<{ blob: Blob; durationMs: number; mimeType: string }>
  cancel: () => void
}

export async function startRecording(): Promise<ActiveRecording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  const mimeType = preferred.find((type) => MediaRecorder.isTypeSupported?.(type)) ?? ''
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
  const chunks: Blob[] = []
  const started = Date.now()
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }
  recorder.start(1000)
  const release = () => stream.getTracks().forEach((track) => track.stop())
  return {
    stop: () =>
      new Promise((resolve) => {
        recorder.onstop = () => {
          release()
          const type = recorder.mimeType || mimeType || 'audio/webm'
          resolve({
            blob: new Blob(chunks, { type }),
            durationMs: Date.now() - started,
            mimeType: type,
          })
        }
        recorder.stop()
      }),
    cancel: () => {
      if (recorder.state !== 'inactive') recorder.stop()
      release()
    },
  }
}

/* ---------- Live transcription (Web Speech API, where the browser has it) ---------- */

interface RecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult:
    | ((event: {
        resultIndex: number
        results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
      }) => void)
    | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

export function transcriptionSupported(): boolean {
  const scope = window as unknown as Record<string, unknown>
  return Boolean(scope.SpeechRecognition ?? scope.webkitSpeechRecognition)
}

/** Starts continuous recognition; calls back with the full transcript so far. */
export function startTranscription(onText: (text: string) => void): () => void {
  const scope = window as unknown as Record<string, unknown>
  const Recognition = (scope.SpeechRecognition ?? scope.webkitSpeechRecognition) as
    (new () => RecognitionLike) | undefined
  if (!Recognition) return () => undefined
  const recognition = new Recognition()
  recognition.lang = 'en-US'
  recognition.continuous = true
  recognition.interimResults = true
  let finalText = ''
  let stopped = false
  recognition.onresult = (event) => {
    let interim = ''
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i]
      if (result.isFinal) finalText += `${result[0].transcript} `
      else interim += result[0].transcript
    }
    onText(`${finalText}${interim}`.trim())
  }
  // Chrome ends continuous recognition after a pause; restart until stopped.
  recognition.onend = () => {
    if (!stopped) {
      try {
        recognition.start()
      } catch {
        /* already started */
      }
    }
  }
  recognition.onerror = () => undefined
  recognition.start()
  return () => {
    stopped = true
    recognition.stop()
  }
}
