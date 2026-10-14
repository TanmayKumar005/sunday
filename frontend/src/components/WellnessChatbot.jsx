
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Icon from './Icon'

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
).replace(/\/$/, '')

const quickPrompts = [
  'Explain fractions simply',
  'Give me a practice question',
  'Compare 1/2 and 1/4',
]

const welcomeMessage = {
  role: 'assistant',
  content: "Hey! I'm Soli ☀️ What are we learning today?",
}

export default function WellnessChatbot() {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState([welcomeMessage])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const listRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, open, loading])

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  async function send(text = draft) {
    const clean = text.trim()

    if (!clean || loading) return

    const previousMessages = messages.filter(
      (message) =>
        ['user', 'assistant'].includes(message.role) &&
        !message.error &&
        message !== welcomeMessage
    )

    setMessages((current) => [
      ...current,
      { role: 'user', content: clean },
    ])
    setDraft('')
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: clean,
          history: previousMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Soli could not respond.')
      }

      if (!data.reply?.trim()) {
        throw new Error('Soli returned an empty response.')
      }

      setMessages((current) => [
        ...current,
        { role: 'assistant', content: data.reply.trim() },
      ])
    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? 'Cannot reach Soli. Make sure your backend is running.'
          : err.message || 'Something went wrong. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    send()
  }

  function resetChat() {
    setMessages([welcomeMessage])
    setDraft('')
    setError('')
  }

  return (
    <div className="buddy-widget">
      {open && (
        <section
          className="buddy-panel"
          aria-label="Soli AI study assistant"
        >
          <header className="buddy-header">
            <div className="buddy-avatar buddy-avatar--small">
              ☀️
            </div>

            <div className="buddy-heading">
              <strong>Soli</strong>
              <span>
                <i className="buddy-status-dot" />
                Your AI study companion
              </span>
            </div>

            <button
              className="buddy-reset"
              onClick={resetChat}
              title="New conversation"
              aria-label="Start a new conversation"
              disabled={loading}
            >
              ↻
            </button>

            <button
              className="buddy-close"
              onClick={() => setOpen(false)}
              aria-label="Close Soli"
            >
              <Icon name="close" size={18} />
            </button>
          </header>

          <div className="buddy-context">
            <span>✦</span> Let's make learning easier, one step at a time.
          </div>

          <div
            className="buddy-messages"
            ref={listRef}
            aria-live="polite"
            aria-busy={loading}
          >
            {messages.map((message, index) => (
              <div
                key={`${index}-${message.role}`}
                className={`buddy-message buddy-message--${
                  message.role === 'user' ? 'user' : 'bot'
                }`}
              >
                {message.role === 'assistant' ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  message.content
                )}
              </div>
            ))}

            {loading && (
              <div className="buddy-message buddy-message--bot buddy-typing">
                <span />
                <span />
                <span />
                <span className="buddy-sr-only">Soli is thinking</span>
              </div>
            )}

            {error && (
              <div className="buddy-error" role="alert">
                {error}
                <button
                  type="button"
                  onClick={() => send(
                    messages[messages.length - 1]?.role === 'user'
                      ? messages[messages.length - 1].content
                      : draft
                  )}
                  disabled={loading}
                >
                  Retry
                </button>
              </div>
            )}
          </div>

          {messages.length === 1 && (
            <div className="buddy-quick-prompts">
              <p>TRY ASKING</p>
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => send(prompt)}
                  disabled={loading}
                >
                  {prompt}
                  <span>↗</span>
                </button>
              ))}
            </div>
          )}

          <form className="buddy-compose" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask Soli anything about studying..."
              aria-label="Message Soli"
              maxLength={4000}
              disabled={loading}
            />

            <button
              type="submit"
              aria-label="Send message"
              disabled={!draft.trim() || loading}
            >
              {loading ? '…' : <Icon name="arrow" size={18} />}
            </button>
          </form>

          <p className="buddy-disclaimer">
            Made for learning · AI can make mistakes
          </p>
        </section>
      )}

      <button
        className={`buddy-launcher ${open ? 'buddy-launcher--open' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Close Soli' : 'Open Soli study assistant'}
        aria-expanded={open}
      >
        {open ? (
          <Icon name="close" size={24} />
        ) : (
          <>
            <span className="buddy-avatar" aria-hidden="true">
              ☀️
            </span>
            <span className="buddy-launcher-label">
              Ask Soli <small>Your study buddy</small>
            </span>
          </>
        )}
      </button>
    </div>
  )
}