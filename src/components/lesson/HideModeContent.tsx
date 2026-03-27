type HideModeContentProps = {
  revealed: boolean
  englishText: string
  chineseText: string
  onToggle: () => void
}

/**
 * 隐藏模式下的句子卡片：
 * - 默认隐藏原文，点击 chip 切换显示/隐藏
 * - chip 用眼睛图标替代原来的文字按钮，样式更轻量
 */
function HideModeContent({ revealed, englishText, chineseText, onToggle }: HideModeContentProps) {
  return (
    <div className="hide-mode-box">
      {/* 显示/隐藏切换按钮：参考设计图的眼睛 chip 风格 */}
      <button
        type="button"
        className={`reveal-chip${revealed ? ' active' : ''}`}
        onClick={(event) => {
          // 阻止冒泡，防止触发卡片的 onCardSelect
          event.stopPropagation()
          onToggle()
        }}
        title={revealed ? '点击隐藏内容' : '点击显示内容'}
      >
        {/* 眼睛 SVG 图标（stroke 风格，14×14） */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        {revealed ? '隐藏' : '显示'}
      </button>

      {/* 内容区：仅 revealed = true 时展示，否则保持空白 */}
      {revealed ? (
        <div className="line-content-box">
          <strong>{englishText}</strong>
          <span>{chineseText}</span>
        </div>
      ) : null}
    </div>
  )
}

export default HideModeContent
