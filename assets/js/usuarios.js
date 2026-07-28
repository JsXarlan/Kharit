/*
 * Kharit — Fase 4b (Supabase)
 * Módulo Usuarios: listado/edición de usuarios, CRUD de roles, y el
 * autoregistro seguro de usuario_nuevo.html (ver auth-guard.js para la
 * excepción que hace esta última página pública).
 *
 * usuario_nuevo.html ya no crea usuarios como admin (eso requeriría la
 * Secret key en un servidor); ahora es autoregistro vía
 * supabase.auth.signUp(). El trigger handle_new_user crea la fila en
 * 'usuarios' con rol_id = null; las políticas RLS de Fase 4b impiden que
 * un usuario normal se autoasigne un rol, así que los campos Rol/Estado del
 * formulario se ocultan y se ignoran aquí.
 *
 * permisos.html (Fase 4c) guarda permisos reales en 'rol_permiso'; las
 * políticas RLS de las 13 tablas restantes consultan tiene_permiso(modulo,
 * accion) (función SQL creada en Fase 4c) en vez de solo pedir sesión activa.
 */

document.addEventListener('DOMContentLoaded', function () {
    initListadoUsuarios();
    initUsuarioEditar();
    initUsuarioNuevo();

    initListadoRoles();
    initRolNuevo();
    initRolEditar();

    initPermisos();
});

function poblarSelectRoles(select) {
    if (!select) {
        return Promise.resolve();
    }
    return window.supabaseClient
        .from('roles')
        .select('id, nombre_rol')
        .order('nombre_rol')
        .then(function (resultado) {
            if (resultado.error || !resultado.data) {
                return;
            }
            resultado.data.forEach(function (rol) {
                var opcion = document.createElement('option');
                opcion.value = rol.id;
                opcion.textContent = rol.nombre_rol;
                select.appendChild(opcion);
            });
        });
}

/* ---------------------------------------------------------------------- */
/* Usuarios                                                                */
/* ---------------------------------------------------------------------- */

function initListadoUsuarios() {
    var tbody = document.getElementById('tablaUsuariosBody');
    if (!tbody) {
        return;
    }

    var formBusqueda = document.getElementById('formBuscarUsuarios');
    var inputBuscar = document.getElementById('buscarUsuario');

    function cargar() {
        var busqueda = inputBuscar.value.trim();
        var consulta = window.supabaseClient
            .from('usuarios')
            .select('id, nombre_completo, email, estado, roles(nombre_rol)')
            .order('nombre_completo');

        if (busqueda) {
            consulta = consulta.or('nombre_completo.ilike.%' + busqueda + '%,email.ilike.%' + busqueda + '%');
        }

        consulta.then(function (resultado) {
            if (resultado.error) {
                tbody.innerHTML = '<tr><td colspan="5">Error al cargar usuarios: ' + escaparHtml(resultado.error.message) + '</td></tr>';
                return;
            }
            renderizarFilasUsuarios(tbody, resultado.data);
        });
    }

    formBusqueda.addEventListener('submit', function (evento) {
        evento.preventDefault();
        cargar();
    });

    cargar();
}

function renderizarFilasUsuarios(tbody, usuarios) {
    var spanTotal = document.getElementById('totalUsuariosListado');

    if (!usuarios.length) {
        tbody.innerHTML = '<tr><td colspan="5">No se encontraron usuarios.</td></tr>';
        if (spanTotal) {
            spanTotal.textContent = '0';
        }
        return;
    }

    tbody.innerHTML = '';
    usuarios.forEach(function (usuario) {
        var fila = document.createElement('tr');
        fila.innerHTML =
            '<td>' + escaparHtml(usuario.nombre_completo) + '</td>' +
            '<td>' + escaparHtml(usuario.email || '—') + '</td>' +
            '<td>' + escaparHtml(usuario.roles ? usuario.roles.nombre_rol : 'Sin rol asignado') + '</td>' +
            '<td>' + (usuario.estado === 'activo' ? 'Activo' : 'Inactivo') + '</td>' +
            '<td><a href="usuario_editar.html?id=' + usuario.id + '">Editar</a></td>';
        tbody.appendChild(fila);
    });

    if (spanTotal) {
        spanTotal.textContent = String(usuarios.length);
    }
}

function initUsuarioEditar() {
    var formulario = document.getElementById('formUsuarioEditar');
    if (!formulario) {
        return;
    }

    var id = obtenerParametroUrl('id');
    if (!id) {
        mostrarMensajeFormulario(formulario, 'No se especificó un usuario para editar.', 'error');
        return;
    }
    document.getElementById('usuarioId').value = id;

    poblarSelectRoles(document.getElementById('rolUsuario')).then(function () {
        return window.supabaseClient.from('usuarios').select('*').eq('id', id).single();
    }).then(function (resultado) {
        if (resultado.error || !resultado.data) {
            mostrarMensajeFormulario(formulario, 'No se pudo cargar el usuario solicitado.', 'error');
            return;
        }
        var usuario = resultado.data;
        document.getElementById('nombreCompleto').value = usuario.nombre_completo || '';
        document.getElementById('emailUsuario').value = usuario.email || '';
        document.getElementById('rolUsuario').value = usuario.rol_id || '';
        document.getElementById('estadoUsuario').value = usuario.estado;
    });

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        if (!formulario.checkValidity()) {
            formulario.reportValidity();
            return;
        }

        var cambios = {
            nombre_completo: document.getElementById('nombreCompleto').value,
            rol_id: document.getElementById('rolUsuario').value || null,
            estado: document.getElementById('estadoUsuario').value
        };

        var boton = document.getElementById('btnActualizarUsuario');
        boton.disabled = true;

        window.supabaseClient.from('usuarios').update(cambios).eq('id', id).then(function (resultado) {
            boton.disabled = false;
            if (resultado.error) {
                mostrarMensajeFormulario(formulario, resultado.error.message, 'error');
                return;
            }
            window.location.href = 'usuarios.html';
        });
    });
}

/* ---------------------------------------------------------------------- */
/* Autoregistro (usuario_nuevo.html — página pública, ver auth-guard.js)   */
/* ---------------------------------------------------------------------- */

function initUsuarioNuevo() {
    var formulario = document.getElementById('formUsuarioNuevo');
    if (!formulario) {
        return;
    }

    var selectRol = document.getElementById('rolUsuario');
    if (selectRol) {
        var fieldsetRolEstado = selectRol.closest('fieldset');
        if (fieldsetRolEstado) {
            fieldsetRolEstado.style.display = 'none';
        }
    }

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();

        var nombreCompleto = document.getElementById('nombreCompleto').value;
        var email = document.getElementById('emailUsuario').value;
        var password = document.getElementById('passwordTemporal').value;

        if (!nombreCompleto || !email || !password) {
            formulario.reportValidity();
            return;
        }

        var boton = document.getElementById('btnGuardarUsuario');
        boton.disabled = true;

        window.supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { nombre_completo: nombreCompleto },
                emailRedirectTo: KHARIT_SITE_URL + 'login.html'
            }
        }).then(function (resultado) {
            boton.disabled = false;
            if (resultado.error) {
                mostrarMensajeFormulario(formulario, resultado.error.message, 'error');
                return;
            }
            if (!resultado.data.session) {
                mostrarMensajeFormulario(formulario, 'Cuenta creada. Revisa tu correo para confirmarla antes de iniciar sesión.', 'success');
                formulario.reset();
                return;
            }
            window.location.href = '../login.html';
        });
    });
}

/* ---------------------------------------------------------------------- */
/* Roles                                                                   */
/* ---------------------------------------------------------------------- */

function initListadoRoles() {
    var tbody = document.getElementById('tablaRolesBody');
    if (!tbody) {
        return;
    }

    window.supabaseClient.from('roles').select('id, nombre_rol, descripcion').order('nombre_rol').then(function (resultado) {
        if (resultado.error) {
            tbody.innerHTML = '<tr><td colspan="4">Error al cargar roles: ' + escaparHtml(resultado.error.message) + '</td></tr>';
            return;
        }
        renderizarFilasRoles(tbody, resultado.data);
    });
}

function renderizarFilasRoles(tbody, roles) {
    var spanTotal = document.getElementById('totalRolesListado');

    if (!roles.length) {
        tbody.innerHTML = '<tr><td colspan="4">No hay roles registrados.</td></tr>';
        if (spanTotal) {
            spanTotal.textContent = '0';
        }
        return;
    }

    tbody.innerHTML = '';
    roles.forEach(function (rol) {
        var fila = document.createElement('tr');
        fila.innerHTML =
            '<td>' + escaparHtml(rol.nombre_rol) + '</td>' +
            '<td>' + escaparHtml(rol.descripcion || '—') + '</td>' +
            '<td>—</td>' +
            '<td><a href="rol_editar.html?id=' + rol.id + '">Editar</a></td>';
        tbody.appendChild(fila);
    });

    if (spanTotal) {
        spanTotal.textContent = String(roles.length);
    }
}

function initRolNuevo() {
    var formulario = document.getElementById('formRolNuevo');
    if (!formulario) {
        return;
    }

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        if (!formulario.checkValidity()) {
            formulario.reportValidity();
            return;
        }

        var nuevoRol = {
            nombre_rol: document.getElementById('nombreRol').value,
            descripcion: document.getElementById('descripcionRol').value || null
        };

        var boton = document.getElementById('btnGuardarRol');
        boton.disabled = true;

        window.supabaseClient.from('roles').insert(nuevoRol).then(function (resultado) {
            boton.disabled = false;
            if (resultado.error) {
                mostrarMensajeFormulario(formulario, resultado.error.message, 'error');
                return;
            }
            window.location.href = 'roles.html';
        });
    });
}

function initRolEditar() {
    var formulario = document.getElementById('formRolEditar');
    if (!formulario) {
        return;
    }

    var id = obtenerParametroUrl('id');
    if (!id) {
        mostrarMensajeFormulario(formulario, 'No se especificó un rol para editar.', 'error');
        return;
    }
    document.getElementById('rolId').value = id;

    window.supabaseClient.from('roles').select('*').eq('id', id).single().then(function (resultado) {
        if (resultado.error || !resultado.data) {
            mostrarMensajeFormulario(formulario, 'No se pudo cargar el rol solicitado.', 'error');
            return;
        }
        var rol = resultado.data;
        document.getElementById('nombreRol').value = rol.nombre_rol || '';
        document.getElementById('descripcionRol').value = rol.descripcion || '';
    });

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        if (!formulario.checkValidity()) {
            formulario.reportValidity();
            return;
        }

        var cambios = {
            nombre_rol: document.getElementById('nombreRol').value,
            descripcion: document.getElementById('descripcionRol').value || null
        };

        var boton = document.getElementById('btnActualizarRol');
        boton.disabled = true;

        window.supabaseClient.from('roles').update(cambios).eq('id', id).then(function (resultado) {
            boton.disabled = false;
            if (resultado.error) {
                mostrarMensajeFormulario(formulario, resultado.error.message, 'error');
                return;
            }
            window.location.href = 'roles.html';
        });
    });
}

/* ---------------------------------------------------------------------- */
/* Permisos (Fase 4c)                                                     */
/* ---------------------------------------------------------------------- */

var MAPA_PERMISOS = [
    { id: 'permisoProductosVer', modulo: 'productos', accion: 'ver' },
    { id: 'permisoProductosCrear', modulo: 'productos', accion: 'crear' },
    { id: 'permisoProductosEditar', modulo: 'productos', accion: 'editar' },
    { id: 'permisoProductosEliminar', modulo: 'productos', accion: 'eliminar' },
    { id: 'permisoComprasVer', modulo: 'compras', accion: 'ver' },
    { id: 'permisoComprasCrear', modulo: 'compras', accion: 'crear' },
    { id: 'permisoVentasVer', modulo: 'ventas', accion: 'ver' },
    { id: 'permisoVentasCrear', modulo: 'ventas', accion: 'crear' },
    { id: 'permisoInventarioVer', modulo: 'inventario', accion: 'ver' },
    { id: 'permisoInventarioAjustar', modulo: 'inventario', accion: 'ajustar' },
    { id: 'permisoUsuariosGestionar', modulo: 'usuarios', accion: 'gestionar' },
    { id: 'permisoConfiguracionGestionar', modulo: 'configuracion', accion: 'gestionar' }
];

function initPermisos() {
    var formulario = document.getElementById('formPermisos');
    if (!formulario) {
        return;
    }

    var selectRol = document.getElementById('rolPermisos');
    poblarSelectRoles(selectRol);

    function limpiarCheckboxes() {
        MAPA_PERMISOS.forEach(function (item) {
            var checkbox = document.getElementById(item.id);
            if (checkbox) {
                checkbox.checked = false;
            }
        });
    }

    function cargarPermisosDelRol(rolId) {
        limpiarCheckboxes();
        if (!rolId) {
            return;
        }

        window.supabaseClient.from('rol_permiso').select('modulo, accion, permitido').eq('rol_id', rolId).then(function (resultado) {
            if (resultado.error || !resultado.data) {
                return;
            }
            resultado.data.forEach(function (fila) {
                var item = MAPA_PERMISOS.filter(function (m) {
                    return m.modulo === fila.modulo && m.accion === fila.accion;
                })[0];
                if (item) {
                    var checkbox = document.getElementById(item.id);
                    if (checkbox) {
                        checkbox.checked = !!fila.permitido;
                    }
                }
            });
        });
    }

    selectRol.addEventListener('change', function () {
        cargarPermisosDelRol(selectRol.value);
    });

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        if (!formulario.checkValidity()) {
            formulario.reportValidity();
            return;
        }

        var rolId = selectRol.value;
        var filas = MAPA_PERMISOS.map(function (item) {
            var checkbox = document.getElementById(item.id);
            return {
                rol_id: rolId,
                modulo: item.modulo,
                accion: item.accion,
                permitido: checkbox ? checkbox.checked : false
            };
        });

        var boton = document.getElementById('btnGuardarPermisos');
        boton.disabled = true;

        window.supabaseClient.from('rol_permiso').upsert(filas, { onConflict: 'rol_id,modulo,accion' }).then(function (resultado) {
            boton.disabled = false;
            if (resultado.error) {
                mostrarMensajeFormulario(formulario, resultado.error.message, 'error');
                return;
            }
            mostrarMensajeFormulario(formulario, 'Permisos guardados correctamente.', 'success');
        });
    });
}
