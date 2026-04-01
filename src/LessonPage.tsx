import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import './LessonPage.scss'
import { allLessons } from './utils/nce'
import type { Lesson } from './utils/nce'
import { markLessonLearned } from './utils/progress'
import LessonLineCard from './features/lesson/LessonLineCard'
import { evaluateDictation } from './features/lesson/dictation'
import type { DictationFeedback } from './features/lesson/dictation'
import { handleEnglishBackspaceAtActive, handleEnglishTypeAtActive } from './features/lesson/modes/englishDictation'
import { commitChineseInputAtActive, updateChineseDraftInput } from './features/lesson/modes/chineseDictation'
import { getFavoriteMapByLesson, recordMistake, toggleFavorite } from './features/records/db'
import LessonSettingsPanel from './features/lesson/settings/LessonSettingsPanel'
import ShortcutModal from './features/lesson/settings/ShortcutModal'
import { PLAY_MODE_LABEL, VIEW_MODE_LABEL } from './features/lesson/settings/types'
import type { PlayMode, ViewMode } from './features/lesson/settings/types'

const clickWav = `${import.meta.env.BASE_URL}click.wav`
const beepWav = `${import.meta.env.BASE_URL}beep.wav`

const SHADOW_GAP_SECONDS = 2.2
const LISTEN_GAP_SECONDS = 0.8
const ERROR_PREVIEW_MS = 220

const isEnglishTypingKey = (key: string) => /^[a-zA-Z0-9']$/.test(key)

function LessonPage() {
  const navigate = useNavigate()
  const { contentId, level, lessonId } = useParams()
  const isMacPlatform = useMemo(() => {
    if (typeof navigator === 'undefined') {
      return false
    }
    return /Mac|iPhone|iPad/.test(navigator.platform)
  }, [])
  const [activeLineIndex, setActiveLineIndex] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [shortcutModalOpen, setShortcutModalOpen] = useState(false)
  const [playMode, setPlayMode] = useState<PlayMode>('continuous')
  const [viewMode, setViewMode] = useState<ViewMode>('both')
  const [playbackRate, setPlaybackRate] = useState(1)
  const [revealedMap, setRevealedMap] = useState<Record<number, boolean>>({})
  const [favoriteMap, setFavoriteMap] = useState<Record<number, boolean>>({})
  const [dictationInputs, setDictationInputs] = useState<Record<number, string>>({})
  const [mistakeCountMap, setMistakeCountMap] = useState<Record<number, number>>({})
  const [typingLockedMap, setTypingLockedMap] = useState<Record<number, boolean>>({})
  const [chineseDraftInput, setChineseDraftInput] = useState('')
  const [shakingLineIndex, setShakingLineIndex] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const chineseInputRef = useRef<HTMLInputElement | null>(null)
  const clickAudioRef = useRef<HTMLAudioElement | null>(null)
  const beepAudioRef = useRef<HTMLAudioElement | null>(null)
  const shakeTimerRef = useRef<number | null>(null)
  const wordResetTimerRef = useRef<number | null>(null)
  const chineseComposingRef = useRef(false)
  const segmentTimerRef = useRef<number | null>(null)
  const nextStepTimerRef = useRef<number | null>(null)
  const isDictationModeRef = useRef(false)
  const isChineseTargetRef = useRef(false)
  const dictationFeedbackRef = useRef<Record<number, DictationFeedback>>({})
  const activeLineIndexRef = useRef(0)
  const isRunningRef = useRef(false)
  const currentLessonRef = useRef<Lesson | null>(null)
  const startPlaybackRef = useRef<(fromIndex?: number) => void>(() => undefined)
  const stopPlaybackRef = useRef<(pauseAudio?: boolean) => void>(() => undefined)
  const handleSelectLineRef = useRef<(index: number) => void>(() => undefined)
  const typeAtActiveRef = useRef<(key: string) => void>(() => undefined)
  const backspaceAtActiveRef = useRef<() => void>(() => undefined)
  // panelOpen 状态的 ref 镜像，供 keydown 闭包（deps=[]）中安全读取
  const panelOpenRef = useRef(false)
  const shortcutModalOpenRef = useRef(false)

  const safeLevel = level || 'NCE1'
  const decodedLessonId = decodeURIComponent(lessonId || '')

  const levelLessons = useMemo(
    () => allLessons.filter((item) => item.level === safeLevel),
    [safeLevel],
  )

  const currentIndex = levelLessons.findIndex((item) => item.id === decodedLessonId)
  const currentLesson = currentIndex >= 0 ? levelLessons[currentIndex] : null

  const prevLesson = currentIndex > 0 ? levelLessons[currentIndex - 1] : null
  const nextLesson = currentIndex >= 0 && currentIndex < levelLessons.length - 1
    ? levelLessons[currentIndex + 1]
    : null

  const isDictationMode = viewMode === 'dictation-en' || viewMode === 'dictation-zh'
  const isChineseTarget = viewMode === 'dictation-en'

  const dictationFeedbackMap = useMemo<Record<number, DictationFeedback>>(() => {
    if (!currentLesson || !isDictationMode) {
      return {}
    }

    const targetIsChinese = viewMode === 'dictation-en'
    const nextMap: Record<number, DictationFeedback> = {}

    currentLesson.subtitles.forEach((line, index) => {
      const targetText = targetIsChinese ? line.chinese : line.english
      nextMap[index] = evaluateDictation(dictationInputs[index] || '', targetText, targetIsChinese)
    })

    return nextMap
  }, [currentLesson, dictationInputs, isDictationMode, viewMode])

  const activeLineCorrect = !isDictationMode || Boolean(dictationFeedbackMap[activeLineIndex]?.isCorrect)

  useEffect(() => {
    if (contentId !== 'nce') {
      navigate('/learn', { replace: true })
      return
    }

    if (!levelLessons.length) {
      navigate('/learn', { replace: true })
      return
    }

    if (!currentLesson) {
      navigate(`/learn/${contentId}/${safeLevel}/${encodeURIComponent(levelLessons[0].id)}`, { replace: true })
    }
  }, [contentId, currentLesson, levelLessons, navigate, safeLevel])

  useEffect(() => {
    if (currentLesson) {
      void markLessonLearned(currentLesson)
    }
  }, [currentLesson])

  useEffect(() => {
    if (!currentLesson) {
      setFavoriteMap({})
      return
    }

    let mounted = true
    void getFavoriteMapByLesson(currentLesson.id).then((map) => {
      if (mounted) {
        setFavoriteMap(map)
      }
    })

    return () => {
      mounted = false
    }
  }, [currentLesson])

  useEffect(() => {
    isDictationModeRef.current = isDictationMode
  }, [isDictationMode])

  useEffect(() => {
    isChineseTargetRef.current = isChineseTarget
  }, [isChineseTarget])

  useEffect(() => {
    dictationFeedbackRef.current = dictationFeedbackMap
  }, [dictationFeedbackMap])

  useEffect(() => {
    activeLineIndexRef.current = activeLineIndex
  }, [activeLineIndex])

  useEffect(() => {
    isRunningRef.current = isRunning
  }, [isRunning])

  useEffect(() => {
    currentLessonRef.current = currentLesson
  }, [currentLesson])

  // 同步 panelOpen 到 ref，让 keydown 闭包能读到最新值
  useEffect(() => {
    panelOpenRef.current = panelOpen
  }, [panelOpen])

  useEffect(() => {
    shortcutModalOpenRef.current = shortcutModalOpen
  }, [shortcutModalOpen])

  const clearPlaybackTimers = () => {
    if (wordResetTimerRef.current !== null) {
      window.clearTimeout(wordResetTimerRef.current)
      wordResetTimerRef.current = null
    }
    if (shakeTimerRef.current !== null) {
      window.clearTimeout(shakeTimerRef.current)
      shakeTimerRef.current = null
    }
    if (segmentTimerRef.current !== null) {
      window.clearInterval(segmentTimerRef.current)
      segmentTimerRef.current = null
    }
    if (nextStepTimerRef.current !== null) {
      window.clearTimeout(nextStepTimerRef.current)
      nextStepTimerRef.current = null
    }
  }

  const playFx = (audio: HTMLAudioElement | null) => {
    if (!audio) {
      return
    }
    audio.currentTime = 0
    audio.play().catch(() => undefined)
  }

  const focusChineseInput = () => {
    window.setTimeout(() => chineseInputRef.current?.focus(), 0)
  }

  const triggerShake = (index: number) => {
    setShakingLineIndex(null)
    window.requestAnimationFrame(() => {
      setShakingLineIndex(index)
    })

    if (shakeTimerRef.current !== null) {
      window.clearTimeout(shakeTimerRef.current)
    }
    shakeTimerRef.current = window.setTimeout(() => {
      setShakingLineIndex((prev) => (prev === index ? null : prev))
    }, 260)
  }

  const stopPlayback = (pauseAudio = true) => {
    clearPlaybackTimers()
    if (pauseAudio && audioRef.current) {
      audioRef.current.pause()
    }
    setIsRunning(false)
  }

  const getLineEnd = (index: number) => {
    if (!currentLesson) {
      return 0
    }
    const next = currentLesson.subtitles[index + 1]
    if (next) {
      return Math.max(currentLesson.subtitles[index].time + 0.4, next.time - 0.06)
    }

    const audioDuration = audioRef.current?.duration ?? 0
    if (Number.isFinite(audioDuration) && audioDuration > 0) {
      return audioDuration
    }
    return currentLesson.subtitles[index].time + 3
  }

  const runLine = (index: number, mode: PlayMode) => {
    if (!currentLesson || !audioRef.current || index < 0 || index >= currentLesson.subtitles.length) {
      return
    }

    const audio = audioRef.current
    stopPlayback(false)

    const start = currentLesson.subtitles[index].time
    const end = getLineEnd(index)
    setActiveLineIndex(index)
    setIsRunning(true)

    audio.playbackRate = playbackRate
    audio.currentTime = start
    audio.play().catch(() => {
      setIsRunning(false)
    })

    segmentTimerRef.current = window.setInterval(() => {
      if (!audioRef.current) {
        stopPlayback()
        return
      }

      if (audioRef.current.currentTime < end) {
        return
      }

      audioRef.current.pause()
      if (segmentTimerRef.current !== null) {
        window.clearInterval(segmentTimerRef.current)
        segmentTimerRef.current = null
      }

      if (mode === 'tap') {
        setIsRunning(false)
        return
      }

      if (mode === 'shadow') {
        nextStepTimerRef.current = window.setTimeout(() => runLine(index, mode), SHADOW_GAP_SECONDS * 1000)
        return
      }

      const nextIndex = index + 1
      if (!currentLesson || nextIndex >= currentLesson.subtitles.length) {
        setIsRunning(false)
        return
      }

      if (isDictationModeRef.current && !dictationFeedbackRef.current[index]?.isCorrect) {
        setIsRunning(false)
        return
      }

      if (mode === 'listen') {
        nextStepTimerRef.current = window.setTimeout(() => runLine(nextIndex, mode), LISTEN_GAP_SECONDS * 1000)
        return
      }

      runLine(nextIndex, mode)
    }, 32)
  }

  const startPlayback = (fromIndex?: number) => {
    const index = typeof fromIndex === 'number' ? fromIndex : activeLineIndex
    runLine(index, playMode)
  }

  const handleSelectLine = (index: number) => {
    if (!currentLesson) {
      return
    }

    const targetIndex = index

    setActiveLineIndex(targetIndex)

    if (isDictationMode && isChineseTarget) {
      focusChineseInput()
      setChineseDraftInput('')
    }

    if (!isDictationMode) {
      runLine(targetIndex, playMode === 'tap' ? 'tap' : playMode)
    }
  }

  const typeAtActive = (key: string) => {
    if (!isEnglishTypingKey(key)) {
      return
    }

    handleEnglishTypeAtActive({
      key,
      dictationInputs,
      mistakeCountMap,
      currentLessonRef,
      activeLineIndexRef,
      isDictationModeRef,
      isChineseTargetRef,
      setDictationInputs,
      setMistakeCountMap,
      setActiveLineIndex,
      playCorrect: () => playFx(clickAudioRef.current),
      playError: () => {
        const lesson = currentLessonRef.current
        const lineIndex = activeLineIndexRef.current
        if (lesson && lesson.subtitles[lineIndex]) {
          void recordMistake({
            lesson,
            lineIndex,
            line: lesson.subtitles[lineIndex],
            targetLang: isChineseTargetRef.current ? 'chinese' : 'english',
          })
        }
        playFx(beepAudioRef.current)
      },
      triggerShake,
      focusChineseInput,
      wordResetTimerRef,
      errorPreviewMs: ERROR_PREVIEW_MS,
    })
  }

  const commitChineseAtActive = (rawValue: string) => {
    commitChineseInputAtActive({
      rawValue,
      dictationInputs,
      mistakeCountMap,
      currentLessonRef,
      activeLineIndexRef,
      isDictationModeRef,
      isChineseTargetRef,
      setDictationInputs,
      setMistakeCountMap,
      setTypingLockedMap,
      setActiveLineIndex,
      setChineseDraftInput,
      playCorrect: () => playFx(clickAudioRef.current),
      playError: () => {
        const lesson = currentLessonRef.current
        const lineIndex = activeLineIndexRef.current
        if (lesson && lesson.subtitles[lineIndex]) {
          void recordMistake({
            lesson,
            lineIndex,
            line: lesson.subtitles[lineIndex],
            targetLang: isChineseTargetRef.current ? 'chinese' : 'english',
          })
        }
        playFx(beepAudioRef.current)
      },
      triggerShake,
      focusChineseInput,
      errorPreviewMs: ERROR_PREVIEW_MS,
    })
  }

  const backspaceAtActive = () => {
    handleEnglishBackspaceAtActive({
      dictationInputs,
      currentLessonRef,
      activeLineIndexRef,
      isDictationModeRef,
      isChineseTargetRef,
      setDictationInputs,
      setTypingLockedMap,
    })
  }

  startPlaybackRef.current = startPlayback
  stopPlaybackRef.current = stopPlayback
  handleSelectLineRef.current = handleSelectLine
  typeAtActiveRef.current = typeAtActive
  backspaceAtActiveRef.current = backspaceAtActive

  const gotoLesson = (targetId: string | undefined) => {
    if (!targetId || !contentId) {
      return
    }
    if (!activeLineCorrect) {
      return
    }
    stopPlayback()
    navigate(`/learn/${contentId}/${safeLevel}/${encodeURIComponent(targetId)}`)
    setActiveLineIndex(0)
  }

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate
    }
  }, [playbackRate])

  useEffect(() => {
    setActiveLineIndex(0)
    setRevealedMap({})
    setDictationInputs({})
    setMistakeCountMap({})
    setTypingLockedMap({})
    setChineseDraftInput('')
    stopPlayback()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLesson?.id])

  useEffect(() => {
    setActiveLineIndex(0)
    setDictationInputs({})
    setMistakeCountMap({})
    setTypingLockedMap({})
    setChineseDraftInput('')
    stopPlayback()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playMode, viewMode])

  useEffect(() => {
    const audio = audioRef.current

    return () => {
      if (wordResetTimerRef.current !== null) {
        window.clearTimeout(wordResetTimerRef.current)
        wordResetTimerRef.current = null
      }
      if (shakeTimerRef.current !== null) {
        window.clearTimeout(shakeTimerRef.current)
        shakeTimerRef.current = null
      }
      if (segmentTimerRef.current !== null) {
        window.clearInterval(segmentTimerRef.current)
        segmentTimerRef.current = null
      }
      if (nextStepTimerRef.current !== null) {
        window.clearTimeout(nextStepTimerRef.current)
        nextStepTimerRef.current = null
      }
      if (audio) {
        audio.pause()
      }
      setIsRunning(false)
    }
  }, [])

  useEffect(() => {
    /**
     * 全局键盘快捷键（绑定在 window，输入框内按键不拦截）
     *
     * 快捷键一览：
     *   Space         播放 / 暂停（非默写模式）
     *   P             点读当前句（非默写模式，以 tap 模式单次播放）
     *   Cmd/Ctrl + J  播放当前句音频（所有默写模式）
     *   Cmd/Ctrl + ,  打开 / 关闭学习设置面板
    *   Cmd/Ctrl + K  从本章第一句重播
    *   Cmd/Ctrl + 1  显示模式：中英文
    *   Cmd/Ctrl + 2  显示模式：隐藏内容
    *   Cmd/Ctrl + 3  显示模式：显示英文默写中文
    *   Cmd/Ctrl + 4  显示模式：显示中文默写英文
     *   Backspace     删除上一个字符（英文默写模式）
     *   ↑ / ↓         上一句 / 下一句
     *   ` (反引号)    打开 / 关闭学习设置面板
     *   Escape        关闭学习设置面板
     */
    const onKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + ,: 切换设置面板（比反引号更容易触发）
      if (event.key === ',' && (event.metaKey || event.ctrlKey) && !event.altKey) {
        event.preventDefault()
        setPanelOpen((prev) => !prev)
        return
      }

      // Cmd/Ctrl + J: 所有默写模式下都允许播放当前句音频。
      if (
        (event.key === 'j' || event.key === 'J')
        && (event.metaKey || event.ctrlKey)
        && !event.altKey
        && isDictationModeRef.current
      ) {
        event.preventDefault()
        startPlaybackRef.current(activeLineIndexRef.current)
        return
      }

      // Cmd/Ctrl + K: 从本章第一句重播
      if ((event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey) && !event.altKey) {
        event.preventDefault()
        setActiveLineIndex(0)
        startPlaybackRef.current(0)
        return
      }

      // Cmd/Ctrl + 数字: 快速切换显示模式
      if ((event.metaKey || event.ctrlKey) && !event.altKey) {
        if (event.key === '1') {
          event.preventDefault()
          setViewMode('both')
          return
        }
        if (event.key === '2') {
          event.preventDefault()
          setViewMode('hide')
          return
        }
        if (event.key === '3') {
          event.preventDefault()
          setViewMode('dictation-en')
          return
        }
        if (event.key === '4') {
          event.preventDefault()
          setViewMode('dictation-zh')
          return
        }
      }

      const target = event.target as HTMLElement | null
      // 当焦点在输入框内时，放行所有按键（中文输入法需要）
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return
      }

      // Escape: 关闭设置面板
      if (event.code === 'Escape') {
        if (shortcutModalOpenRef.current) {
          setShortcutModalOpen(false)
          return
        }
        if (panelOpenRef.current) {
          setPanelOpen(false)
        }
        return
      }

      // 反引号: 切换设置面板开关
      if (event.key === '`' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault()
        setPanelOpen((prev) => !prev)
        return
      }

      // P: 点读当前行（仅非默写模式，以 tap 模式单次播放）
      if ((event.key === 'p' || event.key === 'P') && !event.metaKey && !event.ctrlKey && !isDictationModeRef.current) {
        event.preventDefault()
        startPlaybackRef.current(activeLineIndexRef.current)
        return
      }

      // ↑ / ↓: 所有模式统一切换上一句 / 下一句
      if (!event.metaKey && !event.ctrlKey) {
        if (event.code === 'ArrowUp') {
          event.preventDefault()
          handleSelectLineRef.current(Math.max(0, activeLineIndexRef.current - 1))
          return
        }

        if (event.code === 'ArrowDown') {
          event.preventDefault()
          const total = currentLessonRef.current?.subtitles.length ?? 0
          if (total === 0) {
            return
          }
          handleSelectLineRef.current(Math.min(total - 1, activeLineIndexRef.current + 1))
          return
        }
      }

      // Space: 播放 / 暂停（非默写模式）
      if (event.code === 'Space') {
        event.preventDefault()
        if (isDictationModeRef.current) {
          return
        }

        if (isRunningRef.current) {
          stopPlaybackRef.current()
        } else {
          startPlaybackRef.current(activeLineIndexRef.current)
        }
        return
      }

      // Backspace: 英文默写模式删除上一字符
      if (event.code === 'Backspace' && isDictationModeRef.current) {
        if (isChineseTargetRef.current) {
          return
        }
        event.preventDefault()
        backspaceAtActiveRef.current()
        return
      }

      // 普通字母键: 英文默写输入（非中文默写模式）
      if (
        event.key.length === 1
        && isDictationModeRef.current
        && !isChineseTargetRef.current
        && !event.metaKey
        && !event.ctrlKey
        && !event.altKey
      ) {
        event.preventDefault()
        typeAtActiveRef.current(event.key)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!isDictationMode || !isChineseTarget) {
      return
    }

    setChineseDraftInput('')
    focusChineseInput()
  }, [activeLineIndex, isDictationMode, isChineseTarget])

  return (
    <main className="page">
      <section className="card learning-card">
        <div className="top-row">
          <h1>{currentLesson?.title || '加载课程中...'}</h1>
          <Link to={`/learn?level=${safeLevel}`} className="btn-light">返回课程列表</Link>
        </div>

        <p className="muted">
          {currentLesson
            ? `${currentLesson.album} · Lesson ${currentLesson.startLesson}-${currentLesson.endLesson} · 共 ${currentLesson.subtitles.length} 条字幕`
            : '正在准备课程数据'}
        </p>

        <div className="playback-strip">
          <button
            type="button"
            className="btn-light"
            onClick={() => {
              if (isRunning) {
                stopPlayback()
              } else {
                startPlayback()
              }
            }}
          >
            {isRunning ? '暂停' : '播放'}
          </button>
          <span>模式：{PLAY_MODE_LABEL[playMode]}</span>
          <span>速度：{playbackRate.toFixed(2)}x</span>
          <span>显示：{VIEW_MODE_LABEL[viewMode]}</span>
          {isDictationMode ? <span>直接输入</span> : <span>点击句子播放</span>}
        </div>

        {currentLesson?.audioUrl ? (
          <>
            <audio
              className="audio-player-hidden"
              ref={audioRef}
              src={currentLesson.audioUrl}
              preload="metadata"
            />
          </>
        ) : (
          <p className="muted">当前课程未找到音频文件。</p>
        )}

        <audio className="audio-player-hidden" ref={clickAudioRef} src={clickWav} preload="auto" />
        <audio className="audio-player-hidden" ref={beepAudioRef} src={beepWav} preload="auto" />

        <div className="subtitle-list">
          {currentLesson?.subtitles.map((line, index) => (
            <LessonLineCard
              key={`${line.time}-${line.english}-${line.chinese}`}
              line={line}
              index={index}
              isActive={index === activeLineIndex}
              viewMode={viewMode}
              revealed={Boolean(revealedMap[index])}
              dictationFeedback={dictationFeedbackMap[index]}
              typingLocked={Boolean(typingLockedMap[index])}
              isShaking={shakingLineIndex === index}
              isFavorite={Boolean(favoriteMap[index])}
              onCardSelect={handleSelectLine}
              onToggleReveal={(targetIndex) => {
                setRevealedMap((prev) => ({
                  ...prev,
                  [targetIndex]: !prev[targetIndex],
                }))
              }}
              onToggleFavorite={(targetIndex) => {
                if (!currentLesson) {
                  return
                }
                const targetLine = currentLesson.subtitles[targetIndex]
                if (!targetLine) {
                  return
                }

                void toggleFavorite(currentLesson, targetIndex, targetLine).then((saved) => {
                  setFavoriteMap((prev) => ({
                    ...prev,
                    [targetIndex]: saved,
                  }))
                })
              }}
              onPlayLine={viewMode === 'dictation-zh' ? () => runLine(index, 'tap') : undefined}
            />
          ))}
        </div>

        {isDictationMode && isChineseTarget ? (
          <div className="dictation-input-floating">
            <input
              ref={chineseInputRef}
              className="dictation-text-input"
              autoFocus
              spellCheck="false"
              value={chineseDraftInput || dictationInputs[activeLineIndex] || ''}
              placeholder="中文默写输入区（始终可见）"
              onCompositionStart={() => {
                chineseComposingRef.current = true
              }}
              onCompositionEnd={(event) => {
                chineseComposingRef.current = false
                commitChineseAtActive(event.currentTarget.value)
              }}
              onChange={(event) => {
                if (chineseComposingRef.current) {
                  updateChineseDraftInput({
                    rawValue: event.currentTarget.value,
                    setChineseDraftInput,
                  })
                  return
                }
                commitChineseAtActive(event.currentTarget.value)
              }}
            />
          </div>
        ) : null}

        <div className="lesson-nav lesson-nav-bottom">
          {prevLesson ? (
            <button type="button" className="btn-light" onClick={() => gotoLesson(prevLesson.id)}>上一课</button>
          ) : null}
          <span>{currentIndex >= 0 ? `当前第 ${currentIndex + 1} / ${levelLessons.length} 课` : '未定位课程'}</span>
          {nextLesson ? (
            <button
              type="button"
              className="btn-light"
              onClick={() => gotoLesson(nextLesson.id)}
              disabled={!activeLineCorrect}
            >
              下一课
            </button>
          ) : null}
        </div>
      </section>

      <div className="floating-controls">
        <button
          type="button"
          className="floating-control"
          onClick={() => setPanelOpen((prev) => !prev)}
        >
          学习设置
        </button>
      </div>

      {/* 面板幕布：面板开启时覆盖底层内容，点击任意幕布内区域即可关闭面板 */}
      {panelOpen ? (
        <div className="panel-backdrop" onClick={() => setPanelOpen(false)} />
      ) : null}

      {panelOpen ? (
        <LessonSettingsPanel
          playMode={playMode}
          viewMode={viewMode}
          playbackRate={playbackRate}
          onPlayModeChange={(mode) => {
            setPlayMode(mode)
            // 听读模式专注听力，自动切换到随机内容（不显示文本）
            if (mode === 'listen') {
              setViewMode('hide')
            }
            stopPlayback()
          }}
          onPlaybackRateChange={setPlaybackRate}
          onViewModeChange={setViewMode}
          onOpenShortcutModal={() => setShortcutModalOpen(true)}
        />
      ) : null}

      <ShortcutModal
        open={shortcutModalOpen}
        isMacPlatform={isMacPlatform}
        onClose={() => setShortcutModalOpen(false)}
      />
    </main>
  )
}

export default LessonPage
