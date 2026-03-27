import { useState } from 'react'
import { Link } from 'react-router-dom'
import './App.css'
import { vocabBooks } from './utils/vocab'

type Category = {
  id: string
  label: string
}

const categories: Category[] = [
  { id: 'nce', label: '新概念' },
  { id: 'bec', label: '商务英语' },
  // { id: 'toefl', label: 'TOEFL' },
  // { id: 'ielts', label: 'IELTS' },
  // { id: 'pet', label: 'PET' },
  // { id: 'gmat', label: 'GMAT' },
  // { id: 'gre', label: 'GRE' },
  // { id: 'ket', label: 'KET' },
  // { id: 'sat', label: 'SAT' },
  // { id: 'pte', label: 'PTE' },
  // { id: 'toeic', label: 'TOEIC' },
  // { id: 'cefr', label: 'CEFR' },
  // { id: 'fce', label: 'FCE' },
  // { id: 'oxford', label: '牛津版' },
  // { id: 'other', label: '其他' },
]

function BooksIcon() {
  return (
    <svg viewBox="0 0 48 48" width="36" height="36" aria-hidden="true" fill="none">
      <rect x="4" y="10" width="10" height="30" rx="2" fill="#c97b4b" />
      <rect x="17" y="6" width="10" height="34" rx="2" fill="#7c6fcd" />
      <rect x="30" y="12" width="10" height="28" rx="2" fill="#4caf82" />
      <rect x="4" y="38" width="36" height="3" rx="1.5" fill="#cbb89a" />
    </svg>
  )
}

function App() {
  const [activeCategory, setActiveCategory] = useState('nce')

  return (
    <main className="page home-page">
      <section className="card home-card">
        <h1>英语学习</h1>

        <div className="home-category-tabs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={cat.id === activeCategory ? 'home-cat-chip active' : 'home-cat-chip'}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {activeCategory === 'nce' && (
          <div className="home-content-grid">
            <Link to="/learn" className="home-content-card">
              <div className="home-content-card-icon">
                <BooksIcon />
              </div>
              <div className="home-content-card-body">
                <strong>新概念英语</strong>
                <span>NCE1–NCE4 音频课程</span>
                <em className="home-word-count">4 册全集</em>
              </div>
            </Link>
          </div>
        )}

        {activeCategory === 'bec' && (
          <div className="home-content-grid">
            {vocabBooks.map((book) => (
              <Link key={book.id} to={`/vocab/${book.id}`} className="home-content-card">
                <div className="home-content-card-icon">
                  <BooksIcon />
                </div>
                <div className="home-content-card-body">
                  <strong>{book.name}</strong>
                  <span>{book.description}</span>
                  <em className="home-word-count">{book.totalWords.toLocaleString()} 词</em>
                </div>
              </Link>
            ))}
          </div>
        )}

        {activeCategory !== 'nce' && activeCategory !== 'bec' && (
          <p className="muted home-coming-soon">该分类内容即将推出。</p>
        )}
      </section>
    </main>
  )
}

export default App
