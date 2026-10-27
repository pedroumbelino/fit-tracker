import { useSyncExternalStore } from 'react'
import { todayKey } from './date'

export type MealLog = {
  id: string
  slot: string
  name: string
  kcal: number
  p: number
  c: number
  g: number
  source: 'plan' | 'ai' | 'manual'
  recipeId?: string
  at: number
  verdict?: string
  notes?: string
}

export type SetLog = { id: string; exerciseId: string; set: number; kg: number; reps: number; at: number }

export type Checkin = { energy: number; soreness: number; knee: number; stress: number; hunger: number }

export type DayLog = {
  water: number
  meals: MealLog[]
  sets: SetLog[]
  workoutDone?: boolean
  checkin?: Checkin
  supps: string[]
  habits: string[]
  updatedAt: number
}

export type HealthDay = {
  steps?: number
  active_kcal?: number
  exercise_min?: number
  resting_hr?: number
  hrv?: number
  sleep_h?: number
  weight?: number
  body_fat?: number
  vo2max?: number
  water_ml?: number
}

export type ChatMsg = { id: string; role: 'user' | 'assistant'; text: string; image?: string; at: number }

export type Theme = 'system' | 'light' | 'dark'

export type NotifyKind = 'briefing' | 'water' | 'supps' | 'training' | 'phone' | 'weekly'
export type Notify = Record<NotifyKind, boolean>
export const DEFAULT_NOTIFY: Notify = { briefing: true, water: true, supps: true, training: true, phone: true, weekly: true }

export type Review = { week: string; decision: 'keep' | 'cut' | 'add'; applied: boolean; at: number }

export type Settings = {
  theme: Theme
  notify?: Notify
  /** Ajuste às calorias do plano, decidido nas revisões semanais (kcal). */
  kcalAdjust?: number
  reviews?: Review[]
  updatedAt: number
}

export type State = {
  days: Record<string, DayLog>
  health: Record<string, HealthDay>
  shopping: { checked: Record<string, boolean>; updatedAt: number }
  settings: Settings
  chat: { msgs: ChatMsg[]; updatedAt: number }
  dirty: string[]
}

const KEY = 'fit-tracker:v1'

const emptyDay = (): DayLog => ({ water: 0, meals: [], sets: [], supps: [], habits: [], updatedAt: 0 })

const initial: State = {
  days: {},
  health: {},
  shopping: { checked: {}, updatedAt: 0 },
  settings: { theme: 'system', updatedAt: 0 },
  chat: { msgs: [], updatedAt: 0 },
  dirty: [],
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...initial, ...JSON.parse(raw) }
  } catch {
    // Armazenamento indisponível (modo privado): corre só em memória.
  }
  return initial
}

let state: State = load()
const listeners = new Set<() => void>()
const syncListeners = new Set<() => void>()

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Ignorado: a app continua a funcionar em memória.
  }
}

function emit(dirtyKey?: string) {
  if (dirtyKey && !state.dirty.includes(dirtyKey)) state = { ...state, dirty: [...state.dirty, dirtyKey] }
  persist()
  listeners.forEach((l) => l())
  if (dirtyKey) syncListeners.forEach((l) => l())
}

export const store = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
  onDirty(l: () => void) {
    syncListeners.add(l)
    return () => syncListeners.delete(l)
  },
  /** Substitui o estado sem marcar como alterado (usado pela sincronização). */
  replace(next: State) {
    state = next
    persist()
    listeners.forEach((l) => l())
  },
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(store.subscribe, () => selector(state))
}

export function getDay(s: State, date: string): DayLog {
  return s.days[date] ?? EMPTY
}
const EMPTY = emptyDay()

export function updateDay(date: string, fn: (d: DayLog) => DayLog) {
  const cur = state.days[date] ?? emptyDay()
  state = { ...state, days: { ...state.days, [date]: { ...fn(cur), updatedAt: Date.now() } } }
  emit(`day:${date}`)
}

export const uid = () => crypto.randomUUID()

export const actions = {
  addWater(ml: number, date = todayKey()) {
    updateDay(date, (d) => ({ ...d, water: Math.max(0, d.water + ml) }))
  },
  addMeal(meal: Omit<MealLog, 'id' | 'at'>, date = todayKey()) {
    updateDay(date, (d) => ({ ...d, meals: [...d.meals, { ...meal, id: uid(), at: Date.now() }] }))
  },
  removeMeal(id: string, date = todayKey()) {
    updateDay(date, (d) => ({ ...d, meals: d.meals.filter((m) => m.id !== id) }))
  },
  addSet(set: Omit<SetLog, 'id' | 'at'>, date = todayKey()) {
    updateDay(date, (d) => ({ ...d, sets: [...d.sets, { ...set, id: uid(), at: Date.now() }] }))
  },
  removeSet(id: string, date = todayKey()) {
    updateDay(date, (d) => ({ ...d, sets: d.sets.filter((s) => s.id !== id) }))
  },
  setWorkoutDone(done: boolean, date = todayKey()) {
    updateDay(date, (d) => ({ ...d, workoutDone: done }))
  },
  setCheckin(checkin: Checkin, date = todayKey()) {
    updateDay(date, (d) => ({ ...d, checkin }))
  },
  toggle(field: 'supps' | 'habits', id: string, date = todayKey()) {
    updateDay(date, (d) => ({
      ...d,
      [field]: d[field].includes(id) ? d[field].filter((x) => x !== id) : [...d[field], id],
    }))
  },
  toggleShop(id: string) {
    const checked = { ...state.shopping.checked, [id]: !state.shopping.checked[id] }
    state = { ...state, shopping: { checked, updatedAt: Date.now() } }
    emit('shopping')
  },
  clearShop() {
    state = { ...state, shopping: { checked: {}, updatedAt: Date.now() } }
    emit('shopping')
  },
  setTheme(theme: Theme) {
    state = { ...state, settings: { ...state.settings, theme, updatedAt: Date.now() } }
    emit('settings')
  },
  setNotify(kind: NotifyKind, on: boolean) {
    const notify = { ...DEFAULT_NOTIFY, ...state.settings.notify, [kind]: on }
    state = { ...state, settings: { ...state.settings, notify, updatedAt: Date.now() } }
    emit('settings')
  },
  saveReview(review: Omit<Review, 'at'>, kcalDelta: number) {
    const reviews = [...(state.settings.reviews ?? []).filter((r) => r.week !== review.week), { ...review, at: Date.now() }].slice(-26)
    const kcalAdjust = Math.max(-450, Math.min(300, (state.settings.kcalAdjust ?? 0) + kcalDelta))
    state = { ...state, settings: { ...state.settings, reviews, kcalAdjust, updatedAt: Date.now() } }
    emit('settings')
  },
  addChat(msg: Omit<ChatMsg, 'id' | 'at'>) {
    const msgs = [...state.chat.msgs, { ...msg, id: uid(), at: Date.now() }].slice(-60)
    state = { ...state, chat: { msgs, updatedAt: Date.now() } }
    emit('chat')
  },
  clearChat() {
    state = { ...state, chat: { msgs: [], updatedAt: Date.now() } }
    emit('chat')
  },
  setHealth(date: string, patch: HealthDay) {
    state = { ...state, health: { ...state.health, [date]: { ...state.health[date], ...patch } } }
    emit(`health:${date}`)
  },
}
