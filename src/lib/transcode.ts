import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { parseHlsDuration } from './media'

export type TranscodeProgress = (pct: number, label: string) => void

export type PreparedMedia =
  | {
      kind: 'hls'
      files: File[]
      duration: number
      srcBytes: number
      outBytes: number
      mode: 'copy' | 'encode'
    }
  | {
      kind: 'mp4'
      file: File
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
      onProgress?.(15 + Math.round(pct * 0.7), `Light compress… ${pct}%`)
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

async function readHlsOutputs(ffmpeg: FFmpeg) {
  const listing = await ffmpeg.listDir('/')
  const names = listing
    .filter((e) => !e.isDir && (e.name.endsWith('.m3u8') || e.name.endsWith('.ts')))
    .map((e) => e.name)
  const tsCount = names.filter((n) => n.endsWith('.ts')).length
  if (!names.some((n) => n.endsWith('.m3u8')) || tsCount < 1) {
    throw new Error('HLS pack incomplete')
  }

  const files: File[] = []
  let duration = 0
  let totalBytes = 0
  for (const name of names) {
    const data = await ffmpeg.readFile(name)
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data))
    const copy = new Uint8Array(bytes)
    totalBytes += copy.byteLength
    if (name.endsWith('.m3u8')) {
      const text = new TextDecoder().decode(copy)
      duration = Math.max(duration, parseHlsDuration(text))
      files.push(new File([copy], name, { type: 'application/vnd.apple.mpegurl' }))
    } else {
      files.push(new File([copy], name, { type: 'video/MP2T' }))
    }
  }
  return { files, duration, totalBytes }
}

async function cleanupFs(ffmpeg: FFmpeg) {
  const listing = await ffmpeg.listDir('/').catch(() => [])
  for (const e of listing) {
    if (e.isDir) continue
    if (
      e.name.endsWith('.m3u8') ||
      e.name.endsWith('.ts') ||
      e.name.endsWith('.mp4') ||
      e.name.startsWith('input.')
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

const HLS_TAIL = [
  '-f',
  'hls',
  '-hls_time',
  '6',
  '-hls_playlist_type',
  'vod',
  '-hls_flags',
  'independent_segments',
  '-hls_segment_filename',
  'seg%03d.ts',
  'index.m3u8',
]

/** Almost free on CPU — only repacks containers when codecs are already browser-friendly. */
async function tryRemuxHls(ffmpeg: FFmpeg, input: string) {
  const code = await ffmpeg.exec(['-i', input, '-map', '0:v:0', '-map', '0:a:0?', '-c', 'copy', ...HLS_TAIL])
  if (code !== 0) throw new Error('remux failed')
  return readHlsOutputs(ffmpeg)
}

/** One light encode only — ultrafast, no multi-pass, mild scale. */
async function tryLightEncodeHls(ffmpeg: FFmpeg, input: string) {
  const code = await ffmpeg.exec([
    '-fflags',
    '+genpts',
    '-i',
    input,
    '-map',
    '0:v:0',
    '-map',
    '0:a:0?',
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
    '-threads',
    '0',
    '-c:a',
    'aac',
    '-b:a',
    '96k',
    '-ac',
    '2',
    '-ar',
    '44100',
    ...HLS_TAIL,
  ])
  if (code !== 0) throw new Error('encode hls failed')
  return readHlsOutputs(ffmpeg)
}

async function tryLightMp4(ffmpeg: FFmpeg, input: string) {
  const out = 'out.mp4'
  const code = await ffmpeg.exec([
    '-fflags',
    '+genpts',
    '-i',
    input,
    '-map',
    '0:v:0',
    '-map',
    '0:a:0?',
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
    '-threads',
    '0',
    '-c:a',
    'aac',
    '-b:a',
    '96k',
    '-ac',
    '2',
    '-movflags',
    '+faststart',
    '-y',
    out,
  ])
  if (code !== 0) throw new Error('mp4 failed')
  const data = await ffmpeg.readFile(out)
  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data))
  const copy = new Uint8Array(bytes)
  if (copy.byteLength < 10_000) throw new Error('mp4 too small')
  return {
    file: new File([copy], 'video.mp4', { type: 'video/mp4' }),
    totalBytes: copy.byteLength,
    duration: 0,
  }
}

/**
 * Light pipeline so the phone/PC does not melt:
 * 1) remux/copy (almost no CPU) when possible
 * 2) one ultrafast encode to HLS
 * 3) one ultrafast MP4 fallback
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

    // 1) Fast remux — normal MP4s finish here, device barely works.
    try {
      onProgress?.(10, 'Fast remux (light, no heavy compress)…')
      const out = await tryRemuxHls(ffmpeg, input)
      await cleanupFs(ffmpeg)
      onProgress?.(92, `Ready HLS ${mb(out.totalBytes)} (remux)`)
      return {
        kind: 'hls',
        files: out.files,
        duration: out.duration,
        srcBytes: srcSize,
        outBytes: out.totalBytes,
        mode: 'copy',
      }
    } catch {
      /* Xmaster / HEVC need encode */
    }

    // 2) Single light encode only
    try {
      onProgress?.(18, 'Light H.264 compress (one pass)…')
      await writeInput(ffmpeg, file, input)
      const out = await tryLightEncodeHls(ffmpeg, input)
      await cleanupFs(ffmpeg)
      const saved = Math.max(0, srcSize - out.totalBytes)
      onProgress?.(92, `Ready HLS ${mb(out.totalBytes)}${saved ? ` · saved ${mb(saved)}` : ''}`)
      return {
        kind: 'hls',
        files: out.files,
        duration: out.duration,
        srcBytes: srcSize,
        outBytes: out.totalBytes,
        mode: 'encode',
      }
    } catch {
      /* last resort */
    }

    onProgress?.(40, 'Light MP4 fallback…')
    await writeInput(ffmpeg, file, input)
    const out = await tryLightMp4(ffmpeg, input)
    await cleanupFs(ffmpeg)
    onProgress?.(92, `Ready MP4 ${mb(out.totalBytes)}`)
    return {
      kind: 'mp4',
      file: out.file,
      duration: out.duration,
      srcBytes: srcSize,
      outBytes: out.totalBytes,
      mode: 'encode',
    }
  })
}

/** @deprecated use prepareVideoForUpload */
export async function transcodeToHls(file: File, onProgress?: TranscodeProgress) {
  const prepared = await prepareVideoForUpload(file, onProgress)
  if (prepared.kind !== 'hls') {
    throw new Error('Could not build HLS — use prepareVideoForUpload MP4 fallback')
  }
  return prepared
}
