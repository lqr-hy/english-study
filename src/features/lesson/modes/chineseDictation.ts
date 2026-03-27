import { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { Lesson } from '../../../utils/nce'
import { evaluateDictation } from '../dictation'

export const normalizeChineseInput = (value: string) => value
  .replace(/\s+/g, '')
  .replace(/[A-Za-z]/g, '')

type ChineseCommitHandlerDeps = {
  rawValue: string
  dictationInputs: Record<number, string>
  mistakeCountMap: Record<number, number>
  currentLessonRef: MutableRefObject<Lesson | null>
  activeLineIndexRef: MutableRefObject<number>
  isDictationModeRef: MutableRefObject<boolean>
  isChineseTargetRef: MutableRefObject<boolean>
  setDictationInputs: Dispatch<SetStateAction<Record<number, string>>>
  setMistakeCountMap: Dispatch<SetStateAction<Record<number, number>>>
  setTypingLockedMap: Dispatch<SetStateAction<Record<number, boolean>>>
  setActiveLineIndex: Dispatch<SetStateAction<number>>
  setChineseDraftInput: Dispatch<SetStateAction<string>>
  playCorrect: () => void
  playError: () => void
  triggerShake: (index: number) => void
  focusChineseInput: () => void
  errorPreviewMs: number
}

export const commitChineseInputAtActive = ({
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
  playCorrect,
  playError,
  triggerShake,
  focusChineseInput,
  errorPreviewMs,
}: ChineseCommitHandlerDeps) => {
  if (!currentLessonRef.current || !isDictationModeRef.current || !isChineseTargetRef.current) {
    return
  }

  const targetIndex = activeLineIndexRef.current
  const targetLine = currentLessonRef.current.subtitles[targetIndex]
  const targetText = targetLine.chinese
  const normalizedValue = normalizeChineseInput(rawValue)

  setChineseDraftInput('')
  setDictationInputs((prev) => ({
    ...prev,
    [targetIndex]: normalizedValue,
  }))

  const feedback = evaluateDictation(normalizedValue, targetText, true)
  if (feedback.hasError) {
    const nextMistakeCount = (mistakeCountMap[targetIndex] || 0) + 1
    setMistakeCountMap((prev) => ({
      ...prev,
      [targetIndex]: nextMistakeCount >= 3 ? 0 : nextMistakeCount,
    }))
    setTypingLockedMap((prev) => ({
      ...prev,
      [targetIndex]: false,
    }))
    playError()
    triggerShake(targetIndex)

    if (nextMistakeCount >= 3) {
      window.setTimeout(() => {
        setDictationInputs((prev) => ({
          ...prev,
          [targetIndex]: '',
        }))
      }, errorPreviewMs)
    }
    return
  }

  setTypingLockedMap((prev) => ({
    ...prev,
    [targetIndex]: false,
  }))

  if (!feedback.isCorrect) {
    return
  }

  if (normalizedValue.length > (dictationInputs[targetIndex] || '').length) {
    playCorrect()
  }

  setMistakeCountMap((prev) => ({
    ...prev,
    [targetIndex]: 0,
  }))

  const nextIndex = Math.min(targetIndex + 1, currentLessonRef.current.subtitles.length - 1)
  if (nextIndex !== targetIndex) {
    setActiveLineIndex(nextIndex)
    focusChineseInput()
  }
}

type ChineseDraftHandlerDeps = {
  rawValue: string
  setChineseDraftInput: Dispatch<SetStateAction<string>>
}

export const updateChineseDraftInput = ({ rawValue, setChineseDraftInput }: ChineseDraftHandlerDeps) => {
  setChineseDraftInput(rawValue)
}
