# 💰 Caixa da Carol

App financeiro pessoal, **mobile-first** e **offline**, para separar e enxergar dois mundos numa conta só: **vida pessoal (CPF)** e **escritório (CNPJ)** — pensado para advogada autônoma.

Tudo fica **no seu próprio aparelho** (IndexedDB). Sem login, sem servidor, sem mensalidade. Instalável como app (PWA) na tela inicial do celular.

---

## ✨ O que ele faz

- **Lançamentos** de entradas e saídas com escopo obrigatório (Pessoal/Escritório), categoria e forma de pagamento (dinheiro, Pix, débito, crédito).
- **Lançamento rápido por voz/texto**: escreva ou dite *"mercado 230 pessoal"* e o app entende valor, tipo, escopo e categoria, mostrando uma prévia para confirmar. Botão de microfone dentro do app (Web Speech API).
- **Dashboard mensal**: saldo, pizza Pessoal × Escritório, barras dos últimos 12 meses, ranking de categorias e comparativo com o mês anterior.
- **Contas fixas recorrentes**: aparecem como pendentes todo mês; ao marcar "pago" viram lançamento automático. Alerta para contas vencendo em até 3 dias.
- **Regra dos potes**: divide cada entrada em Meu salário / Caixa do escritório / Reserva, com registro automático do aporte na reserva.
- **Reserva de emergência**: meta, barra de progresso, histórico e projeção de quando você atinge a meta.
- **Fatura de cartão de crédito**: compras no crédito se agrupam por fatura, com datas de fechamento e vencimento configuráveis.
- **Relatório mensal imprimível (PDF)**: resumo Pessoal × Escritório para decidir quando vale a pena separar as contas CPF/CNPJ.
- **Backup manual** em JSON (restaurável) e exportação em CSV (abre no Excel).

---

## 🚀 Como rodar no seu computador

> Você precisa do **Node.js** instalado. Se ainda não tem, baixe a versão **LTS** em <https://nodejs.org> e instale (Avançar → Avançar → Concluir).
> *(No seu computador o Node já foi configurado nesta pasta.)*

Abra o **Terminal / PowerShell** nesta pasta e rode:

```bash
npm install      # só na primeira vez (instala as dependências)
npm run dev      # inicia o app em modo desenvolvimento
```

Vai aparecer um endereço como `http://localhost:5173`. Abra no navegador.

Para gerar a versão final (otimizada):

```bash
npm run build    # cria a pasta dist/ pronta para publicar
npm run preview  # testa a versão final localmente
```

---

## 📲 Como instalar no celular (mesma rede)

1. Rode `npm run dev -- --host` no computador.
2. Ele vai mostrar um endereço "Network" (ex.: `http://192.168.0.10:5173`).
3. No celular, **conectado no mesmo Wi-Fi**, abra esse endereço no navegador.
4. No menu do navegador escolha **"Adicionar à tela inicial"**.

> Para usar de qualquer lugar (fora de casa), publique de graça na Vercel ou Netlify — veja abaixo.

---

## ☁️ Como publicar de graça (para acessar de qualquer celular)

### Opção A — Vercel (recomendado, pelo site)

1. Crie uma conta grátis em <https://vercel.com> (pode entrar com o Google).
2. Suba este projeto para o **GitHub** (crie um repositório e envie a pasta), **ou** use o botão *"Deploy"* importando a pasta.
3. Na Vercel, clique em **Add New → Project** e selecione o repositório.
4. Confirme as configurações (ela detecta Vite sozinha):
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Clique em **Deploy**. Em ~1 minuto você recebe um link tipo `https://caixa-da-carol.vercel.app`.
6. Abra o link no celular → menu do navegador → **Adicionar à tela inicial**. Pronto: vira um app. ✅

### Opção B — Netlify (arrastar e soltar)

1. Rode `npm run build` no computador (gera a pasta `dist`).
2. Acesse <https://app.netlify.com/drop>.
3. **Arraste a pasta `dist`** para a área indicada. Ele publica na hora e te dá um link.

> Dica: sempre que mudar o app, rode `npm run build` de novo e reenvie/atualize o deploy.

---

## 🔒 Seus dados e backup

- Tudo é salvo **apenas neste dispositivo/navegador** (IndexedDB). Nada vai para a internet.
- **Faça backup**: em **Mais → Ajustes → Backup**, toque em *"Backup (JSON)"* de tempos em tempos e guarde o arquivo (ex.: no Google Drive).
- Trocou de celular ou limpou o navegador? Use *"Restaurar backup (JSON)"* para trazer tudo de volta.

---

## 🛠️ Tecnologias

React + Vite + TailwindCSS · Dexie.js (IndexedDB) · Recharts · vite-plugin-pwa (manifest + service worker).
