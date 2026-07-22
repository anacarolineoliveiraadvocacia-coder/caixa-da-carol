import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, CORES } from '../db.js'
import { formatBRL, parseValor, formatNumberBR } from '../utils/format.js'
import { saldoConta, saldoTotalContas } from '../utils/finance.js'
import { EmptyState } from '../components/ui.jsx'
import Modal from '../components/Modal.jsx'

export default function ContasBancarias() {
  const [form, setForm] = useState(null)
  const accounts = useLiveQuery(() => db.accounts.orderBy('ordem').toArray(), [], null)
  const txs = useLiveQuery(() => db.transactions.toArray(), [], null)

  const dados = useMemo(() => {
    if (!accounts || !txs) return null
    const comSaldo = accounts.map((a) => ({ ...a, saldo: saldoConta(a, txs) }))
    return { comSaldo, total: saldoTotalContas(accounts, txs) }
  }, [accounts, txs])

  async function excluir(a) {
    const n = await db.transactions.where('accountId').equals(a.id).count()
    const msg = n > 0
      ? `A conta "${a.name}" tem ${n} lançamento(s) vinculado(s). Ao excluir, eles ficarão sem conta (não afetam mais nenhum saldo). Continuar?`
      : `Excluir a conta "${a.name}"?`
    if (!confirm(msg)) return
    await db.transaction('rw', db.accounts, db.transactions, async () => {
      if (n > 0) {
        const vinc = await db.transactions.where('accountId').equals(a.id).toArray()
        for (const t of vinc) await db.transactions.update(t.id, { accountId: null })
      }
      await db.accounts.delete(a.id)
    })
  }

  if (!dados) return <div className="p-4 text-slate-400">Carregando...</div>

  return (
    <div className="p-4 space-y-4">
      <div className="card bg-gradient-to-br from-sky-500 to-blue-600 text-white border-0">
        <p className="text-sky-50 text-sm">💰 Saldo total das contas</p>
        <p className="text-3xl font-bold mt-1">{formatBRL(dados.total)}</p>
        <p className="text-sky-100/80 text-xs mt-1">
          {dados.comSaldo.length} {dados.comSaldo.length === 1 ? 'conta' : 'contas'}
        </p>
      </div>

      {dados.comSaldo.length === 0 ? (
        <EmptyState
          icon="🏦"
          title="Nenhuma conta cadastrada"
          subtitle="Cadastre sua conta para o Pix e o débito descontarem do saldo."
        />
      ) : (
        <div className="space-y-2.5">
          {dados.comSaldo.map((a) => (
            <div key={a.id} className="card flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0" style={{ background: (a.cor || '#0ea5e9') + '22' }}>
                <span style={{ color: a.cor || '#0ea5e9' }}>🏦</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-700 truncate">{a.name}</p>
                <p className="text-xs text-slate-400">Saldo inicial {formatBRL(a.saldoInicial)}</p>
                <div className="flex gap-3 mt-1 text-xs">
                  <button onClick={() => setForm(a)} className="text-slate-400">editar</button>
                  <button onClick={() => excluir(a)} className="text-slate-400">excluir</button>
                </div>
              </div>
              <p className={`font-bold text-lg shrink-0 ${a.saldo < 0 ? 'text-rose-500' : 'text-slate-700'}`}>
                {formatBRL(a.saldo)}
              </p>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setForm({ name: '', saldoInicial: '', cor: CORES[0] })}
        className="btn btn-lg btn-ghost w-full border border-dashed border-slate-300"
      >
        + Nova conta
      </button>

      <p className="text-xs text-slate-400 text-center px-4">
        O saldo é o saldo inicial mais as entradas e menos as saídas pagas por Pix ou débito
        vinculadas à conta.
      </p>

      <ContaForm conta={form} onClose={() => setForm(null)} proximaOrdem={dados.comSaldo.length} />
    </div>
  )
}

function ContaForm({ conta, onClose, proximaOrdem }) {
  const [name, setName] = useState('')
  const [saldo, setSaldo] = useState('')
  const [cor, setCor] = useState(CORES[0])

  useEffect(() => {
    if (conta) {
      setName(conta.name || '')
      setSaldo(conta.saldoInicial != null && conta.saldoInicial !== '' ? formatNumberBR(conta.saldoInicial) : '')
      setCor(conta.cor || CORES[0])
    }
  }, [conta])

  async function salvar() {
    if (!name.trim()) return alert('Informe o nome da conta.')
    const saldoInicial = parseValor(saldo)
    if (conta.id) {
      await db.accounts.update(conta.id, { name: name.trim(), saldoInicial, cor })
    } else {
      await db.accounts.add({
        name: name.trim(),
        saldoInicial,
        cor,
        ativo: true,
        ordem: proximaOrdem,
        createdAt: new Date().toISOString()
      })
    }
    onClose()
  }

  return (
    <Modal
      open={!!conta}
      onClose={onClose}
      title={conta?.id ? 'Editar conta' : 'Nova conta'}
      footer={<button className="btn btn-lg btn-primary w-full" onClick={salvar}>Salvar</button>}
    >
      <div className="space-y-4">
        <div>
          <label className="field-label">Nome da conta</label>
          <input className="field-input" placeholder="Ex.: Nubank, Caixa, Itaú..." value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="field-label">Saldo atual (inicial)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">R$</span>
            <input inputMode="decimal" className="field-input pl-11 font-semibold" placeholder="0,00" value={saldo} onChange={(e) => setSaldo(e.target.value)} />
          </div>
          <p className="text-xs text-slate-400 mt-1">O quanto tem na conta hoje. A partir daqui o app soma e subtrai.</p>
        </div>
        <div>
          <label className="field-label">Cor</label>
          <div className="flex flex-wrap gap-2">
            {CORES.map((c) => (
              <button key={c} type="button" onClick={() => setCor(c)} className={`w-8 h-8 rounded-full ${cor === c ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`} style={{ background: c }} />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
