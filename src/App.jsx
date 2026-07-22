import { useEffect, useState } from 'react'
import { getSettings } from './db.js'
import Dashboard from './pages/Dashboard.jsx'
import Extrato from './pages/Extrato.jsx'
import Carteira from './pages/Carteira.jsx'
import Mais from './pages/Mais.jsx'
import QuickAdd from './components/QuickAdd.jsx'
import TransactionForm from './components/TransactionForm.jsx'
import PotesModal from './components/PotesModal.jsx'

const TABS = [
  { id: 'inicio', label: 'Início', icon: '🏠' },
  { id: 'extrato', label: 'Extrato', icon: '📋' },
  { id: 'add', label: '', icon: '＋' },
  { id: 'carteira', label: 'Carteira', icon: '👛' },
  { id: 'mais', label: 'Mais', icon: '⋯' }
]

const TITULOS = {
  inicio: 'Início',
  extrato: 'Extrato',
  carteira: 'Carteira',
  mais: 'Mais'
}

export default function App() {
  const [tab, setTab] = useState('inicio')
  const [quickOpen, setQuickOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [potes, setPotes] = useState(null) // { income, potes }

  async function handleIncome(saved) {
    const s = await getSettings()
    setPotes({ income: saved, potes: s.potes })
  }

  return (
    <div className="min-h-full flex flex-col bg-slate-100">
      {/* Header */}
      <header className="safe-top bg-marca text-white no-print">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <h1 className="font-bold text-lg tracking-tight">
              Caixa da Carol
            </h1>
          </div>
          <span className="text-xs bg-white/15 px-2.5 py-1 rounded-full">
            {TITULOS[tab]}
          </span>
        </div>
      </header>

      {/* Conteudo */}
      <main className="flex-1 overflow-y-auto pb-24">
        {tab === 'inicio' && <Dashboard />}
        {tab === 'extrato' && <Extrato />}
        {tab === 'carteira' && <Carteira />}
        {tab === 'mais' && <Mais />}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 safe-bottom no-print z-30">
        <div className="max-w-md mx-auto flex items-center justify-around px-2 pt-1.5">
          {TABS.map((t) => {
            if (t.id === 'add') {
              return (
                <button
                  key="add"
                  onClick={() => setQuickOpen(true)}
                  className="w-14 h-14 -mt-6 rounded-full bg-marca text-white text-3xl shadow-lg shadow-marca/30 flex items-center justify-center active:scale-95 transition"
                  aria-label="Novo lançamento"
                >
                  ＋
                </button>
              )
            }
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-col items-center gap-0.5 py-1.5 px-3 min-w-[56px] ${
                  active ? 'text-marca' : 'text-slate-400'
                }`}
              >
                <span className="text-xl leading-none">{t.icon}</span>
                <span className="text-[11px] font-medium">{t.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Modais globais */}
      <QuickAdd
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onIncome={handleIncome}
        onDetailed={() => setFormOpen(true)}
      />
      <TransactionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={(saved) => {
          if (saved.type === 'income') handleIncome(saved)
        }}
      />
      <PotesModal
        open={!!potes}
        onClose={() => setPotes(null)}
        income={potes?.income}
        potes={potes?.potes || { salario: 60, escritorio: 20, reserva: 20 }}
      />
    </div>
  )
}
