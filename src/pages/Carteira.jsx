import { useState } from 'react'
import ContasBancarias from './ContasBancarias.jsx'
import Cartoes from './Cartoes.jsx'

export default function Carteira() {
  const [tab, setTab] = useState('contas')
  return (
    <div>
      <div className="px-4 pt-4">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setTab('contas')}
            className={`pill-tab ${tab === 'contas' ? 'bg-white shadow text-slate-700' : 'text-slate-500'}`}
          >
            🏦 Contas
          </button>
          <button
            onClick={() => setTab('cartoes')}
            className={`pill-tab ${tab === 'cartoes' ? 'bg-white shadow text-slate-700' : 'text-slate-500'}`}
          >
            💳 Cartões
          </button>
        </div>
      </div>
      {tab === 'contas' ? <ContasBancarias /> : <Cartoes />}
    </div>
  )
}
