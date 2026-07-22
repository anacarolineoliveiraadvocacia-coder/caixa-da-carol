import { useState } from 'react'
import Reserva from './Reserva.jsx'
import Relatorio from './Relatorio.jsx'
import Relatorios from './Relatorios.jsx'
import Categorias from './Categorias.jsx'
import ContasFixas from './ContasFixas.jsx'
import Ajustes from './Ajustes.jsx'

const ITENS = [
  { id: 'relatorios', icon: '📊', titulo: 'Relatórios e gráficos', sub: 'Gastos por categoria e período' },
  { id: 'categorias', icon: '🏷️', titulo: 'Categorias', sub: 'Criar, editar e subcategorias' },
  { id: 'fixas', icon: '📅', titulo: 'Contas fixas', sub: 'Recorrentes e vencimentos' },
  { id: 'reserva', icon: '🛟', titulo: 'Reserva de emergência', sub: 'Meta, aportes e projeção' },
  { id: 'relatorioPdf', icon: '🖨️', titulo: 'Relatório mensal (PDF)', sub: 'Resumo Pessoal × Escritório' },
  { id: 'ajustes', icon: '⚙️', titulo: 'Ajustes e backup', sub: 'Potes, cartão, meta e exportação' }
]

const VIEWS = {
  relatorios: { titulo: 'Relatórios e gráficos', comp: Relatorios },
  categorias: { titulo: 'Categorias', comp: Categorias },
  fixas: { titulo: 'Contas fixas', comp: ContasFixas },
  reserva: { titulo: 'Reserva de emergência', comp: Reserva },
  relatorioPdf: { titulo: 'Relatório mensal', comp: Relatorio },
  ajustes: { titulo: 'Ajustes e backup', comp: Ajustes }
}

export default function Mais() {
  const [view, setView] = useState(null)

  if (view && VIEWS[view]) {
    const { titulo, comp: Comp } = VIEWS[view]
    return (
      <SubPage titulo={titulo} onBack={() => setView(null)}>
        <Comp />
      </SubPage>
    )
  }

  return (
    <div className="p-4 space-y-3">
      <div className="card bg-gradient-to-br from-marca to-marca-dark text-white border-0">
        <h2 className="text-lg font-bold">Caixa da Carol</h2>
        <p className="text-marca-soft/90 text-sm mt-1">Sua vida pessoal e o escritório, lado a lado. 💙💜</p>
      </div>

      {ITENS.map((it) => (
        <button key={it.id} onClick={() => setView(it.id)} className="card w-full flex items-center gap-4 text-left active:bg-slate-50">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl shrink-0">{it.icon}</div>
          <div className="flex-1">
            <p className="font-semibold text-slate-700">{it.titulo}</p>
            <p className="text-xs text-slate-400">{it.sub}</p>
          </div>
          <span className="text-slate-300 text-xl">›</span>
        </button>
      ))}

      <div className="card bg-amber-50 border-amber-200">
        <p className="text-sm text-amber-800">
          <strong>💾 Lembrete:</strong> exporte um backup em Ajustes de tempos em tempos. Como tudo fica só no seu celular, um backup evita perder os dados se trocar de aparelho ou limpar o navegador.
        </p>
      </div>
    </div>
  )
}

function SubPage({ titulo, onBack, children }) {
  return (
    <div>
      <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur px-4 py-3 flex items-center gap-3 border-b border-slate-100 no-print">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-500">‹</button>
        <h1 className="font-bold text-slate-700">{titulo}</h1>
      </div>
      {children}
    </div>
  )
}
