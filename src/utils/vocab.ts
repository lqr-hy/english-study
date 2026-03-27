export type WordEntry = {
  name: string
  trans: string[]
  usphone: string
  ukphone: string
}

export type VocabBook = {
  id: string
  name: string
  description: string
  totalWords: number
  jsonFile: string
}

export const WORDS_PER_CHAPTER = 20

export const vocabBooks: VocabBook[] = [
  {
    id: 'bec2',
    name: '商务英语',
    description: '商务英语常见词',
    totalWords: 2753,
    jsonFile: '/dict/BEC_2_T.json',
  },
  {
    id: 'bec3',
    name: 'BEC',
    description: 'BEC考试常见词',
    totalWords: 2825,
    jsonFile: '/dict/BEC_3_T.json',
  },
]

export const vocabBookMap: Record<string, VocabBook> = Object.fromEntries(
  vocabBooks.map((b) => [b.id, b]),
)

export const getChapterCount = (totalWords: number): number =>
  Math.ceil(totalWords / WORDS_PER_CHAPTER)

export const getChapterId = (bookId: string, chapterNum: number): string =>
  `${bookId}-ch${chapterNum}`

export const getWordAudioUrl = (word: string): string =>
  `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=1`

const wordCache: Record<string, WordEntry[]> = {}

export const loadBookWords = async (book: VocabBook): Promise<WordEntry[]> => {
  if (wordCache[book.id]) {
    return wordCache[book.id]
  }
  const res = await fetch(book.jsonFile)
  if (!res.ok) {
    throw new Error(`Failed to load ${book.jsonFile}: ${res.status}`)
  }
  const data = (await res.json()) as WordEntry[]
  wordCache[book.id] = data
  return data
}

export const getChapterWords = (allWords: WordEntry[], chapterNum: number): WordEntry[] => {
  const start = (chapterNum - 1) * WORDS_PER_CHAPTER
  return allWords.slice(start, start + WORDS_PER_CHAPTER)
}
