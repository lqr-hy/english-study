type NormalModeContentProps = {
  englishText: string
  chineseText: string
  englishVisible: boolean
  chineseVisible: boolean
  /**
   * 可选：点击中文旁边的播放按钮时执行的回调。
   * 只在"显示中文默写英文"(dictation-zh) 模式下由父组件传入。
   */
  onPlayAudio?: () => void
}

/**
 * 普通双语内容展示组件（非隐藏模式）：
 * - englishVisible / chineseVisible 控制各行可见性
 * - dictation-zh 模式下在中文旁边展示音频播放图标
 */
function NormalModeContent({
  englishText,
  chineseText,
  englishVisible,
  chineseVisible,
  onPlayAudio,
}: NormalModeContentProps) {
  return (
    <div className="line-content-box">
      {englishVisible ? <strong>{englishText}</strong> : null}

      {chineseVisible ? (
        /* 中文行：当 onPlayAudio 存在时，旁边追加音频播放小按钮 */
        <div className="line-chinese-row">
          <span>{chineseText}</span>

          {onPlayAudio ? (
            <button
              type="button"
              className="line-audio-btn"
              onClick={(e) => {
                // 阻止冒泡：仅播放音频，不触发卡片选中
                e.stopPropagation()
                onPlayAudio()
              }}
              title="播放这句话 (点读)"
            >
              {/* 播放三角 SVG 图标 */}
              <svg viewBox="0 0 16 16" fill="currentColor" width="11" height="11" aria-hidden="true">
                <path d="M3 2.8A1 1 0 014 2l8 5.2a1 1 0 010 1.6L4 14A1 1 0 012.5 13.14V2.86A1 1 0 013 2.8z" />
              </svg>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default NormalModeContent
