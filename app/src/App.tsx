import { useEffect, useState } from 'react'
import { Icon, ToastHost } from './components/ui'
import { useStore } from './lib/store'
import Today from './screens/Today'
import Food from './screens/Food'
import Training from './screens/Training'
import Health from './screens/Health'
import Coach from './screens/Coach'
import Settings from './screens/Settings'

export type Tab = 'today' | 'food' | 'training' | 'health' | 'coach' | 'settings'

const TABS: { id: Exclude<Tab, 'settings'>; label: string; icon: () => React.ReactElement }[] = [
  { id: 'today', label: 'Hoje', icon: Icon.today },
  { id: 'food', label: 'Comida', icon: Icon.food },
  { id: 'training', label: 'Treino', icon: Icon.dumbbell },
  { id: 'health', label: 'Saúde', icon: Icon.heart },
  { id: 'coach', label: 'Coach', icon: Icon.spark },
]

function readTab(): Tab {
  const h = location.hash.slice(1) as Tab
  return ['today', 'food', 'training', 'health', 'coach', 'settings'].includes(h) ? h : 'today'
}

export default function App() {
  const [tab, setTab] = useState<Tab>(readTab)
  const theme = useStore((s) => s.settings.theme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
    const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#000000' : '#f2f2f7')
  }, [theme])

  useEffect(() => {
    const onHash = () => setTab(readTab())
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  const go = (t: Tab) => {
    if (t !== tab) {
      location.hash = t
      scrollTo({ top: 0 })
    }
  }

  return (
    <div className="app">
      {tab === 'today' && <Today go={go} />}
      {tab === 'food' && <Food />}
      {tab === 'training' && <Training />}
      {tab === 'health' && <Health go={go} />}
      {tab === 'coach' && <Coach />}
      {tab === 'settings' && <Settings />}
      <div className="tabbar">
        <nav>
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => go(t.id)} aria-current={tab === t.id}>
              <t.icon />
              {t.label}
            </button>
          ))}
        </nav>
      </div>
      <ToastHost />
    </div>
  )
}
