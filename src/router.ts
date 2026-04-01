import { createHashRouter } from 'react-router-dom'
import App from './App'
import StudyPage from './StudyPage.tsx'
import LessonPage from './LessonPage.tsx'
import MistakesPage from './MistakesPage.tsx'
import FavoritesPage from './FavoritesPage.tsx'
import AppShell from './AppShell.tsx'
import VocabStudyPage from './VocabStudyPage.tsx'
import VocabChapterPage from './VocabChapterPage.tsx'

const router = createHashRouter(
  [
    {
      path: '/',
      Component: AppShell,
      children: [
        {
          index: true,
          Component: App,
        },
        {
          path: 'learn',
          Component: StudyPage,
        },
        {
          path: 'learn/:contentId/:level/:lessonId',
          Component: LessonPage,
        },
        {
          path: 'vocab/:bookId',
          Component: VocabStudyPage,
        },
        {
          path: 'vocab/:bookId/:chapterNum',
          Component: VocabChapterPage,
        },
        {
          path: 'records/mistakes',
          Component: MistakesPage,
        },
        {
          path: 'records/favorites',
          Component: FavoritesPage,
        },
      ],
    },
  ],
)

export default router
