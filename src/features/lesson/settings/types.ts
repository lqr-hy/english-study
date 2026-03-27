export type PlayMode = 'continuous' | 'tap' | 'shadow' | 'listen'
export type ViewMode = 'both' | 'hide' | 'dictation-en' | 'dictation-zh'

export const PLAY_MODE_LABEL: Record<PlayMode, string> = {
  continuous: '连续',
  tap: '点读',
  shadow: '跟读',
  listen: '听读',
}

export const VIEW_MODE_LABEL: Record<ViewMode, string> = {
  both: '中英文',
  hide: '隐藏内容',
  'dictation-en': '显示英文默写中文',
  'dictation-zh': '显示中文默写英文',
}

export const PLAY_MODE_OPTIONS: PlayMode[] = ['continuous', 'tap', 'shadow', 'listen']
export const VIEW_MODE_OPTIONS: ViewMode[] = ['both', 'hide', 'dictation-en', 'dictation-zh']
export const PLAYBACK_SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2]
