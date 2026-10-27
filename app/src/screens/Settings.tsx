import { useEffect, useState } from 'react'
import { Check, toast } from '../components/ui'
import { disablePush, enablePush, pushState, testPush, type PushState } from '../lib/push'
import { DEFAULT_NOTIFY, store, useStore, actions, type NotifyKind, type Theme } from '../lib/store'
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
      <Notifications />
      <HealthImport />
      <SiriShortcuts />
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

const NOTIFY_LABELS: { kind: NotifyKind; label: string; when: string }[] = [
  { kind: 'briefing', label: 'Resumo da manhã', when: '08:30 · sono, treino e metas do dia' },
  { kind: 'water', label: 'Água', when: '11h, 14h, 17h e 20h, só se estiveres atrasado' },
  { kind: 'supps', label: 'Suplementos', when: '13:30, se ainda não marcaste a creatina' },
  { kind: 'training', label: 'Treino', when: '17:00 nos dias de ginásio' },
  { kind: 'phone', label: 'Hora de desligar', when: '22:45 · telemóvel fora do quarto' },
  { kind: 'weekly', label: 'Revisão semanal', when: 'Domingo às 19:00' },
]

function Notifications() {
  const sync = useSyncStatus()
  const notify = { ...DEFAULT_NOTIFY, ...useStore((s) => s.settings.notify) }
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { pushState().then(setState) }, [])

  async function run(fn: () => Promise<void>, ok: string) {
    setBusy(true)
    try {
      await fn()
      toast(ok)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro')
    } finally {
      setBusy(false)
      setState(await pushState())
    }
  }

  if (!supabase) return null
  return (
    <>
      <h2>Notificações</h2>
      <div className="card">
        {state === 'install' && <p className="small">Para receberes lembretes, abre a Forma a partir do ícone no ecrã principal (Safari → Partilhar → Adicionar ao ecrã principal).</p>}
        {state === 'unsupported' && <p className="small">Este dispositivo não suporta notificações web. No iPhone é preciso iOS 16.4 ou mais recente.</p>}
        {state === 'denied' && <p className="small">As notificações estão bloqueadas. Ativa em Definições do iPhone → Notificações → Forma.</p>}
        {!sync.email && (state === 'off' || state === 'on') && <p className="small">Inicia sessão para ativares os lembretes.</p>}
        {sync.email && state === 'off' && (
          <>
            <p className="small" style={{ marginBottom: 10 }}>Poucos lembretes, só os que ajudam: água quando estás atrasado, creatina, treino e a hora de largar o telemóvel.</p>
            <button className="btn block" disabled={busy} onClick={() => run(enablePush, 'Notificações ativadas')}>Ativar notificações</button>
          </>
        )}
        {sync.email && state === 'on' && (
          <div className="row" style={{ gap: 8 }}>
            <button className="btn small secondary" disabled={busy} onClick={() => run(testPush, 'Enviada. Deve chegar em segundos.')}>Enviar teste</button>
            <button className="btn small danger" disabled={busy} onClick={() => run(disablePush, 'Notificações desligadas')}>Desligar</button>
          </div>
        )}
      </div>
      {state === 'on' && (
        <div className="card flush">
          {NOTIFY_LABELS.map((n) => (
            <button key={n.kind} className="list-item" onClick={() => actions.setNotify(n.kind, !notify[n.kind])}>
              <div className="grow">
                <div style={{ fontWeight: 600, fontSize: 15 }}>{n.label}</div>
                <div className="small muted">{n.when}</div>
              </div>
              <Check on={notify[n.kind]} />
            </button>
          ))}
        </div>
      )}
    </>
  )
}

function SiriShortcuts() {
  const endpoint = `${SUPABASE_URL}/functions/v1/health-ingest`
  if (!supabase) return null
  return (
    <>
      <h2>Siri</h2>
      <div className="card">
        <p className="small">Dois atalhos curtos para registares sem abrir a app. Usam o mesmo URL e token do atalho da Saúde.</p>
        <details style={{ marginTop: 10 }}>
          <summary className="small" style={{ fontWeight: 600, color: 'var(--accent)' }}>"Bebi água" (+500 ml)</summary>
          <ol className="small" style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Novo atalho com o nome <b>Bebi água</b> (é o que dizes à Siri).</li>
            <li><b>Obter conteúdo do URL</b>: <code style={{ wordBreak: 'break-all' }}>{endpoint}</code>, Método POST, cabeçalho <code>Authorization</code> = <code>Bearer O_TEU_TOKEN</code>, Corpo JSON com o campo Número <code>add_water_ml</code> = <code>500</code>.</li>
            <li><b>Obter valor do dicionário</b>: chave <code>message</code>.</li>
            <li><b>Mostrar resultado</b> com o Valor do dicionário. A Siri lê-o em voz alta.</li>
          </ol>
          <p className="tiny muted">Para um copo pequeno, duplica o atalho com 250 e chama-lhe "Bebi um copo".</p>
        </details>
        <details style={{ marginTop: 10 }}>
          <summary className="small" style={{ fontWeight: 600, color: 'var(--accent)' }}>"Peso" (pergunta o peso e regista)</summary>
          <ol className="small" style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Novo atalho com o nome <b>Registar peso</b>.</li>
            <li><b>Pedir entrada</b>: tipo Número, pergunta "Quanto pesas hoje?".</li>
            <li><b>Obter conteúdo do URL</b>: mesmo URL, POST, mesmo cabeçalho, Corpo JSON com o campo Texto <code>weight</code> = variável <b>Entrada fornecida</b>.</li>
            <li><b>Obter valor do dicionário</b> <code>message</code> → <b>Mostrar resultado</b>.</li>
          </ol>
        </details>
      </div>
    </>
  )
}
