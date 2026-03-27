export type ShortcutItem = {
  key: string
  mac: string
  win: string
  desc: string
}

export const SHORTCUT_ITEMS: ShortcutItem[] = [
  { key: 'panel-toggle', mac: '`', win: '`', desc: '打开或关闭学习设置面板' },
  { key: 'panel-close', mac: 'Esc', win: 'Esc', desc: '关闭学习设置面板' },
  { key: 'play-pause', mac: 'Space', win: 'Space', desc: '播放或暂停当前句（非默写模式）' },
  { key: 'tap-play', mac: 'P', win: 'P', desc: '点读当前句（非默写模式）' },
  { key: 'dictation-play', mac: 'Command + J', win: 'Ctrl + J', desc: '播放当前句音频（所有默写模式）' },
  { key: 'line-nav', mac: '↑ / ↓', win: '↑ / ↓', desc: '切换上一句 / 下一句' },
  { key: 'backspace', mac: 'Backspace', win: 'Backspace', desc: '删除未确认字符（英文默写模式）' },
]
