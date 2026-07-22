import { addMonthsToKey, monthKeyLabel } from '../utils/format.js'

export default function MonthSwitcher({ value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <button
        onClick={() => onChange(addMonthsToKey(value, -1))}
        className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-100 text-slate-500 text-lg flex items-center justify-center"
        aria-label="Mês anterior"
      >
        ‹
      </button>
      <span className="font-semibold text-slate-700 first-letter:uppercase text-center flex-1">
        {monthKeyLabel(value)}
      </span>
      <button
        onClick={() => onChange(addMonthsToKey(value, 1))}
        className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-100 text-slate-500 text-lg flex items-center justify-center"
        aria-label="Próximo mês"
      >
        ›
      </button>
    </div>
  )
}
