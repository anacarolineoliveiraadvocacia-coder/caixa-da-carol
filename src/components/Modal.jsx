import { useEffect } from 'react'

export default function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full sm:max-w-md bg-slate-50 rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[92vh] flex flex-col fade-up">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xl leading-none"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-3 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-slate-200 safe-bottom">{footer}</div>}
      </div>
    </div>
  )
}
