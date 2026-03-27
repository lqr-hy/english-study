import { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { Lesson } from '../../../utils/nce'
import { evaluateDictation } from '../dictation'

const normalizeEnglishTarget = (value: string) => value
  .toLowerCase()
  .replace(/[^a-z0-9\s']/g, '')
  .replace(/\s+/g, ' ')
  .trim()

export const normalizeEnglishInput = (value: string) => value
  .toLowerCase()
  .replace(/[^a-z0-9']/g, '')

const getWordStartByCharIndex = (targetText: string, charIndex: number) => {
  const words = normalizeEnglishTarget(targetText).split(' ').filter(Boolean)
  if (!words.length) {
    return 0
  }

  let cursor = 0
  for (const word of words) {
    const nextCursor = cursor + word.length
    if (charIndex < nextCursor) {
      return cursor
    }
    cursor = nextCursor
  }

  return cursor
}

export const resetEnglishToCurrentWordStart = (inputWithError: string, targetText: string) => {
  const normalizedInput = normalizeEnglishInput(inputWithError)
  if (!normalizedInput) {
    return ''
  }

  const errorIndex = Math.max(0, normalizedInput.length - 1)
  const wordStart = getWordStartByCharIndex(targetText, errorIndex)
  return normalizedInput.slice(0, wordStart)
}

type EnglishInputHandlerDeps = {
  key: string
  dictationInputs: Record<number, string>
  mistakeCountMap: Record<number, number>
  currentLessonRef: MutableRefObject<Lesson | null>
  activeLineIndexRef: MutableRefObject<number>
  isDictationModeRef: MutableRefObject<boolean>
  isChineseTargetRef: MutableRefObject<boolean>
  setDictationInputs: Dispatch<SetStateAction<Record<number, string>>>
  setMistakeCountMap: Dispatch<SetStateAction<Record<number, number>>>
  setActiveLineIndex: Dispatch<SetStateAction<number>>
  playCorrect: () => void
  playError: () => void
  triggerShake: (index: number) => void
  focusChineseInput: () => void
  wordResetTimerRef: MutableRefObject<number | null>
  errorPreviewMs: number
}

export const handleEnglishTypeAtActive = ({
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
  playCorrect,
  playError,
  triggerShake,
  focusChineseInput,
  wordResetTimerRef,
  errorPreviewMs,
}: EnglishInputHandlerDeps) => {
  if (!isDictationModeRef.current || isChineseTargetRef.current || !currentLessonRef.current) {
    return
  }

  const targetIndex = activeLineIndexRef.current
  const currentValue = dictationInputs[targetIndex] || ''
  const nextValue = normalizeEnglishInput(`${currentValue}${key.toLowerCase()}`)
  const targetLine = currentLessonRef.current.subtitles[targetIndex]
  const targetText = targetLine.english
  const feedback = evaluateDictation(nextValue, targetText, false)

  if (feedback.hasError) {
    const nextMistakeCount = (mistakeCountMap[targetIndex] || 0) + 1
    setMistakeCountMap((prev) => ({
      ...prev,
      [targetIndex]: nextMistakeCount >= 3 ? 0 : nextMistakeCount,
    }))
    setDictationInputs((prev) => ({
      ...prev,
      [targetIndex]: nextValue,
    }))
    playError()
    triggerShake(targetIndex)

    if (wordResetTimerRef.current !== null) {
      window.clearTimeout(wordResetTimerRef.current)
    }
    wordResetTimerRef.current = window.setTimeout(() => {
      setDictationInputs((prev) => ({
        ...prev,
        [targetIndex]: resetEnglishToCurrentWordStart(prev[targetIndex] || '', targetText),
      }))
    }, errorPreviewMs)
    return
  }

  setDictationInputs((prev) => ({
    ...prev,
    [targetIndex]: nextValue,
  }))
  playCorrect()

  if (feedback.isCorrect && currentLessonRef.current) {
    setMistakeCountMap((prev) => ({
      ...prev,
      [targetIndex]: 0,
    }))
    const nextIndex = Math.min(targetIndex + 1, currentLessonRef.current.subtitles.length - 1)
    if (nextIndex !== targetIndex) {
      setActiveLineIndex(nextIndex)
      if (isChineseTargetRef.current) {
        focusChineseInput()
      }
    }
  }
}

type EnglishBackspaceHandlerDeps = {
  dictationInputs: Record<number, string>
  currentLessonRef: MutableRefObject<Lesson | null>
  activeLineIndexRef: MutableRefObject<number>
  isDictationModeRef: MutableRefObject<boolean>
  isChineseTargetRef: MutableRefObject<boolean>
  setDictationInputs: Dispatch<SetStateAction<Record<number, string>>>
  setTypingLockedMap: Dispatch<SetStateAction<Record<number, boolean>>>
}

export const handleEnglishBackspaceAtActive = ({
  dictationInputs,
  currentLessonRef,
  activeLineIndexRef,
  isDictationModeRef,
  isChineseTargetRef,
  setDictationInputs,
  setTypingLockedMap,
}: EnglishBackspaceHandlerDeps) => {
  if (!isDictationModeRef.current || isChineseTargetRef.current) {
    return
  }

  const targetIndex = activeLineIndexRef.current
  const currentValue = dictationInputs[targetIndex] || ''
  if (!currentValue) {
    return
  }

  // 英文默写中，已经确认正确的前缀不允许再删除。
  // 由于错误输入会被短暂预览后回退，留在输入框中的内容通常就是已确认正确的前缀。
  const targetLine = currentLessonRef.current?.subtitles[targetIndex]
  if (targetLine) {
    const feedback = evaluateDictation(currentValue, targetLine.english, false)
    if (feedback.matchedCount >= currentValue.length) {
      return
    }
  }

  const nextValue = currentValue.slice(0, -1)

  setDictationInputs((prev) => ({
    ...prev,
    [targetIndex]: nextValue,
  }))

  setTypingLockedMap((prev) => ({
    ...prev,
    [targetIndex]: false,
  }))
}
