import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Loader2, AlertTriangle } from 'lucide-react'
import { AdminShell } from '../../components/layout/AdminShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

/**
 * V6 Ajuste 27 — Salvaje IA assistant.
 *
 * Scaffold ready to plug in. Full activation is blocked until
 * `VITE_ANTHROPIC_API_KEY` exists. See docs/BLOCKERS.md.
 *
 * When the env var is present, this component switches into a working
 * conversational UI that calls the Anthropic Messages API directly from the
 * client. We intentionally keep that wiring small here so the SuperAdmin can
 * flip the switch in one config step.
 */
const HAS_KEY = typeof import.meta !== 'undefined'
  && import.meta.env
  && !!import.meta.env.VITE_ANTHROPIC_API_KEY

export function AdminAIAssistant() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: HAS_KEY
        ? '¡Hola! Soy Salvaje, tu asistente de negocio. Pregúntame cualquier cosa sobre tus datos.'
        : 'Salvaje IA está listo para activarse. Configura VITE_ANTHROPIC_API_KEY (ver docs/BLOCKERS.md) y vuelve por aquí.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!HAS_KEY) return
    if (!input.trim() || loading) return
    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
      const conversation = [...messages, { role: 'user', content: userMessage }]
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-10)

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 800,
          system: 'Eres Salvaje, asistente de negocio del box SALVAJE Vida Deportiva. Responde en español, conciso, accionable.',
          messages: conversation,
        }),
      })
      const data = await response.json()
      const reply = data?.content?.[0]?.text || 'No pude procesar tu consulta.'
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      console.error('Anthropic API failed:', e)
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: 'Tuve un problema conectándome a la API. Intenta de nuevo en un momento.',
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminShell title="Salvaje IA">
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-salvaje-brown rounded-xl flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-display text-3xl uppercase text-salvaje-dark">Salvaje IA</h1>
            <p className="font-body text-xs text-salvaje-gray">Tu asistente de negocio</p>
          </div>
        </div>

        {!HAS_KEY && (
          <Card>
            <CardBody className="py-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-salvaje-gold flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-display text-sm uppercase text-salvaje-dark mb-1">Pendiente de activación</p>
                <p className="font-body text-xs text-salvaje-gray leading-relaxed">
                  Para activar Salvaje IA, agrega <code className="font-mono text-salvaje-orange">VITE_ANTHROPIC_API_KEY</code> a tu <code className="font-mono">.env.local</code> y rebuild.
                  Detalles en <code className="font-mono">docs/BLOCKERS.md</code>.
                </p>
              </div>
            </CardBody>
          </Card>
        )}

        <div className="bg-white rounded-salvaje shadow-salvaje overflow-hidden flex flex-col" style={{ minHeight: 360 }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm font-body whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-salvaje-orange text-white rounded-br-sm'
                    : 'bg-salvaje-light text-salvaje-dark rounded-bl-sm border border-salvaje-cream'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-salvaje-light rounded-2xl rounded-bl-sm px-4 py-3 border border-salvaje-cream">
                  <Loader2 size={14} className="animate-spin text-salvaje-gray" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-salvaje-cream flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={HAS_KEY ? 'Pregúntame sobre tu negocio...' : 'Configura VITE_ANTHROPIC_API_KEY para activar el chat'}
              disabled={!HAS_KEY || loading}
              className="flex-1 px-4 py-2 rounded-xl border border-salvaje-cream bg-white font-body text-sm focus:outline-none focus:ring-2 focus:ring-salvaje-orange/30 focus:border-salvaje-orange disabled:bg-salvaje-light/40 disabled:cursor-not-allowed"
            />
            <Button onClick={handleSend} disabled={!HAS_KEY || loading || !input.trim()}>
              <Send size={14} />
            </Button>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
