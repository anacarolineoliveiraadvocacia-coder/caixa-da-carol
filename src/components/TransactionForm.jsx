import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db.js'
import { todayISO, parseValor, formatNumberBR, formatBRL } from '../utils/format.js'
import { faturaDaCompra } from '../utils/cartao.js'
import { gerarParcelas, afetaConta } from '../utils/finance.js'
import { categoriasDoEscopo } from '../utils/categorias.js'
import { ScopeToggle, TypeToggle, MethodPicker } from './ui.jsx'
import Modal from './Modal.jsx'

const empty = {
  amount: '',
  description: '',
  date: todayISO(),
  scope: 'pessoal',
  type: 'expense',
  categoryId: null,
  subcategoryId: null,
  method: 'pix',
  accountId: null,
  cardId: null,
  parcelado: false,
  nParcelas: 2
}

export default function TransactionForm({ open, onClose, initial, onSaved }) {
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  const categories = useLiveQuery(() => db.categories.toArray(), [], null)
  const accounts = useLiveQuery(() => db.accounts.orderBy('ordem').toArray(), [], null)
  const cards = useLiveQuery(() => db.cards.orderBy('ordem').toArray(), [], null)

  const editando = !!initial?.id

  useEffect(() => {
    if (!open) return
    if (initial) {
      setForm({
        ...empty,
        ...initial,
        amount: initial.amount != null && initial.amount !== '' ? formatNumberBR(initial.amount) : '',
        parcelado: false,
        nParcelas: 2
      })
    } else {
      setForm(empty)
    }
  }, [open, initial])

  const cats = useMemo(() => categoriasDoEscopo(categories, form.scope), [categories, form.scope])
  const catAtual = cats.find((c) => c.id === form.categoryId) || null
  const subs = catAtual?.subs || []

  // Ajusta categoria padrao ao abrir/trocar escopo quando invalida
  useEffect(() => {
    if (!open || cats.length === 0) return
    if (!cats.find((c) => c.id === form.categoryId)) {
      setForm((f) => ({ ...f, categoryId: cats[0].id, subcategoryId: null }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cats])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const onScope = (scope) => {
    const lista = categoriasDoEscopo(categories, scope)
    const categoryId = lista[0]?.id || null
    set({ scope, categoryId, subcategoryId: null })
  }

  const usaConta = form.type === 'income' || afetaConta(form.method)
  const usaCartao = form.type === 'expense' && form.method === 'credito'

  async function handleSave() {
    const amount = parseValor(form.amount)
    if (amount <= 0) return alert('Informe um valor maior que zero.')
    const category = cats.find((c) => c.id === form.categoryId)?.name || 'Outros'
    const subcategory = subs.find((s) => s.id === form.subcategoryId)?.name || null

    setSaving(true)
    try {
      // Compra no credito (novo lancamento): pode gerar parcelas
      if (usaCartao && !editando) {
        const card = cards?.find((c) => c.id === Number(form.cardId))
        if (!card) {
          alert('Selecione um cartão (ou cadastre um na aba Cartões).')
          setSaving(false)
          return
        }
        const n = form.parcelado ? Math.max(2, Number(form.nParcelas) || 2) : 1
        const recs = gerarParcelas({
          card, dateISO: form.date, total: amount, nParcelas: n,
          scope: form.scope, categoryId: form.categoryId, category,
          subcategoryId: form.subcategoryId, subcategory,
          description: form.description.trim() || 'Compra'
        })
        const ids = await db.transactions.bulkAdd(recs, { allKeys: true })
        onSaved?.({ ...recs[0], id: ids[0], amount, type: 'expense' })
        onClose()
        return
      }

      const record = {
        amount,
        description: form.description.trim(),
        date: form.date,
        scope: form.scope,
        type: form.type,
        method: form.method,
        categoryId: form.categoryId,
        category,
        subcategoryId: form.subcategoryId,
        subcategory,
        accountId: usaConta && form.accountId ? Number(form.accountId) : null,
        cardId: usaCartao && form.cardId ? Number(form.cardId) : null,
        invoiceMonth: usaCartao && form.cardId
          ? faturaDaCompra(form.date, cards.find((c) => c.id === Number(form.cardId))?.diaFechamento || 25)
          : (initial?.invoiceMonth || null),
        createdAt: initial?.createdAt || new Date().toISOString()
      }
      let id
      if (editando) {
        id = initial.id
        await db.transactions.update(id, record)
      } else {
        id = await db.transactions.add(record)
      }
      onSaved?.({ ...record, id })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const semContas = usaConta && (!accounts || accounts.length === 0)
  const semCartoes = usaCartao && (!cards || cards.length === 0)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editando ? 'Editar lançamento' : 'Novo lançamento'}
      footer={
        <button className="btn btn-lg btn-primary w-full" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="field-label">Tipo</label>
          <TypeToggle value={form.type} onChange={(type) => set({ type, method: type === 'income' && form.method === 'credito' ? 'pix' : form.method })} />
        </div>

        <div>
          <label className="field-label">Valor</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">R$</span>
            <input inputMode="decimal" className="field-input pl-11 text-lg font-semibold" placeholder="0,00" value={form.amount} onChange={(e) => set({ amount: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="field-label">Descrição</label>
          <input className="field-input" placeholder="Ex.: Mercado, Honorários João..." value={form.description} onChange={(e) => set({ description: e.target.value })} />
        </div>

        <div>
          <label className="field-label">Escopo (obrigatório)</label>
          <ScopeToggle value={form.scope} onChange={onScope} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Categoria</label>
            <select className="field-input" value={form.categoryId ?? ''} onChange={(e) => set({ categoryId: Number(e.target.value), subcategoryId: null })}>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>{c.emoji ? c.emoji + ' ' : ''}{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Subcategoria</label>
            <select className="field-input" value={form.subcategoryId ?? ''} onChange={(e) => set({ subcategoryId: e.target.value || null })} disabled={subs.length === 0}>
              <option value="">{subs.length === 0 ? '—' : '(nenhuma)'}</option>
              {subs.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="field-label">Data</label>
          <input type="date" className="field-input" value={form.date} onChange={(e) => set({ date: e.target.value })} />
        </div>

        <div>
          <label className="field-label">Forma de pagamento</label>
          <MethodPicker value={form.method} onChange={(method) => set({ method })} />
        </div>

        {/* Conta bancaria */}
        {usaConta && (
          <div>
            <label className="field-label">{form.type === 'income' ? 'Entrou em qual conta?' : 'Debitar de qual conta?'}</label>
            {semContas ? (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
                Nenhuma conta cadastrada. Você pode salvar assim mesmo, mas cadastre uma conta em Carteira → Contas para controlar o saldo.
              </p>
            ) : (
              <select className="field-input" value={form.accountId ?? ''} onChange={(e) => set({ accountId: e.target.value || null })}>
                <option value="">(não vincular a conta)</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Cartao + parcelas */}
        {usaCartao && (
          <div className="space-y-3 bg-slate-50 rounded-xl p-3">
            <div>
              <label className="field-label">Cartão</label>
              {semCartoes ? (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
                  Nenhum cartão cadastrado. Cadastre em Carteira → Cartões.
                </p>
              ) : (
                <select className="field-input" value={form.cardId ?? ''} onChange={(e) => set({ cardId: e.target.value || null })}>
                  <option value="">Selecione o cartão</option>
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
            {!editando && (
              <>
                <div className="flex gap-2 p-1 bg-white rounded-xl border border-slate-200">
                  <button type="button" onClick={() => set({ parcelado: false })} className={`pill-tab ${!form.parcelado ? 'bg-marca text-white' : 'text-slate-500'}`}>À vista</button>
                  <button type="button" onClick={() => set({ parcelado: true })} className={`pill-tab ${form.parcelado ? 'bg-marca text-white' : 'text-slate-500'}`}>Parcelado</button>
                </div>
                {form.parcelado && (
                  <div>
                    <label className="field-label">Número de parcelas</label>
                    <input type="number" min="2" max="48" className="field-input" value={form.nParcelas} onChange={(e) => set({ nParcelas: e.target.value })} />
                    {parseValor(form.amount) > 0 && Number(form.nParcelas) >= 2 && (
                      <p className="text-xs text-slate-500 mt-1">
                        {form.nParcelas}x de {formatBRL(parseValor(form.amount) / Number(form.nParcelas))}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
            {editando && (
              <p className="text-xs text-slate-400">Para mudar parcelamento, exclua e lance novamente.</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
