/*
 * Kharit — Fase 4 (Supabase)
 * Cliente único de Supabase, reutilizado por auth-guard.js y main.js.
 * La Publishable key es segura de exponer en el navegador: la protección
 * real de los datos la da Row Level Security (RLS), activado en las 16 tablas.
 */

var KHARIT_SUPABASE_URL = 'https://gccnkyxbcflyizalnauk.supabase.co';
var KHARIT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_gcN_0gsORfJ7Pb07X1CuLg_AxKHLyQt';

/* URL pública del sitio en GitHub Pages, usada para construir redirectTo
   en flujos de auth (recuperación de contraseña, confirmación de registro). */
var KHARIT_SITE_URL = 'https://jsxarlan.github.io/Kharit/';

window.supabaseClient = supabase.createClient(
    KHARIT_SUPABASE_URL,
    KHARIT_SUPABASE_PUBLISHABLE_KEY
);
