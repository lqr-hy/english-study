import { getLearnedMap as getLearnedMapFromDb, LearnedMap, markLessonLearned as markLessonLearnedInDb } from '../features/records/db'
import { Lesson } from './nce'

export type { LearnedMap }

export const getLearnedMap = async (): Promise<LearnedMap> => {
  try {
    return await getLearnedMapFromDb()
  } catch {
    return {}
  }
}

export const markLessonLearned = async (lesson: Lesson): Promise<void> => {
  if (!lesson?.id) {
    return
  }

  try {
    await markLessonLearnedInDb(lesson)
  } catch {
    // swallow storage errors to avoid blocking lesson flow
  }
}
