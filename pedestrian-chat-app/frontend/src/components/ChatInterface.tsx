import { useState, useRef, useEffect } from 'react'

const SUGGESTED_PROMPTS = [
  'How has pedestrian activity on Lygon Street changed before and after Covid?',
  'Show me trends in pedestrian counts by month for the last 2 years.',
  'What are the typical time-of-day patterns for foot traffic in the CBD?',
  'How did the recent [event name] affect pedestrian activity over the surrounding days?',
  'Compare weekday vs weekend pedestrian volumes at key sensor locations.',
  'Which locations had the biggest drop in foot traffic post-Covid and which recovered most?',
]

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          conversation_id: conversationId || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || `HTTP ${res.status}`)
      }

      const data = await res.json()
      const reply = data.reply ?? 'No response.'
      if (data.conversation_id) setConversationId(data.conversation_id)

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Something went wrong.'
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `Sorry, I couldn’t get a response: ${errMsg}`,
          timestamp: new Date(),
        },
      ])
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="chat">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <p className="chat-welcome-title">Ask about pedestrian data</p>
            <p className="chat-welcome-desc">
              This chat is powered by your Genie space. Try questions about locations (e.g. Lygon Street), trends over time, or the impact of events.
            </p>
            <div className="suggested-prompts">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  className="suggested-prompt"
                  onClick={() => sendMessage(prompt)}
                  disabled={loading}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`message message--${msg.role}`}>
            <div className="message-bubble">
              <div className="message-content">{msg.content}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="message message--assistant">
            <div className="message-bubble message-bubble--loading">
              <span className="typing-dots">
                <span></span><span></span><span></span>
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about pedestrian activity..."
          rows={1}
          disabled={loading}
          aria-label="Message"
        />
        <button
          type="submit"
          className="chat-send"
          disabled={loading || !input.trim()}
          aria-label="Send"
        >
          Send
        </button>
      </form>
    </div>
  )
}
