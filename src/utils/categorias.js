// Funcoes puras para lidar com a lista de categorias vinda do DB

export function categoriasDoEscopo(categories, scope) {
  return (categories || [])
    .filter((c) => c.scope === scope && c.ativo !== false)
    .sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99) || a.name.localeCompare(b.name))
}

export function acharCategoria(categories, categoryId) {
  return (categories || []).find((c) => c.id === categoryId) || null
}

export function nomeCategoria(categories, categoryId, fallback = 'Outros') {
  return acharCategoria(categories, categoryId)?.name || fallback
}

export function emojiCategoria(categories, categoryId, fallback = '📦') {
  return acharCategoria(categories, categoryId)?.emoji || fallback
}

export function nomeSub(categories, categoryId, subId, fallback = '') {
  if (!subId) return fallback
  const c = acharCategoria(categories, categoryId)
  return c?.subs?.find((s) => s.id === subId)?.name || fallback
}

// Encontra categoria por nome dentro de um escopo (para o parser/migracao)
export function acharCategoriaPorNome(categories, scope, nome) {
  const alvo = (nome || '').toLowerCase()
  return (
    (categories || []).find(
      (c) => c.scope === scope && c.name.toLowerCase() === alvo
    ) || null
  )
}
