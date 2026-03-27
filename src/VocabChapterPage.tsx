import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import './App.css'
import {
  vocabBookMap,
  loadBookWords,
  getChapterId,
  getChapterCount,
  getChapterWords,
  getWordAudioUrl,
  type WordEntry,
} from './utils/vocab'
import {
  recordWordMistake,
  toggleWordFavorite,
  getWordFavoriteMapByChapter,
  markChapterLearned,
} from './features/records/wordDb'
import { evaluateDictation } from './features/lesson/dictation'

// card  : show word + translation directly
// en-zh : show English, click to reveal Chinese
// zh-en : show Chinese, type English (NCE-style char input)
type StudyMode = 'card' | 'en-zh' | 'zh-en'

const ERROR_PREVIEW_MS = 220
const AUTO_ADVANCE_MS = 400
const normalizeInput = (v: string) => v.toLowerCase().replace(/[^a-z0-9']/g, '')

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12" aria-hidden="true">
      <path d="M3 2.8A1 1 0 014 2l8 5.2a1 1 0 010 1.6L4 14A1 1 0 012.5 13.14V2.86A1 1 0 013 2.8z" />
    </svg>
  )
}

function VocabChapterPage() {
  const { bookId, chapterNum: chapterNumStr } = useParams()
  const navigate = useNavigate()
  const chapterNum = Math.max(1, Number(chapterNumStr) || 1)

  const book = bookId ? vocabBookMap[bookId] : null
  const chapterId = bookId ? getChapterId(bookId, chapterNum) : ''

  const [words, setWords] = useState<WordEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<StudyMode>('card')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showTranslation, setShowTranslation] = useState(true)
  const [dictInput, setDictInput] = useState('')
  const [shaking, setShaking] = useState(false)
  const [favoriteMap, setFavoriteMap] = useState<Record<string, boolean>>({})
  const [visitedIndices, setVisitedIndices] = useState<Set<number>>(new Set())
  const [hoverHint, setHoverHint] = useState('')

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const clickAudioRef = useRef<HTMLAudioElement | null>(null)
  const beepAudioRef = useRef<HTMLAudioElement | null>(null)
  const wordResetTimerRef = useRef<number | null>(null)
  const autoAdvanceTimerRef = useRef<number | null>(null)
  const shakeTimerRef = useRef<number | null>(null)

  const currentIndexRef = useRef(0)
  const wordsRef = useRef<WordEntry[]>([])
  const modeRef = useRef<StudyMode>('card')
  const dictInputRef = useRef('')
  const showTranslationRef = useRef(true)

  useEffect(() => { currentIndexRef.current = currentIndex }, [currentIndex])
  useEffect(() => { wordsRef.current = words }, [words])
  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { dictInputRef.current = dictInput }, [dictInput])
  useEffect(() => { showTranslationRef.current = showTranslation }, [showTranslation])

  useEffect(() => {
    if (!book) {
      navigate('/', { replace: true })
      return
    }

    let mounted = true
    Promise.all([
      loadBookWords(book),
      bookId ? getWordFavoriteMapByChapter(bookId, chapterId) : Promise.resolve({} as Record<string, boolean>),
    ])
      .then(([allWords, favMap]) => {
        if (!mounted) {
          return
        }
        setWords(getChapterWords(allWords, chapterNum))
        setFavoriteMap(favMap)
        setLoading(false)
      })
      .catch(() => {
        if (mounted) {
          setLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [book, bookId, chapterId, chapterNum, navigate])

  // Mark chapter learned when all words visited
  useEffect(() => {
    if (words.length > 0 && visitedIndices.size >= words.length && bookId) {
      void markChapterLearned(bookId, chapterId, chapterNum)
    }
  }, [visitedIndices, words.length, bookId, chapterId, chapterNum])

  const clearTimers = useCallback(() => {
    if (wordResetTimerRef.current !== null) { window.clearTimeout(wordResetTimerRef.current); wordResetTimerRef.current = null }
    if (autoAdvanceTimerRef.current !== null) { window.clearTimeout(autoAdvanceTimerRef.current); autoAdvanceTimerRef.current = null }
    if (shakeTimerRef.current !== null) { window.clearTimeout(shakeTimerRef.current); shakeTimerRef.current = null }
  }, [])

  const playAudio = useCallback((word: string) => {
    const el = audioRef.current
    if (!el) return
    el.src = getWordAudioUrl(word)
    el.play().catch(() => undefined)
  }, [])

  const markVisited = useCallback((index: number) => {
    setVisitedIndices((prev) => {
      if (prev.has(index)) return prev
      const next = new Set(prev)
      next.add(index)
      return next
    })
  }, [])

  const goNext = useCallback(() => {
    const idx = currentIndexRef.current
    const ws = wordsRef.current
    markVisited(idx)
    if (idx < ws.length - 1) {
      clearTimers()
      setCurrentIndex(idx + 1)
      setShowTranslation(modeRef.current !== 'en-zh')
      setDictInput('')
      setShaking(false)
    }
  }, [markVisited, clearTimers])

  const goPrev = useCallback(() => {
    const idx = currentIndexRef.current
    if (idx > 0) {
      clearTimers()
      setCurrentIndex(idx - 1)
      setShowTranslation(modeRef.current !== 'en-zh')
      setDictInput('')
      setShaking(false)
    }
  }, [clearTimers])

  // NCE-style character-by-character handler for zh-en mode
  const handleKeyForZhEn = useCallback((key: string) => {
    if (!/^[a-zA-Z0-9']$/.test(key)) return
    const ws = wordsRef.current
    const idx = currentIndexRef.current
    const word = ws[idx]
    if (!word) return

    if (wordResetTimerRef.current !== null) { window.clearTimeout(wordResetTimerRef.current); wordResetTimerRef.current = null }
    if (autoAdvanceTimerRef.current !== null) { window.clearTimeout(autoAdvanceTimerRef.current); autoAdvanceTimerRef.current = null }

    const nextValue = normalizeInput(dictInputRef.current + key)
    const feedback = evaluateDictation(nextValue, word.name, false)

    const playFx = (el: HTMLAudioElement | null) => { if (el) { el.currentTime = 0; el.play().catch(() => undefined) } }

    if (feedback.hasError) {
      setDictInput(nextValue)
      setShaking(false)
      window.requestAnimationFrame(() => setShaking(true))
      if (shakeTimerRef.current !== null) window.clearTimeout(shakeTimerRef.current)
      shakeTimerRef.current = window.setTimeout(() => setShaking(false), 400)
      if (bookId) void recordWordMistake(bookId, chapterId, chapterNum, word)
      playFx(beepAudioRef.current)
      wordResetTimerRef.current = window.setTimeout(() => setDictInput(''), ERROR_PREVIEW_MS)
      return
    }

    playFx(clickAudioRef.current)
    setDictInput(nextValue)

    if (feedback.isCorrect) {
      markVisited(idx)
      autoAdvanceTimerRef.current = window.setTimeout(() => {
        const curIdx = currentIndexRef.current
        const ws2 = wordsRef.current
        if (curIdx < ws2.length - 1) {
          setCurrentIndex(curIdx + 1)
          setDictInput('')
          setShaking(false)
        }
      }, AUTO_ADVANCE_MS)
    }
  }, [bookId, chapterId, chapterNum, markVisited])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Cmd+J / Ctrl+J: play current word audio in all modes
      if ((e.key === 'j' || e.key === 'J') && (e.metaKey || e.ctrlKey) && !e.altKey) {
        e.preventDefault()
        const word = wordsRef.current[currentIndexRef.current]
        if (word) playAudio(word.name)
        return
      }

      const currentMode = modeRef.current

      if (currentMode === 'zh-en') {
        // Space plays audio (not a typed char for single words)
        if (e.code === 'Space') {
          e.preventDefault()
          const word = wordsRef.current[currentIndexRef.current]
          if (word) playAudio(word.name)
          return
        }
        // Intercept all printable chars for NCE-style input
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault()
          handleKeyForZhEn(e.key)
          return
        }
      }

      if (e.code === 'ArrowRight' || e.code === 'ArrowDown') {
        e.preventDefault(); goNext(); return
      }
      if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
        e.preventDefault(); goPrev(); return
      }
      if (e.code === 'Space') {
        e.preventDefault()
        if (currentMode === 'en-zh' && !showTranslationRef.current) {
          setShowTranslation(true)
          markVisited(currentIndexRef.current)
        } else if (currentMode === 'card') {
          const word = wordsRef.current[currentIndexRef.current]
          if (word) playAudio(word.name)
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goNext, goPrev, playAudio, handleKeyForZhEn, markVisited])

  // Compute live feedback for zh-en char display
  const dictFeedback = useMemo(() => {
    const word = words[currentIndex]
    if (!word || mode !== 'zh-en') return null
    return evaluateDictation(dictInput, word.name, false)
  }, [dictInput, words, currentIndex, mode])

  const handleToggleFavorite = useCallback(
    (word: WordEntry) => {
      if (!bookId) return
      void toggleWordFavorite(bookId, chapterId, chapterNum, word).then((saved) => {
        setFavoriteMap((prev) => ({ ...prev, [word.name]: saved }))
      })
    },
    [bookId, chapterId, chapterNum],
  )

  const switchMode = useCallback((next: StudyMode) => {
    clearTimers()
    setMode(next)
    setShowTranslation(next !== 'en-zh')
    setDictInput('')
    setShaking(false)
  }, [clearTimers])

  if (!book) return null

  const currentWord = words[currentIndex]
  const totalChapters = getChapterCount(book.totalWords)

  // Pending char placeholders for zh-en mode before any input
  const pendingSegments = currentWord
    ? currentWord.name.split('').map((ch) => ({ expected: ch, actual: '', status: 'pending' as const, hint: '', wordStart: false }))
    : []

  return (
    <main className="page">
      <section className="card vocab-chapter-page">
        <div className="top-row">
          <h1>{book.name} · 第 {chapterNum} 章</h1>
          <Link to={`/vocab/${book.id}`} className="btn-light">章节列表</Link>
        </div>

        <div className="vocab-mode-row">
          <button type="button" className={mode === 'card' ? 'chip active' : 'chip'} onClick={() => switchMode('card')}>卡片</button>
          <button type="button" className={mode === 'en-zh' ? 'chip active' : 'chip'} onClick={() => switchMode('en-zh')}>英→中</button>
          <button type="button" className={mode === 'zh-en' ? 'chip active' : 'chip'} onClick={() => switchMode('zh-en')}>中→英</button>
          <span className="muted vocab-progress-counter">
            {currentIndex + 1} / {words.length}
            {visitedIndices.size > 0 && ` · 已学 ${visitedIndices.size}/${words.length}`}
          </span>
        </div>

        {loading && <p className="muted">加载中…</p>}

        {!loading && currentWord && (
          <div className={`vocab-word-card${shaking ? ' shake' : ''}`}>

            {/* ── 卡片模式：直接显示单词 + 翻译 ── */}
            {mode === 'card' && (
              <div className="vocab-word-main">
                <div className="vocab-word-top-actions">
                  <button type="button" className="line-icon-btn" onClick={() => playAudio(currentWord.name)} aria-label="播放发音"><PlayIcon /></button>
                  <button type="button" className={`line-fav-btn${favoriteMap[currentWord.name] ? ' active' : ''}`} onClick={() => handleToggleFavorite(currentWord)} aria-label="收藏">★</button>
                </div>
                <h2 className="vocab-word-name">{currentWord.name}</h2>
                <div className="vocab-word-phonetic">
                  {currentWord.usphone && <span>美 /{currentWord.usphone}/</span>}
                  {currentWord.ukphone && <span>英 /{currentWord.ukphone}/</span>}
                </div>
                <div className="vocab-word-trans">
                  {currentWord.trans.map((t, i) => <p key={i}>{t}</p>)}
                </div>
              </div>
            )}

            {/* ── 英→中：显示英文，隐藏中文，点击/Space 查看 ── */}
            {mode === 'en-zh' && (
              <>
                <div className="vocab-word-main">
                  <div className="vocab-word-top-actions">
                    <button type="button" className="line-icon-btn" onClick={() => playAudio(currentWord.name)} aria-label="播放发音"><PlayIcon /></button>
                    <button type="button" className={`line-fav-btn${favoriteMap[currentWord.name] ? ' active' : ''}`} onClick={() => handleToggleFavorite(currentWord)} aria-label="收藏">★</button>
                  </div>
                  <h2 className="vocab-word-name">{currentWord.name}</h2>
                  <div className="vocab-word-phonetic">
                    {currentWord.usphone && <span>美 /{currentWord.usphone}/</span>}
                    {currentWord.ukphone && <span>英 /{currentWord.ukphone}/</span>}
                  </div>
                </div>
                {showTranslation ? (
                  <div className="vocab-word-trans">
                    {currentWord.trans.map((t, i) => <p key={i}>{t}</p>)}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="vocab-reveal-area"
                    onClick={() => { setShowTranslation(true); markVisited(currentIndex) }}
                  >
                    点击查看释义（Space）
                  </button>
                )}
              </>
            )}

            {/* ── 中→英：显示中文，逐字键入英文（参考新概念模式）── */}
            {mode === 'zh-en' && (
              <>
                <div className="vocab-dict-prompt">
                  {currentWord.trans.map((t, i) => <p key={i}>{t}</p>)}
                  <div className="vocab-word-phonetic">
                    {currentWord.usphone && <span>美 /{currentWord.usphone}/</span>}
                    {currentWord.ukphone && <span>英 /{currentWord.ukphone}/</span>}
                  </div>
                </div>

                <div className="vocab-dict-display">
                  <div className="dictation-highlight">
                    {(dictFeedback?.segments ?? pendingSegments).map((seg, i) => {
                      const isHovered = Boolean(hoverHint && hoverHint === seg.hint)
                      const text =
                        seg.status === 'pending'
                          ? (isHovered ? (seg.expected || ' ') : '_')
                          : seg.status === 'wrong'
                            ? '_'
                            : (seg.actual || ' ')
                      return (
                        <span
                          key={i}
                          className={`token-${seg.status}${seg.wordStart ? ' token-word-start' : ''}${isHovered ? ' reveal-hint' : ''}`}
                          onMouseEnter={() => setHoverHint(seg.hint || String(i))}
                          onMouseLeave={() => setHoverHint('')}
                        >
                          {text}
                        </span>
                      )
                    })}
                  </div>
                  <p className="vocab-dict-hint muted">Space / Cmd+J 播放发音</p>
                </div>

                <div className="vocab-dict-actions">
                  <button type="button" className="line-icon-btn" onClick={() => playAudio(currentWord.name)} aria-label="播放发音"><PlayIcon /></button>
                  <button type="button" className={`line-fav-btn${favoriteMap[currentWord.name] ? ' active' : ''}`} onClick={() => handleToggleFavorite(currentWord)} aria-label="收藏">★</button>
                </div>
              </>
            )}
          </div>
        )}

        {!loading && words.length > 0 && (
          <div className="vocab-nav-row">
            <button type="button" className="btn-light" onClick={goPrev} disabled={currentIndex === 0}>上一词</button>
            <div className="vocab-dot-row" role="tablist" aria-label="单词导航">
              {words.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === currentIndex}
                  aria-label={`第 ${i + 1} 词`}
                  className={`vocab-dot${i === currentIndex ? ' active' : ''}${visitedIndices.has(i) ? ' visited' : ''}`}
                  onClick={() => {
                    clearTimers()
                    setCurrentIndex(i)
                    setShowTranslation(mode !== 'en-zh')
                    setDictInput('')
                    setShaking(false)
                  }}
                />
              ))}
            </div>
            <button type="button" className="btn-light" onClick={goNext} disabled={currentIndex === words.length - 1}>下一词</button>
          </div>
        )}

        <div className="lesson-nav lesson-nav-bottom">
          {chapterNum > 1 && (
            <Link to={`/vocab/${book.id}/${chapterNum - 1}`} className="btn-light" onClick={() => { clearTimers(); setCurrentIndex(0) }}>
              上一章
            </Link>
          )}
          <span>{chapterNum} / {totalChapters}</span>
          {chapterNum < totalChapters && (
            <Link to={`/vocab/${book.id}/${chapterNum + 1}`} className="btn-light" onClick={() => { clearTimers(); setCurrentIndex(0) }}>
              下一章
            </Link>
          )}
        </div>
      </section>

      <audio ref={audioRef} preload="none" className="audio-player-hidden" />
      <audio ref={clickAudioRef} src="/click.wav" preload="auto" className="audio-player-hidden" />
      <audio ref={beepAudioRef} src="/beep.wav" preload="auto" className="audio-player-hidden" />
    </main>
  )
}

export default VocabChapterPage
