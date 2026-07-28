/*
 * Kharit — Fase 4 (Supabase)
 * Módulos Compras y Ventas: registran la transacción + su detalle, y ajustan
 * el stock del producto (compra = entrada, venta = salida), dejando un
 * registro correspondiente en movimientos_inventario para auditoría.
 * Reutiliza helpers de main.js: mostrarMensajeFormulario, obtenerParametroUrl,
 * escaparHtml, formatoMoneda, poblarSelectProveedores.
 */

document.addEventListener('DOMContentLoaded', function () {
    initListadoCompras();
    initCompraNueva();
    initCompraDetalle();

    initListadoVentas();
    initVentaNueva();
    initVentaDetalle();
});

/* ---------------------------------------------------------------------- */
/* Utilidades compartidas por compras y ventas                             */
/* ---------------------------------------------------------------------- */

function generarFolio(prefijo) {
    return prefijo + '-' + Date.now().toString(36).toUpperCase();
}

function poblarSelectProductos(select) {
    if (!select) {
        return Promise.resolve();
    }
    return window.supabaseClient
        .from('productos')
        .select('id, nombre_producto')
        .eq('estado', 'activo')
        .order('nombre_producto')
        .then(function (resultado) {
            if (resultado.error || !resultado.data) {
                return;
            }
            resultado.data.forEach(function (producto) {
                var opcion = document.createElement('option');
                opcion.value = producto.id;
                opcion.textContent = producto.nombre_producto;
                select.appendChild(opcion);
            });
        });
}

function poblarSelectClientes(select) {
    if (!select) {
        return Promise.resolve();
    }
    return window.supabaseClient
        .from('clientes')
        .select('id, nombre_cliente')
        .eq('estado', 'activo')
        .order('nombre_cliente')
        .then(function (resultado) {
            if (resultado.error || !resultado.data) {
                return;
            }
            resultado.data.forEach(function (cliente) {
                var opcion = document.createElement('option');
                opcion.value = cliente.id;
                opcion.textContent = cliente.nombre_cliente;
                select.appendChild(opcion);
            });
        });
}

function leerLineasDetalle(tbody) {
    var lineas = [];
    tbody.querySelectorAll('tr').forEach(function (fila) {
        var selectProducto = fila.querySelector('select[name^="producto_id_"]');
        var inputCantidad = fila.querySelector('input[name^="cantidad_"]');
        var inputPrecio = fila.querySelector('input[name^="precio_unitario_"]');

        var productoId = selectProducto ? selectProducto.value : '';
        var cantidad = parseFloat(inputCantidad && inputCantidad.value) || 0;
        var precioUnitario = parseFloat(inputPrecio && inputPrecio.value) || 0;

        if (productoId && cantidad > 0) {
            lineas.push({
                producto_id: productoId,
                cantidad: cantidad,
                precio_unitario: precioUnitario,
                subtotal: cantidad * precioUnitario
            });
        }
    });
    return lineas;
}

/* Ajusta el stock_actual de un producto sumando/restando delta (positivo o negativo) */
function ajustarStockProducto(productoId, delta) {
    return window.supabaseClient.from('productos').select('stock_actual').eq('id', productoId).single().then(function (resultado) {
        if (resultado.error || !resultado.data) {
            return;
        }
        var nuevoStock = resultado.data.stock_actual + delta;
        return window.supabaseClient.from('productos').update({ stock_actual: nuevoStock }).eq('id', productoId);
    });
}

/* Aplica el movimiento de inventario correspondiente a cada línea de una compra/venta */
function aplicarMovimientosDeLineas(lineas, tipoMovimiento, motivo) {
    var signo = tipoMovimiento === 'salida' ? -1 : 1;

    return window.supabaseClient.auth.getUser().then(function (resultadoUsuario) {
        var usuarioId = resultadoUsuario.data.user ? resultadoUsuario.data.user.id : null;

        var operaciones = lineas.map(function (linea) {
            return ajustarStockProducto(linea.producto_id, signo * linea.cantidad).then(function () {
                return window.supabaseClient.from('movimientos_inventario').insert({
                    producto_id: linea.producto_id,
                    tipo_movimiento: tipoMovimiento,
                    cantidad: linea.cantidad,
                    motivo: motivo,
                    usuario_id: usuarioId
                });
            });
        });

        return Promise.all(operaciones);
    });
}

/* ---------------------------------------------------------------------- */
/* Compras                                                                 */
/* ---------------------------------------------------------------------- */

function initListadoCompras() {
    var tbody = document.getElementById('tablaComprasBody');
    if (!tbody) {
        return;
    }

    var formBusqueda = document.getElementById('formBuscarCompras');
    var inputBuscar = document.getElementById('buscarCompra');
    var inputFechaInicio = document.getElementById('filtrarFechaInicio');
    var inputFechaFin = document.getElementById('filtrarFechaFin');

    function cargar() {
        var busqueda = inputBuscar.value.trim();
        var consulta = window.supabaseClient
            .from('compras')
            .select('id, folio, fecha, total, estado, proveedores(nombre_proveedor)')
            .order('fecha', { ascending: false });

        if (busqueda) {
            consulta = consulta.ilike('folio', '%' + busqueda + '%');
        }
        if (inputFechaInicio.value) {
            consulta = consulta.gte('fecha', inputFechaInicio.value);
        }
        if (inputFechaFin.value) {
            consulta = consulta.lte('fecha', inputFechaFin.value);
        }

        consulta.then(function (resultado) {
            if (resultado.error) {
                tbody.innerHTML = '<tr><td colspan="6">Error al cargar compras: ' + escaparHtml(resultado.error.message) + '</td></tr>';
                return;
            }
            renderizarFilasCompras(tbody, resultado.data);
        });
    }

    formBusqueda.addEventListener('submit', function (evento) {
        evento.preventDefault();
        cargar();
    });

    cargar();
}

function renderizarFilasCompras(tbody, compras) {
    var spanTotal = document.getElementById('totalComprasListado');

    if (!compras.length) {
        tbody.innerHTML = '<tr><td colspan="6">No se encontraron compras.</td></tr>';
        if (spanTotal) {
            spanTotal.textContent = '0';
        }
        return;
    }

    tbody.innerHTML = '';
    compras.forEach(function (compra) {
        var fila = document.createElement('tr');
        fila.innerHTML =
            '<td>' + escaparHtml(compra.folio || '—') + '</td>' +
            '<td>' + escaparHtml(compra.fecha) + '</td>' +
            '<td>' + escaparHtml(compra.proveedores ? compra.proveedores.nombre_proveedor : 'Sin proveedor') + '</td>' +
            '<td>' + formatoMoneda(compra.total) + '</td>' +
            '<td>' + escaparHtml(compra.estado) + '</td>' +
            '<td><a href="compra_detalle.html?id=' + compra.id + '">Ver</a></td>';
        tbody.appendChild(fila);
    });

    if (spanTotal) {
        spanTotal.textContent = String(compras.length);
    }
}

function initCompraNueva() {
    var formulario = document.getElementById('formCompraNueva');
    if (!formulario) {
        return;
    }

    document.getElementById('folioCompra').value = generarFolio('C');
    poblarSelectProveedores(document.getElementById('proveedorCompra'));

    var tbody = document.getElementById('tablaDetalleCompraBody');
    tbody.querySelectorAll('select[name^="producto_id_"]').forEach(function (select) {
        poblarSelectProductos(select);
    });

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        if (!formulario.checkValidity()) {
            formulario.reportValidity();
            return;
        }

        var lineas = leerLineasDetalle(tbody);
        if (!lineas.length) {
            mostrarMensajeFormulario(formulario, 'Agrega al menos un producto con cantidad mayor a cero.', 'error');
            return;
        }

        var folio = document.getElementById('folioCompra').value;
        var nuevaCompra = {
            folio: folio,
            fecha: document.getElementById('fechaCompra').value,
            proveedor_id: document.getElementById('proveedorCompra').value || null,
            subtotal: parseFloat(document.getElementById('subtotalCompra').value) || 0,
            impuestos: parseFloat(document.getElementById('impuestosCompra').value) || 0,
            total: parseFloat(document.getElementById('totalCompra').value) || 0
        };

        var boton = document.getElementById('btnGuardarCompra');
        boton.disabled = true;

        window.supabaseClient.from('compras').insert(nuevaCompra).select().single().then(function (resultadoCompra) {
            if (resultadoCompra.error) {
                boton.disabled = false;
                mostrarMensajeFormulario(formulario, resultadoCompra.error.message, 'error');
                return;
            }

            var compraId = resultadoCompra.data.id;
            var detalleConId = lineas.map(function (linea) {
                return {
                    compra_id: compraId,
                    producto_id: linea.producto_id,
                    cantidad: linea.cantidad,
                    precio_unitario: linea.precio_unitario,
                    subtotal: linea.subtotal
                };
            });

            window.supabaseClient.from('compra_detalle').insert(detalleConId).then(function (resultadoDetalle) {
                if (resultadoDetalle.error) {
                    boton.disabled = false;
                    mostrarMensajeFormulario(formulario, 'La compra se registró, pero hubo un error al guardar el detalle: ' + resultadoDetalle.error.message, 'error');
                    return;
                }

                aplicarMovimientosDeLineas(lineas, 'entrada', 'Compra ' + folio).then(function () {
                    boton.disabled = false;
                    window.location.href = 'compra_detalle.html?id=' + compraId;
                });
            });
        });
    });
}

function initCompraDetalle() {
    var elemento = document.getElementById('detalleFolio');
    if (!elemento) {
        return;
    }

    var id = obtenerParametroUrl('id');
    if (!id) {
        return;
    }

    window.supabaseClient.from('compras').select('*, proveedores(nombre_proveedor)').eq('id', id).single().then(function (resultado) {
        if (resultado.error || !resultado.data) {
            return;
        }
        var compra = resultado.data;
        document.getElementById('detalleFolio').textContent = compra.folio || '—';
        document.getElementById('detalleFecha').textContent = compra.fecha;
        document.getElementById('detalleProveedor').textContent = compra.proveedores ? compra.proveedores.nombre_proveedor : 'Sin proveedor';
        document.getElementById('detalleEstado').textContent = compra.estado;
        document.getElementById('detalleSubtotal').textContent = formatoMoneda(compra.subtotal);
        document.getElementById('detalleImpuestos').textContent = formatoMoneda(compra.impuestos);
        document.getElementById('detalleTotal').textContent = formatoMoneda(compra.total);
    });

    window.supabaseClient
        .from('compra_detalle')
        .select('cantidad, precio_unitario, subtotal, productos(nombre_producto)')
        .eq('compra_id', id)
        .then(function (resultado) {
            var tbody = document.getElementById('tablaDetalleCompraBody');
            if (!tbody || resultado.error) {
                return;
            }
            if (!resultado.data.length) {
                tbody.innerHTML = '<tr><td colspan="4">No hay productos registrados en esta compra.</td></tr>';
                return;
            }
            tbody.innerHTML = '';
            resultado.data.forEach(function (linea) {
                var fila = document.createElement('tr');
                fila.innerHTML =
                    '<td>' + escaparHtml(linea.productos ? linea.productos.nombre_producto : 'Producto eliminado') + '</td>' +
                    '<td>' + linea.cantidad + '</td>' +
                    '<td>' + formatoMoneda(linea.precio_unitario) + '</td>' +
                    '<td>' + formatoMoneda(linea.subtotal) + '</td>';
                tbody.appendChild(fila);
            });
        });
}

/* ---------------------------------------------------------------------- */
/* Ventas                                                                  */
/* ---------------------------------------------------------------------- */

function initListadoVentas() {
    var tbody = document.getElementById('tablaVentasBody');
    if (!tbody) {
        return;
    }

    var formBusqueda = document.getElementById('formBuscarVentas');
    var inputBuscar = document.getElementById('buscarVenta');
    var inputFechaInicio = document.getElementById('filtrarFechaInicio');
    var inputFechaFin = document.getElementById('filtrarFechaFin');

    function cargar() {
        var busqueda = inputBuscar.value.trim();
        var consulta = window.supabaseClient
            .from('ventas')
            .select('id, folio, fecha, total, estado, clientes(nombre_cliente)')
            .order('fecha', { ascending: false });

        if (busqueda) {
            consulta = consulta.ilike('folio', '%' + busqueda + '%');
        }
        if (inputFechaInicio.value) {
            consulta = consulta.gte('fecha', inputFechaInicio.value);
        }
        if (inputFechaFin.value) {
            consulta = consulta.lte('fecha', inputFechaFin.value);
        }

        consulta.then(function (resultado) {
            if (resultado.error) {
                tbody.innerHTML = '<tr><td colspan="6">Error al cargar ventas: ' + escaparHtml(resultado.error.message) + '</td></tr>';
                return;
            }
            renderizarFilasVentas(tbody, resultado.data);
        });
    }

    formBusqueda.addEventListener('submit', function (evento) {
        evento.preventDefault();
        cargar();
    });

    cargar();
}

function renderizarFilasVentas(tbody, ventas) {
    var spanTotal = document.getElementById('totalVentasListado');

    if (!ventas.length) {
        tbody.innerHTML = '<tr><td colspan="6">No se encontraron ventas.</td></tr>';
        if (spanTotal) {
            spanTotal.textContent = '0';
        }
        return;
    }

    tbody.innerHTML = '';
    ventas.forEach(function (venta) {
        var fila = document.createElement('tr');
        fila.innerHTML =
            '<td>' + escaparHtml(venta.folio || '—') + '</td>' +
            '<td>' + escaparHtml(venta.fecha) + '</td>' +
            '<td>' + escaparHtml(venta.clientes ? venta.clientes.nombre_cliente : 'Sin cliente') + '</td>' +
            '<td>' + formatoMoneda(venta.total) + '</td>' +
            '<td>' + escaparHtml(venta.estado) + '</td>' +
            '<td><a href="venta_detalle.html?id=' + venta.id + '">Ver</a></td>';
        tbody.appendChild(fila);
    });

    if (spanTotal) {
        spanTotal.textContent = String(ventas.length);
    }
}

function initVentaNueva() {
    var formulario = document.getElementById('formVentaNueva');
    if (!formulario) {
        return;
    }

    document.getElementById('folioVenta').value = generarFolio('V');
    poblarSelectClientes(document.getElementById('clienteVenta'));

    var tbody = document.getElementById('tablaDetalleVentaBody');
    tbody.querySelectorAll('select[name^="producto_id_"]').forEach(function (select) {
        poblarSelectProductos(select);
    });

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        if (!formulario.checkValidity()) {
            formulario.reportValidity();
            return;
        }

        var lineas = leerLineasDetalle(tbody);
        if (!lineas.length) {
            mostrarMensajeFormulario(formulario, 'Agrega al menos un producto con cantidad mayor a cero.', 'error');
            return;
        }

        var folio = document.getElementById('folioVenta').value;
        var nuevaVenta = {
            folio: folio,
            fecha: document.getElementById('fechaVenta').value,
            cliente_id: document.getElementById('clienteVenta').value || null,
            metodo_pago: document.getElementById('metodoPagoVenta').value,
            subtotal: parseFloat(document.getElementById('subtotalVenta').value) || 0,
            impuestos: parseFloat(document.getElementById('impuestosVenta').value) || 0,
            total: parseFloat(document.getElementById('totalVenta').value) || 0
        };

        var boton = document.getElementById('btnGuardarVenta');
        boton.disabled = true;

        window.supabaseClient.from('ventas').insert(nuevaVenta).select().single().then(function (resultadoVenta) {
            if (resultadoVenta.error) {
                boton.disabled = false;
                mostrarMensajeFormulario(formulario, resultadoVenta.error.message, 'error');
                return;
            }

            var ventaId = resultadoVenta.data.id;
            var detalleConId = lineas.map(function (linea) {
                return {
                    venta_id: ventaId,
                    producto_id: linea.producto_id,
                    cantidad: linea.cantidad,
                    precio_unitario: linea.precio_unitario,
                    subtotal: linea.subtotal
                };
            });

            window.supabaseClient.from('venta_detalle').insert(detalleConId).then(function (resultadoDetalle) {
                if (resultadoDetalle.error) {
                    boton.disabled = false;
                    mostrarMensajeFormulario(formulario, 'La venta se registró, pero hubo un error al guardar el detalle: ' + resultadoDetalle.error.message, 'error');
                    return;
                }

                aplicarMovimientosDeLineas(lineas, 'salida', 'Venta ' + folio).then(function () {
                    boton.disabled = false;
                    window.location.href = 'venta_detalle.html?id=' + ventaId;
                });
            });
        });
    });
}

function initVentaDetalle() {
    var elemento = document.getElementById('detalleFolio');
    if (!elemento) {
        return;
    }

    var id = obtenerParametroUrl('id');
    if (!id) {
        return;
    }

    window.supabaseClient.from('ventas').select('*, clientes(nombre_cliente)').eq('id', id).single().then(function (resultado) {
        if (resultado.error || !resultado.data) {
            return;
        }
        var venta = resultado.data;
        document.getElementById('detalleFolio').textContent = venta.folio || '—';
        document.getElementById('detalleFecha').textContent = venta.fecha;
        document.getElementById('detalleCliente').textContent = venta.clientes ? venta.clientes.nombre_cliente : 'Sin cliente';
        document.getElementById('detalleMetodoPago').textContent = venta.metodo_pago;
        document.getElementById('detalleEstado').textContent = venta.estado;
        document.getElementById('detalleSubtotal').textContent = formatoMoneda(venta.subtotal);
        document.getElementById('detalleImpuestos').textContent = formatoMoneda(venta.impuestos);
        document.getElementById('detalleTotal').textContent = formatoMoneda(venta.total);
    });

    window.supabaseClient
        .from('venta_detalle')
        .select('cantidad, precio_unitario, subtotal, productos(nombre_producto)')
        .eq('venta_id', id)
        .then(function (resultado) {
            var tbody = document.getElementById('tablaDetalleVentaBody');
            if (!tbody || resultado.error) {
                return;
            }
            if (!resultado.data.length) {
                tbody.innerHTML = '<tr><td colspan="4">No hay productos registrados en esta venta.</td></tr>';
                return;
            }
            tbody.innerHTML = '';
            resultado.data.forEach(function (linea) {
                var fila = document.createElement('tr');
                fila.innerHTML =
                    '<td>' + escaparHtml(linea.productos ? linea.productos.nombre_producto : 'Producto eliminado') + '</td>' +
                    '<td>' + linea.cantidad + '</td>' +
                    '<td>' + formatoMoneda(linea.precio_unitario) + '</td>' +
                    '<td>' + formatoMoneda(linea.subtotal) + '</td>';
                tbody.appendChild(fila);
            });
        });
}
