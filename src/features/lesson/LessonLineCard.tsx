import type { DictationFeedback } from './dictation'
import type { SubtitleLine } from '../../utils/nce'
import HideModeContent from '../../components/lesson/HideModeContent'
import NormalModeContent from '../../components/lesson/NormalModeContent'
import DictationModePanel from '../../components/lesson/DictationModePanel'
import './LessonLineCard.scss'

type ViewMode = 'both' | 'hide' | 'dictation-en' | 'dictation-zh'

type LessonLineCardProps = {
  line: SubtitleLine
  index: number
  isActive: boolean
  viewMode: ViewMode
  revealed: boolean
  dictationFeedback?: DictationFeedback
  typingLocked: boolean
  isShaking: boolean
  onCardSelect: (index: number) => void
  onToggleReveal: (index: number) => void
  isFavorite: boolean
  onToggleFavorite: (index: number) => void
  /**
   * 可选：点击该行的音频播放按钮时触发。
   * 仅在 dictation-zh（显示中文默写英文）模式下由 LessonPage 传入。
   */
  onPlayLine?: () => void
}

/**
 * 单句字幕卡片：
 * - 根据 viewMode 切换渲染逻辑（隐藏 / 普通 / 默写）
 * - isActive 控制高亮边框与阴影
 * - isShaking 触发横向抖动动画（输错反馈）
 */
function LessonLineCard(props: LessonLineCardProps) {
  const {
    line,
    index,
    isActive,
    viewMode,
    revealed,
    dictationFeedback,
    typingLocked,
    isShaking,
    onCardSelect,
    onToggleReveal,
    isFavorite,
    onToggleFavorite,
    onPlayLine,
  } = props

  const isDictationMode = viewMode === 'dictation-en' || viewMode === 'dictation-zh'
  // 英文/中文是否可见，由 viewMode 决定
  const englishVisible = viewMode === 'both' || viewMode === 'dictation-en'
  const chineseVisible = viewMode === 'both' || viewMode === 'dictation-zh'

  return (
    <article
      className={`${isActive ? 'subtitle-item active' : 'subtitle-item'}${isShaking ? ' shake' : ''}`}
      onClick={() => onCardSelect(index)}
    >
      <button
        type="button"
        className={`line-fav-btn line-fav-btn-corner${isFavorite ? ' active' : ''}`}
        onClick={(event) => {
          event.stopPropagation()
          onToggleFavorite(index)
        }}
        aria-label={isFavorite ? '取消收藏' : '收藏'}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
          <path d="M12 2.8l2.77 5.61 6.19.9-4.48 4.37 1.06 6.17L12 16.94 6.46 19.85l1.06-6.17L3.04 9.31l6.19-.9L12 2.8z" />
        </svg>
      </button>

      {/* 隐藏模式：每句独立显示/隐藏切换按钮 */}
      {viewMode === 'hide' ? (
        <HideModeContent
          revealed={revealed}
          englishText={line.english || '-'}
          chineseText={line.chinese || '（暂无翻译）'}
          onToggle={() => onToggleReveal(index)}
        />
      ) : null}

      {/* 非隐藏模式：展示中英双语或单语内容 */}
      {/* dictation-zh 模式下 onPlayAudio 会触发 NormalModeContent 渲染音频按钮 */}
      {viewMode !== 'hide' ? (
        <NormalModeContent
          englishText={line.english || '-'}
          chineseText={line.chinese || '（暂无翻译）'}
          englishVisible={englishVisible}
          chineseVisible={chineseVisible}
          onPlayAudio={viewMode === 'dictation-zh' ? onPlayLine : undefined}
        />
      ) : null}

      {/* 默写模式：在内容下方展示字符级实时反馈 */}
      {isDictationMode ? (
        <DictationModePanel
          lineIndex={index}
          feedback={dictationFeedback}
          typingLocked={typingLocked}
        />
      ) : null}
    </article>
  )
}

export default LessonLineCard
