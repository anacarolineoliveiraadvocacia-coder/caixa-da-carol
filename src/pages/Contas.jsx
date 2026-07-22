import { useState } from 'react'
import ContasFixas from './ContasFixas.jsx'
import Fatura from './Fatura.jsx'

export default function Contas() {
  const [tab, setTab] = useState('fixas')
  return (
    <div>
      <div className="px-4 pt-4">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setTab('fixas')}
            className={`pill-tab ${tab === 'fixas' ? 'bg-white shadow text-slate-700' : 'text-slate-500'}`}
          >
            📅 Contas fixas
          </button>
          <button
            onClick={() => setTab('cartao')}
            className={`pill-tab ${tab === 'cartao' ? 'bg-white shadow text-slate-700' : 'text-slate-500'}`}
          >
            💳 Cartão
          </button>
        </div>
      </div>
      {tab === 'fixas' ? <ContasFixas /> : <Fatura />}
    </div>
  )
}
