export type FeedbackSegment = {
  expected: string
  actual: string
  status: 'correct' | 'wrong' | 'pending'
  hint: string
  wordStart: boolean
}

export type DictationFeedback = {
  isCorrect: boolean
  hasError: boolean
  matchedCount: number
  totalCount: number
  segments: FeedbackSegment[]
}

const normalizeChinese = (value: string) => value
  .replace(/[\s，。！？；：、“”‘’（）()【】《》,.!?;:'"-]/g, '')
  .trim()

const normalizeEnglish = (value: string) => value
  .toLowerCase()
  .replace(/[^a-z0-9\s']/g, '')
  .replace(/\s+/g, ' ')
  .trim()

type DictationToken = {
  char: string
  hint: string
  wordStart: boolean
}

const splitEnglishChars = (value: string): DictationToken[] => {
  const normalized = normalizeEnglish(value)
  if (!normalized) {
    return []
  }

  const words = normalized.split(' ')
  const tokens: DictationToken[] = []

  words.forEach((word) => {
    Array.from(word).forEach((char, charIndex) => {
      tokens.push({
        char,
        hint: word,
        wordStart: charIndex === 0,
      })
    })
  })

  return tokens
}

const splitChineseChars = (value: string): DictationToken[] => {
  const normalized = normalizeChinese(value)
  return normalized
    ? Array.from(normalized).map((char, index) => ({ char, hint: normalized, wordStart: index === 0 }))
    : []
}

export const evaluateDictation = (
  inputValue: string,
  targetValue: string,
  isChinese: boolean,
): DictationFeedback => {
  const expectedTokens = isChinese ? splitChineseChars(targetValue) : splitEnglishChars(targetValue)
  const actualTokens = isChinese ? splitChineseChars(inputValue) : splitEnglishChars(inputValue)
  const expected = expectedTokens.map((item) => item.char)
  const actual = actualTokens.map((item) => item.char)

  const maxLength = Math.max(expected.length, actual.length)
  const segments: FeedbackSegment[] = Array.from({ length: maxLength }).map((_, index) => {
    const expectedToken = expected[index] ?? ''
    const actualToken = actual[index] ?? ''
    const hint = expectedTokens[index]?.hint || ''
    const wordStart = Boolean(expectedTokens[index]?.wordStart)

    if (!expectedToken && actualToken) {
      return { expected: '', actual: actualToken, status: 'wrong', hint: '', wordStart: false }
    }

    if (expectedToken && !actualToken) {
      return { expected: expectedToken, actual: '', status: 'pending', hint, wordStart }
    }

    if (actualToken === expectedToken) {
      return { expected: expectedToken, actual: actualToken, status: 'correct', hint, wordStart }
    }

    return { expected: expectedToken, actual: actualToken, status: 'wrong', hint, wordStart }
  })

  const hasError = segments.some((item) => item.status === 'wrong')
  const matchedCount = segments.filter((item) => item.status === 'correct').length
  const isCorrect = expected.length > 0 && matchedCount === expected.length && actual.length === expected.length

  return {
    isCorrect,
    hasError,
    matchedCount,
    totalCount: expected.length,
    segments,
  }
}
