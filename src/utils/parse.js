import { parseValor } from './format.js'

// Palavras que indicam ENTRADA (receita)
const PALAVRAS_ENTRADA = [
  'recebi', 'recebido', 'recebimento', 'receber', 'entrada', 'ganhei',
  'honorario', 'honorarios', 'honorário', 'honorários', 'salario', 'salário',
  'pagamento de', 'me pagou', 'cliente pagou', 'rendimento', 'reembolso',
  'restituicao', 'restituição', 'deposito', 'depósito', 'pró-labore', 'pro labore', 'prolabore'
]

// Palavras que indicam ESCRITORIO
const PALAVRAS_ESCRITORIO = [
  'escritorio', 'escritório', 'trabalho', 'cliente', 'processo', 'oab',
  'honorario', 'honorarios', 'honorário', 'honorários', 'custas', 'peticao',
  'petição', 'audiencia', 'audiência', 'juridico', 'jurídico', 'advocacia', 'cnpj'
]
const PALAVRAS_PESSOAL = ['pessoal', 'casa', 'cpf', 'minha', 'meu']

// Palavras EXPLICITAS de escopo (tem prioridade sobre o contexto)
const EXPLICITO_PESSOAL = ['pessoal', 'cpf']
const EXPLICITO_ESCRITORIO = ['escritorio', 'escritório', 'cnpj']
const EXPLICITO_FILHO = ['filho', 'filha', 'menino', 'menina', 'crianca', 'criança', 'bebe', 'bebê']

// Palavras de CONTEXTO que indicam o escopo FILHO
const PALAVRAS_FILHO = [
  'filho', 'filha', 'menino', 'menina', 'crianca', 'criança', 'bebe', 'bebê',
  'escola', 'colegio', 'colégio', 'creche', 'babá', 'baba', 'pediatra',
  'fralda', 'fraldas', 'brinquedo', 'brinquedos', 'mensalidade escolar',
  'material escolar', 'uniforme'
]

// Formas de pagamento
const METODO_MAP = [
  { id: 'pix', kws: ['pix'] },
  { id: 'dinheiro', kws: ['dinheiro', 'especie', 'espécie', 'em maos', 'em mãos'] },
  { id: 'debito', kws: ['debito', 'débito', 'no debito', 'cartao de debito'] },
  { id: 'credito', kws: ['credito', 'crédito', 'cartao', 'cartão', 'no credito', 'parcelado'] }
]

// Categorias por palavra-chave
const CAT_PESSOAL = [
  { cat: 'Alimentação', kws: ['mercado', 'supermercado', 'feira', 'restaurante', 'ifood', 'lanche', 'padaria', 'almoco', 'almoço', 'janta', 'comida', 'cafe', 'café', 'acougue', 'açougue', 'hortifruti'] },
  { cat: 'Moradia', kws: ['aluguel', 'condominio', 'condomínio', 'luz', 'energia', 'agua', 'água', 'internet', 'gas', 'gás', 'iptu', 'faxina', 'diarista', 'movel', 'móvel'] },
  { cat: 'Transporte', kws: ['uber', '99', 'gasolina', 'combustivel', 'combustível', 'onibus', 'ônibus', 'metro', 'metrô', 'estacionamento', 'pedagio', 'pedágio', 'ipva', 'mecanico', 'mecânico', 'oficina'] },
  { cat: 'Saúde', kws: ['farmacia', 'farmácia', 'remedio', 'remédio', 'medico', 'médico', 'consulta', 'dentista', 'exame', 'plano de saude', 'academia', 'psicologo', 'psicólogo', 'terapia'] },
  { cat: 'Lazer', kws: ['cinema', 'bar', 'balada', 'netflix', 'spotify', 'viagem', 'passeio', 'show', 'festa', 'jogo', 'streaming'] },
  { cat: 'Educação', kws: ['curso', 'faculdade', 'livro', 'escola', 'aula', 'pos', 'pós', 'mensalidade', 'ingles', 'inglês'] },
  { cat: 'Beleza', kws: ['salao', 'salão', 'cabelo', 'cabeleireiro', 'manicure', 'unha', 'depilacao', 'depilação', 'estetica', 'estética', 'maquiagem', 'sobrancelha'] }
]
const CAT_FILHO = [
  { cat: 'Escola', kws: ['escola', 'colegio', 'colégio', 'mensalidade', 'material escolar', 'uniforme', 'apostila', 'caderno', 'excursao', 'excursão', 'transporte escolar', 'van'] },
  { cat: 'Saúde', kws: ['pediatra', 'medico', 'médico', 'consulta', 'farmacia', 'farmácia', 'remedio', 'remédio', 'vacina', 'dentista', 'fono', 'terapia', 'psicologo', 'psicólogo', 'plano de saude'] },
  { cat: 'Alimentação', kws: ['mercado', 'lanche', 'lanchinho', 'comida', 'restaurante', 'ifood', 'merenda', 'leite', 'papinha'] },
  { cat: 'Vestuário', kws: ['roupa', 'roupas', 'calcado', 'calçado', 'tenis', 'tênis', 'sapato', 'meia', 'casaco'] },
  { cat: 'Cuidados', kws: ['baba', 'babá', 'creche', 'fralda', 'fraldas', 'higiene', 'shampoo', 'sabonete', 'lenco', 'lenço'] },
  { cat: 'Atividades', kws: ['futebol', 'natacao', 'natação', 'esporte', 'ingles', 'inglês', 'idioma', 'musica', 'música', 'judo', 'judô', 'balé', 'bale', 'danca', 'dança'] },
  { cat: 'Lazer', kws: ['passeio', 'brinquedo', 'festa', 'aniversario', 'aniversário', 'cinema', 'parque', 'streaming', 'jogo'] }
]

const CAT_ESCRITORIO = [
  { cat: 'OAB/Anuidades', kws: ['oab', 'anuidade', 'carteira', 'inscricao', 'inscrição'] },
  { cat: 'Custas processuais', kws: ['custas', 'custa', 'protocolo', 'guia', 'darf judicial', 'preparo', 'diligencia', 'diligência', 'oficial de justica', 'oficial de justiça'] },
  { cat: 'Software/Assinaturas', kws: ['software', 'assinatura', 'sistema', 'projuris', 'astrea', 'saas', 'nuvem', 'dominio', 'domínio', 'hospedagem', 'chatgpt', 'claude', 'canva'] },
  { cat: 'Marketing', kws: ['marketing', 'anuncio', 'anúncio', 'trafego', 'tráfego', 'instagram', 'facebook', 'meta ads', 'google ads', 'social media', 'panfleto', 'cartao de visita', 'cartão de visita', 'site'] },
  { cat: 'Deslocamento', kws: ['deslocamento', 'viagem cliente', 'uber trabalho', 'estacionamento forum', 'estacionamento fórum', 'forum', 'fórum', 'tribunal', 'combustivel trabalho'] },
  { cat: 'Material', kws: ['papel', 'material', 'cartorio', 'cartório', 'toner', 'impressao', 'impressão', 'caneta', 'pasta', 'copia', 'cópia', 'xerox', 'correio', 'sedex', 'selo'] },
  { cat: 'Impostos', kws: ['imposto', 'das', 'iss', 'inss', 'darf', 'simples nacional', 'carne leao', 'carnê leão', 'tributo', 'contador', 'contabilidade'] }
]

function contains(text, kws) {
  return kws.some((k) => text.includes(k))
}

function detectMethod(text) {
  for (const m of METODO_MAP) {
    if (contains(text, m.kws)) return m.id
  }
  return null
}

function detectCategory(text, scope) {
  const table =
    scope === 'escritorio' ? CAT_ESCRITORIO : scope === 'filho' ? CAT_FILHO : CAT_PESSOAL
  for (const row of table) {
    if (contains(text, row.kws)) return row.cat
  }
  return 'Outros'
}

// Extrai o primeiro valor monetario do texto
function extractAmount(text) {
  // Procura numeros como 1.500,50 / 1500,50 / 1500 / 230 / R$ 45
  // 1a alternativa: com separador de milhar (exige ao menos um grupo .ddd)
  // 2a alternativa: inteiro (qualquer tamanho) com decimal opcional
  const regex = /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/gi
  const matches = [...text.matchAll(regex)]
  if (matches.length === 0) return { amount: 0, raw: null }
  // Pega o maior match textual (geralmente o valor real, evita pegar "99" do uber)
  let best = matches[0]
  for (const m of matches) {
    if (parseValor(m[1]) > parseValor(best[1])) best = m
  }
  return { amount: parseValor(best[1]), raw: best[0] }
}

// Monta descricao limpa a partir do texto original
function buildDescription(original, rawAmount) {
  let desc = original
  if (rawAmount) desc = desc.replace(rawAmount, ' ')
  // Remove palavras de controle soltas
  const remover = ['pessoal', 'escritorio', 'escritório', 'filho', 'filha', 'no', 'na', 'pix',
    'debito', 'débito', 'credito', 'crédito', 'cartao', 'cartão',
    'dinheiro', 'reais', 'real', 'r$']
  const words = desc.split(/\s+/).filter((w) => {
    const lw = w.toLowerCase().replace(/[.,]/g, '')
    return lw && !remover.includes(lw)
  })
  // remove preposicoes soltas que sobraram no fim (ex.: "Escola do")
  const preposicoes = ['de', 'do', 'da', 'dos', 'das', 'em', 'com', 'pra', 'para', 'a', 'o']
  while (words.length > 0 && preposicoes.includes(words[words.length - 1].toLowerCase())) {
    words.pop()
  }
  let out = words.join(' ').trim()
  out = out.replace(/\s{2,}/g, ' ')
  if (out.length === 0) return ''
  return out.charAt(0).toUpperCase() + out.slice(1)
}

/**
 * Interpreta um texto livre e retorna um lancamento sugerido.
 * Ex.: "mercado 230 pessoal" -> despesa, pessoal, Alimentacao, 230
 *      "recebi 1500 honorarios escritorio" -> receita, escritorio, 1500
 */
export function interpretarTexto(input) {
  const original = (input || '').trim()
  const text = original.toLowerCase()

  const { amount, raw } = extractAmount(text)

  // Tipo
  const isIncome = contains(text, PALAVRAS_ENTRADA)
  const type = isIncome ? 'income' : 'expense'

  // Escopo: primeiro as palavras explicitas ("filho", "escritorio", "pessoal"),
  // depois o contexto (ex.: "pediatra" -> filho, "honorarios" -> escritorio)
  let scope
  if (contains(text, EXPLICITO_FILHO)) scope = 'filho'
  else if (contains(text, EXPLICITO_ESCRITORIO)) scope = 'escritorio'
  else if (contains(text, EXPLICITO_PESSOAL)) scope = 'pessoal'
  else if (contains(text, PALAVRAS_ESCRITORIO)) scope = 'escritorio'
  else if (contains(text, PALAVRAS_FILHO)) scope = 'filho'
  else scope = 'pessoal' // padrao

  // Categoria (para receita, categoria e menos relevante)
  const category = type === 'income'
    ? (scope === 'escritorio' ? 'Outros' : 'Outros')
    : detectCategory(text, scope)

  // Metodo
  const method = detectMethod(text) || 'pix'

  const description = buildDescription(original, raw) || (isIncome ? 'Recebimento' : 'Gasto')

  return {
    amount,
    type,
    scope,
    category,
    method,
    description,
    confidence: amount > 0 ? 'ok' : 'sem-valor'
  }
}
