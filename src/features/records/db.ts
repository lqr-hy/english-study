import { Lesson, SubtitleLine } from '../../utils/nce'

const DB_NAME = 'nce-learning-db'
const DB_VERSION = 1
const MISTAKES_STORE = 'mistakes'
const FAVORITES_STORE = 'favorites'
const LEARNED_STORE = 'learned'

const PAGE_SIZE = 20

type TargetLang = 'english' | 'chinese'

export type MistakeRecord = {
  id: string
  lessonId: string
  level: string
  lessonTitle: string
  startLesson: number
  endLesson: number
  lineIndex: number
  english: string
  chinese: string
  targetLang: TargetLang
  targetText: string
  errorCount: number
  createdAt: number
  lastErrorAt: number
}

export type FavoriteRecord = {
  id: string
  lessonId: string
  level: string
  lessonTitle: string
  startLesson: number
  endLesson: number
  lineIndex: number
  english: string
  chinese: string
  createdAt: number
}

export type LearnedRecord = {
  lessonId: string
  level: string
  lessonTitle: string
  startLesson: number
  endLesson: number
  completedAt: number
}

export type LearnedMap = Record<string, { completedAt: number }>

export type PagedResult<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type MistakeSortBy = 'recent' | 'count'

type MistakeInput = {
  lesson: Lesson
  lineIndex: number
  line: SubtitleLine
  targetLang: TargetLang
}

const favoriteId = (lessonId: string, lineIndex: number) => `${lessonId}::${lineIndex}`
const mistakeId = (lessonId: string, lineIndex: number, targetLang: TargetLang) => `${lessonId}::${lineIndex}::${targetLang}`

const openDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(MISTAKES_STORE)) {
        db.createObjectStore(MISTAKES_STORE, { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains(FAVORITES_STORE)) {
        db.createObjectStore(FAVORITES_STORE, { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains(LEARNED_STORE)) {
        db.createObjectStore(LEARNED_STORE, { keyPath: 'lessonId' })
      }
    }
    request.onsuccess = () => resolve(request.result)
  })
}

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

const withStore = async <T>(storeName: string, mode: IDBTransactionMode, run: (store: IDBObjectStore) => Promise<T>): Promise<T> => {
  const db = await openDb()

  try {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    return await run(store)
  } finally {
    db.close()
  }
}

const paginate = <T>(source: T[], page: number, pageSize = PAGE_SIZE): PagedResult<T> => {
  const safePage = Math.max(1, page)
  const total = source.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const clampedPage = Math.min(safePage, totalPages)
  const start = (clampedPage - 1) * pageSize

  return {
    items: source.slice(start, start + pageSize),
    page: clampedPage,
    pageSize,
    total,
    totalPages,
  }
}

export const markLessonLearned = async (lesson: Lesson): Promise<void> => {
  if (!lesson.id) {
    return
  }

  await withStore(LEARNED_STORE, 'readwrite', async (store) => {
    const existing = await requestToPromise<LearnedRecord | undefined>(store.get(lesson.id))
    if (existing) {
      return
    }

    const record: LearnedRecord = {
      lessonId: lesson.id,
      level: lesson.level,
      lessonTitle: lesson.title,
      startLesson: lesson.startLesson,
      endLesson: lesson.endLesson,
      completedAt: Date.now(),
    }
    await requestToPromise(store.put(record))
  })
}

export const getLearnedMap = async (): Promise<LearnedMap> => {
  return withStore(LEARNED_STORE, 'readonly', async (store) => {
    const all = await requestToPromise<LearnedRecord[]>(store.getAll())
    return all.reduce<LearnedMap>((acc, item) => {
      acc[item.lessonId] = { completedAt: item.completedAt }
      return acc
    }, {})
  })
}

export const recordMistake = async (input: MistakeInput): Promise<void> => {
  const { lesson, lineIndex, line, targetLang } = input
  const id = mistakeId(lesson.id, lineIndex, targetLang)

  await withStore(MISTAKES_STORE, 'readwrite', async (store) => {
    const now = Date.now()
    const existing = await requestToPromise<MistakeRecord | undefined>(store.get(id))

    if (existing) {
      existing.errorCount += 1
      existing.lastErrorAt = now
      await requestToPromise(store.put(existing))
      return
    }

    const record: MistakeRecord = {
      id,
      lessonId: lesson.id,
      level: lesson.level,
      lessonTitle: lesson.title,
      startLesson: lesson.startLesson,
      endLesson: lesson.endLesson,
      lineIndex,
      english: line.english,
      chinese: line.chinese,
      targetLang,
      targetText: targetLang === 'english' ? line.english : line.chinese,
      errorCount: 1,
      createdAt: now,
      lastErrorAt: now,
    }

    await requestToPromise(store.put(record))
  })
}

export const getMistakesPaged = async (
  page: number,
  pageSize = PAGE_SIZE,
  sortBy: MistakeSortBy = 'count',
): Promise<PagedResult<MistakeRecord>> => {
  return withStore(MISTAKES_STORE, 'readonly', async (store) => {
    const all = await requestToPromise<MistakeRecord[]>(store.getAll())

    if (sortBy === 'count') {
      all.sort((a, b) => {
        if (b.errorCount !== a.errorCount) {
          return b.errorCount - a.errorCount
        }
        return b.lastErrorAt - a.lastErrorAt
      })
    } else {
      all.sort((a, b) => b.lastErrorAt - a.lastErrorAt)
    }

    return paginate(all, page, pageSize)
  })
}

export const toggleFavorite = async (lesson: Lesson, lineIndex: number, line: SubtitleLine): Promise<boolean> => {
  const id = favoriteId(lesson.id, lineIndex)

  return withStore(FAVORITES_STORE, 'readwrite', async (store) => {
    const existing = await requestToPromise<FavoriteRecord | undefined>(store.get(id))

    if (existing) {
      await requestToPromise(store.delete(id))
      return false
    }

    const record: FavoriteRecord = {
      id,
      lessonId: lesson.id,
      level: lesson.level,
      lessonTitle: lesson.title,
      startLesson: lesson.startLesson,
      endLesson: lesson.endLesson,
      lineIndex,
      english: line.english,
      chinese: line.chinese,
      createdAt: Date.now(),
    }

    await requestToPromise(store.put(record))
    return true
  })
}

export const getFavoritesPaged = async (page: number, pageSize = PAGE_SIZE): Promise<PagedResult<FavoriteRecord>> => {
  return withStore(FAVORITES_STORE, 'readonly', async (store) => {
    const all = await requestToPromise<FavoriteRecord[]>(store.getAll())
    all.sort((a, b) => b.createdAt - a.createdAt)
    return paginate(all, page, pageSize)
  })
}

export const getFavoriteMapByLesson = async (lessonId: string): Promise<Record<number, boolean>> => {
  if (!lessonId) {
    return {}
  }

  return withStore(FAVORITES_STORE, 'readonly', async (store) => {
    const all = await requestToPromise<FavoriteRecord[]>(store.getAll())
    return all.reduce<Record<number, boolean>>((acc, item) => {
      if (item.lessonId === lessonId) {
        acc[item.lineIndex] = true
      }
      return acc
    }, {})
  })
}

export const getLearnedPaged = async (page: number, pageSize = PAGE_SIZE): Promise<PagedResult<LearnedRecord>> => {
  return withStore(LEARNED_STORE, 'readonly', async (store) => {
    const all = await requestToPromise<LearnedRecord[]>(store.getAll())
    all.sort((a, b) => b.completedAt - a.completedAt)
    return paginate(all, page, pageSize)
  })
}
