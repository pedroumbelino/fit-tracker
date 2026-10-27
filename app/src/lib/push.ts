import { supabase } from './supabase'

export type PushState = 'unsupported' | 'install' | 'denied' | 'off' | 'on'

const standalone = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

export async function pushState(): Promise<PushState> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    // No iPhone, o Web Push só existe na app instalada no ecrã principal.
    return /iPhone|iPad/.test(navigator.userAgent) && !standalone() ? 'install' : 'unsupported'
  }
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub ? 'on' : 'off'
}

function keyToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4)
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export async function enablePush(): Promise<void> {
  if (!supabase) throw new Error('Liga o Supabase primeiro.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Permissão recusada. Ativa em Definições do iPhone → Notificações → Forma.')
  const { data, error } = await supabase.functions.invoke('reminders', { body: { action: 'public_key' } })
  if (error || !data?.publicKey) throw new Error('Não foi possível obter a chave das notificações.')
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(data.publicKey) })
  const json = sub.toJSON()
  const { error: saveErr } = await supabase.from('push_subscriptions').upsert({
    endpoint: sub.endpoint, p256dh: json.keys!.p256dh, auth: json.keys!.auth,
  })
  if (saveErr) throw new Error(saveErr.message)
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await supabase?.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

export async function testPush(): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.functions.invoke('reminders', { body: { action: 'test' } })
  if (error) {
    const ctx = (error as { context?: Response }).context
    const detail = ctx ? await ctx.json().catch(() => null) : null
    throw new Error(detail?.error ?? error.message)
  }
}
