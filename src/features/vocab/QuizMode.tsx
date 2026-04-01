import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { WordEntry } from '../../utils/vocab'
import { recordWordMistake } from '../records/wordDb'
import type { VocabModeProps } from './types'
import { shuffleArray } from './types'
import PlayIcon from './PlayIcon'
import './QuizMode.scss'

function QuizMode({ word, words, currentIndex, bookId, chapterId, chapterNum, favoriteMap, playAudio, onToggleFavorite, markVisited, allBookWords }: VocabModeProps & { allBookWords: WordEntry[] }) {
  const [options, setOptions] = useState<WordEntry[]>([])
  const [correctIdx, setCorrectIdx] = useState(-1)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const advanceTimerRef = useRef<number | null>(null)
  const selectedRef = useRef<number | null>(null)
  const correctIdxRef = useRef(-1)
  const optionsLenRef = useRef(0)

  useEffect(() => { selectedRef.current = selected }, [selected])
  useEffect(() => { correctIdxRef.current = correctIdx }, [correctIdx])
  useEffect(() => { optionsLenRef.current = options.length }, [options.length])

  // Generate options
  const quizData = useMemo(() => {
    if (allBookWords.length < 4) return null
    const pool = allBookWords.filter(w => w.name !== word.name)
    const distractors = shuffleArray(pool).slice(0, 3)
    const opts = shuffleArray([word, ...distractors])
    return { options: opts, correctIdx: opts.findIndex(o => o.name === word.name) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, word.name, allBookWords.length])

  useEffect(() => {
    if (quizData) {
      setOptions(quizData.options)
      setCorrectIdx(quizData.correctIdx)
      setSelected(null)
    }
  }, [quizData])

  useEffect(() => {
    return () => { if (advanceTimerRef.current !== null) window.clearTimeout(advanceTimerRef.current) }
  }, [])

  const handleSelect = useCallback((idx: number) => {
    if (selectedRef.current !== null) return
    if (idx < 0 || idx >= optionsLenRef.current) return
    setSelected(idx)
    const isCorrect = idx === correctIdxRef.current
    if (isCorrect) {
      markVisited(currentIndex)
      setScore(prev => ({ correct: prev.correct + 1, total: prev.total + 1 }))
    } else {
      setScore(prev => ({ ...prev, total: prev.total + 1 }))
      void recordWordMistake(bookId, chapterId, chapterNum, word)
    }
  }, [bookId, chapterId, chapterNum, word, currentIndex, markVisited])

  // Keyboard: 1-4 select, Space play audio
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault()
        handleSelect(parseInt(e.key) - 1)
        return
      }
      if (e.code === 'Space') {
        e.preventDefault()
        playAudio(word.name)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSelect, playAudio, word.name])

  // Auto-advance after selection
  useEffect(() => {
    if (selected === null) return
    const isCorrect = selected === correctIdx
    advanceTimerRef.current = window.setTimeout(() => {
      // Use a custom event to tell parent to advance
      window.dispatchEvent(new CustomEvent('vocab-quiz-advance'))
    }, isCorrect ? 800 : 1500)
    return () => { if (advanceTimerRef.current !== null) window.clearTimeout(advanceTimerRef.current) }
  }, [selected, correctIdx])

  return (
    <>
      <div className="vocab-word-main">
        <div className="vocab-word-top-actions">
          <button type="button" className="line-icon-btn" onClick={() => playAudio(word.name)} aria-label="播放发音"><PlayIcon /></button>
          <button type="button" className={`line-fav-btn${favoriteMap[word.name] ? ' active' : ''}`} onClick={() => onToggleFavorite(word)} aria-label="收藏">★</button>
        </div>
        <h2 className="vocab-word-name">{word.name}</h2>
        <div className="vocab-word-phonetic">
          {word.usphone && <span>美 /{word.usphone}/</span>}
          {word.ukphone && <span>英 /{word.ukphone}/</span>}
        </div>
      </div>
      <div className="quiz-options">
        {options.map((opt, i) => {
          let cls = 'quiz-option'
          if (selected !== null) {
            if (i === correctIdx) cls += ' correct'
            else if (i === selected) cls += ' wrong'
            else cls += ' dimmed'
          }
          return (
            <button
              key={`${currentIndex}-${i}`}
              type="button"
              className={cls}
              disabled={selected !== null}
              onClick={() => handleSelect(i)}
            >
              <span className="quiz-option-num">{i + 1}</span>
              <span className="quiz-option-text">{opt.trans[0]}</span>
            </button>
          )
        })}
      </div>
      <p className="quiz-score muted">
        {score.total >= words.length
          ? `全部完成! 正确 ${score.correct}/${score.total} · 正确率 ${Math.round(score.correct / score.total * 100)}%`
          : `第 ${score.total + 1}/${words.length} 题${score.total > 0 ? ` · 正确 ${score.correct}/${score.total} · ${Math.round(score.correct / score.total * 100)}%` : ''}`}
      </p>
      {score.total >= words.length && (
        <button type="button" className="btn-light" style={{ justifySelf: 'center' }} onClick={() => { window.dispatchEvent(new CustomEvent('vocab-quiz-reset')); setScore({ correct: 0, total: 0 }) }}>重新测试</button>
      )}
    </>
  )
}

export default QuizMode
