import { useState } from 'react'
import { DictationFeedback, FeedbackSegment } from '../../features/lesson/dictation'

type DictationModePanelProps = {
  lineIndex: number
  feedback?: DictationFeedback
  typingLocked: boolean
}

const renderTokenText = (segment: FeedbackSegment, revealHint: boolean) => {
  if (segment.status === 'pending') {
    if (revealHint) {
      return segment.expected || ' '
    }
    return '_'
  }

  if (segment.status === 'wrong') {
    return '_'
  }

  return segment.actual || ' '
}

function DictationModePanel({ lineIndex, feedback, typingLocked }: DictationModePanelProps) {
  const [hoverHint, setHoverHint] = useState('')

  return (
    <div className={typingLocked ? 'dictation-box locked' : 'dictation-box'}>
      <div className="dictation-highlight">
        {feedback?.segments.map((segment, segmentIndex) => (
          <span
            key={`${lineIndex}-${segmentIndex}-${segment.expected}`}
            className={`token-${segment.status}${segment.wordStart ? ' token-word-start' : ''}${hoverHint && hoverHint === segment.hint ? ' reveal-hint' : ''}`}
            onMouseEnter={() => {
              setHoverHint(segment.hint || '')
            }}
            onMouseLeave={() => setHoverHint('')}
          >
            {renderTokenText(segment, Boolean(hoverHint && hoverHint === segment.hint))}
          </span>
        ))}
      </div>
    </div>
  )
}

export default DictationModePanel
