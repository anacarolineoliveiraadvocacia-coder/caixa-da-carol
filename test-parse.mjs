import { interpretarTexto } from './src/utils/parse.js'

const casos = [
  // escopo filho
  'escola do filho 850',
  'pediatra 300 filho',
  'fralda 90',
  'uniforme escolar 180 filho',
  'natação do filho 250',
  'brinquedo 75 filho crédito',
  'creche 600',
  'lanche da escola 40',
  // continuam funcionando
  'mercado 230 pessoal',
  'recebi 1500 honorários escritório pix',
  'uber 32 no pix',
  'oab anuidade 800 crédito',
  'farmácia 45,90 débito',
  'recebi 3.000 salário pessoal',
  'aluguel 1.250,00 pessoal'
]

for (const c of casos) {
  const r = interpretarTexto(c)
  console.log(`"${c}"\n  -> ${r.type === 'income' ? 'ENTRADA' : 'saida'} R$${r.amount} | escopo=${r.scope} | cat=${r.category} | ${r.method} | desc="${r.description}"\n`)
}
