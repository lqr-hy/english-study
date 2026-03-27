export type SubtitleLine = {
  time: number
  english: string
  chinese: string
}

export type Lesson = {
  id: string
  level: string
  startLesson: number
  endLesson: number
  filenameTitle: string
  title: string
  album: string
  audioUrl: string | null
  subtitles: SubtitleLine[]
}

const lrcModules = import.meta.glob('../../public/NCE*/*.lrc', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

export const formatMediaTime = (value: number): string => {
  const safe = Math.max(0, Math.floor(value))
  const minute = Math.floor(safe / 60)
  const second = safe % 60
  return `${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`
}

const toBasePath = (path: string): string => path.replace(/\.(mp3|lrc)$/i, '')

const toPublicMediaPath = (path: string, ext: 'mp3' | 'lrc') => {
  const normalized = toBasePath(path).replace(/^.*\/public\//, '/')
  return `${normalized}.${ext}`
}

const parseName = (filename: string) => {
  const cleaned = filename.replace(/\.[^.]+$/, '')
  const pairMatch = cleaned.match(/^(\d{2,3})&(\d{2,3})－(.+)$/)
  const singleMatch = cleaned.match(/^(\d{1,3})－(.+)$/)

  if (pairMatch) {
    return {
      startLesson: Number(pairMatch[1]),
      endLesson: Number(pairMatch[2]),
      title: pairMatch[3].trim(),
    }
  }

  if (singleMatch) {
    const lesson = Number(singleMatch[1])
    return {
      startLesson: lesson,
      endLesson: lesson,
      title: singleMatch[2].trim(),
    }
  }

  if (!cleaned) {
    return {
      startLesson: 0,
      endLesson: 0,
      title: 'Untitled',
    }
  }

  return {
    startLesson: 0,
    endLesson: 0,
    title: cleaned,
  }
}

const parseLrc = (text: string) => {
  const lines = text.split(/\r?\n/)
  const metadata: Record<string, string> = {}
  const subtitles: SubtitleLine[] = []

  for (const line of lines) {
    const metaMatch = line.match(/^\[(al|ar|ti|by):(.+)]$/i)
    if (metaMatch) {
      metadata[metaMatch[1].toLowerCase()] = metaMatch[2].trim()
      continue
    }

    const lineMatch = line.match(/^\[(\d{2}):(\d{2}\.\d{2})](.*)$/)
    if (!lineMatch) {
      continue
    }

    const minute = Number(lineMatch[1])
    const second = Number(lineMatch[2])
    const payload = lineMatch[3].trim()
    const [english, chinese] = payload.split('|')

    subtitles.push({
      time: minute * 60 + second,
      english: (english || '').trim(),
      chinese: (chinese || '').trim(),
    })
  }

  return {
    metadata,
    subtitles: subtitles.sort((a, b) => a.time - b.time),
  }
}

export const allLessons: Lesson[] = Object.entries(lrcModules)
  .map(([path, lrcText]) => {
    const levelMatch = path.match(/public\/(NCE\d)\//)
    const level = levelMatch?.[1] ?? 'NCE?'
    const fileName = path.split('/').pop() || ''
    const nameInfo = parseName(fileName)
    const parsed = parseLrc(lrcText)
    const audioUrl = toPublicMediaPath(path, 'mp3')

    return {
      id: `${level}-${fileName}`,
      level,
      startLesson: nameInfo.startLesson,
      endLesson: nameInfo.endLesson,
      filenameTitle: nameInfo.title,
      title: parsed.metadata.ti || nameInfo.title,
      album: parsed.metadata.al || level,
      audioUrl,
      subtitles: parsed.subtitles,
    }
  })
  .sort((a, b) => {
    if (a.level === b.level) {
      return a.startLesson - b.startLesson
    }
    return a.level.localeCompare(b.level)
  })

export const levelOptions = Array.from(new Set(allLessons.map((item) => item.level)))