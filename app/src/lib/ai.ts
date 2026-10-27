import { supabase } from './supabase'

export type MealItem = { name: string; grams: number; kcal: number; protein_g: number; carbs_g: number; fat_g: number }

export type MealAnalysis = {
  name: string
  items: MealItem[]
  total: { kcal: number; protein_g: number; carbs_g: number; fat_g: number }
  confidence: 'alta' | 'media' | 'baixa'
  tip: string
  jev?: {
    fit?: { choice: string; confidence: number }
    lactose?: number
    protein_ok?: number
    processed?: number
  } | null
}

export type ReadinessAI = {
  level: 'full' | 'reduced' | 'recovery'
  confidence: number
  knee_caution: number
  sleep_debt: number
}

export const aiAvailable = () => supabase != null

async function call<T>(body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('Liga o Supabase nas Definições para usar a AI.')
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) throw new Error('Inicia sessão nas Definições para usar a AI.')
  const { data, error } = await supabase.functions.invoke('coach', { body })
  if (error) {
    const ctx = (error as { context?: Response }).context
    const detail = ctx ? await ctx.json().catch(() => null) : null
    throw new Error(detail?.error ?? error.message)
  }
  return data as T
}

export const ai = {
  meal: (image: string | null, note: string, context: unknown) =>
    call<MealAnalysis>({ mode: 'meal', image, note, context }),
  chat: (messages: { role: 'user' | 'assistant'; text: string; image?: string }[], context: unknown) =>
    call<{ text: string }>({ mode: 'chat', messages, context }),
  readiness: (context: unknown) => call<ReadinessAI>({ mode: 'readiness', context }),
  weekly: (week: unknown, recommendation: unknown, context: unknown) =>
    call<{ text: string; jev: { decision: string; confidence: number } | null }>({ mode: 'weekly', week, recommendation, context }),
}

/** Reduz a foto para no máximo 1024 px e devolve JPEG em base64 (sem prefixo data:). */
export async function fileToJpegBase64(file: File, max = 1024): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
}
