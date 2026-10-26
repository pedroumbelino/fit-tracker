import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/ui'
import { ai, aiAvailable, fileToJpegBase64 } from '../lib/ai'
import { todayKey } from '../lib/date'
import { actions, store, useStore } from '../lib/store'
import { buildContext } from '../lib/targets'

const SUGGESTIONS = [
  'O que janto hoje para fechar a proteína?',
  'Dormi mal, ajusto o treino de hoje?',
  'Que exercício troco se o joelho doer no leg press?',
  'Como estou a evoluir esta semana?',
]

export default function Coach() {
  const msgs = useStore((s) => s.chat.msgs)
  const [text, setText] = useState('')
  const [img, setImg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs.length, loading])

  async function send(q = text) {
    if (!q.trim() && !img) return
    setError(null)
    // A imagem não fica guardada no histórico (seria pesada para o telemóvel e para a sincronização).
    const sentImg = img
    actions.addChat({ role: 'user', text: `${sentImg ? '📷 ' : ''}${q.trim() || 'Analisa esta imagem.'}` })
    setText('')
    setImg(null)
    setLoading(true)
    try {
      const history = store.get().chat.msgs.slice(-16).map((m, i, arr) => ({
        role: m.role, text: m.text, image: i === arr.length - 1 && sentImg ? sentImg : undefined,
      }))
      const res = await ai.chat(history, buildContext(store.get(), todayKey()))
      actions.addChat({ role: 'assistant', text: res.text })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen" style={{ paddingBottom: 'calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 96px)' }}>
      <div className="row between">
        <p className="eyebrow">Claude + Jev</p>
        {msgs.length > 0 && <button className="btn danger small" onClick={() => actions.clearChat()}>Limpar</button>}
      </div>
      <h1>Coach</h1>

      {!aiAvailable() && (
        <div className="card"><p className="small">A AI precisa do Supabase com as funções configuradas. Vê o README e inicia sessão nas Definições.</p></div>
      )}

      {msgs.length === 0 && (
        <div className="stack">
          <p className="muted small">Pergunta sobre comida, treino, sono ou envia uma foto (prato, rótulo, máquina do ginásio). O coach conhece o teu plano e os dados da Saúde.</p>
          {SUGGESTIONS.map((s) => (
            <button key={s} className="card" style={{ border: 0, textAlign: 'left', marginBottom: 0, fontSize: 15 }} onClick={() => send(s)} disabled={!aiAvailable()}>{s}</button>
          ))}
        </div>
      )}

      <div className="stack" style={{ gap: 10 }}>
        {msgs.map((m) => (
          <div key={m.id} className={`bubble ${m.role}`}>
            {m.text}
          </div>
        ))}
        {loading && <div className="bubble assistant"><span className="spinner" /></div>}
        {error && <p className="small" style={{ color: 'var(--danger)' }}>{error}</p>}
        <div ref={end} />
      </div>

      <div className="composer">
        {img && <img src={`data:image/jpeg;base64,${img}`} alt="Pré-visualização" style={{ height: 64, borderRadius: 10, marginBottom: 6, display: 'block', marginInline: 'auto' }} />}
        <div>
          <input ref={file} type="file" accept="image/*" hidden onChange={async (e) => {
            const f = e.target.files?.[0]
            if (f) setImg(await fileToJpegBase64(f))
            e.target.value = ''
          }} />
          <button className={`icon-btn ${img ? 'accent' : ''}`} onClick={() => (img ? setImg(null) : file.current?.click())} aria-label={img ? 'Remover imagem' : 'Anexar imagem'}>
            {img ? <Icon.x /> : <Icon.camera />}
          </button>
          <textarea
            className="field" rows={1} placeholder={img ? 'Pergunta sobre a imagem…' : 'Escreve uma pergunta…'} value={text}
            onChange={(e) => setText(e.target.value)} style={{ resize: 'none', maxHeight: 120 }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          />
          <button className="icon-btn accent" onClick={() => send()} disabled={loading || !aiAvailable() || (!text.trim() && !img)} aria-label="Enviar"><Icon.send /></button>
        </div>
      </div>
    </div>
  )
}
