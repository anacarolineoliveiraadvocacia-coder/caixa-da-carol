import { saldoConta, usoCartao, disponivelCartao, gerarParcelas, paidSetFrom } from './src/utils/finance.js'

// --- Conta bancaria ---
const conta = { id: 1, saldoInicial: 1000 }
const txsConta = [
  { accountId: 1, type: 'income', amount: 500 },   // +500
  { accountId: 1, type: 'expense', amount: 200 },  // -200 (pix)
  { accountId: 2, type: 'expense', amount: 999 },  // outra conta, ignora
  { accountId: 1, type: 'expense', amount: 50, isFaturaPgto: true } // pagamento fatura -50
]
console.log('Saldo conta (esperado 1250):', saldoConta(conta, txsConta))

// --- Cartao: compra parcelada 3x de 300 ---
const card = { id: 10, limiteTotal: 2000, usoInicial: 0, diaFechamento: 25, diaVencimento: 5 }
const parcelas = gerarParcelas({
  card, dateISO: '2026-07-10', total: 300, nParcelas: 3,
  scope: 'pessoal', categoryId: 1, category: 'Alimentação',
  subcategoryId: null, subcategory: null, description: 'Compra teste'
})
console.log('\nParcelas geradas:')
parcelas.forEach(p => console.log(`  ${p.parcelaNum}/${p.parcelaTotal} R$${p.amount} data=${p.date} fatura=${p.invoiceMonth} desc="${p.description}"`))
const soma = parcelas.reduce((a,p)=>a+p.amount,0)
console.log('Soma parcelas (esperado 300):', soma)

// uso do cartao: nenhuma fatura paga -> uso = 300
let paid = paidSetFrom([])
console.log('Uso cartao (esperado 300):', usoCartao(card, parcelas, paid))
console.log('Disponivel (esperado 1700):', disponivelCartao(card, parcelas, paid))

// paga a fatura da 1a parcela (julho/2026) -> libera 100
paid = paidSetFrom([{ cardId: 10, monthKey: parcelas[0].invoiceMonth }])
console.log('\nApos pagar 1a fatura:')
console.log('Uso cartao (esperado 200):', usoCartao(card, parcelas, paid))
console.log('Disponivel (esperado 1800):', disponivelCartao(card, parcelas, paid))

// --- Parcela com resto (100 em 3x) ---
const p2 = gerarParcelas({ card, dateISO:'2026-07-10', total:100, nParcelas:3, scope:'pessoal', categoryId:1, category:'x', description:'y' })
console.log('\n100 em 3x:', p2.map(p=>p.amount).join(' + '), '=', p2.reduce((a,p)=>a+p.amount,0))
