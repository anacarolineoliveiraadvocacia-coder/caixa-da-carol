import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db.js'
import { interpretarTexto } from '../utils/parse.js'
import { todayISO, parseValor, formatNumberBR } from '../utils/format.js'
import { faturaDaCompra } from '../utils/cartao.js'
import { afetaConta } from '../utils/finance.js'
import { categoriasDoEscopo, acharCategoriaPorNome } from '../utils/categorias.js'
import { ScopeToggle, TypeToggle, MethodPicker } from './ui.jsx'
import Modal from './Modal.jsx'

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null

export default function QuickAdd({ open, onClose, onSaved, onIncome, onDetailed }) {
  const [texto, setTexto] = useState('')
  const [preview, setPreview] = useState(null)
  const [ouvindo, setOuvindo] = useState(false)
  const [saving, setSaving] = useState(false)
  const recognitionRef = useRef(null)

  const categories = useLiveQuery(() => db.categories.toArray(), [], null)
  const accounts = useLiveQuery(() => db.accounts.orderBy('ordem').toArray(), [], null)
  const cards = useLiveQuery(() => db.cards.orderBy('ordem').toArray(), [], null)

  useEffect(() => {
    if (!open) {
      setTexto('')
      setPreview(null)
      pararVoz()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Reinterpreta ao mudar o texto
  useEffect(() => {
    if (!categories) return
    if (texto.trim().length === 0) {
      setPreview(null)
      return
    }
    const p = interpretarTexto(texto)
    const cat = acharCategoriaPorNome(categories, p.scope, p.category)
    const fallback = categoriasDoEscopo(categories, p.scope)[0]
    setPreview({
      ...p,
      amountStr: p.amount > 0 ? formatNumberBR(p.amount) : '',
      categoryId: cat?.id || fallback?.id || null,
      subcategoryId: null
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto, categories])

  const cats = useMemo(
    () => (preview ? categoriasDoEscopo(categories, preview.scope) : []),
    [categories, preview]
  )

  function setPrev(patch) {
    setPreview((p) => ({ ...p, ...patch }))
  }

  function onScope(scope) {
    const lista = categoriasDoEscopo(categories, scope)
    setPrev({ scope, categoryId: lista[0]?.id || null, subcategoryId: null })
  }

  function ouvirVoz() {
    if (!SpeechRecognition) return
    try {
      const rec = new SpeechRecognition()
      rec.lang = 'pt-BR'
      rec.interimResults = true
      rec.continuous = false
      rec.onstart = () => setOuvindo(true)
      rec.onend = () => setOuvindo(false)
      rec.onerror = () => setOuvindo(false)
      rec.onresult = (event) => {
        let txt = ''
        for (let i = 0; i < event.results.length; i++) txt += event.results[i][0].transcript
        setTexto(txt)
      }
      recognitionRef.current = rec
      rec.start()
    } catch (e) {
      setOuvindo(false)
    }
  }

  function pararVoz() {
    try { recognitionRef.current?.stop() } catch (e) { /* ignore */ }
    setOuvindo(false)
  }

  const usaConta = preview && (preview.type === 'income' || afetaConta(preview.method))
  const usaCartao = preview && preview.type === 'expense' && preview.method === 'credito'

  async function confirmar() {
    if (!preview) return
    const amount = parseValor(preview.amountStr)
    if (amount <= 0) {
      alert('Não consegui identificar o valor. Digite o valor (ex.: "mercado 230 pessoal").')
      return
    }
    setSaving(true)
    try {
      const category = cats.find((c) => c.id === preview.categoryId)?.name || 'Outros'
      const card = usaCartao ? (cards || []).find((c) => c.id === Number(preview.cardId ?? (cards?.[0]?.id))) : null
      const accountId = usaConta
        ? (preview.accountId != null ? Number(preview.accountId) : accounts?.[0]?.id ?? null)
        : null

      const record = {
        amount,
        description: (preview.description || '').trim() || 'Lançamento',
        date: todayISO(),
        scope: preview.scope,
        type: preview.type,
        method: preview.method,
        categoryId: preview.categoryId,
        category,
        subcategoryId: null,
        subcategory: null,
        accountId,
        cardId: card?.id || null,
        invoiceMonth: card ? faturaDaCompra(todayISO(), card.diaFechamento) : null,
        createdAt: new Date().toISOString()
      }
      const id = await db.transactions.add(record)
      const saved = { ...record, id }
      onSaved?.(saved)
      if (record.type === 'income') onIncome?.(saved)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const exemplos = ['mercado 230 pessoal', 'recebi 1500 honorários escritório', 'uber 32 no pix', 'oab anuidade 800 crédito']

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="⚡ Lançamento rápido"
      footer={
        <button className="btn btn-lg btn-primary w-full" onClick={confirmar} disabled={saving || !preview || parseValor(preview?.amountStr) <= 0}>
          {saving ? 'Salvando...' : 'Confirmar lançamento'}
        </button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Digite ou dite uma frase. Ex.: <em>"mercado 230 pessoal"</em>.
        </p>

        <div className="relative">
          <textarea className="field-input min-h-[76px] pr-14 resize-none" placeholder="Fale ou escreva aqui..." value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus />
          {SpeechRecognition && (
            <button type="button" onClick={ouvindo ? pararVoz : ouvirVoz} className={`absolute right-2 top-2 w-11 h-11 rounded-full flex items-center justify-center text-xl ${ouvindo ? 'bg-rose-500 text-white animate-pulse' : 'bg-marca-soft text-marca-dark'}`} aria-label="Ditar por voz">🎤</button>
          )}
        </div>

        {!texto && (
          <div className="flex flex-wrap gap-2">
            {exemplos.map((ex) => (
              <button key={ex} type="button" onClick={() => setTexto(ex)} className="chip bg-slate-100 border-slate-200 text-slate-500">{ex}</button>
            ))}
          </div>
        )}

        {!SpeechRecognition && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
            O microfone dentro do app não é suportado neste navegador, mas você pode usar o microfone do teclado do celular normalmente.
          </p>
        )}

        <button type="button" onClick={() => { onClose(); onDetailed?.() }} className="w-full text-sm text-marca font-semibold py-1">
          Prefiro preencher em detalhe (data, parcelas...) →
        </button>

        {preview && (
          <div className="border-t border-slate-200 pt-4 space-y-4 fade-up">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Prévia — confira e ajuste</p>

            <TypeToggle value={preview.type} onChange={(type) => setPrev({ type, method: type === 'income' && preview.method === 'credito' ? 'pix' : preview.method })} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Valor</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">R$</span>
                  <input inputMode="decimal" className="field-input pl-9 font-semibold" placeholder="0,00" value={preview.amountStr} onChange={(e) => setPrev({ amountStr: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="field-label">Categoria</label>
                <select className="field-input" value={preview.categoryId ?? ''} onChange={(e) => setPrev({ categoryId: Number(e.target.value) })}>
                  {cats.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
            </div>

            <div>
              <label className="field-label">Descrição</label>
              <input className="field-input" value={preview.description} onChange={(e) => setPrev({ description: e.target.value })} />
            </div>

            <div>
              <label className="field-label">Escopo</label>
              <ScopeToggle value={preview.scope} onChange={onScope} />
            </div>

            <div>
              <label className="field-label">Forma de pagamento</label>
              <MethodPicker value={preview.method} onChange={(method) => setPrev({ method })} />
            </div>

            {usaConta && accounts?.length > 0 && (
              <div>
                <label className="field-label">{preview.type === 'income' ? 'Entrou na conta' : 'Debitar da conta'}</label>
                <select className="field-input" value={preview.accountId ?? accounts[0].id} onChange={(e) => setPrev({ accountId: e.target.value })}>
                  {accounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
                </select>
              </div>
            )}

            {usaCartao && (
              cards?.length > 0 ? (
                <div>
                  <label className="field-label">Cartão (à vista)</label>
                  <select className="field-input" value={preview.cardId ?? cards[0].id} onChange={(e) => setPrev({ cardId: e.target.value })}>
                    {cards.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">Para parcelar, use "preencher em detalhe".</p>
                </div>
              ) : (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">Nenhum cartão cadastrado — cadastre em Carteira → Cartões.</p>
              )
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
