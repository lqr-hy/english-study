import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import './App.css'
import {
  vocabBookMap,
  loadBookWords,
  getChapterCount,
  getChapterId,
  WORDS_PER_CHAPTER,
  type WordEntry,
} from './utils/vocab'
import { getLearnedChapterSet } from './features/records/wordDb'

function VocabStudyPage() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const book = bookId ? vocabBookMap[bookId] : null

  const [words, setWords] = useState<WordEntry[]>([])
  const [learnedSet, setLearnedSet] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!book) {
      navigate('/', { replace: true })
      return
    }

    let mounted = true
    setLoading(true)

    Promise.all([loadBookWords(book), getLearnedChapterSet(book.id)])
      .then(([loadedWords, learnedChapters]) => {
        if (!mounted) {
          return
        }
        setWords(loadedWords)
        setLearnedSet(learnedChapters)
        setLoading(false)
      })
      .catch(() => {
        if (mounted) {
          setError('加载词库失败，请检查网络后刷新。')
          setLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [book, navigate])

  if (!book) {
    return null
  }

  const chapterCount = getChapterCount(book.totalWords)
  const learnedCount = Array.from({ length: chapterCount }, (_, i) =>
    learnedSet.has(getChapterId(book.id, i + 1)),
  ).filter(Boolean).length

  return (
    <main className="page">
      <section className="card">
        <div className="top-row">
          <div>
            <h1>{book.name}</h1>
            <p className="muted">
              {book.description} · {book.totalWords.toLocaleString()} 词 · {chapterCount} 章
            </p>
          </div>
          <Link to="/" className="btn-light">
            返回首页
          </Link>
        </div>

        {learnedCount > 0 && (
          <div className="vocab-progress-wrap">
            <div className="vocab-progress-bar">
              <div
                className="vocab-progress-fill"
                style={{ width: `${(learnedCount / chapterCount) * 100}%` }}
              />
            </div>
            <span className="vocab-progress-text">
              已学 {learnedCount} / {chapterCount} 章
            </span>
          </div>
        )}

        {loading && <p className="muted">加载中…</p>}
        {error && <p className="muted">{error}</p>}

        {!loading && !error && (
          <ul className="vocab-chapter-list">
            {Array.from({ length: chapterCount }, (_, i) => {
              const chapterNum = i + 1
              const chapterId = getChapterId(book.id, chapterNum)
              const start = i * WORDS_PER_CHAPTER
              const chapterWords = words.slice(start, start + WORDS_PER_CHAPTER)
              const isLearned = learnedSet.has(chapterId)
              const firstWord = chapterWords[0]?.name ?? ''
              const lastWord = chapterWords[chapterWords.length - 1]?.name ?? ''

              return (
                <li key={chapterId}>
                  <Link to={`/vocab/${book.id}/${chapterNum}`} className="vocab-chapter-row">
                    <div className="vocab-chapter-info">
                      <strong>第 {chapterNum} 章</strong>
                      <span className="vocab-chapter-range">
                        {firstWord} — {lastWord}
                      </span>
                    </div>
                    {isLearned && <em className="learned-badge">已学习</em>}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}

export default VocabStudyPage
