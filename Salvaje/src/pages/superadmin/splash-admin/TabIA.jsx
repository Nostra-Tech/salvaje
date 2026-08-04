import { useState } from 'react'
import toast from 'react-hot-toast'
import { Sparkles, Copy, RefreshCw, AlertTriangle, Info, CheckCircle2, Bot } from 'lucide-react'
import { fmtCOP, LANDING_URL, PAY_URL, STAGES } from '../../../services/splashAdmin.service'

/**
 * Centro IA — dos motores:
 *  1. Copiloto (reglas sobre datos reales) → las sugerencias vienen del padre.
 *  2. Generadores de contenido: plantillas parametrizadas con los datos vivos
 *     de la campaña + "prompt experto" listo para pegar en ChatGPT/Claude si
 *     se quiere una versión más elaborada.
 */

const NIVEL = {
  alta: { icon: AlertTriangle, cls: 'border-salvaje-danger/30 bg-salvaje-danger/5' },
  media: { icon: Info, cls: 'border-salvaje-gold/40 bg-salvaje-gold/10' },
  ok: { icon: CheckCircle2, cls: 'border-salvaje-success/30 bg-salvaje-success/5' },
}

const BRAND = 'Salvaje Splash: evento de SALVAJE Vida Deportiva el sábado 22 de agosto de 2026. NO se vende como entrenamiento ni festival: se vende "un día diferente con amigos". Idea central: "No es un entrenamiento. Es un parche." Sentimiento objetivo: "hace rato no hacía algo diferente con mis amigos". Incluye: entrenamiento, DJ en vivo, pista jabonosa gigante, inflable, comida, premios. Tono: cercano, colombiano, energético, cero corporativo.'

function ctxVivo(s) {
  const st = s.stage
  return `Datos de HOY: quedan ${s.daysLeft} días. Etapa ${st.label} a ${fmtCOP(st.price)} (después sube). Vendidas ${s.vendidas}/${s.meta}. Landing: ${LANDING_URL}. Pago directo: ${PAY_URL}.`
}

const TOOLS = [
  {
    key: 'hook', label: 'Hooks para Reels', gen: (s, i) => [
      'POV: le dijiste "hágale" al parche del 22 de agosto y ahora estás deslizándote en una pista jabonosa gigante 🌊',
      '¿Hace cuánto no haces algo DIFERENTE con tus amigos? (y no, otro viernes de lo mismo no cuenta)',
      'Nadie: … | Tu parche el 22 de agosto: entrenando con DJ en vivo y tirándose por una pista de jabón',
      'Esto NO es un entrenamiento. Es el parche que tu grupo lleva meses aplazando.',
      'Si tu plan del finde es "lo de siempre", esto te va a doler verlo el 23 de agosto.',
    ][i % 5],
  },
  {
    key: 'guion', label: 'Guión UGC 30s', gen: (s, i) => [
      `[0-3s] Selfie caminando, energía alta: "Les cuento qué es lo que hay el 22 de agosto…"\n[3-10s] Cortes rápidos del lugar/entreno: "Esto NO es un entrenamiento. Es un parche: música con DJ en vivo, pista jabonosa, inflable, comida…"\n[10-20s] Cara a cámara: "Yo ya tengo mi entrada. ¿Hace cuánto no haces algo diferente con tus amigos?"\n[20-27s] "Está en ${fmtCOP(s.stage.price)} y sube pronto. Link en la bio."\n[27-30s] Cierre con logo Salvaje Splash + fecha.`,
      `[0-3s] Texto en pantalla: "hace rato no hacía algo diferente" sobre video del grupo riéndose.\n[3-12s] Voz en off: "Entrenar, mojarse, música en vivo y premios. Todo el mismo día, con tu gente."\n[12-22s] Testimonio real de un comprador: por qué va.\n[22-30s] CTA: "22 de agosto · entradas en la bio · el precio sube el 12".`,
    ][i % 2],
  },
  {
    key: 'copy', label: 'Copy IG/FB', gen: (s, i) => [
      `No es un entrenamiento. Es un parche. 🌊🔥\n\nSábado 22 de agosto: entrenas, te mojas en la pista jabonosa, suena el DJ, comes rico y te llevas premios. Todo con tu gente.\n\n🎟 Etapa ${s.stage.label}: ${fmtCOP(s.stage.price)} (después sube)\n📍 Link en la bio → asegura tu entrada\n\n¿A quién te llevas? Etiquétalo 👇`,
      `¿Hace cuánto no haces algo diferente con tus amigos?\n\nEso pensamos. Por eso existe Salvaje Splash: un día para entrenar, mojarse, bailar y reírse hasta que duela. 22 de agosto.\n\nEntradas en ${fmtCOP(s.stage.price)} — y suben el 12. Link en la bio.`,
    ][i % 2],
  },
  {
    key: 'wsp', label: 'WhatsApp difusión', gen: (s, i) => [
      `🌊 ¡El parche del año es el 22 de agosto! Salvaje Splash: entrenamiento + DJ en vivo + pista jabonosa + inflable + comida + premios. Quedan ${s.daysLeft} días. Tu entrada ${s.stage.label} está en ${fmtCOP(s.stage.price)} (sube pronto). Asegúrala aquí 👉 ${LANDING_URL}`,
      `¿Plan diferente con tus amigos? 😏 22 de agosto · Salvaje Splash. No es un entrenamiento, es un parche: música, agua, jabón y premios. Entradas desde ${fmtCOP(s.stage.price)} 👉 ${LANDING_URL} (el precio sube el 12 de agosto)`,
    ][i % 2],
  },
  {
    key: 'email', label: 'Email a la base', gen: (s, i) => [
      `Asunto: ¿Hace cuánto no haces algo diferente? 🌊\n\nHola {{nombre}},\n\nEl 22 de agosto no es un entrenamiento más: es Salvaje Splash. Un día para entrenar con música de DJ en vivo, tirarte por una pista jabonosa gigante, comer rico, ganarte premios y — lo más importante — hacerlo con tu gente.\n\nTu entrada ${s.stage.label} está en ${fmtCOP(s.stage.price)}. El 12 de agosto sube a ${fmtCOP(STAGES[2].price)}.\n\n👉 Asegura la tuya: ${LANDING_URL}\n\nNos vemos en el agua,\nEl equipo SALVAJE`,
    ][i % 1],
  },
  {
    key: 'anuncio', label: 'Anuncio Meta Ads', gen: (s, i) => [
      `🎯 Segmentación sugerida: 20-38 años, radio 25 km, intereses: CrossFit, gimnasios locales, festivales, planes con amigos. Excluir compradores.\n\nCreativo: UGC vertical (gente real deslizándose/riéndose, NO producción pulida).\n\nPrimario: ¿Hace rato no haces algo diferente con tus amigos? El 22 de agosto: entrenamiento + DJ en vivo + pista jabonosa + premios. No es un entrenamiento, es un parche.\n\nTitular: Salvaje Splash · 22 de agosto\nDescripción: Entradas ${s.stage.label} ${fmtCOP(s.stage.price)} — el precio sube el 12.\nCTA: Comprar · destino ${LANDING_URL}`,
    ][i % 1],
  },
  {
    key: 'objecion', label: 'Respuestas a objeciones', gen: (s, i) => [
      `"Está caro" → Totalmente entendible. Piénsalo así: es entreno + fiesta con DJ en vivo + pista jabonosa + comida + premios en un solo día — por menos de lo que vale una salida normal de viernes. Y hoy está en ${fmtCOP(s.stage.price)}; el 12 de agosto sube.`,
      `"No tengo con quién ir" → ¡Ese es justo el punto del parche! Va gente de toda la comunidad Salvaje y los grupos se mezclan desde el calentamiento. Nadie queda solo — y si quieres, te conecto con un grupo que ya va.`,
      `"Yo no entreno / no estoy en forma" → El entreno es UNA parte y es para todos los niveles (hay quien va solo a mojarse y bailar). Esto no es una competencia: es un día diferente.`,
      `"Lo pienso y te digo" → ¡De una! Solo te cuento: quedan ${s.daysLeft} días y el precio sube el 12 de agosto. Si quieres te guardo el link para que decidas hoy con calma: ${PAY_URL}`,
    ][i % 4],
  },
]

export function TabIA({ stats, suggestions }) {
  return (
    <div className="space-y-4">
      {/* Copiloto */}
      <div className="bg-white rounded-salvaje p-5 shadow-salvaje">
        <div className="flex items-center gap-2 mb-3">
          <Bot size={18} className="text-salvaje-orange" />
          <p className="font-body text-sm font-semibold text-salvaje-dark">Copiloto — acciones sugeridas según los datos de HOY</p>
        </div>
        <div className="space-y-2">
          {suggestions.map((sg, i) => {
            const N = NIVEL[sg.nivel] || NIVEL.media
            const Icon = N.icon
            return (
              <div key={i} className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 ${N.cls}`}>
                <Icon size={16} className="mt-0.5 shrink-0 text-salvaje-dark" />
                <p className="font-body text-sm text-salvaje-dark">{sg.texto}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Generadores */}
      <div className="bg-white rounded-salvaje p-5 shadow-salvaje">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={18} className="text-salvaje-gold" />
          <p className="font-body text-sm font-semibold text-salvaje-dark">Generadores de contenido</p>
        </div>
        <p className="font-body text-xs text-salvaje-gray mb-4">
          Listos para usar con los datos vivos de la campaña (precio, etapa, días restantes). El botón
          "Prompt IA" copia un brief experto para pegar en ChatGPT/Claude si quieres más variaciones.
        </p>
        <div className="grid md:grid-cols-2 gap-3">
          {TOOLS.map((t) => <Tool key={t.key} tool={t} stats={stats} />)}
        </div>
      </div>
    </div>
  )
}

function Tool({ tool, stats }) {
  const [i, setI] = useState(0)
  const out = tool.gen(stats, i)

  const copy = async (text, msg) => {
    try { await navigator.clipboard.writeText(text); toast.success(msg) }
    catch { toast.error('No se pudo copiar') }
  }

  const prompt =
    `Actúa como copywriter senior de growth para eventos.\n\nMARCA Y EVENTO: ${BRAND}\n\n${ctxVivo(stats)}\n\n` +
    `TAREA: genera 5 variantes de "${tool.label}" en español colombiano, cortas, con gancho emocional (amistad + salir de la rutina) y urgencia por el cambio de precio. Aquí un ejemplo del tono que ya usamos:\n\n"${out}"`

  return (
    <div className="rounded-2xl border border-salvaje-cream bg-salvaje-light p-4 flex flex-col">
      <p className="font-display text-base uppercase text-salvaje-dark mb-2">{tool.label}</p>
      <pre className="flex-1 whitespace-pre-wrap font-body text-[13px] leading-relaxed text-salvaje-brown bg-white rounded-xl border border-salvaje-cream p-3 max-h-52 overflow-y-auto">{out}</pre>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <button onClick={() => copy(out, 'Copiado — listo para publicar')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-salvaje-orange px-3 py-1.5 text-xs font-body font-bold text-white hover:bg-salvaje-fire transition">
          <Copy size={13} /> Copiar
        </button>
        <button onClick={() => setI(i + 1)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-salvaje-brown/10 px-3 py-1.5 text-xs font-body font-semibold text-salvaje-brown hover:bg-salvaje-brown/20 transition">
          <RefreshCw size={13} /> Otra versión
        </button>
        <button onClick={() => copy(prompt, 'Prompt copiado — pégalo en tu IA')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-salvaje-gold/15 px-3 py-1.5 text-xs font-body font-semibold text-salvaje-gold hover:bg-salvaje-gold/25 transition">
          <Sparkles size={13} /> Prompt IA
        </button>
      </div>
    </div>
  )
}
