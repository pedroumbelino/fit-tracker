import { useSyncExternalStore } from 'react'
import { supabase } from './supabase'
import { store, type HealthDay, type State } from './store'
import { addDays, todayKey } from './date'

type Status = { state: 'off' | 'idle' | 'syncing' | 'error'; at?: number; error?: string; email?: string }

let status: Status = { state: supabase ? 'idle' : 'off' }
const listeners = new Set<() => void>()
const setStatus = (s: Partial<Status>) => {
  status = { ...status, ...s }
  listeners.forEach((l) => l())
}

export function useSyncStatus(): Status {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => status,
  )
}

const HEALTH_METRICS: (keyof HealthDay)[] = [
  'steps', 'active_kcal', 'exercise_min', 'resting_hr', 'hrv', 'sleep_h', 'weight', 'body_fat', 'vo2max', 'water_ml',
]

function valueFor(s: State, key: string): { updatedAt: number } | undefined {
  if (key.startsWith('day:')) return s.days[key.slice(4)]
  if (key === 'shopping') return s.shopping
  if (key === 'settings') return s.settings
  if (key === 'chat') return s.chat
}

async function push(userId: string) {
  const s = store.get()
  const keys = [...s.dirty]
  if (!keys.length || !supabase) return
  const kvRows = keys
    .filter((k) => !k.startsWith('health:'))
    .map((k) => ({ user_id: userId, key: k, value: valueFor(s, k) ?? null, updated_at: new Date().toISOString() }))
  const healthRows = keys
    .filter((k) => k.startsWith('health:'))
    .flatMap((k) => {
      const date = k.slice(7)
      const h = s.health[date] ?? {}
      return HEALTH_METRICS.filter((m) => h[m] != null).map((metric) => ({
        user_id: userId, date, metric, value: h[metric], source: 'app',
      }))
    })
  if (kvRows.length) {
    const { error } = await supabase.from('user_kv').upsert(kvRows)
    if (error) throw error
  }
  if (healthRows.length) {
    const { error } = await supabase.from('health_daily').upsert(healthRows)
    if (error) throw error
  }
  const cur = store.get()
  store.replace({ ...cur, dirty: cur.dirty.filter((k) => !keys.includes(k)) })
}

async function pull() {
  if (!supabase) return
  const since = localStorage.getItem('fit-tracker:lastPull') ?? '1970-01-01T00:00:00Z'
  const startedAt = new Date().toISOString()
  const { data: kv, error } = await supabase.from('user_kv').select('key,value').gt('updated_at', since)
  if (error) throw error
  const { data: health, error: hErr } = await supabase
    .from('health_daily')
    .select('date,metric,value')
    .gte('date', addDays(todayKey(), -120))
  if (hErr) throw hErr

  let next = store.get()
  for (const row of kv ?? []) {
    const remote = row.value as { updatedAt: number } | null
    if (!remote) continue
    const local = valueFor(next, row.key)
    if (local && local.updatedAt >= remote.updatedAt) continue
    if (row.key.startsWith('day:')) next = { ...next, days: { ...next.days, [row.key.slice(4)]: remote as State['days'][string] } }
    else if (row.key === 'shopping') next = { ...next, shopping: remote as State['shopping'] }
    else if (row.key === 'settings') next = { ...next, settings: remote as State['settings'] }
    else if (row.key === 'chat') next = { ...next, chat: remote as State['chat'] }
  }
  const healthMap: Record<string, HealthDay> = { ...next.health }
  for (const row of health ?? []) {
    healthMap[row.date] = { ...healthMap[row.date], [row.metric]: Number(row.value) }
  }
  next = { ...next, health: healthMap }
  store.replace(next)
  localStorage.setItem('fit-tracker:lastPull', startedAt)
}

let timer: number | undefined
let running = false

export async function syncNow() {
  if (!supabase || running) return
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user
  if (!user) {
    setStatus({ state: 'idle', email: undefined })
    return
  }
  running = true
  setStatus({ state: 'syncing', email: user.email })
  try {
    await push(user.id)
    await pull()
    setStatus({ state: 'idle', at: Date.now(), error: undefined })
  } catch (e) {
    setStatus({ state: 'error', error: e instanceof Error ? e.message : String(e) })
  } finally {
    running = false
  }
}

export function startSync() {
  if (!supabase) return
  store.onDirty(() => {
    window.clearTimeout(timer)
    timer = window.setTimeout(syncNow, 1500)
  })
  supabase.auth.onAuthStateChange((_e, session) => {
    setStatus({ email: session?.user.email })
    if (session) syncNow()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncNow()
  })
  syncNow()
}
