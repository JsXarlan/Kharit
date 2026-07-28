/*
 * Kharit — Fase 4 (Supabase)
 * Protege las páginas internas (las que tienen .sidebar): sin sesión activa,
 * redirige a login.html. Con sesión, muestra el email real y activa "Cerrar sesión".
 * Nota: al ser 100% cliente (sin SSR), hay un breve parpadeo del contenido antes
 * de la redirección si no hay sesión — limitación conocida de esta fase.
 */

document.addEventListener('DOMContentLoaded', function () {
    protegerPagina();
});

function protegerPagina() {
    var esPaginaInterna = document.querySelector('.sidebar');
    if (!esPaginaInterna) {
        return;
    }

    var prefijo = obtenerPrefijoRutaAssets('auth-guard.js');

    window.supabaseClient.auth.getSession().then(function (resultado) {
        var session = resultado.data.session;

        if (!session) {
            window.location.href = prefijo + 'login.html';
            return;
        }

        var spanUsuario = document.getElementById('nombreUsuarioSesion');
        if (spanUsuario) {
            spanUsuario.textContent = session.user.email;
        }

        var enlaceCerrarSesion = document.getElementById('enlaceCerrarSesion');
        if (enlaceCerrarSesion) {
            enlaceCerrarSesion.addEventListener('click', function (evento) {
                evento.preventDefault();
                window.supabaseClient.auth.signOut().then(function () {
                    window.location.href = prefijo + 'login.html';
                });
            });
        }
    });
}

/* Deduce el prefijo relativo ("" en raíz, "../" en subcarpetas) a partir
   de la ruta con la que se cargó este mismo script. */
function obtenerPrefijoRutaAssets(nombreArchivo) {
    var script = document.querySelector('script[src$="' + nombreArchivo + '"]');
    var src = script.getAttribute('src');
    return src.replace('assets/js/' + nombreArchivo, '');
}
