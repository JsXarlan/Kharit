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

    // usuario_nuevo.html pasó a ser autoregistro público (Fase 4b): un visitante
    // sin sesión debe poder llegar a ella sin que el guard lo redirija a login.
    if (location.pathname.indexOf('usuario_nuevo.html') !== -1) {
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

        ocultarModulosSinPermiso();
    });
}

/* Oculta del sidebar los módulos a los que el usuario actual no tiene permiso
   de ver/gestionar (Fase 4c). RLS ya bloquea los datos igual; esto es solo
   para que la navegación no muestre enlaces que llevan a páginas vacías. */
var MODULOS_SIDEBAR = [
    { patron: 'productos/productos.html', modulo: 'productos', accion: 'ver' },
    { patron: 'compras/compras.html', modulo: 'compras', accion: 'ver' },
    { patron: 'ventas/ventas.html', modulo: 'ventas', accion: 'ver' },
    { patron: 'inventario/inventario_movimientos.html', modulo: 'inventario', accion: 'ver' },
    { patron: 'usuarios/usuarios.html', modulo: 'usuarios', accion: 'gestionar' },
    { patron: 'configuracion/configuracion.html', modulo: 'configuracion', accion: 'gestionar' }
];

function ocultarModulosSinPermiso() {
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar) {
        return;
    }

    MODULOS_SIDEBAR.forEach(function (item) {
        window.supabaseClient.rpc('tiene_permiso', { p_modulo: item.modulo, p_accion: item.accion }).then(function (resultado) {
            if (resultado.error || resultado.data) {
                return;
            }

            var enlaces = sidebar.querySelectorAll('a');
            for (var i = 0; i < enlaces.length; i++) {
                var href = enlaces[i].getAttribute('href') || '';
                if (href.indexOf(item.patron) !== -1) {
                    var li = enlaces[i].closest('li');
                    if (li) {
                        li.style.display = 'none';
                    }
                    break;
                }
            }
        });
    });
}

/* Deduce el prefijo relativo ("" en raíz, "../" en subcarpetas) a partir
   de la ruta con la que se cargó este mismo script. */
function obtenerPrefijoRutaAssets(nombreArchivo) {
    var script = document.querySelector('script[src$="' + nombreArchivo + '"]');
    var src = script.getAttribute('src');
    return src.replace('assets/js/' + nombreArchivo, '');
}
