import { useState } from 'react'
import { useSync } from '../useSync.js'
import { entrar, cadastrar, sair, sincronizarAgora } from '../sync.js'

function horaCurta(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function SyncCard() {
  const sync = useSync()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [modo, setModo] = useState('entrar') // entrar | criar
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  // Sincronização ainda não configurada (chaves não preenchidas)
  if (sync.status === 'off') {
    return (
      <div className="card space-y-2">
        <h3 className="font-bold text-slate-700">☁️ Sincronização na nuvem</h3>
        <p className="text-sm text-slate-500">
          Em preparação. Assim que a nuvem estiver configurada, você poderá entrar aqui e
          ver os mesmos lançamentos no celular e no computador.
        </p>
      </div>
    )
  }

  async function fazerLogin() {
    setMsg('')
    if (!email.trim() || senha.length < 6) {
      setMsg('Informe o e-mail e uma senha de pelo menos 6 caracteres.')
      return
    }
    setBusy(true)
    try {
      if (modo === 'criar') {
        const r = await cadastrar(email, senha)
        if (r.precisaConfirmarEmail) {
          setMsg('✓ Conta criada! Confira seu e-mail para confirmar e depois faça login.')
          setModo('entrar')
        }
      } else {
        await entrar(email, senha)
      }
      setSenha('')
    } catch (e) {
      const m = String(e.message || e)
      if (m.includes('Invalid login')) setMsg('E-mail ou senha incorretos.')
      else if (m.includes('already registered')) setMsg('Esse e-mail já tem conta. Use "Entrar".')
      else setMsg('Erro: ' + m)
    } finally {
      setBusy(false)
    }
  }

  // Logada
  if (sync.user) {
    const statusTxt =
      sync.status === 'syncing' ? '🔄 Sincronizando...'
      : sync.status === 'error' ? '⚠️ ' + (sync.error || 'erro ao sincronizar')
      : `✓ Tudo sincronizado${sync.lastSyncAt ? ' às ' + horaCurta(sync.lastSyncAt) : ''}`
    const cor = sync.status === 'error' ? 'text-rose-600' : sync.status === 'syncing' ? 'text-amber-600' : 'text-emerald-600'
    return (
      <div className="card space-y-3">
        <h3 className="font-bold text-slate-700">☁️ Sincronização na nuvem</h3>
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-sm text-slate-600">Conectada como</p>
          <p className="font-semibold text-slate-800 break-all">{sync.user.email}</p>
          <p className={`text-sm font-medium mt-1 ${cor}`}>{statusTxt}</p>
        </div>
        <p className="text-xs text-slate-400">
          Seus lançamentos aparecem automaticamente em todos os aparelhos onde você entrar
          com esse e-mail.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button className="btn btn-lg btn-ghost" onClick={() => sincronizarAgora()} disabled={sync.status === 'syncing'}>
            Sincronizar agora
          </button>
          <button className="btn btn-lg btn-ghost text-rose-500" onClick={() => sair()}>
            Sair
          </button>
        </div>
      </div>
    )
  }

  // Deslogada: formulário
  return (
    <div className="card space-y-3">
      <h3 className="font-bold text-slate-700">☁️ Sincronização na nuvem</h3>
      <p className="text-xs text-slate-400">
        Entre com o mesmo e-mail e senha em cada aparelho para ver os mesmos lançamentos
        em todos eles.
      </p>

      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
        <button onClick={() => { setModo('entrar'); setMsg('') }} className={`pill-tab ${modo === 'entrar' ? 'bg-white shadow text-slate-700' : 'text-slate-500'}`}>Entrar</button>
        <button onClick={() => { setModo('criar'); setMsg('') }} className={`pill-tab ${modo === 'criar' ? 'bg-white shadow text-slate-700' : 'text-slate-500'}`}>Criar conta</button>
      </div>

      <div>
        <label className="field-label">E-mail</label>
        <input type="email" autoComplete="email" className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
      </div>
      <div>
        <label className="field-label">Senha {modo === 'criar' && <span className="text-slate-400">(mín. 6 caracteres)</span>}</label>
        <input type="password" autoComplete={modo === 'criar' ? 'new-password' : 'current-password'} className="field-input" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••" />
      </div>

      {msg && <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-2">{msg}</p>}

      <button className="btn btn-lg btn-primary w-full" onClick={fazerLogin} disabled={busy}>
        {busy ? 'Aguarde...' : modo === 'criar' ? 'Criar conta e sincronizar' : 'Entrar e sincronizar'}
      </button>

      {modo === 'criar' && (
        <p className="text-xs text-slate-400">
          Dica: use um e-mail e uma senha que você lembre. Vai ser o mesmo login em todos
          os aparelhos.
        </p>
      )}
    </div>
  )
}
