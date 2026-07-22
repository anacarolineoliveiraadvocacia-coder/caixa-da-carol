import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, uid, CORES } from '../db.js'
import { categoriasDoEscopo } from '../utils/categorias.js'
import { ScopeToggle, EmptyState } from '../components/ui.jsx'
import Modal from '../components/Modal.jsx'

const EMOJIS = ['📦', '🍽️', '🏠', '🚗', '💊', '🎉', '📚', '💇', '⚖️', '📄', '💻', '📶', '📣', '🚕', '🖇️', '🧮', '💰', '🎁', '🐶', '👶', '✈️', '📱', '🛒', '⚡']

export default function Categorias() {
  const [scope, setScope] = useState('pessoal')
  const [catForm, setCatForm] = useState(null) // {id?, name, emoji, scope}
  const [subDe, setSubDe] = useState(null) // categoria para gerenciar subs

  const categories = useLiveQuery(() => db.categories.toArray(), [], null)

  if (!categories) return <div className="p-4 text-slate-400">Carregando...</div>

  const lista = categoriasDoEscopo(categories, scope)

  async function excluirCategoria(c) {
    const n = await db.transactions.where('categoryId').equals(c.id).count()
    const msg =
      n > 0
        ? `A categoria "${c.name}" tem ${n} lançamento(s). Excluir mesmo assim? Os lançamentos ficarão sem categoria.`
        : `Excluir a categoria "${c.name}"?`
    if (confirm(msg)) {
      await db.categories.delete(c.id)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <ScopeToggle value={scope} onChange={setScope} />

      {lista.length === 0 ? (
        <EmptyState icon="🏷️" title="Nenhuma categoria neste escopo" />
      ) : (
        <div className="space-y-2.5">
          {lista.map((c) => (
            <div key={c.id} className="card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl shrink-0">
                  {c.emoji || '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-700 truncate">{c.name}</p>
                  <p className="text-xs text-slate-400">
                    {c.subs?.length ? `${c.subs.length} subcategorias` : 'sem subcategorias'}
                  </p>
                </div>
                <button
                  onClick={() => setSubDe(c)}
                  className="chip bg-slate-100 border-slate-200 text-slate-600"
                >
                  Subcategorias
                </button>
              </div>
              {c.subs?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {c.subs.map((s) => (
                    <span key={s.id} className="chip bg-slate-50 border-slate-200 text-slate-500 text-xs py-1">
                      {s.name}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-4 mt-2.5 pt-2.5 border-t border-slate-100 text-xs">
                <button onClick={() => setCatForm(c)} className="text-slate-400">editar</button>
                <button onClick={() => excluirCategoria(c)} className="text-slate-400">excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setCatForm({ name: '', emoji: '📦', scope })}
        className="btn btn-lg btn-ghost w-full border border-dashed border-slate-300"
      >
        + Nova categoria
      </button>

      <CategoriaForm
        cat={catForm}
        onClose={() => setCatForm(null)}
        maxOrdem={lista.length}
      />
      <SubcategoriasModal cat={subDe} onClose={() => setSubDe(null)} />
    </div>
  )
}

function CategoriaForm({ cat, onClose, maxOrdem }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('📦')

  useEffect(() => {
    if (cat) {
      setName(cat.name || '')
      setEmoji(cat.emoji || '📦')
    }
  }, [cat])

  async function salvar() {
    if (!name.trim()) return alert('Informe o nome da categoria.')
    if (cat.id) {
      await db.categories.update(cat.id, { name: name.trim(), emoji })
    } else {
      await db.categories.add({
        name: name.trim(),
        emoji,
        scope: cat.scope,
        subs: [],
        ativo: true,
        ordem: maxOrdem,
        isDefault: false
      })
    }
    onClose()
  }

  return (
    <Modal
      open={!!cat}
      onClose={onClose}
      title={cat?.id ? 'Editar categoria' : 'Nova categoria'}
      footer={<button className="btn btn-lg btn-primary w-full" onClick={salvar}>Salvar</button>}
    >
      <div className="space-y-4">
        <div>
          <label className="field-label">Nome</label>
          <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Pets, Viagem..." autoFocus />
        </div>
        <div>
          <label className="field-label">Ícone</label>
          <div className="grid grid-cols-8 gap-1.5">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`h-10 rounded-lg text-xl flex items-center justify-center ${
                  emoji === e ? 'bg-marca-soft ring-2 ring-marca' : 'bg-slate-100'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

function SubcategoriasModal({ cat, onClose }) {
  const [subs, setSubs] = useState([])
  const [nova, setNova] = useState('')

  useEffect(() => {
    if (cat) setSubs(cat.subs ? [...cat.subs] : [])
  }, [cat])

  async function persistir(novasSubs) {
    setSubs(novasSubs)
    await db.categories.update(cat.id, { subs: novasSubs })
  }

  async function adicionar() {
    const nome = nova.trim()
    if (!nome) return
    await persistir([...subs, { id: uid(), name: nome }])
    setNova('')
  }

  async function remover(id) {
    await persistir(subs.filter((s) => s.id !== id))
  }

  async function renomear(id, nome) {
    await persistir(subs.map((s) => (s.id === id ? { ...s, name: nome } : s)))
  }

  return (
    <Modal
      open={!!cat}
      onClose={onClose}
      title={cat ? `Subcategorias · ${cat.name}` : ''}
      footer={<button className="btn btn-lg btn-primary w-full" onClick={onClose}>Concluir</button>}
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            className="field-input flex-1"
            placeholder="Nova subcategoria"
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && adicionar()}
          />
          <button onClick={adicionar} className="btn px-4 btn-primary">Add</button>
        </div>
        {subs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">
            Nenhuma subcategoria ainda. Ex.: Internet, Telefonia, Uber...
          </p>
        ) : (
          <div className="space-y-2">
            {subs.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <input
                  className="field-input flex-1 py-2"
                  value={s.name}
                  onChange={(e) => renomear(s.id, e.target.value)}
                />
                <button onClick={() => remover(s.id)} className="w-9 h-9 rounded-lg bg-rose-50 text-rose-500 shrink-0">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
