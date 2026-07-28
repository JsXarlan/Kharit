/*
 * Kharit — Fase 4 (Supabase)
 * Perfil: carga y actualiza el registro propio en la tabla 'usuarios'
 * (el email viene de auth.users vía supabaseClient.auth.getUser(), no se
 * guarda en 'usuarios'). El cambio de contraseña ya se conectó en Fase 4a
 * (assets/js/main.js, initCambiarPasswordForm).
 *
 * Nota: el campo "Teléfono" del formulario no tiene columna correspondiente
 * en la tabla 'usuarios' (no se contempló en el esquema inicial); por ahora
 * no se guarda. Habría que añadir esa columna en una futura migración.
 */

document.addEventListener('DOMContentLoaded', function () {
    initPerfil();
});

function initPerfil() {
    var formulario = document.getElementById('formPerfil');
    if (!formulario) {
        return;
    }

    window.supabaseClient.auth.getUser().then(function (resultadoUsuario) {
        var usuario = resultadoUsuario.data.user;
        if (!usuario) {
            return;
        }

        document.getElementById('emailPerfil').value = usuario.email;

        window.supabaseClient
            .from('usuarios')
            .select('*, roles(nombre_rol)')
            .eq('id', usuario.id)
            .single()
            .then(function (resultado) {
                if (resultado.error || !resultado.data) {
                    mostrarMensajeFormulario(formulario, 'No se pudo cargar tu perfil.', 'error');
                    return;
                }
                var perfil = resultado.data;
                document.getElementById('nombreCompletoPerfil').value = perfil.nombre_completo || '';
                document.getElementById('rolPerfil').value = perfil.roles ? perfil.roles.nombre_rol : 'Sin rol asignado';
            });
    });

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        if (!formulario.checkValidity()) {
            formulario.reportValidity();
            return;
        }

        window.supabaseClient.auth.getUser().then(function (resultadoUsuario) {
            var usuario = resultadoUsuario.data.user;
            if (!usuario) {
                return;
            }

            var cambios = {
                nombre_completo: document.getElementById('nombreCompletoPerfil').value
            };

            var boton = document.getElementById('btnGuardarPerfil');
            boton.disabled = true;

            window.supabaseClient.from('usuarios').update(cambios).eq('id', usuario.id).then(function (resultado) {
                boton.disabled = false;
                if (resultado.error) {
                    mostrarMensajeFormulario(formulario, resultado.error.message, 'error');
                    return;
                }
                mostrarMensajeFormulario(formulario, 'Perfil actualizado correctamente.', 'success');
                var spanSesion = document.getElementById('nombreUsuarioSesion');
                if (spanSesion) {
                    spanSesion.textContent = usuario.email;
                }
            });
        });
    });
}
