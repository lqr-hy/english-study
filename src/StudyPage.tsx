import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import './App.css'
import { allLessons, levelOptions } from './utils/nce'
import { getLearnedMap } from './utils/progress'
import { LearnedMap } from './features/records/db'

type LearningContent = {
  id: string
  name: string
  description: string
}

const learningContents: LearningContent[] = [
  {
    id: 'nce',
    name: '新概念英语',
    description: '当前包含 NCE1-NCE4 音频与字幕课程',
  },
]

function StudyPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialLevel = searchParams.get('level')
  const [selectedContentId, setSelectedContentId] = useState('nce')
  const [activeLevel, setActiveLevel] = useState(
    levelOptions.includes(initialLevel || '') ? (initialLevel as string) : 'NCE1',
  )
  const [keyword, setKeyword] = useState('')
  const [learnedMap, setLearnedMap] = useState<LearnedMap>({})

  useEffect(() => {
    let mounted = true

    void getLearnedMap().then((map) => {
      if (mounted) {
        setLearnedMap(map)
      }
    })

    return () => {
      mounted = false
    }
  }, [])

  const lessonsInContent = useMemo(() => {
    if (selectedContentId !== 'nce') {
      return []
    }
    return allLessons
  }, [selectedContentId])

  const filtered = useMemo(() => {
    const query = keyword.trim().toLowerCase()
    const pool = query
      ? lessonsInContent
      : lessonsInContent.filter((lesson) => lesson.level === activeLevel)

    if (!query) {
      return pool
    }

    return pool.filter((lesson) => {
      const text = `${lesson.level} ${lesson.title} ${lesson.filenameTitle} ${lesson.startLesson} ${lesson.endLesson}`.toLowerCase()
      return text.includes(query)
    })
  }, [lessonsInContent, activeLevel, keyword])

  const levelCountMap = useMemo(() => {
    return levelOptions.reduce<Record<string, number>>((acc, level) => {
      acc[level] = lessonsInContent.filter((lesson) => lesson.level === level).length
      return acc
    }, {})
  }, [lessonsInContent])

  return (
    <main className="page">
      <section className="card study-layout">
        <div className="top-row study-header">
          <h1>选择学习内容</h1>
          <Link to="/" className="btn-light">返回首页</Link>
        </div>

        <div className="study-columns">
          <aside className="study-sidebar">
            <div className="content-grid">
              {learningContents.map((content) => (
                <button
                  key={content.id}
                  type="button"
                  className={content.id === selectedContentId ? 'content-card active' : 'content-card'}
                  onClick={() => {
                    setSelectedContentId(content.id)
                    setKeyword('')
                  }}
                >
                  <strong>{content.name}</strong>
                  <span>{content.description}</span>
                </button>
              ))}
            </div>

            <div className="level-row">
              {levelOptions.map((level) => (
                <button
                  key={level}
                  type="button"
                  className={level === activeLevel ? 'chip active' : 'chip'}
                  onClick={() => {
                    setActiveLevel(level)
                    setSearchParams({ level })
                  }}
                >
                  {level} ({levelCountMap[level] || 0})
                </button>
              ))}
            </div>

            <label className="search-box">
              <span>课程搜索（支持全局）</span>
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="输入标题、课次、关键词"
              />
            </label>
          </aside>

          <section className="study-main">
            <ul className="course-list">
              {filtered.map((lesson) => (
                <li key={lesson.id}>
                  <Link
                    className="course-link"
                    to={`/learn/${selectedContentId}/${lesson.level}/${encodeURIComponent(lesson.id)}`}
                  >
                    <div>
                      <strong>
                        {lesson.level} · Lesson {String(lesson.startLesson).padStart(3, '0')} & {String(lesson.endLesson).padStart(3, '0')}
                      </strong>
                      <span>{lesson.title}</span>
                    </div>
                    {learnedMap[lesson.id] ? <em className="learned-badge">已学习</em> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </section>
    </main>
  )
}

export default StudyPage
