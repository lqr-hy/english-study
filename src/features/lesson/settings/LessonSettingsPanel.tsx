import { PLAY_MODE_LABEL, PLAY_MODE_OPTIONS, PLAYBACK_SPEED_OPTIONS, PlayMode, VIEW_MODE_LABEL, VIEW_MODE_OPTIONS, ViewMode } from './types'

type LessonSettingsPanelProps = {
  playMode: PlayMode
  viewMode: ViewMode
  playbackRate: number
  onPlayModeChange: (mode: PlayMode) => void
  onPlaybackRateChange: (speed: number) => void
  onViewModeChange: (mode: ViewMode) => void
  onOpenShortcutModal: () => void
}

function LessonSettingsPanel({
  playMode,
  viewMode,
  playbackRate,
  onPlayModeChange,
  onPlaybackRateChange,
  onViewModeChange,
  onOpenShortcutModal,
}: LessonSettingsPanelProps) {
  return (
    <aside className="floating-panel">
      <h3>播放与学习面板</h3>

      <div className="panel-quick-links">
        <button type="button" className="chip" onClick={onOpenShortcutModal}>
          查看快捷键
        </button>
      </div>

      <div className="panel-group">
        <p>播放模式</p>
        <div className="panel-options">
          {PLAY_MODE_OPTIONS.map((mode) => (
            <button
              key={mode}
              type="button"
              className={mode === playMode ? 'chip active' : 'chip'}
              onClick={() => onPlayModeChange(mode)}
            >
              {PLAY_MODE_LABEL[mode]}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-group">
        <p>播放速度</p>
        <div className="panel-options">
          {PLAYBACK_SPEED_OPTIONS.map((speed) => (
            <button
              key={speed}
              type="button"
              className={speed === playbackRate ? 'chip active' : 'chip'}
              onClick={() => onPlaybackRateChange(speed)}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      <div className="panel-group">
        <p>显示模式</p>
        <div className="panel-options">
          {VIEW_MODE_OPTIONS.map((mode) => (
            <button
              key={mode}
              type="button"
              className={mode === viewMode ? 'chip active' : 'chip'}
              onClick={() => onViewModeChange(mode)}
            >
              {VIEW_MODE_LABEL[mode]}
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}

export default LessonSettingsPanel
