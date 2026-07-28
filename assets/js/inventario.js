/*
 * Kharit — Fase 4 (Supabase)
 * Módulo Inventario: movimientos (listado+filtros), entrada/salida (ajustan
 * stock_actual y registran el movimiento), ajuste (fija el stock exacto
 * contado y registra la diferencia) e historial (auditoría completa).
 * Reutiliza helpers de main.js y compras-ventas.js: mostrarMensajeFormulario,
 * obtenerParametroUrl, escaparHtml, poblarSelectProductos, ajustarStockProducto.
 */

document.addEventListener('DOMContentLoaded', function () {
    initMovimientos();
    initEntrada();
    initSalida();
    initAjuste();
    initHistorial();
});

function capitalizar(texto) {
    if (!texto) {
        return '';
    }
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function poblarSelectUsuarios(select) {
    if (!select) {
        return Promise.resolve();
    }
    return window.supabaseClient
        .from('usuarios')
        .select('id, nombre_completo')
        .order('nombre_completo')
        .then(function (resultado) {
            if (resultado.error || !resultado.data) {
                return;
            }
            resultado.data.forEach(function (usuario) {
                var opcion = document.createElement('option');
                opcion.value = usuario.id;
                opcion.textContent = usuario.nombre_completo;
                select.appendChild(opcion);
            });
        });
}

/* movimientos_inventario.usuario_id apunta a auth.users, que no es embebible
   directamente vía PostgREST; se resuelve con una consulta aparte a la tabla
   pública 'usuarios' y se arma un mapa id → nombre_completo en el cliente. */
function obtenerMapaUsuarios(ids) {
    var idsUnicos = Array.prototype.filter.call(new Set(ids), Boolean);
    if (!idsUnicos.length) {
        return Promise.resolve({});
    }
    return window.supabaseClient.from('usuarios').select('id, nombre_completo').in('id', idsUnicos).then(function (resultado) {
        var mapa = {};
        if (!resultado.error && resultado.data) {
            resultado.data.forEach(function (usuario) {
                mapa[usuario.id] = usuario.nombre_completo;
            });
        }
        return mapa;
    });
}

/* ---------------------------------------------------------------------- */
/* Movimientos (vista general)                                             */
/* ---------------------------------------------------------------------- */

function initMovimientos() {
    var tbody = document.getElementById('tablaMovimientosBody');
    if (!tbody) {
        return;
    }

    var formFiltro = document.getElementById('formFiltrarMovimientos');
    var selectProducto = document.getElementById('filtrarProducto');
    var selectTipo = document.getElementById('filtrarTipoMovimiento');

    poblarSelectProductos(selectProducto);

    function cargar() {
        var consulta = window.supabaseClient
            .from('movimientos_inventario')
            .select('fecha, tipo_movimiento, cantidad, motivo, usuario_id, productos(nombre_producto)')
            .order('created_at', { ascending: false })
            .limit(50);

        if (selectProducto.value) {
            consulta = consulta.eq('producto_id', selectProducto.value);
        }
        if (selectTipo.value) {
            consulta = consulta.eq('tipo_movimiento', selectTipo.value);
        }

        consulta.then(function (resultado) {
            if (resultado.error) {
                tbody.innerHTML = '<tr><td colspan="6">Error al cargar movimientos: ' + escaparHtml(resultado.error.message) + '</td></tr>';
                return;
            }
            var ids = resultado.data.map(function (movimiento) {
                return movimiento.usuario_id;
            });
            obtenerMapaUsuarios(ids).then(function (mapaUsuarios) {
                renderizarFilasMovimientos(tbody, resultado.data, mapaUsuarios);
            });
        });
    }

    formFiltro.addEventListener('submit', function (evento) {
        evento.preventDefault();
        cargar();
    });

    cargar();
}

function renderizarFilasMovimientos(tbody, movimientos, mapaUsuarios) {
    if (!movimientos.length) {
        tbody.innerHTML = '<tr><td colspan="6">Aún no hay movimientos registrados.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    movimientos.forEach(function (movimiento) {
        var fila = document.createElement('tr');
        var nombreUsuario = mapaUsuarios[movimiento.usuario_id] || '—';
        fila.innerHTML =
            '<td>' + escaparHtml(movimiento.fecha) + '</td>' +
            '<td>' + escaparHtml(movimiento.productos ? movimiento.productos.nombre_producto : 'Producto eliminado') + '</td>' +
            '<td>' + capitalizar(movimiento.tipo_movimiento) + '</td>' +
            '<td>' + (movimiento.cantidad !== null ? movimiento.cantidad : '—') + '</td>' +
            '<td>' + escaparHtml(nombreUsuario) + '</td>' +
            '<td>' + escaparHtml(movimiento.motivo || '—') + '</td>';
        tbody.appendChild(fila);
    });
}

/* ---------------------------------------------------------------------- */
/* Entrada                                                                 */
/* ---------------------------------------------------------------------- */

function initEntrada() {
    var formulario = document.getElementById('formInventarioEntrada');
    if (!formulario) {
        return;
    }

    poblarSelectProductos(document.getElementById('productoEntrada'));

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        if (!formulario.checkValidity()) {
            formulario.reportValidity();
            return;
        }

        var productoId = document.getElementById('productoEntrada').value;
        var cantidad = parseFloat(document.getElementById('cantidadEntrada').value) || 0;
        var selectMotivo = document.getElementById('motivoEntrada');
        var motivoTexto = selectMotivo.selectedOptions[0].textContent;
        var notas = document.getElementById('notasEntrada').value || null;
        var fecha = document.getElementById('fechaEntrada').value;

        var boton = document.getElementById('btnGuardarEntrada');
        boton.disabled = true;

        window.supabaseClient.auth.getUser().then(function (resultadoUsuario) {
            var usuarioId = resultadoUsuario.data.user ? resultadoUsuario.data.user.id : null;

            return ajustarStockProducto(productoId, cantidad).then(function () {
                return window.supabaseClient.from('movimientos_inventario').insert({
                    producto_id: productoId,
                    tipo_movimiento: 'entrada',
                    cantidad: cantidad,
                    fecha: fecha,
                    motivo: motivoTexto,
                    notas: notas,
                    usuario_id: usuarioId
                });
            });
        }).then(function (resultado) {
            boton.disabled = false;
            if (resultado && resultado.error) {
                mostrarMensajeFormulario(formulario, resultado.error.message, 'error');
                return;
            }
            window.location.href = 'inventario_movimientos.html';
        });
    });
}

/* ---------------------------------------------------------------------- */
/* Salida                                                                  */
/* ---------------------------------------------------------------------- */

function initSalida() {
    var formulario = document.getElementById('formInventarioSalida');
    if (!formulario) {
        return;
    }

    poblarSelectProductos(document.getElementById('productoSalida'));

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        if (!formulario.checkValidity()) {
            formulario.reportValidity();
            return;
        }

        var productoId = document.getElementById('productoSalida').value;
        var cantidad = parseFloat(document.getElementById('cantidadSalida').value) || 0;
        var selectMotivo = document.getElementById('motivoSalida');
        var motivoTexto = selectMotivo.selectedOptions[0].textContent;
        var notas = document.getElementById('notasSalida').value || null;
        var fecha = document.getElementById('fechaSalida').value;

        var boton = document.getElementById('btnGuardarSalida');
        boton.disabled = true;

        window.supabaseClient.auth.getUser().then(function (resultadoUsuario) {
            var usuarioId = resultadoUsuario.data.user ? resultadoUsuario.data.user.id : null;

            return ajustarStockProducto(productoId, -cantidad).then(function () {
                return window.supabaseClient.from('movimientos_inventario').insert({
                    producto_id: productoId,
                    tipo_movimiento: 'salida',
                    cantidad: cantidad,
                    fecha: fecha,
                    motivo: motivoTexto,
                    notas: notas,
                    usuario_id: usuarioId
                });
            });
        }).then(function (resultado) {
            boton.disabled = false;
            if (resultado && resultado.error) {
                mostrarMensajeFormulario(formulario, resultado.error.message, 'error');
                return;
            }
            window.location.href = 'inventario_movimientos.html';
        });
    });
}

/* ---------------------------------------------------------------------- */
/* Ajuste                                                                  */
/* ---------------------------------------------------------------------- */

function initAjuste() {
    var formulario = document.getElementById('formInventarioAjuste');
    if (!formulario) {
        return;
    }

    var selectProducto = document.getElementById('productoAjuste');
    var inputStockSistema = document.getElementById('stockSistemaAjuste');

    poblarSelectProductos(selectProducto);

    selectProducto.addEventListener('change', function () {
        if (!selectProducto.value) {
            inputStockSistema.value = '';
            return;
        }
        window.supabaseClient.from('productos').select('stock_actual').eq('id', selectProducto.value).single().then(function (resultado) {
            if (resultado.error || !resultado.data) {
                return;
            }
            inputStockSistema.value = resultado.data.stock_actual;
        });
    });

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        if (!formulario.checkValidity()) {
            formulario.reportValidity();
            return;
        }

        var productoId = selectProducto.value;
        var stockFisico = parseFloat(document.getElementById('stockFisicoAjuste').value) || 0;
        var stockSistema = parseFloat(inputStockSistema.value) || 0;
        var diferencia = stockFisico - stockSistema;
        var selectMotivo = document.getElementById('motivoAjuste');
        var motivoTexto = selectMotivo.selectedOptions[0].textContent;
        var justificacion = document.getElementById('justificacionAjuste').value;
        var fecha = document.getElementById('fechaAjuste').value;

        var boton = document.getElementById('btnGuardarAjuste');
        boton.disabled = true;

        window.supabaseClient.auth.getUser().then(function (resultadoUsuario) {
            var usuarioId = resultadoUsuario.data.user ? resultadoUsuario.data.user.id : null;

            return window.supabaseClient.from('productos').update({ stock_actual: stockFisico }).eq('id', productoId).then(function () {
                return window.supabaseClient.from('movimientos_inventario').insert({
                    producto_id: productoId,
                    tipo_movimiento: 'ajuste',
                    cantidad: diferencia,
                    fecha: fecha,
                    motivo: motivoTexto,
                    justificacion: justificacion,
                    stock_sistema: stockSistema,
                    stock_fisico: stockFisico,
                    usuario_id: usuarioId
                });
            });
        }).then(function (resultado) {
            boton.disabled = false;
            if (resultado && resultado.error) {
                mostrarMensajeFormulario(formulario, resultado.error.message, 'error');
                return;
            }
            window.location.href = 'inventario_movimientos.html';
        });
    });
}

/* ---------------------------------------------------------------------- */
/* Historial completo                                                     */
/* ---------------------------------------------------------------------- */

function initHistorial() {
    var tbody = document.getElementById('tablaHistorialBody');
    if (!tbody) {
        return;
    }

    var formFiltro = document.getElementById('formFiltrarHistorial');
    var selectProducto = document.getElementById('filtrarProductoHistorial');
    var selectUsuario = document.getElementById('filtrarUsuarioHistorial');
    var selectTipo = document.getElementById('filtrarTipoHistorial');
    var inputFechaInicio = document.getElementById('filtrarFechaInicioHistorial');
    var inputFechaFin = document.getElementById('filtrarFechaFinHistorial');

    poblarSelectProductos(selectProducto);
    poblarSelectUsuarios(selectUsuario);

    function cargar() {
        var consulta = window.supabaseClient
            .from('movimientos_inventario')
            .select('fecha, tipo_movimiento, cantidad, motivo, justificacion, usuario_id, productos(nombre_producto)')
            .order('created_at', { ascending: false });

        if (selectProducto.value) {
            consulta = consulta.eq('producto_id', selectProducto.value);
        }
        if (selectUsuario.value) {
            consulta = consulta.eq('usuario_id', selectUsuario.value);
        }
        if (selectTipo.value) {
            consulta = consulta.eq('tipo_movimiento', selectTipo.value);
        }
        if (inputFechaInicio.value) {
            consulta = consulta.gte('fecha', inputFechaInicio.value);
        }
        if (inputFechaFin.value) {
            consulta = consulta.lte('fecha', inputFechaFin.value);
        }

        consulta.then(function (resultado) {
            if (resultado.error) {
                tbody.innerHTML = '<tr><td colspan="7">Error al cargar historial: ' + escaparHtml(resultado.error.message) + '</td></tr>';
                return;
            }
            var ids = resultado.data.map(function (movimiento) {
                return movimiento.usuario_id;
            });
            obtenerMapaUsuarios(ids).then(function (mapaUsuarios) {
                renderizarFilasHistorial(tbody, resultado.data, mapaUsuarios);
            });
        });
    }

    formFiltro.addEventListener('submit', function (evento) {
        evento.preventDefault();
        cargar();
    });

    cargar();
}

function renderizarFilasHistorial(tbody, movimientos, mapaUsuarios) {
    if (!movimientos.length) {
        tbody.innerHTML = '<tr><td colspan="7">Aún no hay movimientos registrados en el historial.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    movimientos.forEach(function (movimiento) {
        var fila = document.createElement('tr');
        var nombreUsuario = mapaUsuarios[movimiento.usuario_id] || '—';
        fila.innerHTML =
            '<td>' + escaparHtml(movimiento.fecha) + '</td>' +
            '<td>' + escaparHtml(movimiento.productos ? movimiento.productos.nombre_producto : 'Producto eliminado') + '</td>' +
            '<td>' + capitalizar(movimiento.tipo_movimiento) + '</td>' +
            '<td>' + (movimiento.cantidad !== null ? movimiento.cantidad : '—') + '</td>' +
            '<td>' + escaparHtml(nombreUsuario) + '</td>' +
            '<td>' + escaparHtml(movimiento.motivo || '—') + '</td>' +
            '<td>' + escaparHtml(movimiento.justificacion || '—') + '</td>';
        tbody.appendChild(fila);
    });
}
