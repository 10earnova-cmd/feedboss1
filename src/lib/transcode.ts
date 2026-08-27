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

async function getFfmpeg(onProgress?: TranscodeProgress) {
  if (ffmpegSingleton?.loaded) return ffmpegSingleton
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    onProgress?.(2, 'Loading compressor…')
    const ffmpeg = new FFmpeg()
    ffmpeg.on('log', () => undefined)
    ffmpeg.on('progress', ({ progress }) => {
      const pct = Math.max(0, Math.min(99, Math.round((progress || 0) * 100)))
      onProgress?.(8 + Math.round(pct * 0.72), 'Compressing to HLS…')
    })

    // Single-thread core: works without COOP/COEP; still remux-first for speed.
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
  for (const name of names) {
    const data = await ffmpeg.readFile(name)
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data))
    const copy = new Uint8Array(bytes)
    if (name.endsWith('.m3u8')) {
      const text = new TextDecoder().decode(copy)
      duration = Math.max(duration, parseHlsDuration(text))
      files.push(new File([copy], name, { type: 'application/vnd.apple.mpegurl' }))
    } else {
      files.push(new File([copy], name, { type: 'video/MP2T' }))
    }
  }
  return { files, duration }
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
 * Any video → HLS (m3u8 + .ts) for Cloudflare R2 streaming.
 * Fast path: remux with codec copy (no quality loss).
 * Fallback: H.264 CRF 18 + AAC (visually lossless, ultrafast preset).
 */
export async function transcodeToHls(file: File, onProgress?: TranscodeProgress) {
  return withFfmpegLock(async () => {
    if (file.name.toLowerCase().endsWith('.m3u8')) {
      throw new Error('Already an HLS playlist — select the playlist with its .ts files')
    }

    const ffmpeg = await getFfmpeg(onProgress)
    const input = inputNameFor(file)
    onProgress?.(5, 'Reading video…')
    await ffmpeg.writeFile(input, await fetchFile(file))

    const commonTail = [
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

    onProgress?.(8, 'Fast remux to HLS (no quality loss)…')
    let mode: 'copy' | 'encode' = 'copy'
    let code = await ffmpeg.exec([
      '-i',
      input,
      '-map',
      '0:v:0',
      '-map',
      '0:a:0?',
      '-c',
      'copy',
      ...commonTail,
    ])

    const hasPlaylist = (await ffmpeg.listDir('/')).some((e) => !e.isDir && e.name === 'index.m3u8')
    if (code !== 0 || !hasPlaylist) {
      await cleanupFs(ffmpeg, [input])
      await ffmpeg.writeFile(input, await fetchFile(file))
      mode = 'encode'
      onProgress?.(10, 'Encoding high-quality H.264 HLS…')
      code = await ffmpeg.exec([
        '-i',
        input,
        '-map',
        '0:v:0',
        '-map',
        '0:a:0?',
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-crf',
        '18',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-ac',
        '2',
        '-ar',
        '48000',
        ...commonTail,
      ])
    }

    if (code !== 0) {
      await cleanupFs(ffmpeg, [input])
      throw new Error('Could not convert this video. Try MP4/H.264, or a smaller file.')
    }

    onProgress?.(88, 'Packaging HLS files…')
    const out = await readHlsOutputs(ffmpeg)
    await cleanupFs(ffmpeg, [input])
    onProgress?.(92, mode === 'copy' ? 'HLS ready (remux)' : 'HLS ready (encoded)')
    return { ...out, mode }
  })
}
