import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db.js'
import { formatBRL, monthKey, parseValor, formatNumberBR, todayISO } from '../utils/format.js'
import { afetaConta } from '../utils/finance.js'
import { categoriasDoEscopo } from '../utils/categorias.js'
import { ScopeToggle, MethodPicker, EmptyState, ScopeBadge } from '../components/ui.jsx'
import Modal from '../components/Modal.jsx'
import MonthSwitcher from '../components/MonthSwitcher.jsx'

// Dias entre hoje e o vencimento (dueDay) no mes selecionado
function diasAteVencimento(monthK, dueDay) {
  const [y, m] = monthK.split('-').map(Number)
  const venc = new Date(y, m - 1, dueDay)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  venc.setHours(0, 0, 0, 0)
  return Math.round((venc - hoje) / 86400000)
}

export default function ContasFixas() {
  const [mes, setMes] = useState(monthKey(new Date()))
  const [formOpen, setFormOpen] = useState(false)
  const [editando, setEditando] = useState(null)

  const bills = useLiveQuery(() => db.fixedBills.toArray(), [], null)
  const pagamentos = useLiveQuery(() => db.billPayments.where('monthKey').equals(mes).toArray(), [mes], null)

  const lista = useMemo(() => {
    if (!bills || !pagamentos) return null
    const pagos = new Set(pagamentos.map((p) => p.billId))
    return bills
      .filter((b) => b.active !== false)
      .map((b) => ({
        ...b,
        pago: pagos.has(b.id),
        pagamento: pagamentos.find((p) => p.billId === b.id),
        dias: diasAteVencimento(mes, b.dueDay)
      }))
      .sort((a, b) => a.dueDay - b.dueDay)
  }, [bills, pagamentos, mes])

  async function marcarPago(bill) {
    const [y, m] = mes.split('-').map(Number)
    const dataVenc = `${y}-${String(m).padStart(2, '0')}-${String(bill.dueDay).padStart(2, '0')}`
    await db.transaction('rw', db.transactions, db.billPayments, async () => {
      const txId = await db.transactions.add({
        amount: Number(bill.amount),
        description: bill.name,
        date: dataVenc,
        scope: bill.scope,
        type: 'expense',
        category: bill.category || 'Outros',
        categoryId: bill.categoryId ?? null,
        subcategoryId: bill.subcategoryId ?? null,
        subcategory: bill.subcategory ?? null,
        method: bill.method || 'pix',
        accountId: afetaConta(bill.method) ? bill.accountId ?? null : null,
        cardId: null,
        invoiceMonth: null,
        billKey: `${bill.id}:${mes}`,
        createdAt: new Date().toISOString()
      })
      await db.billPayments.add({
        billId: bill.id,
        monthKey: mes,
        paidDate: todayISO(),
        transactionId: txId
      })
    })
  }

  async function desmarcarPago(item) {
    if (!item.pagamento) return
    await db.transaction('rw', db.transactions, db.billPayments, async () => {
      if (item.pagamento.transactionId) {
        await db.transactions.delete(item.pagamento.transactionId)
      }
      await db.billPayments.delete(item.pagamento.id)
    })
  }

  async function excluirConta(bill) {
    if (confirm(`Excluir a conta fixa "${bill.name}"? Os lançamentos já feitos serão mantidos.`)) {
      await db.fixedBills.delete(bill.id)
    }
  }

  if (!lista) return <div className="p-4 text-slate-400">Carregando...</div>

  const totalMes = lista.reduce((a, b) => a + Number(b.amount), 0)
  const pagoMes = lista.filter((l) => l.pago).reduce((a, b) => a + Number(b.amount), 0)

  return (
    <div className="p-4 space-y-4">
      <MonthSwitcher value={mes} onChange={setMes} />

      <div className="card flex justify-between items-center">
        <div>
          <p className="text-xs text-slate-400">Total de contas fixas</p>
          <p className="text-lg font-bold text-slate-700">{formatBRL(totalMes)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Já pago</p>
          <p className="text-lg font-bold text-emerald-600">{formatBRL(pagoMes)}</p>
        </div>
      </div>

      {lista.length === 0 ? (
        <EmptyState
          icon="📅"
          title="Nenhuma conta fixa"
          subtitle="Cadastre aluguel, OAB, assinaturas..."
        />
      ) : (
        <div className="space-y-2.5">
          {lista.map((item) => {
            const vencendo = !item.pago && item.dias >= 0 && item.dias <= 3
            const atrasada = !item.pago && item.dias < 0
            return (
              <div
                key={item.id}
                className={`card ${
                  atrasada
                    ? 'border-rose-200 bg-rose-50/50'
                    : vencendo
                    ? 'border-amber-200 bg-amber-50/50'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-700 truncate">{item.name}</p>
                      <ScopeBadge scope={item.scope} />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm font-bold text-slate-600">{formatBRL(item.amount)}</p>
                      <span className="text-xs text-slate-400">• vence dia {item.dueDay}</span>
                    </div>
                    {!item.pago && atrasada && (
                      <p className="text-xs font-semibold text-rose-600 mt-1">
                        ⚠️ Atrasada há {Math.abs(item.dias)} dia(s)
                      </p>
                    )}
                    {vencendo && (
                      <p className="text-xs font-semibold text-amber-600 mt-1">
                        ⏰ {item.dias === 0 ? 'Vence hoje!' : `Vence em ${item.dias} dia(s)`}
                      </p>
                    )}
                  </div>
                  {item.pago ? (
                    <button
                      onClick={() => desmarcarPago(item)}
                      className="chip bg-emerald-50 text-emerald-600 border-emerald-200 shrink-0"
                    >
                      ✓ Pago
                    </button>
                  ) : (
                    <button
                      onClick={() => marcarPago(item)}
                      className="btn px-4 py-2 bg-marca text-white text-sm shrink-0"
                    >
                      Pagar
                    </button>
                  )}
                </div>
                <div className="flex gap-4 mt-2 pt-2 border-t border-slate-100 text-xs">
                  <button onClick={() => { setEditando(item); setFormOpen(true) }} className="text-slate-400">
                    editar
                  </button>
                  <button onClick={() => excluirConta(item)} className="text-slate-400">
                    excluir
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <button
        onClick={() => { setEditando(null); setFormOpen(true) }}
        className="btn btn-lg btn-ghost w-full border border-dashed border-slate-300"
      >
        + Nova conta fixa
      </button>

      <FixedBillForm
        open={formOpen}
        initial={editando}
        onClose={() => { setFormOpen(false); setEditando(null) }}
      />
    </div>
  )
}

const emptyBill = {
  name: '',
  amount: '',
  dueDay: 5,
  scope: 'pessoal',
  categoryId: null,
  method: 'pix',
  accountId: null
}

function FixedBillForm({ open, onClose, initial }) {
  const [form, setForm] = useState(emptyBill)
  const categories = useLiveQuery(() => db.categories.toArray(), [], null)
  const accounts = useLiveQuery(() => db.accounts.orderBy('ordem').toArray(), [], null)

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? { ...emptyBill, ...initial, amount: formatNumberBR(initial.amount) }
          : emptyBill
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial])

  const cats = categoriasDoEscopo(categories, form.scope)

  // garante categoria valida
  useEffect(() => {
    if (!open || cats.length === 0) return
    if (!cats.find((c) => c.id === form.categoryId)) {
      setForm((f) => ({ ...f, categoryId: cats[0].id }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form.scope, categories])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  function onScope(scope) {
    const lista = categoriasDoEscopo(categories, scope)
    set({ scope, categoryId: lista[0]?.id || null })
  }

  async function salvar() {
    const amount = parseValor(form.amount)
    if (!form.name.trim()) return alert('Informe o nome da conta.')
    if (amount <= 0) return alert('Informe um valor válido.')
    const dueDay = Math.min(28, Math.max(1, Number(form.dueDay) || 1))
    const category = cats.find((c) => c.id === form.categoryId)?.name || 'Outros'
    const record = {
      name: form.name.trim(),
      amount,
      dueDay,
      scope: form.scope,
      categoryId: form.categoryId,
      category,
      method: form.method,
      accountId: afetaConta(form.method) && form.accountId ? Number(form.accountId) : null,
      active: true
    }
    if (initial?.id) await db.fixedBills.update(initial.id, record)
    else await db.fixedBills.add({ ...record, createdAt: new Date().toISOString() })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial?.id ? 'Editar conta fixa' : 'Nova conta fixa'}
      footer={
        <button className="btn btn-lg btn-primary w-full" onClick={salvar}>
          Salvar
        </button>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="field-label">Nome</label>
          <input
            className="field-input"
            placeholder="Ex.: Aluguel, Anuidade OAB..."
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Valor</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">R$</span>
              <input
                inputMode="decimal"
                className="field-input pl-9 font-semibold"
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => set({ amount: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="field-label">Dia do vencimento</label>
            <input
              type="number"
              min="1"
              max="28"
              className="field-input"
              value={form.dueDay}
              onChange={(e) => set({ dueDay: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="field-label">Escopo</label>
          <ScopeToggle value={form.scope} onChange={onScope} />
        </div>
        <div>
          <label className="field-label">Categoria</label>
          <select
            className="field-input"
            value={form.categoryId ?? ''}
            onChange={(e) => set({ categoryId: Number(e.target.value) })}
          >
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.emoji ? c.emoji + ' ' : ''}{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Forma de pagamento padrão</label>
          <MethodPicker value={form.method} onChange={(method) => set({ method })} />
        </div>
        {afetaConta(form.method) && accounts?.length > 0 && (
          <div>
            <label className="field-label">Debitar da conta</label>
            <select className="field-input" value={form.accountId ?? ''} onChange={(e) => set({ accountId: e.target.value || null })}>
              <option value="">(não vincular)</option>
              {accounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
            </select>
          </div>
        )}
      </div>
    </Modal>
  )
}
