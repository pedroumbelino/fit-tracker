// Recebe os dados da app Saúde enviados por um Atalho do iOS.
//
// POST /functions/v1/health-ingest
// Authorization: Bearer <token gerado em Definições → Apple Saúde>
// Corpo: { "date": "2026-10-26", "steps": 8234, "sleep_h": 7.2, ... }
//    ou: [ { "date": ..., ... }, ... ] para enviar vários dias

import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { cors, json } from '../_shared/http.ts'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

const METRICS = ['steps', 'active_kcal', 'exercise_min', 'resting_hr', 'hrv', 'sleep_h', 'weight', 'body_fat', 'vo2max', 'water_ml'] as const

// Os Atalhos em português podem mandar "7,5", "8 234", "1.234,5" ou "83,6 kg" como texto.
function toNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v !== 'string') return null
  let s = v.replace(/[\s  ]/g, '')
  s = s.includes('.') && s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s.replace(',', '.')
  const m = s.match(/-?\d+(?:\.\d+)?/)
  return m ? Number(m[0]) : null
}

function lisbonToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date())
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function rowsFor(userId: string, day: Record<string, unknown>) {
  const date = typeof day.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(day.date) ? day.date.slice(0, 10) : lisbonToday()
  const values: Record<string, number | null> = Object.fromEntries(METRICS.map((m) => [m, toNumber(day[m])]))
  // Aceita o sono noutras unidades, se o Atalho as mandar.
  if (values.sleep_h == null && toNumber(day.sleep_min) != null) values.sleep_h = toNumber(day.sleep_min)! / 60
  if (values.sleep_h == null && toNumber(day.sleep_s) != null) values.sleep_h = toNumber(day.sleep_s)! / 3600
  // A soma de durações nos Atalhos pode vir em minutos ou segundos: uma noite nunca tem mais de 24 h.
  if (values.sleep_h != null && values.sleep_h > 24) values.sleep_h /= values.sleep_h > 1440 ? 3600 : 60
  // Body fat pode vir como fração (0,18) ou percentagem (18).
  if (values.body_fat != null && values.body_fat < 1) values.body_fat *= 100

  return METRICS.flatMap((metric) => {
    const value = values[metric]
    // Zeros de métricas que o relógio não mediu (ex.: peso) não são dados.
    if (value == null || (value === 0 && metric !== 'steps')) return []
    return [{ user_id: userId, date, metric, value: Math.round(value * 100) / 100, source: 'shortcut', updated_at: new Date().toISOString() }]
  })
}

// Água pela Siri: soma ao registo do dia na app (documento day:AAAA-MM-DD em user_kv).
async function addWater(userId: string, date: string, ml: number) {
  const key = `day:${date}`
  const { data } = await admin.from('user_kv').select('value').eq('user_id', userId).eq('key', key).maybeSingle()
  const day = (data?.value as Record<string, unknown> | null) ?? { water: 0, meals: [], sets: [], supps: [], habits: [] }
  const water = Math.max(0, Number(day.water ?? 0) + ml)
  const { error } = await admin.from('user_kv').upsert({
    user_id: userId, key, value: { ...day, water, updatedAt: Date.now() }, updated_at: new Date().toISOString(),
  })
  if (error) throw error
  return water
}

const litres = (ml: number) => (ml / 1000).toLocaleString('pt-PT', { maximumFractionDigits: 1 })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Usa POST' }, 405)

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token) return json({ error: 'Falta o token' }, 401)
  const { data: owner } = await admin.from('ingest_tokens').select('user_id').eq('token_hash', await sha256(token)).maybeSingle()
  if (!owner) return json({ error: 'Token inválido' }, 401)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json({ error: 'JSON inválido' }, 400)
  }
  // Atalhos da Siri: "bebi água" e "peso".
  if (body && typeof body === 'object' && !Array.isArray(body) && 'add_water_ml' in body) {
    const ml = toNumber((body as Record<string, unknown>).add_water_ml)
    if (!ml || ml < -2000 || ml > 3000) return json({ error: 'Quantidade de água inválida' }, 400)
    try {
      const water = await addWater(owner.user_id, lisbonToday(), ml)
      return json({ ok: true, water_ml: water, message: `Registado. Já bebeste ${litres(water)} litros hoje.` })
    } catch (e) {
      console.error(e)
      return json({ error: 'Erro ao guardar a água' }, 500)
    }
  }

  const days = (Array.isArray(body) ? body : [body]).filter((d): d is Record<string, unknown> => !!d && typeof d === 'object').slice(0, 60)
  const rows = days.flatMap((d) => rowsFor(owner.user_id, d))
  // Devolve o que chegou para ser fácil perceber o que o Atalho está a enviar.
  if (!rows.length) return json({ ok: true, saved: 0, received: body })

  const { error } = await admin.from('health_daily').upsert(rows)
  if (error) {
    console.error(error)
    return json({ error: 'Erro ao guardar' }, 500)
  }
  const weight = rows.find((r) => r.metric === 'weight')
  const message = rows.length === 1 && weight
    ? `Peso registado: ${weight.value.toLocaleString('pt-PT')} kg.`
    : `Guardadas ${rows.length} métricas da Saúde.`
  return json({ ok: true, saved: rows.length, metrics: rows.map((r) => r.metric), message })
})
