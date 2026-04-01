import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { WordEntry } from '../../utils/vocab'
import { evaluateDictation } from '../lesson/dictation'
import { recordWordMistake } from '../records/wordDb'
import type { VocabModeProps } from './types'
import { shuffleArray, formatTime, normalizeInput, ERROR_PREVIEW_MS, AUTO_ADVANCE_MS } from './types'
import PlayIcon from './PlayIcon'
import './ChallengeMode.scss'

type Phase = 'idle' | 'running' | 'done'

function ChallengeMode({ words, bookId, chapterId, chapterNum, playAudio, markVisited }: VocabModeProps) {
  const [challengeWords, setChallengeWords] = useState<WordEntry[]>([])
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [inputCount, setInputCount] = useState(0)
  const [dictInput, setDictInput] = useState('')
  const [shaking, setShaking] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  const currentWord = challengeWords[idx]

  const clickAudioRef = useRef<HTMLAudioElement | null>(null)
  const beepAudioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<number | null>(null)
  const wordResetTimerRef = useRef<number | null>(null)
  const autoAdvanceTimerRef = useRef<number | null>(null)
  const shakeTimerRef = useRef<number | null>(null)

  const phaseRef = useRef<Phase>('idle')
  const dictInputRef = useRef('')
  const idxRef = useRef(0)
  const challengeWordsRef = useRef<WordEntry[]>([])
  const hadAnyWordErrorRef = useRef(false)
  const currentWordHadErrorRef = useRef(false)

  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { dictInputRef.current = dictInput }, [dictInput])
  useEffect(() => { idxRef.current = idx }, [idx])
  useEffect(() => { challengeWordsRef.current = challengeWords }, [challengeWords])

  const clearTimers = useCallback(() => {
    if (timerRef.current !== null) { window.clearInterval(timerRef.current); timerRef.current = null }
    if (wordResetTimerRef.current !== null) { window.clearTimeout(wordResetTimerRef.current); wordResetTimerRef.current = null }
    if (autoAdvanceTimerRef.current !== null) { window.clearTimeout(autoAdvanceTimerRef.current); autoAdvanceTimerRef.current = null }
    if (shakeTimerRef.current !== null) { window.clearTimeout(shakeTimerRef.current); shakeTimerRef.current = null }
  }, [])

  // Timer
  useEffect(() => {
    if (phase !== 'running') return
    const id = window.setInterval(() => setElapsed(prev => prev + 1), 1000)
    timerRef.current = id
    return () => { window.clearInterval(id); timerRef.current = null }
  }, [phase])

  const startChallenge = useCallback(() => {
    clearTimers()
    setChallengeWords(shuffleArray(words))
    setIdx(0)
    setDictInput('')
    setPhase('running')
    setElapsed(0)
    setCorrect(0)
    setInputCount(0)
    setShaking(false)
    hadAnyWordErrorRef.current = false
    currentWordHadErrorRef.current = false
  }, [words, clearTimers])

  // NCE-style char-by-char handler
  const handleKey = useCallback((key: string) => {
    if (!/^[a-zA-Z0-9']$/.test(key)) return
    if (phaseRef.current !== 'running') return
    const cw = challengeWordsRef.current
    const curIdx = idxRef.current
    const word = cw[curIdx]
    if (!word) return

    if (wordResetTimerRef.current !== null) { window.clearTimeout(wordResetTimerRef.current); wordResetTimerRef.current = null }
    if (autoAdvanceTimerRef.current !== null) { window.clearTimeout(autoAdvanceTimerRef.current); autoAdvanceTimerRef.current = null }

    const nextValue = normalizeInput(dictInputRef.current + key)
    const feedback = evaluateDictation(nextValue, word.name, false)

    const playFx = (el: HTMLAudioElement | null) => { if (el) { el.currentTime = 0; el.play().catch(() => undefined) } }

    if (feedback.hasError) {
      setDictInput(nextValue)
      setInputCount(prev => prev + 1)
      setShaking(false)
      window.requestAnimationFrame(() => setShaking(true))
      if (shakeTimerRef.current !== null) window.clearTimeout(shakeTimerRef.current)
      shakeTimerRef.current = window.setTimeout(() => setShaking(false), 400)
      void recordWordMistake(bookId, chapterId, chapterNum, word)
      currentWordHadErrorRef.current = true
      hadAnyWordErrorRef.current = true
      playFx(beepAudioRef.current)
      wordResetTimerRef.current = window.setTimeout(() => setDictInput(''), ERROR_PREVIEW_MS)
      return
    }

    playFx(clickAudioRef.current)
    setDictInput(nextValue)
    setInputCount(prev => prev + 1)
    setCorrect(prev => prev + 1)

    if (feedback.isCorrect) {
      const origIdx = words.findIndex(w => w.name === word.name)
      if (origIdx >= 0) markVisited(origIdx)
      autoAdvanceTimerRef.current = window.setTimeout(() => {
        const nextIdx = idxRef.current + 1
        currentWordHadErrorRef.current = false
        if (nextIdx >= challengeWordsRef.current.length) {
          setPhase('done')
          window.dispatchEvent(new CustomEvent('vocab-challenge-done', { detail: { isPerfect: !hadAnyWordErrorRef.current } }))
        } else {
          setIdx(nextIdx)
          setDictInput('')
          setShaking(false)
        }
      }, AUTO_ADVANCE_MS)
    }
  }, [bookId, chapterId, chapterNum, words, markVisited])

  // Keyboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'running') return
      // Cmd+J play
      if ((e.key === 'j' || e.key === 'J') && (e.metaKey || e.ctrlKey) && !e.altKey) {
        e.preventDefault()
        const word = challengeWordsRef.current[idxRef.current]
        if (word) playAudio(word.name)
        return
      }
      if (e.code === 'Space') {
        e.preventDefault()
        const word = challengeWordsRef.current[idxRef.current]
        if (word) playAudio(word.name)
        return
      }
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        handleKey(e.key)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleKey, playAudio])

  // Clean up on unmount
  useEffect(() => () => clearTimers(), [clearTimers])

  // Live feedback
  const dictFeedback = useMemo(() => {
    if (!currentWord || phase !== 'running') return null
    return evaluateDictation(dictInput, currentWord.name, false)
  }, [dictInput, currentWord, phase])

  const pendingSegments = useMemo(() => {
    if (!currentWord) return []
    return currentWord.name.split('').map((ch) => ({ expected: ch, actual: '', status: 'pending' as const, hint: '', wordStart: false }))
  }, [currentWord])

  const switchToCard = useCallback(() => {
    window.dispatchEvent(new CustomEvent('vocab-switch-mode', { detail: 'card' }))
  }, [])

  return (
    <div className={`vocab-word-card challenge-card${shaking ? ' shake' : ''}`}>
      {phase === 'idle' && (
        <div className="challenge-start">
          <h3>拼写挑战</h3>
          <p>本章 {words.length} 个单词，随机打乱顺序</p>
          <p className="muted">看中文释义，逐字母拼写英文单词</p>
          <button type="button" className="btn-primary" onClick={startChallenge}>开始挑战</button>
        </div>
      )}
      {phase === 'running' && currentWord && (
        <>
          <div className="challenge-stats-bar">
            <div className="challenge-stat"><span className="challenge-stat-value">{formatTime(elapsed)}</span><span className="challenge-stat-label">时间</span></div>
            <div className="challenge-stat"><span className="challenge-stat-value">{inputCount}</span><span className="challenge-stat-label">输入数</span></div>
            <div className="challenge-stat"><span className="challenge-stat-value">{elapsed > 0 ? Math.round(inputCount / (elapsed / 60)) : 0}</span><span className="challenge-stat-label">WPM</span></div>
            <div className="challenge-stat"><span className="challenge-stat-value">{correct}</span><span className="challenge-stat-label">正确数</span></div>
            <div className="challenge-stat"><span className="challenge-stat-value">{inputCount > 0 ? Math.round(correct / inputCount * 100) : 100}</span><span className="challenge-stat-label">正确率</span></div>
          </div>
          <div className="challenge-word-area">
            <div className="challenge-dictation-row">
              <div className="vocab-dict-display">
                <div className="dictation-highlight" key={idx} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
                  {(dictFeedback?.segments ?? pendingSegments).map((seg, i) => {
                    const text =
                      seg.status === 'pending'
                        ? (isHovering ? (seg.expected || ' ') : '_')
                        : seg.status === 'wrong'
                          ? '_'
                          : (seg.actual || ' ')
                    return (
                      <span
                        key={i}
                        className={`token-${seg.status}${seg.wordStart ? ' token-word-start' : ''}${seg.status === 'pending' && isHovering ? ' reveal-hint' : ''}`}
                      >
                        {text}
                      </span>
                    )
                  })}
                </div>
              </div>
              <button type="button" className="line-icon-btn" onClick={() => playAudio(currentWord.name)} aria-label="播放发音"><PlayIcon /></button>
            </div>
            <div className="vocab-dict-prompt challenge-dict-prompt">
              {currentWord.trans.map((t, i) => <p key={i}>{t}</p>)}
            </div>
            <p className="muted" style={{ textAlign: 'center', marginTop: 4 }}>第 {idx + 1} / {challengeWords.length} 词</p>
          </div>
        </>
      )}
      {phase === 'done' && (
        <div className="challenge-done">
          <h2>挑战完成!</h2>
          <div className="challenge-stats-bar">
            <div className="challenge-stat"><span className="challenge-stat-value">{formatTime(elapsed)}</span><span className="challenge-stat-label">用时</span></div>
            <div className="challenge-stat"><span className="challenge-stat-value">{inputCount}</span><span className="challenge-stat-label">输入数</span></div>
            <div className="challenge-stat"><span className="challenge-stat-value">{elapsed > 0 ? Math.round(inputCount / (elapsed / 60)) : 0}</span><span className="challenge-stat-label">WPM</span></div>
            <div className="challenge-stat"><span className="challenge-stat-value">{correct}</span><span className="challenge-stat-label">正确数</span></div>
            <div className="challenge-stat"><span className="challenge-stat-value">{inputCount > 0 ? Math.round(correct / inputCount * 100) : 100}%</span><span className="challenge-stat-label">正确率</span></div>
          </div>
          <div className="challenge-done-actions">
            <button type="button" className="btn-primary" onClick={startChallenge}>再来一次</button>
            <button type="button" className="btn-light" onClick={switchToCard}>返回卡片</button>
          </div>
        </div>
      )}

      <audio ref={clickAudioRef} src={`${import.meta.env.BASE_URL}click.wav`} preload="auto" className="audio-player-hidden" />
      <audio ref={beepAudioRef} src={`${import.meta.env.BASE_URL}beep.wav`} preload="auto" className="audio-player-hidden" />
    </div>
  )
}

export default ChallengeMode
