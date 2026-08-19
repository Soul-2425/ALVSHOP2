import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://enqjpyktgbwvkpfwvgfu.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_cQVnKlG3QMMMg8tzETC9Sw_DNj5O1ht'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
