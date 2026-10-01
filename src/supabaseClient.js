import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY, syncConfigured } from './config.js'

// Só cria o cliente se as chaves estiverem configuradas.
// Enquanto não estiver, o app funciona 100% local (como antes).
export const supabase = syncConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null

export { syncConfigured }
