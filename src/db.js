import Dexie from 'dexie'

export const db = new Dexie('caixa-da-carol')

// --- Versao 1 (schema original) ---
db.version(1).stores({
  transactions: '++id, date, type, scope, category, method, invoiceMonth, billKey',
  fixedBills: '++id, name, scope, dueDay, active',
  billPayments: '++id, billId, monthKey, [billId+monthKey]',
  reserveMovements: '++id, date, type',
  settings: 'id'
})

// --- Versao 2: contas, cartoes, categorias, parcelas ---
db.version(2).stores({
  transactions:
    '++id, date, type, scope, category, method, invoiceMonth, billKey, accountId, cardId, categoryId, subcategoryId, purchaseId',
  fixedBills: '++id, name, scope, dueDay, active',
  billPayments: '++id, billId, monthKey, [billId+monthKey]',
  reserveMovements: '++id, date, type',
  settings: 'id',
  accounts: '++id, ordem, ativo',
  cards: '++id, ordem, ativo',
  categories: '++id, scope, ordem',
  invoicePayments: '++id, cardId, monthKey, [cardId+monthKey]'
})

// --- Detecção de mudanças locais (para a sincronização na nuvem) ---
// applyingRemote: quando true, as mudanças vieram da nuvem e NÃO devem gerar
// um novo envio (evita eco). onLocalChange: callback que o sync registra.
export const syncGuard = { applyingRemote: false, onLocalChange: null }

function notifyLocalChange() {
  if (syncGuard.applyingRemote) return
  try {
    localStorage.setItem('cxc_local_updated_at', String(Date.now()))
  } catch (e) {
    /* ignore */
  }
  if (syncGuard.onLocalChange) {
    try { syncGuard.onLocalChange() } catch (e) { /* ignore */ }
  }
}

const SYNC_TABLES = [
  'transactions', 'fixedBills', 'billPayments', 'reserveMovements', 'settings',
  'accounts', 'cards', 'categories', 'invoicePayments'
]
for (const name of SYNC_TABLES) {
  const t = db.table(name)
  t.hook('creating', function () { notifyLocalChange() })
  t.hook('updating', function () { notifyLocalChange() })
  t.hook('deleting', function () { notifyLocalChange() })
}

export const DEFAULT_SETTINGS = {
  id: 1,
  potes: { salario: 60, escritorio: 20, reserva: 20 },
  reservaMeta: 10000,
  cartao: { diaFechamento: 25, diaVencimento: 5 },
  migratedV2: false,
  seededScopes: []
}

// Categorias/metodos/escopos ------------------------------------------------

export const METODOS = [
  { id: 'dinheiro', label: 'Dinheiro', emoji: '💵' },
  { id: 'pix', label: 'Pix', emoji: '⚡' },
  { id: 'debito', label: 'Débito', emoji: '💳' },
  { id: 'credito', label: 'Crédito', emoji: '🧾' }
]

// Metodos que descontam de uma conta bancaria
export const METODOS_CONTA = ['pix', 'debito']

// Escopos (mundos) do app. Para adicionar outro, basta incluir aqui
// e criar as categorias padrao em DEFAULT_CATEGORIES.
export const ESCOPOS = [
  { id: 'pessoal', label: 'Pessoal', color: '#0ea5e9', soft: '#e0f2fe' },
  { id: 'escritorio', label: 'Escritório', color: '#7c3aed', soft: '#ede9fe' },
  { id: 'filho', label: 'Filho', color: '#f59e0b', soft: '#fef3c7' }
]

export function escopoInfo(id) {
  return ESCOPOS.find((e) => e.id === id) || ESCOPOS[0]
}

export function escopoLabel(id) {
  return escopoInfo(id).label
}

export function escopoCor(id) {
  return escopoInfo(id).color
}

export const CORES = [
  '#0ea5e9', '#7c3aed', '#0f766e', '#f59e0b', '#ef4444',
  '#10b981', '#ec4899', '#6366f1', '#f97316', '#14b8a6', '#64748b'
]

// gera id curto para subcategorias
export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

function cat(name, emoji, subs) {
  return { name, emoji, subs: subs.map((s) => ({ id: uid(), name: s })) }
}

// Categorias padrao (com subcategorias) por escopo
export const DEFAULT_CATEGORIES = {
  pessoal: [
    cat('Alimentação', '🍽️', ['Mercado', 'Restaurante/iFood', 'Padaria', 'Outros']),
    cat('Moradia', '🏠', ['Aluguel', 'Condomínio', 'Luz', 'Água', 'Internet', 'Gás', 'Outros']),
    cat('Transporte', '🚗', ['Uber/99', 'Combustível', 'Ônibus/Metrô', 'Estacionamento', 'Manutenção', 'Outros']),
    cat('Saúde', '💊', ['Farmácia', 'Consulta', 'Plano de saúde', 'Academia', 'Outros']),
    cat('Lazer', '🎉', ['Streaming', 'Bar/Restaurante', 'Viagem', 'Outros']),
    cat('Educação', '📚', ['Curso', 'Livros', 'Mensalidade', 'Outros']),
    cat('Beleza', '💇', ['Salão', 'Manicure', 'Estética', 'Outros']),
    cat('Outros', '📦', [])
  ],
  escritorio: [
    cat('OAB/Anuidades', '⚖️', ['Anuidade', 'Inscrição', 'Outros']),
    cat('Custas processuais', '📄', ['Custas', 'Diligências', 'Guias', 'Outros']),
    cat('Software/Assinaturas', '💻', ['Sistema jurídico', 'Nuvem/Domínio', 'IA/ChatGPT', 'Outros']),
    cat('Internet/Telefonia', '📶', ['Internet', 'Telefonia', 'Celular', 'Outros']),
    cat('Marketing', '📣', ['Tráfego pago', 'Social media', 'Material gráfico', 'Site', 'Outros']),
    cat('Deslocamento', '🚕', ['Uber/99', 'Combustível', 'Estacionamento', 'Fórum/Tribunal', 'Outros']),
    cat('Material', '🖇️', ['Papelaria', 'Impressões', 'Correios', 'Cartório', 'Outros']),
    cat('Impostos', '🧮', ['DAS/Simples', 'ISS', 'INSS', 'Contador', 'Outros']),
    cat('Outros', '📦', [])
  ],
  filho: [
    cat('Escola', '🎒', ['Mensalidade', 'Material escolar', 'Uniforme', 'Transporte escolar', 'Excursão', 'Outros']),
    cat('Saúde', '🩺', ['Pediatra', 'Plano de saúde', 'Farmácia/Remédios', 'Vacinas', 'Dentista', 'Terapias', 'Outros']),
    cat('Alimentação', '🍎', ['Mercado', 'Lanches', 'Restaurante', 'Outros']),
    cat('Vestuário', '👕', ['Roupas', 'Calçados', 'Outros']),
    cat('Cuidados', '🧸', ['Babá', 'Creche', 'Higiene', 'Fraldas', 'Outros']),
    cat('Atividades', '⚽', ['Esportes', 'Idiomas', 'Música', 'Outros']),
    cat('Lazer', '🎈', ['Passeios', 'Brinquedos', 'Festas', 'Streaming', 'Outros']),
    cat('Outros', '📦', [])
  ]
}

// Seed + migracao -----------------------------------------------------------

export async function ensureSeed() {
  try {
    let settings = await db.settings.get(1)
    if (!settings) {
      await db.settings.put(DEFAULT_SETTINGS)
      settings = DEFAULT_SETTINGS
    }

    // Seed de categorias por escopo (roda tambem quando um novo escopo e criado
    // numa instalacao antiga, sem duplicar o que ja existe)
    const catCount = await db.categories.count()
    let seededScopes = settings.seededScopes
    if (!Array.isArray(seededScopes)) {
      // Instalacao antiga: se ja havia categorias, assume os dois escopos originais
      seededScopes = catCount > 0 ? ['pessoal', 'escritorio'] : []
    }
    const faltando = Object.keys(DEFAULT_CATEGORIES).filter((s) => !seededScopes.includes(s))
    if (faltando.length > 0) {
      const linhas = []
      for (const scope of faltando) {
        DEFAULT_CATEGORIES[scope].forEach((c, i) => {
          linhas.push({
            name: c.name,
            emoji: c.emoji,
            scope,
            subs: c.subs,
            ativo: true,
            ordem: i,
            isDefault: true
          })
        })
      }
      await db.categories.bulkAdd(linhas)
      const novos = [...seededScopes, ...faltando]
      await db.settings.update(1, { seededScopes: novos })
      settings = { ...settings, seededScopes: novos }
    }

    // Migracao v1 -> v2 (uma unica vez)
    if (!settings.migratedV2) {
      await migrarV2(settings)
      await db.settings.update(1, { migratedV2: true })
    }
  } catch (e) {
    console.error('Erro no seed/migracao', e)
  }
}

async function migrarV2(settings) {
  // Mapeia categoria (string+escopo) -> categoryId, criando o que faltar
  const cats = await db.categories.toArray()
  const mapa = new Map()
  for (const c of cats) mapa.set(`${c.scope}||${c.name}`, c.id)

  const txs = await db.transactions.toArray()
  const semCategoria = txs.filter((t) => !t.categoryId)
  const paraCriar = new Map()
  for (const t of semCategoria) {
    const nome = t.category || 'Outros'
    const chave = `${t.scope || 'pessoal'}||${nome}`
    if (!mapa.has(chave) && !paraCriar.has(chave)) {
      paraCriar.set(chave, { name: nome, scope: t.scope || 'pessoal' })
    }
  }
  for (const [chave, info] of paraCriar) {
    const id = await db.categories.add({
      name: info.name,
      emoji: '📦',
      scope: info.scope,
      subs: [],
      ativo: true,
      ordem: 99,
      isDefault: false
    })
    mapa.set(chave, id)
  }

  // Cria um cartao a partir das configuracoes antigas se houver compras no credito
  const credito = txs.filter((t) => t.method === 'credito' && t.type === 'expense')
  let cardId = null
  if (credito.length > 0) {
    const numCards = await db.cards.count()
    if (numCards === 0) {
      const totalCredito = credito.reduce((a, t) => a + Number(t.amount || 0), 0)
      cardId = await db.cards.add({
        name: 'Meu cartão',
        cor: '#0f766e',
        limiteTotal: Math.ceil(totalCredito / 500) * 500 || 1000,
        usoInicial: 0,
        diaFechamento: settings.cartao?.diaFechamento || 25,
        diaVencimento: settings.cartao?.diaVencimento || 5,
        ativo: true,
        ordem: 0,
        createdAt: new Date().toISOString()
      })
    }
  }

  // Atualiza transacoes com categoryId (e cardId nas de credito)
  await db.transaction('rw', db.transactions, async () => {
    for (const t of semCategoria) {
      const chave = `${t.scope || 'pessoal'}||${t.category || 'Outros'}`
      const patch = { categoryId: mapa.get(chave) || null }
      if (cardId && t.method === 'credito' && t.type === 'expense' && !t.cardId) {
        patch.cardId = cardId
      }
      await db.transactions.update(t.id, patch)
    }
  })
}

// Helpers de configuracoes --------------------------------------------------

export async function getSettings() {
  const s = await db.settings.get(1)
  return s || DEFAULT_SETTINGS
}

export async function saveSettings(patch) {
  const current = await getSettings()
  const merged = { ...current, ...patch, id: 1 }
  await db.settings.put(merged)
  return merged
}
