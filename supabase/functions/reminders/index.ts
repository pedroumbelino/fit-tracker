// Lembretes da app Forma por notificação (Web Push).
//
// POST {}                          → chamado pelo pg_cron a cada 15 min: envia os lembretes devidos
// POST { action: "public_key" }    → chave pública VAPID para a app subscrever
// POST { action: "test" } + JWT    → envia uma notificação de teste ao utilizador
//
// O par de chaves VAPID é gerado na primeira chamada e guardado em push_config (só o service role lhe acede).
// Cada lembrete é enviado no máximo uma vez por dia (push_log), por isso chamadas repetidas não duplicam nada.

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { cors, json } from '../_shared/http.ts'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const SUBJECT = 'mailto:forma@example.com'

type Kind = 'briefing' | 'water' | 'supps' | 'training' | 'phone' | 'weekly'
type Push = { title: string; body: string; url: string; tag: string }
type Sub = { endpoint: string; p256dh: string; auth: string; user_id: string }

// Espelho do plano da app (0 = domingo).
const SESSIONS: Record<number, { name: string; gym: boolean; rest: boolean }> = {
  1: { name: 'Superior A (força)', gym: true, rest: false },
  2: { name: 'Inferior A (posterior)', gym: true, rest: false },
  3: { name: 'Zona 2 na passadeira', gym: false, rest: false },
  4: { name: 'Superior B (hipertrofia)', gym: true, rest: false },
  5: { name: 'Inferior B (joelho amigo)', gym: true, rest: false },
  6: { name: 'Corpo inteiro + passadeira', gym: true, rest: false },
  0: { name: 'Caminhada longa', gym: false, rest: true },
}

async function vapidKeys() {
  const { data } = await admin.from('push_config').select('public_key, private_key').eq('id', 1).maybeSingle()
  if (data) return { publicKey: data.public_key as string, privateKey: data.private_key as string }
  const keys = webpush.generateVAPIDKeys()
  // Se duas chamadas gerarem ao mesmo tempo, fica a primeira e a segunda relê-a.
  await admin.from('push_config').insert({ id: 1, public_key: keys.publicKey, private_key: keys.privateKey })
  const { data: saved } = await admin.from('push_config').select('public_key, private_key').eq('id', 1).single()
  return { publicKey: saved!.public_key as string, privateKey: saved!.private_key as string }
}

/** Cifra com web-push e envia com o fetch nativo (o http do modo Node falha no Deno). Devolve false se a subscrição expirou. */
async function send(sub: Sub, push: Push, keys: { publicKey: string; privateKey: string }): Promise<boolean> {
  const req = webpush.generateRequestDetails(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    JSON.stringify(push),
    { vapidDetails: { subject: SUBJECT, ...keys }, TTL: 3600, urgency: 'normal' },
  )
  const headers = { ...(req.headers as Record<string, string>) }
  delete headers['Content-Length']
  const res = await fetch(req.endpoint, { method: req.method, headers, body: req.body })
  if (res.status === 404 || res.status === 410) {
    await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    return false
  }
  if (!res.ok) console.error('push', res.status, await res.text().catch(() => ''))
  return res.ok
}

function lisbonNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23',
    }).formatToParts(new Date()).map((p) => [p.type, p.value]),
  )
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday)
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute), dow }
}

const at = (h: number, m = 0) => h * 60 + m
const L = (ml: number) => (ml / 1000).toLocaleString('pt-PT', { maximumFractionDigits: 1 })

type Day = { water?: number; supps?: string[]; workoutDone?: boolean } | null

/** Lembretes devidos agora. Cada um tem uma janela de 2 h para não chegar a meio da noite se o cron falhar. */
function due(now: ReturnType<typeof lisbonNow>, day: Day, sleepH: number | null): { id: string; kind: Kind; push: Push }[] {
  const s = SESSIONS[now.dow]
  const waterTarget = 3000 + (s.rest ? 0 : 500)
  const water = day?.water ?? 0
  const win = (t: number) => now.minutes >= t && now.minutes < t + 120
  const out: { id: string; kind: Kind; push: Push }[] = []

  if (win(at(8, 30))) {
    const sleep = sleepH != null ? `Dormiste ${sleepH.toLocaleString('pt-PT', { maximumFractionDigits: 1 })} h. ` : ''
    out.push({ id: 'briefing', kind: 'briefing', push: {
      title: 'Bom dia, Pedro', tag: 'briefing', url: '/#today',
      body: `${sleep}Hoje: ${s.name}. Metas: 170 g de proteína e ${L(waterTarget)} L de água.${sleepH != null && sleepH < 6.5 ? ' Faz o check-in: se estiveres cansado, treino reduzido.' : ''}`,
    } })
  }
  // Água: compara com o ritmo esperado entre as 08:00 e as 21:00.
  for (const [h, frac] of [[11, 0.3], [14, 0.55], [17, 0.75], [20, 0.95]] as const) {
    if (win(at(h)) && water < waterTarget * frac - 250) {
      out.push({ id: `water_${h}`, kind: 'water', push: {
        title: 'Água 💧', tag: 'water', url: '/#today',
        body: `Vais em ${L(water)} de ${L(waterTarget)} L. Bebe um copo grande agora.`,
      } })
    }
  }
  if (win(at(13, 30)) && !day?.supps?.includes('creatina')) {
    out.push({ id: 'supps', kind: 'supps', push: { title: 'Suplementos', tag: 'supps', url: '/#today', body: 'Creatina 5 g e vitamina D3 ao almoço.' } })
  }
  if (s.gym && win(at(17)) && !day?.workoutDone) {
    out.push({ id: 'training', kind: 'training', push: { title: 'Treino de hoje', tag: 'training', url: '/#training', body: `${s.name}. Acaba até às 19:30 para dormires bem.` } })
  }
  if (win(at(22, 45))) {
    out.push({ id: 'phone', kind: 'phone', push: { title: 'Hora de desligar 🌙', tag: 'phone', url: '/#today', body: 'Telemóvel a carregar fora do quarto. Luzes apagadas às 23:30.' } })
  }
  if (now.dow === 0 && win(at(19))) {
    out.push({ id: 'weekly', kind: 'weekly', push: { title: 'Revisão semanal', tag: 'weekly', url: '/#health', body: 'A tua semana está pronta para rever. Leva 1 minuto.' } })
  }
  return out
}

async function runReminders() {
  const keys = await vapidKeys()
  const { data: subs } = await admin.from('push_subscriptions').select('endpoint, p256dh, auth, user_id')
  if (!subs?.length) return { sent: 0 }
  const now = lisbonNow()
  const byUser = new Map<string, Sub[]>()
  for (const s of subs as Sub[]) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s])

  let sent = 0
  for (const [userId, userSubs] of byUser) {
    const [{ data: kv }, { data: sleep }] = await Promise.all([
      admin.from('user_kv').select('key, value').eq('user_id', userId).in('key', ['settings', `day:${now.date}`]),
      admin.from('health_daily').select('value').eq('user_id', userId).eq('date', now.date).eq('metric', 'sleep_h').maybeSingle(),
    ])
    const settings = kv?.find((r) => r.key === 'settings')?.value as { notify?: Partial<Record<Kind, boolean>> } | undefined
    const day = (kv?.find((r) => r.key === `day:${now.date}`)?.value ?? null) as Day
    const prefs = settings?.notify ?? {}

    for (const r of due(now, day, sleep ? Number(sleep.value) : null)) {
      if (prefs[r.kind] === false) continue
      // Reserva o envio antes de enviar: se outra execução já o fez, o insert falha e salta.
      const { error } = await admin.from('push_log').insert({ user_id: userId, kind: r.id, day: now.date })
      if (error) continue
      for (const sub of userSubs) if (await send(sub, r.push, keys)) sent++
    }
  }
  return { sent }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = await req.json().catch(() => ({}))
    if (body.action === 'public_key') return json({ publicKey: (await vapidKeys()).publicKey })

    if (body.action === 'test') {
      const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
      const { data: { user } } = await admin.auth.getUser(jwt)
      if (!user) return json({ error: 'Sessão inválida' }, 401)
      const keys = await vapidKeys()
      const { data: subs } = await admin.from('push_subscriptions').select('endpoint, p256dh, auth, user_id').eq('user_id', user.id)
      if (!subs?.length) return json({ error: 'Este iPhone ainda não está subscrito.' }, 404)
      let sent = 0
      for (const sub of subs as Sub[]) {
        if (await send(sub, { title: 'Forma', body: 'As notificações estão a funcionar ✅', url: '/#today', tag: 'test' }, keys)) sent++
      }
      return json({ ok: true, sent })
    }

    return json({ ok: true, ...(await runReminders()) })
  } catch (e) {
    console.error(e)
    return json({ error: 'Erro interno' }, 500)
  }
})
