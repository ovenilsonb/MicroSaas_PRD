import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidos no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testando conexão com Supabase...');
  console.log('URL:', supabaseUrl);
  
  const { data, error } = await supabase.from('formulas').select('name').limit(1);
  
  if (error) {
    console.error('Erro ao conectar ao Supabase:', error.message);
  } else {
    console.log('Conexão bem-sucedida!');
    console.log('Dados recebidos:', data);
  }
}

testConnection();
