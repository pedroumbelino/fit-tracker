import { useState } from 'react'
import { toast } from '../components/ui'
import { store, useStore, actions, type Theme } from '../lib/store'
import { SUPABASE_URL, supabase } from '../lib/supabase'
import { syncNow, useSyncStatus } from '../lib/sync'

export default function Settings() {
  const theme = useStore((s) => s.settings.theme)
  return (
    <div className="screen">
      <p className="eyebrow">App</p>
      <h1>Definições</h1>

      <h2>Aparência</h2>
      <div className="segmented">
        {(['system', 'light', 'dark'] as Theme[]).map((t) => (
          <button key={t} className={theme === t ? 'on' : ''} onClick={() => actions.setTheme(t)}>
            {{ system: 'Sistema', light: 'Claro', dark: 'Escuro' }[t]}
          </button>
        ))}
      </div>

      <Account />
      <HealthImport />
      <Backup />

      <p className="tiny muted" style={{ textAlign: 'center', marginTop: 24 }}>
        Este plano não substitui um médico, nutricionista ou fisioterapeuta.
      </p>
    </div>
  )
}

function Account() {
  const sync = useSyncStatus()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  if (!supabase) {
    return (
      <>
        <h2>Conta e sincronização</h2>
        <div className="card"><p className="small">Modo local: os dados ficam só neste iPhone. Para sincronizar com o Supabase e usar a AI, define <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> (vê o README).</p></div>
      </>
    )
  }

  async function auth(kind: 'in' | 'up') {
    setBusy(true)
    const { error } = kind === 'in'
      ? await supabase!.auth.signInWithPassword({ email, password })
      : await supabase!.auth.signUp({ email, password })
    setBusy(false)
    if (error) toast(error.message)
    else toast(kind === 'in' ? 'Sessão iniciada' : 'Conta criada. Confirma o email se for pedido.')
  }

  return (
    <>
      <h2>Conta e sincronização</h2>
      <div className="card">
        {sync.email ? (
          <div className="stack">
            <div className="row between">
              <div>
                <p style={{ fontWeight: 600 }}>{sync.email}</p>
                <p className="small muted">
                  {sync.state === 'syncing' ? 'A sincronizar…' : sync.state === 'error' ? `Erro: ${sync.error}` : sync.at ? `Sincronizado às ${new Date(sync.at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}` : 'Pronto'}
                </p>
              </div>
              <button className="btn small ghost" onClick={() => syncNow()}>Sincronizar</button>
            </div>
            <button className="btn danger small" style={{ alignSelf: 'flex-start' }} onClick={() => supabase!.auth.signOut()}>Terminar sessão</button>
          </div>
        ) : (
          <div className="stack" style={{ gap: 10 }}>
            <input className="field" type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="field" type="password" autoComplete="current-password" placeholder="Palavra-passe" value={password} onChange={(e) => setPassword(e.target.value)} />
            <div className="grid2">
              <button className="btn" disabled={busy || !email || password.length < 6} onClick={() => auth('in')}>Entrar</button>
              <button className="btn ghost" disabled={busy || !email || password.length < 6} onClick={() => auth('up')}>Criar conta</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function HealthImport() {
  const sync = useSyncStatus()
  const [token, setToken] = useState<string | null>(null)
  const endpoint = `${SUPABASE_URL}/functions/v1/health-ingest`

  async function createToken() {
    const { data, error } = await supabase!.rpc('create_ingest_token')
    if (error) toast(error.message)
    else setToken(data as string)
  }

  const copy = (v: string) => navigator.clipboard.writeText(v).then(() => toast('Copiado'))

  return (
    <>
      <h2>Apple Saúde</h2>
      <div className="card">
        <p className="small">O iOS não deixa web apps lerem a app Saúde. A solução é um Atalho que, todos os dias às 22:30, lê os dados do Apple Watch e envia-os para a app.</p>
        {supabase && !sync.email && <p className="small" style={{ marginTop: 8, color: 'var(--warn)' }}>Inicia sessão acima para gerares o token do Atalho.</p>}
        {supabase && sync.email && (
          <div className="stack" style={{ marginTop: 12 }}>
            <label className="lbl">URL do Atalho</label>
            <button className="field small" style={{ textAlign: 'left', wordBreak: 'break-all' }} onClick={() => copy(endpoint)}>{endpoint}</button>
            {token ? (
              <>
                <label className="lbl">Token (só aparece agora, guarda-o no Atalho)</label>
                <button className="field small" style={{ textAlign: 'left', wordBreak: 'break-all' }} onClick={() => copy(token)}>{token}</button>
              </>
            ) : (
              <button className="btn secondary" onClick={createToken}>Gerar token do Atalho</button>
            )}
          </div>
        )}
        <details style={{ marginTop: 12 }}>
          <summary className="small" style={{ fontWeight: 600, color: 'var(--accent)' }}>Como criar o Atalho (5 min)</summary>
          <ol className="small" style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Atalhos → <b>+</b> → nome "Enviar Saúde".</li>
            <li>Para cada métrica: <b>Encontrar amostras de Saúde</b> → <b>Calcular estatísticas</b> → <b>Definir variável</b>. Passos e Energia ativa: data de início é hoje, Soma. FC em repouso e Variabilidade da FC: últimos 1 dias, Média.</li>
            <li>Peso: <b>Encontrar amostras de Saúde</b>, mais recente primeiro, limite 1 → <b>Definir variável</b>.</li>
            <li>Sono: Análise do sono, últimos 1 dias, Valor não é "Na cama" nem "Acordado" → <b>Obter detalhes</b> Duração → <b>Calcular estatísticas</b> Soma → <b>Definir variável</b>.</li>
            <li><b>Obter conteúdo do URL</b>: URL acima, Método POST, Cabeçalho <code>Authorization</code> = <code>Bearer O_TEU_TOKEN</code>, Corpo JSON com <code>steps</code>, <code>active_kcal</code>, <code>resting_hr</code>, <code>hrv</code>, <code>weight</code>, <code>sleep_h</code>.</li>
            <li>Automação → <b>Hora do dia</b> 22:30, Diariamente, <b>Executar imediatamente</b> → "Enviar Saúde".</li>
          </ol>
          <p className="tiny muted">Podes mandar os valores com unidades ("83,6 kg"): a app trata da conversão.</p>
        </details>
      </div>
    </>
  )
}

function Backup() {
  return (
    <>
      <h2>Cópia de segurança</h2>
      <div className="grid2">
        <button className="btn ghost" onClick={() => {
          const blob = new Blob([JSON.stringify(store.get(), null, 2)], { type: 'application/json' })
          const a = document.createElement('a')
          a.href = URL.createObjectURL(blob)
          a.download = `fit-tracker-${new Date().toISOString().slice(0, 10)}.json`
          a.click()
        }}>Exportar</button>
        <label className="btn ghost">
          Importar
          <input type="file" accept="application/json" hidden onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            try {
              const data = JSON.parse(await f.text())
              if (!data.days) throw new Error()
              store.replace({ ...store.get(), ...data, dirty: Object.keys(data.days).map((d) => `day:${d}`) })
              toast('Dados importados')
            } catch {
              toast('Ficheiro inválido')
            }
          }} />
        </label>
      </div>
    </>
  )
}
