import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Si todavía no configuraste .env, la app arranca igual con los datos de demo.
export const hayBackend = Boolean(url && key)

export const supabase = hayBackend ? createClient(url, key) : null
