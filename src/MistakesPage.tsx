import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import './MistakesPage.scss'
import RecordPagination from './features/records/RecordPagination'
import { getMistakesPaged } from './features/records/db'
import type { MistakeRecord, MistakeSortBy } from './features/records/db'
import { getWordMistakesPaged } from './features/records/wordDb'
import type { WordMistakeRecord, WordMistakeSortBy } from './features/records/wordDb'
import { vocabBooks } from './utils/vocab'

type RecordType = 'nce' | 'vocab'

function MistakesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const recordType = (searchParams.get('type') as RecordType) ?? 'nce'
  const vocabBookFilter = searchParams.get('book') ?? ''

  // NCE state
  const [ncePage, setNcePage] = useState(1)
  const [nceItems, setNceItems] = useState<MistakeRecord[]>([])
  const [nceTotal, setNceTotal] = useState(0)
  const [nceTotalPages, setNceTotalPages] = useState(1)
  const [nceSortBy, setNceSortBy] = useState<MistakeSortBy>('count')
  const [nceLoading, setNceLoading] = useState(false)
  const [nceActiveIndex, setNceActiveIndex] = useState(0)

  // Vocab state
  const [vocabPage, setVocabPage] = useState(1)
  const [vocabItems, setVocabItems] = useState<WordMistakeRecord[]>([])
  const [vocabTotal, setVocabTotal] = useState(0)
  const [vocabTotalPages, setVocabTotalPages] = useState(1)
  const [vocabSortBy, setVocabSortBy] = useState<WordMistakeSortBy>('count')
  const [vocabLoading, setVocabLoading] = useState(false)
  const [vocabActiveIndex, setVocabActiveIndex] = useState(0)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (recordType !== 'nce') return
    let mounted = true
    setNceLoading(true)
    void getMistakesPaged(ncePage, 20, nceSortBy)
      .then((result) => {
        if (!mounted) return
        setNceItems(result.items)
        setNceActiveIndex(0)
        setNcePage(result.page)
        setNceTotal(result.total)
        setNceTotalPages(result.totalPages)
      })
      .finally(() => { if (mounted) setNceLoading(false) })
    return () => { mounted = false }
  }, [recordType, ncePage, nceSortBy])

  useEffect(() => {
    if (recordType !== 'vocab') return
    let mounted = true
    setVocabLoading(true)
    void getWordMistakesPaged(vocabPage, 20, vocabSortBy, vocabBookFilter || undefined)
      .then((result) => {
        if (!mounted) return
        setVocabItems(result.items)
        setVocabActiveIndex(0)
        setVocabPage(result.page)
        setVocabTotal(result.total)
        setVocabTotalPages(result.totalPages)
      })
      .finally(() => { if (mounted) setVocabLoading(false) })
    return () => { mounted = false }
  }, [recordType, vocabPage, vocabSortBy, vocabBookFilter])

  const playText = (text: string) => {
    const payload = text.trim()
    if (!payload || !audioRef.current) return
    audioRef.current.src = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(payload)}&type=2`
    audioRef.current.play().catch(() => undefined)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (recordType === 'nce' && nceItems.length) {
        if ((event.key === 'j' || event.key === 'J') && (event.metaKey || event.ctrlKey) && !event.altKey) {
          event.preventDefault()
          playText(nceItems[nceActiveIndex]?.english ?? '')
          return
        }
        if (event.code === 'ArrowUp') { event.preventDefault(); setNceActiveIndex((p) => Math.max(0, p - 1)); return }
        if (event.code === 'ArrowDown') { event.preventDefault(); setNceActiveIndex((p) => Math.min(nceItems.length - 1, p + 1)); return }
        if (event.code === 'Space' || event.key.toLowerCase() === 'p') {
          event.preventDefault()
          playText(nceItems[nceActiveIndex]?.english ?? '')
        }
      }
      if (recordType === 'vocab' && vocabItems.length) {
        if ((event.key === 'j' || event.key === 'J') && (event.metaKey || event.ctrlKey) && !event.altKey) {
          event.preventDefault()
          playText(vocabItems[vocabActiveIndex]?.wordName ?? '')
          return
        }
        if (event.code === 'ArrowUp') { event.preventDefault(); setVocabActiveIndex((p) => Math.max(0, p - 1)); return }
        if (event.code === 'ArrowDown') { event.preventDefault(); setVocabActiveIndex((p) => Math.min(vocabItems.length - 1, p + 1)); return }
        if (event.code === 'Space' || event.key.toLowerCase() === 'p') {
          event.preventDefault()
          playText(vocabItems[vocabActiveIndex]?.wordName ?? '')
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [recordType, nceItems, nceActiveIndex, vocabItems, vocabActiveIndex])

  const nceEmpty = useMemo(() => !nceLoading && nceItems.length === 0, [nceLoading, nceItems.length])
  const vocabEmpty = useMemo(() => !vocabLoading && vocabItems.length === 0, [vocabLoading, vocabItems.length])

  const setType = (t: RecordType) => {
    const p = new URLSearchParams()
    p.set('type', t)
    setSearchParams(p)
  }

  return (
    <main className="page">
      <section className="card records-card">
        <div className="top-row">
          <h1>错题本</h1>
          <span className="muted">P/Space/Cmd+J 播放</span>
        </div>

        <div className="record-type-tabs">
          <button
            type="button"
            className={recordType === 'nce' ? 'chip active' : 'chip'}
            onClick={() => setType('nce')}
          >
            新概念错题
          </button>
          <button
            type="button"
            className={recordType === 'vocab' ? 'chip active' : 'chip'}
            onClick={() => setType('vocab')}
          >
            单词错题
          </button>
        </div>

        {recordType === 'nce' && (
          <>
            <div className="record-sort-row">
              <button type="button" className={nceSortBy === 'count' ? 'chip active' : 'chip'} onClick={() => { setNceSortBy('count'); setNcePage(1) }}>按错误次数</button>
              <button type="button" className={nceSortBy === 'recent' ? 'chip active' : 'chip'} onClick={() => { setNceSortBy('recent'); setNcePage(1) }}>按最近错误</button>
            </div>
            {nceLoading && <p className="muted">加载中...</p>}
            {nceEmpty && <p className="muted">暂无错题记录。</p>}
            {nceItems.length > 0 && (
              <ul className="record-list">
                {nceItems.map((item) => (
                  <li
                    key={item.id}
                    className={`record-item${nceItems[nceActiveIndex]?.id === item.id ? ' active' : ''}`}
                    onClick={() => setNceActiveIndex(nceItems.findIndex((c) => c.id === item.id))}
                  >
                    <div className="record-item-head">
                      <strong>{item.level} · Lesson {item.startLesson}-{item.endLesson}</strong>
                      <div className="record-head-actions">
                        <span>错了 {item.errorCount} 次</span>
                        <button type="button" className="line-icon-btn" onClick={() => playText(item.english)} aria-label="播放英文">
                          <svg viewBox="0 0 16 16" fill="currentColor" width="11" height="11" aria-hidden="true"><path d="M3 2.8A1 1 0 014 2l8 5.2a1 1 0 010 1.6L4 14A1 1 0 012.5 13.14V2.86A1 1 0 013 2.8z" /></svg>
                        </button>
                      </div>
                    </div>
                    <p className="record-lesson-title">{item.lessonTitle}</p>
                    <p className="record-line-en">{item.english || '-'}</p>
                    <p className="record-line-zh">{item.chinese || '（暂无翻译）'}</p>
                  </li>
                ))}
              </ul>
            )}
            <RecordPagination page={ncePage} totalPages={nceTotalPages} total={nceTotal} onPageChange={setNcePage} />
          </>
        )}

        {recordType === 'vocab' && (
          <>
            <div className="record-sort-row">
              <select
                className="vocab-book-select"
                value={vocabBookFilter}
                onChange={(e) => {
                  const p = new URLSearchParams()
                  p.set('type', 'vocab')
                  if (e.target.value) p.set('book', e.target.value)
                  setSearchParams(p)
                  setVocabPage(1)
                }}
              >
                <option value="">全部词库</option>
                {vocabBooks.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <button type="button" className={vocabSortBy === 'count' ? 'chip active' : 'chip'} onClick={() => { setVocabSortBy('count'); setVocabPage(1) }}>按错误次数</button>
              <button type="button" className={vocabSortBy === 'recent' ? 'chip active' : 'chip'} onClick={() => { setVocabSortBy('recent'); setVocabPage(1) }}>按最近错误</button>
            </div>
            {vocabLoading && <p className="muted">加载中...</p>}
            {vocabEmpty && <p className="muted">暂无单词错题记录。</p>}
            {vocabItems.length > 0 && (
              <ul className="record-list">
                {vocabItems.map((item) => (
                  <li
                    key={item.id}
                    className={`record-item${vocabItems[vocabActiveIndex]?.id === item.id ? ' active' : ''}`}
                    onClick={() => setVocabActiveIndex(vocabItems.findIndex((c) => c.id === item.id))}
                  >
                    <div className="record-item-head">
                      <strong>{vocabBooks.find((b) => b.id === item.bookId)?.name ?? item.bookId} · 第 {item.chapterNum} 章</strong>
                      <div className="record-head-actions">
                        <span>错了 {item.errorCount} 次</span>
                        <button type="button" className="line-icon-btn" onClick={() => playText(item.wordName)} aria-label="播放单词">
                          <svg viewBox="0 0 16 16" fill="currentColor" width="11" height="11" aria-hidden="true"><path d="M3 2.8A1 1 0 014 2l8 5.2a1 1 0 010 1.6L4 14A1 1 0 012.5 13.14V2.86A1 1 0 013 2.8z" /></svg>
                        </button>
                      </div>
                    </div>
                    <p className="record-line-en">{item.wordName}</p>
                    <p className="record-line-zh">{item.wordTrans.join('；')}</p>
                  </li>
                ))}
              </ul>
            )}
            <RecordPagination page={vocabPage} totalPages={vocabTotalPages} total={vocabTotal} onPageChange={setVocabPage} />
          </>
        )}

        <audio className="audio-player-hidden" ref={audioRef} preload="none" />
      </section>
    </main>
  )
}

export default MistakesPage
