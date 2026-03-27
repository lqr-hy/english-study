import type { WordEntry } from '../../utils/vocab'

const DB_NAME = 'vocab-learning-db'
const DB_VERSION = 1
const WORD_MISTAKES_STORE = 'wordMistakes'
const WORD_FAVORITES_STORE = 'wordFavorites'
const CHAPTER_LEARNED_STORE = 'chapterLearned'

const PAGE_SIZE = 20

export type WordMistakeRecord = {
  id: string
  bookId: string
  chapterId: string
  chapterNum: number
  wordName: string
  wordTrans: string[]
  errorCount: number
  createdAt: number
  lastErrorAt: number
}

export type WordFavoriteRecord = {
  id: string
  bookId: string
  chapterId: string
  chapterNum: number
  wordName: string
  wordTrans: string[]
  wordUsphone: string
  wordUkphone: string
  createdAt: number
}

export type ChapterLearnedRecord = {
  id: string
  bookId: string
  chapterNum: number
  learnedAt: number
}

export type WordPagedResult<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type WordMistakeSortBy = 'recent' | 'count'

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(WORD_MISTAKES_STORE)) {
        db.createObjectStore(WORD_MISTAKES_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(WORD_FAVORITES_STORE)) {
        db.createObjectStore(WORD_FAVORITES_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(CHAPTER_LEARNED_STORE)) {
        db.createObjectStore(CHAPTER_LEARNED_STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
  })

const reqToPromise = <T>(r: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })

const withStore = async <T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T>,
): Promise<T> => {
  const db = await openDb()
  try {
    const tx = db.transaction(storeName, mode)
    return await run(tx.objectStore(storeName))
  } finally {
    db.close()
  }
}

const paginate = <T>(source: T[], page: number, pageSize = PAGE_SIZE): WordPagedResult<T> => {
  const safePage = Math.max(1, page)
  const total = source.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const clampedPage = Math.min(safePage, totalPages)
  return {
    items: source.slice((clampedPage - 1) * pageSize, clampedPage * pageSize),
    page: clampedPage,
    pageSize,
    total,
    totalPages,
  }
}

export const recordWordMistake = async (
  bookId: string,
  chapterId: string,
  chapterNum: number,
  word: WordEntry,
): Promise<void> => {
  const id = `${bookId}::${word.name}`
  await withStore(WORD_MISTAKES_STORE, 'readwrite', async (store) => {
    const now = Date.now()
    const existing = await reqToPromise<WordMistakeRecord | undefined>(store.get(id))
    if (existing) {
      existing.errorCount += 1
      existing.lastErrorAt = now
      await reqToPromise(store.put(existing))
      return
    }
    await reqToPromise(
      store.put({
        id,
        bookId,
        chapterId,
        chapterNum,
        wordName: word.name,
        wordTrans: word.trans,
        errorCount: 1,
        createdAt: now,
        lastErrorAt: now,
      } satisfies WordMistakeRecord),
    )
  })
}

export const getWordMistakesPaged = async (
  page: number,
  pageSize = PAGE_SIZE,
  sortBy: WordMistakeSortBy = 'count',
  bookId?: string,
): Promise<WordPagedResult<WordMistakeRecord>> => {
  return withStore(WORD_MISTAKES_STORE, 'readonly', async (store) => {
    let all = await reqToPromise<WordMistakeRecord[]>(store.getAll())
    if (bookId) {
      all = all.filter((r) => r.bookId === bookId)
    }
    if (sortBy === 'count') {
      all.sort((a, b) =>
        b.errorCount !== a.errorCount ? b.errorCount - a.errorCount : b.lastErrorAt - a.lastErrorAt,
      )
    } else {
      all.sort((a, b) => b.lastErrorAt - a.lastErrorAt)
    }
    return paginate(all, page, pageSize)
  })
}

export const toggleWordFavorite = async (
  bookId: string,
  chapterId: string,
  chapterNum: number,
  word: WordEntry,
): Promise<boolean> => {
  const id = `${bookId}::${word.name}`
  return withStore(WORD_FAVORITES_STORE, 'readwrite', async (store) => {
    const existing = await reqToPromise<WordFavoriteRecord | undefined>(store.get(id))
    if (existing) {
      await reqToPromise(store.delete(id))
      return false
    }
    await reqToPromise(
      store.put({
        id,
        bookId,
        chapterId,
        chapterNum,
        wordName: word.name,
        wordTrans: word.trans,
        wordUsphone: word.usphone,
        wordUkphone: word.ukphone,
        createdAt: Date.now(),
      } satisfies WordFavoriteRecord),
    )
    return true
  })
}

export const getWordFavoritesPaged = async (
  page: number,
  pageSize = PAGE_SIZE,
  bookId?: string,
): Promise<WordPagedResult<WordFavoriteRecord>> => {
  return withStore(WORD_FAVORITES_STORE, 'readonly', async (store) => {
    let all = await reqToPromise<WordFavoriteRecord[]>(store.getAll())
    if (bookId) {
      all = all.filter((r) => r.bookId === bookId)
    }
    all.sort((a, b) => b.createdAt - a.createdAt)
    return paginate(all, page, pageSize)
  })
}

export const getWordFavoriteMapByChapter = async (
  bookId: string,
  chapterId: string,
): Promise<Record<string, boolean>> => {
  return withStore(WORD_FAVORITES_STORE, 'readonly', async (store) => {
    const all = await reqToPromise<WordFavoriteRecord[]>(store.getAll())
    return all.reduce<Record<string, boolean>>((acc, item) => {
      if (item.bookId === bookId && item.chapterId === chapterId) {
        acc[item.wordName] = true
      }
      return acc
    }, {})
  })
}

export const markChapterLearned = async (
  bookId: string,
  chapterId: string,
  chapterNum: number,
): Promise<void> => {
  await withStore(CHAPTER_LEARNED_STORE, 'readwrite', async (store) => {
    const existing = await reqToPromise<ChapterLearnedRecord | undefined>(store.get(chapterId))
    if (existing) {
      return
    }
    await reqToPromise(
      store.put({ id: chapterId, bookId, chapterNum, learnedAt: Date.now() } satisfies ChapterLearnedRecord),
    )
  })
}

export const getLearnedChapterSet = async (bookId: string): Promise<Set<string>> => {
  return withStore(CHAPTER_LEARNED_STORE, 'readonly', async (store) => {
    const all = await reqToPromise<ChapterLearnedRecord[]>(store.getAll())
    return new Set(all.filter((r) => r.bookId === bookId).map((r) => r.id))
  })
}
