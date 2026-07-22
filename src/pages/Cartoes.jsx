import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, CORES, ESCOPOS } from '../db.js'
import {
  formatBRL, parseValor, formatNumberBR, monthKey, monthKeyLabel,
  formatDataBR, formatDataCurta, todayISO
} from '../utils/format.js'
import { datasFatura } from '../utils/cartao.js'
import {
  usoCartao, disponivelCartao, faturaItens, faturaTotal, paidSetFrom
} from '../utils/finance.js'
import MonthSwitcher from '../components/MonthSwitcher.jsx'
import { EmptyState, ScopeBadge } from '../components/ui.jsx'
import Modal from '../components/Modal.jsx'

export default function Cartoes() {
  const [form, setForm] = useState(null)
  const [aberto, setAberto] = useState(null) // cartao em detalhe

  const cards = useLiveQuery(() => db.cards.orderBy('ordem').toArray(), [], null)
  const txs = useLiveQuery(() => db.transactions.toArray(), [], null)
  const pagamentos = useLiveQuery(() => db.invoicePayments.toArray(), [], null)

  const paidSet = useMemo(() => paidSetFrom(pagamentos || []), [pagamentos])

  if (!cards || !txs || !pagamentos) return <div className="p-4 text-slate-400">Carregando...</div>

  const cardAberto = aberto ? cards.find((c) => c.id === aberto) : null
  if (cardAberto) {
    return (
      <DetalheCartao
        card={cardAberto}
        txs={txs}
        paidSet={paidSet}
        onBack={() => setAberto(null)}
        onEdit={() => setForm(cardAberto)}
      />
    )
  }

  async function excluir(card) {
    const n = await db.transactions.where('cardId').equals(card.id).count()
    const msg = n > 0
      ? `O cartão "${card.name}" tem ${n} lançamento(s). Ao excluir, eles ficarão sem cartão. Continuar?`
      : `Excluir o cartão "${card.name}"?`
    if (!confirm(msg)) return
    await db.transaction('rw', db.cards, db.transactions, db.invoicePayments, async () => {
      const vinc = await db.transactions.where('cardId').equals(card.id).toArray()
      for (const t of vinc) await db.transactions.update(t.id, { cardId: null })
      const pags = await db.invoicePayments.where('cardId').equals(card.id).toArray()
      for (const p of pags) await db.invoicePayments.delete(p.id)
      await db.cards.delete(card.id)
    })
  }

  return (
    <div className="p-4 space-y-4">
      {cards.length === 0 ? (
        <EmptyState
          icon="💳"
          title="Nenhum cartão cadastrado"
          subtitle="Cadastre um cartão para registrar compras e parcelas."
        />
      ) : (
        <div className="space-y-3">
          {cards.map((card) => {
            const uso = usoCartao(card, txs, paidSet)
            const disp = disponivelCartao(card, txs, paidSet)
            const total = Number(card.limiteTotal) || 0
            const pct = total > 0 ? Math.min(100, (uso / total) * 100) : 0
            return (
              <button
                key={card.id}
                onClick={() => setAberto(card.id)}
                className="w-full text-left rounded-2xl p-4 text-white shadow-sm active:scale-[0.99] transition"
                style={{ background: `linear-gradient(135deg, ${card.cor || '#0f766e'}, ${sombra(card.cor)})` }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-lg">{card.name}</p>
                    <p className="text-white/70 text-xs">Fecha dia {card.diaFechamento} · vence dia {card.diaVencimento}</p>
                  </div>
                  <span className="text-2xl">💳</span>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/80">Disponível</span>
                    <span className="font-bold">{formatBRL(disp)}</span>
                  </div>
                  <div className="h-2 bg-white/25 rounded-full overflow-hidden mt-1.5">
                    <div className="h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-white/70 mt-1">
                    <span>Usado {formatBRL(uso)}</span>
                    <span>Limite {formatBRL(total)}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <button
        onClick={() => setForm({ name: '', limiteTotal: '', limiteDisponivel: '', diaFechamento: 25, diaVencimento: 5, cor: CORES[2] })}
        className="btn btn-lg btn-ghost w-full border border-dashed border-slate-300"
      >
        + Novo cartão
      </button>

      <CartaoForm card={form} onClose={() => setForm(null)} proximaOrdem={cards.length} onDelete={excluir} />
    </div>
  )
}

function sombra(hex) {
  // escurece a cor para o gradiente
  if (!hex) return '#0b5450'
  const n = parseInt(hex.slice(1), 16)
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  r = Math.round(r * 0.7); g = Math.round(g * 0.7); b = Math.round(b * 0.7)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

function DetalheCartao({ card, txs, paidSet, onBack, onEdit }) {
  const [mes, setMes] = useState(monthKey(new Date()))
  const [pagarOpen, setPagarOpen] = useState(false)

  const itens = faturaItens(card.id, mes, txs)
  const total = faturaTotal(card.id, mes, txs)
  const paga = paidSet.has(`${card.id}:${mes}`)
  const { fechamento, vencimento } = datasFatura(mes, card.diaFechamento, card.diaVencimento)
  const isoData = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const porEscopo = ESCOPOS.map((e) => ({
    ...e,
    valor: itens.filter((t) => t.scope === e.id).reduce((a, t) => a + Number(t.amount), 0)
  })).filter((e) => e.valor > 0)

  async function desmarcarPaga() {
    const pag = await db.invoicePayments.where('[cardId+monthKey]').equals([card.id, mes]).first()
    if (!pag) return
    await db.transaction('rw', db.invoicePayments, db.transactions, async () => {
      if (pag.transactionId) await db.transactions.delete(pag.transactionId)
      await db.invoicePayments.delete(pag.id)
    })
  }

  return (
    <div>
      <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur px-4 py-3 flex items-center gap-3 border-b border-slate-100">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-500">‹</button>
        <h1 className="font-bold text-slate-700 flex-1 truncate">{card.name}</h1>
        <button onClick={onEdit} className="text-sm text-marca font-semibold">Editar</button>
      </div>

      <div className="p-4 space-y-4">
        <MonthSwitcher value={mes} onChange={setMes} />

        <div className="card text-white border-0" style={{ background: `linear-gradient(135deg, ${card.cor || '#0f766e'}, ${sombra(card.cor)})` }}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white/80 text-sm">Fatura de {monthKeyLabel(mes)}</p>
              <p className="text-3xl font-bold mt-1">{formatBRL(total)}</p>
            </div>
            {paga && <span className="chip bg-white/20 border-white/30 text-white">✓ Paga</span>}
          </div>
          <div className="flex gap-4 mt-3 text-sm">
            <div><p className="text-white/70 text-xs">Fechamento</p><p className="font-semibold">{formatDataBR(isoData(fechamento))}</p></div>
            <div><p className="text-white/70 text-xs">Vencimento</p><p className="font-semibold">{formatDataBR(isoData(vencimento))}</p></div>
          </div>
        </div>

        {porEscopo.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {porEscopo.map((e) => (
              <div key={e.id} className="card p-3">
                <p className="text-xs text-slate-400 truncate">{e.label}</p>
                <p className="text-base font-bold" style={{ color: e.color }}>{formatBRL(e.valor)}</p>
              </div>
            ))}
          </div>
        )}

        {total > 0 && (
          paga ? (
            <button onClick={desmarcarPaga} className="btn btn-lg btn-ghost w-full">Desfazer pagamento</button>
          ) : (
            <button onClick={() => setPagarOpen(true)} className="btn btn-lg btn-primary w-full">Marcar fatura como paga</button>
          )
        )}

        {itens.length === 0 ? (
          <EmptyState icon="🧾" title="Sem compras nesta fatura" subtitle="Compras no crédito aparecem aqui." />
        ) : (
          <div className="card p-0 divide-y divide-slate-100">
            {itens.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3.5">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-700 truncate">{t.description || 'Compra'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">{formatDataCurta(t.purchaseDate || t.date)}</span>
                    <ScopeBadge scope={t.scope} />
                    {t.parcelaTotal > 1 && (
                      <span className="text-[10px] text-slate-400">parcela {t.parcelaNum}/{t.parcelaTotal}</span>
                    )}
                  </div>
                </div>
                <p className="font-bold text-slate-700 shrink-0">{formatBRL(t.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <PagarFaturaModal open={pagarOpen} onClose={() => setPagarOpen(false)} card={card} mes={mes} total={total} />
    </div>
  )
}

function PagarFaturaModal({ open, onClose, card, mes, total }) {
  const accounts = useLiveQuery(() => db.accounts.orderBy('ordem').toArray(), [], null)
  const [contaId, setContaId] = useState('none')

  useEffect(() => {
    if (open && accounts?.length) setContaId(String(accounts[0].id))
  }, [open, accounts])

  async function confirmar() {
    await db.transaction('rw', db.invoicePayments, db.transactions, async () => {
      let transactionId = null
      if (contaId !== 'none') {
        transactionId = await db.transactions.add({
          amount: total,
          description: `Pagamento fatura ${card.name} · ${monthKeyLabel(mes)}`,
          date: todayISO(),
          scope: 'pessoal',
          type: 'expense',
          method: 'debito',
          accountId: Number(contaId),
          cardId: null,
          categoryId: null,
          category: 'Pagamento de fatura',
          isFaturaPgto: true,
          createdAt: new Date().toISOString()
        })
      }
      await db.invoicePayments.add({ cardId: card.id, monthKey: mes, paidDate: todayISO(), transactionId })
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Marcar fatura como paga"
      footer={<button className="btn btn-lg btn-primary w-full" onClick={confirmar}>Confirmar pagamento</button>}
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Total da fatura: <strong className="text-slate-800">{formatBRL(total)}</strong>. Isso libera o limite usado.
        </p>
        <div>
          <label className="field-label">Debitar de qual conta?</label>
          <select className="field-input" value={contaId} onChange={(e) => setContaId(e.target.value)}>
            {(accounts || []).map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
            <option value="none">Só liberar limite (não debitar de conta)</option>
          </select>
          <p className="text-xs text-slate-400 mt-1">
            Debitar reduz o saldo da conta escolhida, sem contar de novo como gasto (já foi contado na compra).
          </p>
        </div>
      </div>
    </Modal>
  )
}

const emptyCard = { name: '', limiteTotal: '', limiteDisponivel: '', diaFechamento: 25, diaVencimento: 5, cor: CORES[2] }

function CartaoForm({ card, onClose, proximaOrdem, onDelete }) {
  const [f, setF] = useState(emptyCard)

  useEffect(() => {
    if (card) {
      if (card.id) {
        const total = Number(card.limiteTotal) || 0
        const disp = total - (Number(card.usoInicial) || 0)
        setF({
          ...card,
          limiteTotal: formatNumberBR(total),
          limiteDisponivel: formatNumberBR(disp)
        })
      } else {
        setF({ ...emptyCard, ...card })
      }
    }
  }, [card])

  const set = (patch) => setF((v) => ({ ...v, ...patch }))

  async function salvar() {
    if (!f.name.trim()) return alert('Informe o nome do cartão.')
    const limiteTotal = parseValor(f.limiteTotal)
    const disp = f.limiteDisponivel === '' ? limiteTotal : parseValor(f.limiteDisponivel)
    const usoInicial = Math.max(0, limiteTotal - disp)
    const rec = {
      name: f.name.trim(),
      limiteTotal,
      usoInicial,
      diaFechamento: Math.min(28, Math.max(1, Number(f.diaFechamento) || 1)),
      diaVencimento: Math.min(28, Math.max(1, Number(f.diaVencimento) || 1)),
      cor: f.cor
    }
    if (card.id) await db.cards.update(card.id, rec)
    else await db.cards.add({ ...rec, ativo: true, ordem: proximaOrdem, createdAt: new Date().toISOString() })
    onClose()
  }

  return (
    <Modal
      open={!!card}
      onClose={onClose}
      title={card?.id ? 'Editar cartão' : 'Novo cartão'}
      footer={
        <div className="space-y-2">
          <button className="btn btn-lg btn-primary w-full" onClick={salvar}>Salvar</button>
          {card?.id && (
            <button className="btn btn-lg btn-ghost w-full text-rose-500" onClick={() => { onClose(); onDelete(card) }}>
              Excluir cartão
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="field-label">Nome do cartão</label>
          <input className="field-input" placeholder="Ex.: Nubank, Itaú Visa..." value={f.name} onChange={(e) => set({ name: e.target.value })} autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Limite total</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">R$</span>
              <input inputMode="decimal" className="field-input pl-9 font-semibold" placeholder="0,00" value={f.limiteTotal} onChange={(e) => set({ limiteTotal: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="field-label">Disponível hoje</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">R$</span>
              <input inputMode="decimal" className="field-input pl-9 font-semibold" placeholder="= limite" value={f.limiteDisponivel} onChange={(e) => set({ limiteDisponivel: e.target.value })} />
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400 -mt-2">
          "Disponível hoje" registra quanto já está comprometido antes de usar o app. Deixe igual ao limite se o cartão estiver zerado.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Dia do fechamento</label>
            <input type="number" min="1" max="28" className="field-input" value={f.diaFechamento} onChange={(e) => set({ diaFechamento: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Dia do vencimento</label>
            <input type="number" min="1" max="28" className="field-input" value={f.diaVencimento} onChange={(e) => set({ diaVencimento: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="field-label">Cor</label>
          <div className="flex flex-wrap gap-2">
            {CORES.map((c) => (
              <button key={c} type="button" onClick={() => set({ cor: c })} className={`w-8 h-8 rounded-full ${f.cor === c ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`} style={{ background: c }} />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
