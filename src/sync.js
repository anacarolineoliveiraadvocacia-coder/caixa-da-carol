import { supabase } from './supabaseClient.js'
import { syncGuard } from './db.js'
import { coletarSnapshot, aplicarSnapshot, snapshotTemDados } from './utils/backup.js'

// Identificador deste aparelho (para ignorar o eco dos próprios envios)
function getDeviceId() {
  try {
    let id = localStorage.getItem('cxc_device_id')
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36)
      localStorage.setItem('cxc_device_id', id)
    }
    return id
  } catch (e) {
    return 'dev-' + Math.random().toString(36).slice(2)
  }
}
const DEVICE_ID = getDeviceId()

function getLocalTs() {
  try { return Number(localStorage.getItem('cxc_local_updated_at')) || 0 } catch (e) { return 0 }
}
function setLocalTs(ms) {
  try { localStorage.setItem('cxc_local_updated_at', String(ms)) } catch (e) { /* ignore */ }
}
function getSyncedUser() {
  try { return localStorage.getItem('cxc_synced_user') || null } catch (e) { return null }
}
function setSyncedUser(id) {
  try { localStorage.setItem('cxc_synced_user', id) } catch (e) { /* ignore */ }
}

// --- Estado observável (para a UI) ---
let state = { status: supabase ? 'logged_out' : 'off', user: null, lastSyncAt: 0, error: null }
const listeners = new Set()
function setState(patch) {
  state = { ...state, ...patch }
  listeners.forEach((l) => { try { l(state) } catch (e) {} })
}
export function subscribeSync(cb) {
  listeners.add(cb)
  cb(state)
  return () => listeners.delete(cb)
}
export function getSyncState() { return state }
export function syncDisponivel() { return !!supabase }

let currentUser = null
let started = false
let channel = null
let pushTimer = null

// --- Envio (push) ---
async function push() {
  if (!supabase || !currentUser) return
  try {
    setState({ status: 'syncing' })
    const dados = await coletarSnapshot()
    const updatedAt = getLocalTs() || Date.now()
    const payload = { dados, updatedAt, deviceId: DEVICE_ID }
    const { error } = await supabase
      .from('app_state')
      .upsert({ user_id: currentUser.id, data: payload, updated_at: new Date().toISOString() })
    if (error) throw error
    setState({ status: 'synced', lastSyncAt: Date.now(), error: null })
  } catch (e) {
    setState({ status: 'error', error: e.message || String(e) })
  }
}

function schedulePush() {
  if (!currentUser || !started) return
  if (pushTimer) clearTimeout(pushTimer)
  setState({ status: 'syncing' })
  pushTimer = setTimeout(() => { pushTimer = null; push() }, 1500)
}

// --- Recebimento (pull) ---
async function pull(cloudPayload) {
  if (!cloudPayload?.dados) return
  // guarda uma cópia local de segurança antes de substituir
  try {
    const atual = await coletarSnapshot()
    localStorage.setItem('cxc_presync_backup', JSON.stringify({ quando: Date.now(), dados: atual }))
  } catch (e) { /* ignore */ }
  await aplicarSnapshot(cloudPayload.dados, { fromRemote: true })
  setLocalTs(cloudPayload.updatedAt || Date.now())
  setState({ status: 'synced', lastSyncAt: Date.now(), error: null })
}

async function fetchCloud() {
  const { data, error } = await supabase
    .from('app_state')
    .select('data')
    .eq('user_id', currentUser.id)
    .maybeSingle()
  if (error) throw error
  return data?.data || null
}

// Decide a direção na hora do login
async function reconcile() {
  try {
    setState({ status: 'syncing', error: null })
    const cloud = await fetchCloud()
    const localTs = getLocalTs()
    const cloudHasData = cloud && snapshotTemDados(cloud.dados)
    const jaAdotou = getSyncedUser() === currentUser.id

    if (cloudHasData) {
      if (!jaAdotou) {
        // Aparelho novo entrando numa conta que já tem dados -> adota a nuvem
        await pull(cloud)
      } else if ((cloud.updatedAt || 0) > localTs) {
        await pull(cloud)
      } else if (localTs > (cloud.updatedAt || 0)) {
        await push()
      } else {
        setState({ status: 'synced', lastSyncAt: Date.now() })
      }
    } else {
      // Nuvem vazia -> envia o que tem neste aparelho
      await push()
    }
    setSyncedUser(currentUser.id)
    subscribeRealtime()
    started = true
  } catch (e) {
    setState({ status: 'error', error: e.message || String(e) })
    started = true
  }
}

function subscribeRealtime() {
  if (!supabase || !currentUser) return
  teardownRealtime()
  channel = supabase
    .channel('app_state_' + currentUser.id)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'app_state', filter: `user_id=eq.${currentUser.id}` },
      async (payload) => {
        const p = payload.new?.data
        if (!p || p.deviceId === DEVICE_ID) return
        if ((p.updatedAt || 0) <= getLocalTs()) return
        await pull(p)
      }
    )
    .subscribe()
}

function teardownRealtime() {
  if (channel) { try { supabase.removeChannel(channel) } catch (e) {} channel = null }
}

async function onVisible() {
  if (document.visibilityState !== 'visible' || !currentUser || !supabase) return
  try {
    const cloud = await fetchCloud()
    if (cloud && (cloud.updatedAt || 0) > getLocalTs()) await pull(cloud)
  } catch (e) { /* silencioso */ }
}

function handleSession(session) {
  if (session?.user) {
    currentUser = session.user
    started = false
    setState({ user: { id: session.user.id, email: session.user.email } })
    reconcile()
  } else {
    currentUser = null
    started = false
    teardownRealtime()
    setState({ status: 'logged_out', user: null })
  }
}

// --- API pública ---
export async function initSync() {
  if (!supabase) { setState({ status: 'off' }); return }
  syncGuard.onLocalChange = () => schedulePush()
  supabase.auth.onAuthStateChange((_event, session) => handleSession(session))
  try {
    const { data } = await supabase.auth.getSession()
    handleSession(data.session)
  } catch (e) {
    setState({ status: 'error', error: e.message })
  }
  window.addEventListener('visibilitychange', onVisible)
  window.addEventListener('online', () => { if (currentUser) reconcile() })
}

export async function entrar(email, senha) {
  if (!supabase) throw new Error('Sincronização não configurada.')
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
  if (error) throw error
  return data
}

export async function cadastrar(email, senha) {
  if (!supabase) throw new Error('Sincronização não configurada.')
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: senha })
  if (error) throw error
  // Se o projeto exigir confirmação de e-mail, não vem sessão
  return { precisaConfirmarEmail: !data.session, data }
}

export async function sair() {
  if (!supabase) return
  teardownRealtime()
  await supabase.auth.signOut()
}

export async function sincronizarAgora() {
  if (!currentUser) return
  await reconcile()
}
