import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'

const quickPrompts = [
  'I feel overwhelmed',
  'Explain this topic simply',
  'How am I progressing?',
]

function replyFor(message) {
  const text = message.toLowerCase()
  if (/overwhelm|stress|anxious|tired|pressure|break|upset/.test(text)) {
    return 'That sounds like a lot to handle. Try relaxing your shoulders, taking a few slow breaths, and getting a sip of water. You can take a short break whenever you need one. When you feel ready, return to one small step at a time.'
  }
  if (/explain|topic|understand|confus|help with|hint|question/.test(text)) {
    return 'Absolutely! Tell me which part is confusing, or paste the question here. We can break it into smaller steps and work through it together.'
  }
  if (/progress|improv|doing|score|result/.test(text)) {
    return 'You can review your completed work on the Progress page. Remember, mistakes are useful feedback—not a judgement of your ability. Try focusing on one topic you want to improve next.'
  }
  if (/hello|hi\b|hey/.test(text)) {
    return 'Hey there! 👋 I’m your S.U.N.D.A.Y. study buddy. I can help you work through a topic, find a next step, or take a mindful pause.'
  }
  if (/tomorrow|stop|finish|done/.test(text)) {
    return 'It’s okay to pause for today. If you’re ready to stop, you can leave your practice and return when it suits you. Your completed answers are saved as you submit them.'
  }
  return 'I’m here to help. Tell me what you’re studying or what feels difficult, and we’ll break it into a manageable next step. I’m a starter study helper, so I may not know every answer yet.'
}

export default function WellnessChatbot() {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hi! I’m your S.U.N.D.A.Y. buddy. Need help with a topic, a next step, or a mindful pause?' },
  ])
  const listRef = useRef(null)

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, open])

  function send(text = draft) {
    const clean = text.trim()
    if (!clean) return
    setMessages(current => [...current, { from: 'user', text: clean }, { from: 'bot', text: replyFor(clean) }])
    setDraft('')
  }

  return <div className="buddy-widget">
    {open && <section className="buddy-panel" aria-label="SUNDAY study buddy">
      <header className="buddy-header">
        <div className="buddy-avatar buddy-avatar--small" aria-hidden="true">☀️</div>
        <div><strong>S.U.N.D.A.Y. Buddy</strong><span>Your study companion</span></div>
        <button className="buddy-close" onClick={() => setOpen(false)} aria-label="Close chat"><Icon name="close" size={18} /></button>
      </header>
      <div className="buddy-messages" ref={listRef} aria-live="polite">
        {messages.map((message, index) => <div key={`${index}-${message.from}`} className={`buddy-message buddy-message--${message.from}`}>{message.text}</div>)}
      </div>
      {messages.length === 1 && <div className="buddy-quick-prompts">{quickPrompts.map(prompt => <button key={prompt} onClick={() => send(prompt)}>{prompt}</button>)}</div>}
      <form className="buddy-compose" onSubmit={event => { event.preventDefault(); send() }}>
        <input value={draft} onChange={event => setDraft(event.target.value)} placeholder="Ask your study buddy…" aria-label="Message your study buddy" />
        <button type="submit" aria-label="Send message" disabled={!draft.trim()}><Icon name="arrow" size={18} /></button>
      </form>
      <p className="buddy-disclaimer">Starter helper with guided responses—not an emergency or clinical service.</p>
    </section>}
    <button className={`buddy-launcher ${open ? 'buddy-launcher--open' : ''}`} onClick={() => setOpen(value => !value)} aria-label={open ? 'Close study buddy' : 'Open study buddy'} aria-expanded={open}>
      {open ? <Icon name="close" size={24} /> : <span className="buddy-avatar" aria-hidden="true">☀️</span>}
      {!open && <span className="buddy-launcher-label">Need help?</span>}
    </button>
  </div>
}
