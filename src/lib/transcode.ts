import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { parseHlsDuration } from './media'

export type TranscodeProgress = (pct: number, label: string) => void

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
      onProgress?.(10 + Math.round(pct * 0.7), `Compressing on your device… ${pct}%`)
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
  if (!names.some((n) => n.endsWith('.m3u8'))) {
    throw new Error('HLS playlist was not created')
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

async function cleanupFs(ffmpeg: FFmpeg, extra: string[]) {
  const listing = await ffmpeg.listDir('/').catch(() => [])
  for (const e of listing) {
    if (e.isDir) continue
    if (extra.includes(e.name) || e.name.endsWith('.m3u8') || e.name.endsWith('.ts') || e.name.startsWith('input.')) {
      try {
        await ffmpeg.deleteFile(e.name)
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * Compress on the user's device (CPU/WASM), then return HLS pack for R2 upload.
 * H.264 CRF 23 + AAC 128k, max 1080p — smaller MB, still sharp for tube streaming.
 */
export async function transcodeToHls(file: File, onProgress?: TranscodeProgress) {
  return withFfmpegLock(async () => {
    if (file.name.toLowerCase().endsWith('.m3u8')) {
      throw new Error('Already an HLS playlist — select the playlist with its .ts files')
    }

    const srcSize = file.size
    const ffmpeg = await getFfmpeg(onProgress)
    const input = inputNameFor(file)
    onProgress?.(6, `Reading ${mb(srcSize)} on this device…`)
    await ffmpeg.writeFile(input, await fetchFile(file))

    onProgress?.(10, 'Compressing with your device power…')
    const code = await ffmpeg.exec([
      '-i',
      input,
      '-map',
      '0:v:0',
      '-map',
      '0:a:0?',
      '-vf',
      "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease",
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-crf',
      '23',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-ac',
      '2',
      '-ar',
      '44100',
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
    ])

    if (code !== 0) {
      await cleanupFs(ffmpeg, [input])
      throw new Error('Device compress failed. Try a smaller file or MP4.')
    }

    onProgress?.(88, 'Packaging compressed HLS…')
    const out = await readHlsOutputs(ffmpeg)
    await cleanupFs(ffmpeg, [input])
    const saved = srcSize > out.totalBytes ? srcSize - out.totalBytes : 0
    const label =
      saved > 0
        ? `Compressed ${mb(srcSize)} → ${mb(out.totalBytes)} (saved ${mb(saved)})`
        : `Compressed pack ${mb(out.totalBytes)} — ready to upload`
    onProgress?.(92, label)
    return { ...out, mode: 'encode' as const, srcBytes: srcSize, outBytes: out.totalBytes }
  })
}
