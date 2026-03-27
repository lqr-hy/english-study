import { SHORTCUT_ITEMS } from './shortcuts'

type ShortcutModalProps = {
  open: boolean
  isMacPlatform: boolean
  onClose: () => void
}

function ShortcutModal({ open, isMacPlatform, onClose }: ShortcutModalProps) {
  if (!open) {
    return null
  }

  return (
    <div className="shortcut-modal-backdrop" onClick={onClose}>
      <section className="shortcut-modal" onClick={(event) => event.stopPropagation()}>
        <div className="shortcut-modal-header">
          <div>
            <h3>当前支持的快捷键</h3>
            <p>{isMacPlatform ? '当前展示 Mac 键位' : '当前展示 Windows 键位'}</p>
          </div>
          <button type="button" className="chip" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="shortcut-list">
          {SHORTCUT_ITEMS.map((item) => (
            <div key={item.key} className="shortcut-item">
              <div className="shortcut-keys">
                <span className="shortcut-key">{isMacPlatform ? item.mac : item.win}</span>
              </div>
              <span className="shortcut-desc">{item.desc}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default ShortcutModal
