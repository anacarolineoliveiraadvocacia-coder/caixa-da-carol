import { ESCOPOS, METODOS, escopoInfo } from '../db.js'

export function ScopeBadge({ scope }) {
  const info = escopoInfo(scope)
  return (
    <span
      className="chip border"
      style={{ background: info.soft, color: info.color, borderColor: info.color + '55' }}
    >
      {info.label}
    </span>
  )
}

export function ScopeToggle({ value, onChange }) {
  return (
    <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl">
      {ESCOPOS.map((e) => {
        const active = value === e.id
        return (
          <button
            key={e.id}
            type="button"
            onClick={() => onChange(e.id)}
            className={`pill-tab ${active ? 'text-white shadow' : 'text-slate-500'}`}
            style={active ? { background: e.color } : undefined}
          >
            {e.label}
          </button>
        )
      })}
    </div>
  )
}

// Filtro "Todos + escopos" usado em listas e relatorios
export function ScopeFilter({ value, onChange }) {
  const itens = [{ id: 'todos', label: 'Todos', color: '#64748b' }, ...ESCOPOS]
  return (
    <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl">
      {itens.map((e) => {
        const active = value === e.id
        return (
          <button
            key={e.id}
            type="button"
            onClick={() => onChange(e.id)}
            className={`pill-tab text-xs ${active ? 'text-white shadow' : 'text-slate-500'}`}
            style={active ? { background: e.color } : undefined}
          >
            {e.label}
          </button>
        )
      })}
    </div>
  )
}

export function TypeToggle({ value, onChange }) {
  return (
    <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
      <button
        type="button"
        onClick={() => onChange('expense')}
        className={`pill-tab ${
          value === 'expense' ? 'bg-rose-500 text-white shadow' : 'text-slate-500'
        }`}
      >
        Saída
      </button>
      <button
        type="button"
        onClick={() => onChange('income')}
        className={`pill-tab ${
          value === 'income' ? 'bg-emerald-500 text-white shadow' : 'text-slate-500'
        }`}
      >
        Entrada
      </button>
    </div>
  )
}

export function MethodPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {METODOS.map((m) => {
        const active = value === m.id
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium ${
              active
                ? 'border-marca bg-marca-soft text-marca-dark'
                : 'border-slate-200 bg-white text-slate-500'
            }`}
          >
            <span className="text-lg">{m.emoji}</span>
            {m.label}
          </button>
        )
      })}
    </div>
  )
}

export function EmptyState({ icon = '📭', title, subtitle }) {
  return (
    <div className="text-center py-12 px-6">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="font-semibold text-slate-600">{title}</p>
      {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
    </div>
  )
}

export function methodLabel(id) {
  return METODOS.find((m) => m.id === id)?.label || id
}
export function methodEmoji(id) {
  return METODOS.find((m) => m.id === id)?.emoji || '•'
}
