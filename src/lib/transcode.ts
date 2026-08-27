import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { sceneCaptureTimes } from './media'

export type TranscodeProgress = (pct: number, label: string) => void

export type PreparedMedia = {
  kind: 'mp4'
  file: File
  thumbs: File[]
  duration: number
  srcBytes: number
  outBytes: number
  mode: 'encode'
}

let ffmpegSingleton: FFmpeg | null = null
let loadPromise: Promise<FFmpeg> | null = null
let chain: Promise<unknown> = Promise.resolve()

function withFfmpegLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn)
  chain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

function mb(n: number) {
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

async function getFfmpeg(onProgress?: TranscodeProgress) {
  if (ffmpegSingleton?.loaded) return ffmpegSingleton
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    onProgress?.(2, 'Loading light compressor…')
    const ffmpeg = new FFmpeg()
    ffmpeg.on('log', () => undefined)
    ffmpeg.on('progress', ({ progress }) => {
      const pct = Math.max(0, Math.min(99, Math.round((progress || 0) * 100)))
      onProgress?.(12 + Math.round(pct * 0.55), `Making playable MP4… ${pct}%`)
    })

    const base = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm'
    await ffmpeg.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
    })
    ffmpegSingleton = ffmpeg
    return ffmpeg
  })()

  try {
    return await loadPromise
  } catch (err) {
    loadPromise = null
    throw err
  }
}

function inputNameFor(file: File) {
  const ext = (file.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4'
  return `input.${ext.slice(0, 5)}`
}

async function cleanupFs(ffmpeg: FFmpeg) {
  const listing = await ffmpeg.listDir('/').catch(() => [])
  for (const e of listing) {
    if (e.isDir) continue
    if (
      e.name.endsWith('.m3u8') ||
      e.name.endsWith('.ts') ||
      e.name.endsWith('.mp4') ||
      e.name.endsWith('.jpg') ||
      e.name.startsWith('input.') ||
      e.name.startsWith('safe.') ||
      e.name.startsWith('thumb')
    ) {
      try {
        await ffmpeg.deleteFile(e.name)
      } catch {
        /* ignore */
      }
    }
  }
}

async function writeInput(ffmpeg: FFmpeg, file: File, input: string) {
  await cleanupFs(ffmpeg)
  await ffmpeg.writeFile(input, await fetchFile(file))
}

async function grabThumbs(ffmpeg: FFmpeg, input: string, duration: number) {
  const times = sceneCaptureTimes(duration > 0 ? duration : 180)
  const thumbs: File[] = []
  for (let i = 0; i < times.length; i += 1) {
    const out = `thumb${i}.jpg`
    const code = await ffmpeg.exec(['-ss', String(times[i]), '-i', input, '-frames:v', '1', '-q:v', '4', '-y', out])
    if (code !== 0) continue
    try {
      const data = await ffmpeg.readFile(out)
      const bytes = data instanceof Uint8Array ? data : new Uint8Array()
      if (bytes.byteLength < 500) continue
      thumbs.push(new File([new Uint8Array(bytes)], out, { type: 'image/jpeg' }))
      await ffmpeg.deleteFile(out)
    } catch {
      /* skip */
    }
  }
  if (!thumbs.length) {
    const out = 'thumb0.jpg'
    const code = await ffmpeg.exec(['-i', input, '-frames:v', '1', '-q:v', '5', '-y', out])
    if (code === 0) {
      try {
        const data = await ffmpeg.readFile(out)
        const bytes = data instanceof Uint8Array ? data : new Uint8Array()
        if (bytes.byteLength > 500) thumbs.push(new File([new Uint8Array(bytes)], out, { type: 'image/jpeg' }))
        await ffmpeg.deleteFile(out)
      } catch {
        /* ignore */
      }
    }
  }
  if (!thumbs.length) throw new Error('Could not grab any poster frames')
  return thumbs
}

async function encodeMp4(ffmpeg: FFmpeg, input: string, withAudio: boolean) {
  const out = 'out.mp4'
  const args = [
    '-fflags',
    '+genpts',
    '-i',
    input,
    '-map',
    '0:v:0',
    ...(withAudio ? ['-map', '0:a:0?'] : ['-an']),
    '-vf',
    'scale=1280:-2:flags=fast_bilinear,format=yuv420p',
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-tune',
    'fastdecode',
    '-crf',
    '24',
    '-pix_fmt',
    'yuv420p',
    '-profile:v',
    'baseline',
    '-level',
    '3.1',
    '-threads',
    '0',
    ...(withAudio ? ['-c:a', 'aac', '-b:a', '96k', '-ac', '2', '-ar', '44100'] : []),
    '-movflags',
    '+faststart',
    '-y',
    out,
  ]
  const code = await ffmpeg.exec(args)
  if (code !== 0) throw new Error('mp4 encode failed')
  const data = await ffmpeg.readFile(out)
  const bytes = data instanceof Uint8Array ? data : new Uint8Array()
  if (bytes.byteLength < 10_000) throw new Error('mp4 too small')
  return new File([new Uint8Array(bytes)], 'video.mp4', { type: 'video/mp4' })
}

/**
 * Always output browser-safe progressive H.264 MP4 + 1:00 poster/scenes.
 * More reliable on Chrome than WASM HLS packs.
 */
export async function prepareVideoForUpload(file: File, onProgress?: TranscodeProgress): Promise<PreparedMedia> {
  return withFfmpegLock(async () => {
    if (file.name.toLowerCase().endsWith('.m3u8')) {
      throw new Error('Already an HLS playlist — select the playlist with its .ts files')
    }

    const srcSize = file.size
    const ffmpeg = await getFfmpeg(onProgress)
    const input = inputNameFor(file)
    onProgress?.(6, `Reading ${mb(srcSize)}…`)
    await writeInput(ffmpeg, file, input)

    onProgress?.(12, 'Making browser-safe H.264 MP4…')
    let mp4: File
    try {
      mp4 = await encodeMp4(ffmpeg, input, true)
    } catch {
      await writeInput(ffmpeg, file, input)
      mp4 = await encodeMp4(ffmpeg, input, false)
    }

    onProgress?.(78, 'Grabbing ~10 scenes (1:00 + mid points)…')
    await cleanupFs(ffmpeg)
    await ffmpeg.writeFile('safe.mp4', await fetchFile(mp4))

    let durationHint = 600
    try {
      durationHint = await new Promise<number>((resolve) => {
        const url = URL.createObjectURL(mp4)
        const v = document.createElement('video')
        v.preload = 'metadata'
        v.src = url
        v.onloadedmetadata = () => {
          const d = Math.round(v.duration || 0)
          URL.revokeObjectURL(url)
          resolve(d > 0 ? d : 600)
        }
        v.onerror = () => {
          URL.revokeObjectURL(url)
          resolve(600)
        }
      })
    } catch {
      durationHint = 600
    }

    const thumbs = await grabThumbs(ffmpeg, 'safe.mp4', durationHint)
    await cleanupFs(ffmpeg)

    const saved = Math.max(0, srcSize - mp4.size)
    onProgress?.(
      92,
      `Ready MP4 ${mb(mp4.size)}${saved ? ` · saved ${mb(saved)}` : ''} · ${thumbs.length} thumbs`,
    )
    return {
      kind: 'mp4',
      file: mp4,
      thumbs,
      duration: durationHint,
      srcBytes: srcSize,
      outBytes: mp4.size,
      mode: 'encode',
    }
  })
}

export async function transcodeToHls(file: File, onProgress?: TranscodeProgress) {
  return prepareVideoForUpload(file, onProgress)
}
