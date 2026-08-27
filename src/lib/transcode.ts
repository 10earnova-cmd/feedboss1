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
      mode: 'encode'
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
    onProgress?.(2, 'Loading compressor on this device…')
    const ffmpeg = new FFmpeg()
    ffmpeg.on('log', () => undefined)
    ffmpeg.on('progress', ({ progress }) => {
      const pct = Math.max(0, Math.min(99, Math.round((progress || 0) * 100)))
      onProgress?.(12 + Math.round(pct * 0.68), `Fixing / compressing downloader video… ${pct}%`)
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

const INPUT_FLAGS = [
  '-fflags',
  '+genpts+igndts+discardcorrupt',
  '-err_detect',
  'ignore_err',
  '-analyzeduration',
  '100M',
  '-probesize',
  '100M',
]

const VIDEO_ENCODE = [
  '-c:v',
  'libx264',
  '-preset',
  'ultrafast',
  '-crf',
  '23',
  '-pix_fmt',
  'yuv420p',
  '-profile:v',
  'main',
  '-level',
  '4.0',
  '-movflags',
  '+faststart',
]

const AUDIO_ENCODE = ['-c:a', 'aac', '-b:a', '128k', '-ac', '2', '-ar', '44100']

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

async function tryHls(ffmpeg: FFmpeg, input: string, withAudio: boolean) {
  const args = [
    ...INPUT_FLAGS,
    '-i',
    input,
    '-map',
    '0:v:0',
    ...(withAudio ? ['-map', '0:a:0?'] : ['-an']),
    '-vf',
    'scale=1280:-2:flags=fast_bilinear,format=yuv420p',
    ...VIDEO_ENCODE.filter((x) => x !== '-movflags' && x !== '+faststart'),
    ...(withAudio ? AUDIO_ENCODE : []),
    '-f',
    'hls',
    '-hls_time',
    '4',
    '-hls_playlist_type',
    'vod',
    '-hls_flags',
    'independent_segments',
    '-hls_segment_filename',
    'seg%03d.ts',
    'index.m3u8',
  ]
  const code = await ffmpeg.exec(args)
  if (code !== 0) throw new Error('hls failed')
  return readHlsOutputs(ffmpeg)
}

async function tryMp4(ffmpeg: FFmpeg, input: string, withAudio: boolean) {
  const out = 'out.mp4'
  const args = [
    ...INPUT_FLAGS,
    '-i',
    input,
    '-map',
    '0:v:0',
    ...(withAudio ? ['-map', '0:a:0?'] : ['-an']),
    '-vf',
    'scale=1280:-2:flags=fast_bilinear,format=yuv420p',
    ...VIDEO_ENCODE,
    ...(withAudio ? AUDIO_ENCODE : []),
    '-y',
    out,
  ]
  const code = await ffmpeg.exec(args)
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
 * Xmaster / IDM downloader files are often HEVC or broken MP4.
 * Always re-encode to browser-safe H.264 on the user's device, then upload.
 * Prefer HLS; fall back to progressive MP4 if HLS packaging fails.
 */
export async function prepareVideoForUpload(file: File, onProgress?: TranscodeProgress): Promise<PreparedMedia> {
  return withFfmpegLock(async () => {
    if (file.name.toLowerCase().endsWith('.m3u8')) {
      throw new Error('Already an HLS playlist — select the playlist with its .ts files')
    }

    const srcSize = file.size
    const ffmpeg = await getFfmpeg(onProgress)
    const input = inputNameFor(file)
    onProgress?.(6, `Reading ${mb(srcSize)} (downloader files get fixed here)…`)
    await writeInput(ffmpeg, file, input)

    // 1) HLS with audio
    try {
      onProgress?.(10, 'Compressing to HLS (H.264)…')
      const out = await tryHls(ffmpeg, input, true)
      await cleanupFs(ffmpeg)
      const saved = Math.max(0, srcSize - out.totalBytes)
      onProgress?.(92, `Ready HLS ${mb(out.totalBytes)}${saved ? ` (saved ${mb(saved)})` : ''}`)
      return { kind: 'hls', files: out.files, duration: out.duration, srcBytes: srcSize, outBytes: out.totalBytes, mode: 'encode' }
    } catch {
      /* try next */
    }

    // 2) HLS video-only (bad/odd audio from downloaders)
    try {
      onProgress?.(20, 'Retry HLS without audio…')
      await writeInput(ffmpeg, file, input)
      const out = await tryHls(ffmpeg, input, false)
      await cleanupFs(ffmpeg)
      onProgress?.(92, `Ready HLS ${mb(out.totalBytes)} (video only)`)
      return { kind: 'hls', files: out.files, duration: out.duration, srcBytes: srcSize, outBytes: out.totalBytes, mode: 'encode' }
    } catch {
      /* try next */
    }

    // 3) Progressive MP4 — same path as normal site videos
    try {
      onProgress?.(35, 'Downloader pack failed HLS — making browser MP4…')
      await writeInput(ffmpeg, file, input)
      const out = await tryMp4(ffmpeg, input, true)
      await cleanupFs(ffmpeg)
      onProgress?.(92, `Ready MP4 ${mb(out.totalBytes)}`)
      return { kind: 'mp4', file: out.file, duration: out.duration, srcBytes: srcSize, outBytes: out.totalBytes, mode: 'encode' }
    } catch {
      /* try next */
    }

    try {
      onProgress?.(50, 'Last try: MP4 video only…')
      await writeInput(ffmpeg, file, input)
      const out = await tryMp4(ffmpeg, input, false)
      await cleanupFs(ffmpeg)
      onProgress?.(92, `Ready MP4 ${mb(out.totalBytes)} (video only)`)
      return { kind: 'mp4', file: out.file, duration: out.duration, srcBytes: srcSize, outBytes: out.totalBytes, mode: 'encode' }
    } catch {
      await cleanupFs(ffmpeg)
      throw new Error(
        'This Xmaster/downloader file could not be fixed. Re-download as MP4 (H.264), or convert once in VLC → H.264 MP4, then upload.',
      )
    }
  })
}

/** @deprecated use prepareVideoForUpload */
export async function transcodeToHls(file: File, onProgress?: TranscodeProgress) {
  const prepared = await prepareVideoForUpload(file, onProgress)
  if (prepared.kind !== 'hls') {
    throw new Error('Could not build HLS from this file — upload will use MP4 fallback from prepareVideoForUpload')
  }
  return prepared
}
