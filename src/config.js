// Configuração da sincronização na nuvem (Supabase).
// A chave "anon" é pública por natureza — a segurança vem das regras (RLS)
// do Supabase, que garantem que cada pessoa só enxerga os próprios dados.
// Preencha os dois valores com os dados do SEU projeto Supabase:
//   Project Settings → API → "Project URL" e "anon public".
export const SUPABASE_URL = 'https://pcbdrqzilassvexydrqy.supabase.co'
export const SUPABASE_ANON_KEY = 'sb_publishable_ECtb284T5e9znfTWWl9Vww_6wv8pjVK'

export function syncConfigured() {
  return (
    SUPABASE_URL.startsWith('https://') &&
    !SUPABASE_URL.includes('SEU-PROJETO') &&
    SUPABASE_ANON_KEY.length > 20 &&
    !SUPABASE_ANON_KEY.includes('COLE_AQUI')
  )
}
