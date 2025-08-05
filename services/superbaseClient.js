// services/superbaseClient.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY // or SERVICE_ROLE_KEY if private
);

module.exports = supabase;
