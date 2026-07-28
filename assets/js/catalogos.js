/*
 * Kharit — Fase 4 (Supabase)
 * Módulos Categorías, Proveedores y Clientes: mismo patrón de referencia
 * establecido en assets/js/main.js para Productos (listado/nuevo/editar/detalle).
 * Reutiliza los helpers ya definidos en main.js: mostrarMensajeFormulario,
 * obtenerParametroUrl, escaparHtml, formatoMoneda.
 */

document.addEventListener('DOMContentLoaded', function () {
    initListadoCategorias();
    initCategoriaNueva();
    initCategoriaEditar();

    initListadoProveedores();
    initProveedorNuevo();
    initProveedorEditar();
    initProveedorDetalle();

    initListadoClientes();
    initClienteNuevo();
    initClienteEditar();
    initClienteDetalle();
});

/* ---------------------------------------------------------------------- */
/* Categorías                                                              */
/* ---------------------------------------------------------------------- */

function initListadoCategorias() {
    var tbody = document.getElementById('tablaCategoriasBody');
    if (!tbody) {
        return;
    }

    var formBusqueda = document.getElementById('formBuscarCategorias');
    var inputBuscar = document.getElementById('buscarCategoria');

    function cargar() {
        var busqueda = inputBuscar.value.trim();
        var consulta = window.supabaseClient
            .from('categorias')
            .select('id, nombre_categoria, descripcion, estado')
            .order('nombre_categoria');

        if (busqueda) {
            consulta = consulta.ilike('nombre_categoria', '%' + busqueda + '%');
        }

        consulta.then(function (resultado) {
            if (resultado.error) {
                tbody.innerHTML = '<tr><td colspan="5">Error al cargar categorías: ' + escaparHtml(resultado.error.message) + '</td></tr>';
                return;
            }
            renderizarFilasCategorias(tbody, resultado.data);
        });
    }

    formBusqueda.addEventListener('submit', function (evento) {
        evento.preventDefault();
        cargar();
    });

    cargar();
}

function renderizarFilasCategorias(tbody, categorias) {
    var spanTotal = document.getElementById('totalCategoriasListado');

    if (!categorias.length) {
        tbody.innerHTML = '<tr><td colspan="5">No se encontraron categorías.</td></tr>';
        if (spanTotal) {
            spanTotal.textContent = '0';
        }
        return;
    }

    tbody.innerHTML = '';
    categorias.forEach(function (categoria) {
        var fila = document.createElement('tr');
        fila.innerHTML =
            '<td>' + escaparHtml(categoria.nombre_categoria) + '</td>' +
            '<td>' + escaparHtml(categoria.descripcion || '—') + '</td>' +
            '<td>—</td>' +
            '<td>' + (categoria.estado === 'activo' ? 'Activo' : 'Inactivo') + '</td>' +
            '<td><a href="categoria_editar.html?id=' + categoria.id + '">Editar</a></td>';
        tbody.appendChild(fila);
    });

    if (spanTotal) {
        spanTotal.textContent = String(categorias.length);
    }
}

function initCategoriaNueva() {
    var formulario = document.getElementById('formCategoriaNueva');
    if (!formulario) {
        return;
    }

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        if (!formulario.checkValidity()) {
            formulario.reportValidity();
            return;
        }

        var nuevaCategoria = {
            nombre_categoria: document.getElementById('nombreCategoria').value,
            descripcion: document.getElementById('descripcionCategoria').value || null,
            estado: document.getElementById('estadoCategoria').value
        };

        var boton = document.getElementById('btnGuardarCategoria');
        boton.disabled = true;

        window.supabaseClient.from('categorias').insert(nuevaCategoria).then(function (resultado) {
            boton.disabled = false;
            if (resultado.error) {
                mostrarMensajeFormulario(formulario, resultado.error.message, 'error');
                return;
            }
            window.location.href = 'categorias.html';
        });
    });
}

function initCategoriaEditar() {
    var formulario = document.getElementById('formCategoriaEditar');
    if (!formulario) {
        return;
    }

    var id = obtenerParametroUrl('id');
    if (!id) {
        mostrarMensajeFormulario(formulario, 'No se especificó una categoría para editar.', 'error');
        return;
    }
    document.getElementById('categoriaId').value = id;

    window.supabaseClient.from('categorias').select('*').eq('id', id).single().then(function (resultado) {
        if (resultado.error || !resultado.data) {
            mostrarMensajeFormulario(formulario, 'No se pudo cargar la categoría solicitada.', 'error');
            return;
        }
        var categoria = resultado.data;
        document.getElementById('nombreCategoria').value = categoria.nombre_categoria || '';
        document.getElementById('descripcionCategoria').value = categoria.descripcion || '';
        document.getElementById('estadoCategoria').value = categoria.estado;
    });

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        if (!formulario.checkValidity()) {
            formulario.reportValidity();
            return;
        }

        var cambios = {
            nombre_categoria: document.getElementById('nombreCategoria').value,
            descripcion: document.getElementById('descripcionCategoria').value || null,
            estado: document.getElementById('estadoCategoria').value
        };

        var boton = document.getElementById('btnActualizarCategoria');
        boton.disabled = true;

        window.supabaseClient.from('categorias').update(cambios).eq('id', id).then(function (resultado) {
            boton.disabled = false;
            if (resultado.error) {
                mostrarMensajeFormulario(formulario, resultado.error.message, 'error');
                return;
            }
            window.location.href = 'categorias.html';
        });
    });
}

/* ---------------------------------------------------------------------- */
/* Proveedores                                                             */
/* ---------------------------------------------------------------------- */

function initListadoProveedores() {
    var tbody = document.getElementById('tablaProveedoresBody');
    if (!tbody) {
        return;
    }

    var formBusqueda = document.getElementById('formBuscarProveedores');
    var inputBuscar = document.getElementById('buscarProveedor');
    var selectEstado = document.getElementById('filtrarEstadoProveedor');

    function cargar() {
        var busqueda = inputBuscar.value.trim();
        var estado = selectEstado.value;

        var consulta = window.supabaseClient
            .from('proveedores')
            .select('id, nombre_proveedor, contacto_nombre, telefono, email, estado')
            .order('nombre_proveedor');

        if (busqueda) {
            consulta = consulta.or('nombre_proveedor.ilike.%' + busqueda + '%,rfc.ilike.%' + busqueda + '%');
        }
        if (estado) {
            consulta = consulta.eq('estado', estado);
        }

        consulta.then(function (resultado) {
            if (resultado.error) {
                tbody.innerHTML = '<tr><td colspan="6">Error al cargar proveedores: ' + escaparHtml(resultado.error.message) + '</td></tr>';
                return;
            }
            renderizarFilasProveedores(tbody, resultado.data);
        });
    }

    formBusqueda.addEventListener('submit', function (evento) {
        evento.preventDefault();
        cargar();
    });

    cargar();
}

function renderizarFilasProveedores(tbody, proveedores) {
    var spanTotal = document.getElementById('totalProveedoresListado');

    if (!proveedores.length) {
        tbody.innerHTML = '<tr><td colspan="6">No se encontraron proveedores.</td></tr>';
        if (spanTotal) {
            spanTotal.textContent = '0';
        }
        return;
    }

    tbody.innerHTML = '';
    proveedores.forEach(function (proveedor) {
        var fila = document.createElement('tr');
        fila.innerHTML =
            '<td>' + escaparHtml(proveedor.nombre_proveedor) + '</td>' +
            '<td>' + escaparHtml(proveedor.contacto_nombre || '—') + '</td>' +
            '<td>' + escaparHtml(proveedor.telefono || '—') + '</td>' +
            '<td>' + escaparHtml(proveedor.email || '—') + '</td>' +
            '<td>' + (proveedor.estado === 'activo' ? 'Activo' : 'Inactivo') + '</td>' +
            '<td><a href="proveedor_detalle.html?id=' + proveedor.id + '">Ver</a> <a href="proveedor_editar.html?id=' + proveedor.id + '">Editar</a></td>';
        tbody.appendChild(fila);
    });

    if (spanTotal) {
        spanTotal.textContent = String(proveedores.length);
    }
}

function initProveedorNuevo() {
    var formulario = document.getElementById('formProveedorNuevo');
    if (!formulario) {
        return;
    }

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        if (!formulario.checkValidity()) {
            formulario.reportValidity();
            return;
        }

        var nuevoProveedor = {
            nombre_proveedor: document.getElementById('nombreProveedor').value,
            razon_social: document.getElementById('razonSocial').value || null,
            rfc: document.getElementById('rfcProveedor').value || null,
            contacto_nombre: document.getElementById('contactoNombre').value || null,
            telefono: document.getElementById('telefonoProveedor').value,
            email: document.getElementById('emailProveedor').value || null,
            direccion: document.getElementById('direccionProveedor').value || null,
            estado: document.getElementById('estadoProveedor').value
        };

        var boton = document.getElementById('btnGuardarProveedor');
        boton.disabled = true;

        window.supabaseClient.from('proveedores').insert(nuevoProveedor).then(function (resultado) {
            boton.disabled = false;
            if (resultado.error) {
                mostrarMensajeFormulario(formulario, resultado.error.message, 'error');
                return;
            }
            window.location.href = 'proveedores.html';
        });
    });
}

function initProveedorEditar() {
    var formulario = document.getElementById('formProveedorEditar');
    if (!formulario) {
        return;
    }

    var id = obtenerParametroUrl('id');
    if (!id) {
        mostrarMensajeFormulario(formulario, 'No se especificó un proveedor para editar.', 'error');
        return;
    }
    document.getElementById('proveedorId').value = id;

    window.supabaseClient.from('proveedores').select('*').eq('id', id).single().then(function (resultado) {
        if (resultado.error || !resultado.data) {
            mostrarMensajeFormulario(formulario, 'No se pudo cargar el proveedor solicitado.', 'error');
            return;
        }
        var proveedor = resultado.data;
        document.getElementById('nombreProveedor').value = proveedor.nombre_proveedor || '';
        document.getElementById('razonSocial').value = proveedor.razon_social || '';
        document.getElementById('rfcProveedor').value = proveedor.rfc || '';
        document.getElementById('contactoNombre').value = proveedor.contacto_nombre || '';
        document.getElementById('telefonoProveedor').value = proveedor.telefono || '';
        document.getElementById('emailProveedor').value = proveedor.email || '';
        document.getElementById('direccionProveedor').value = proveedor.direccion || '';
        document.getElementById('estadoProveedor').value = proveedor.estado;
    });

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        if (!formulario.checkValidity()) {
            formulario.reportValidity();
            return;
        }

        var cambios = {
            nombre_proveedor: document.getElementById('nombreProveedor').value,
            razon_social: document.getElementById('razonSocial').value || null,
            rfc: document.getElementById('rfcProveedor').value || null,
            contacto_nombre: document.getElementById('contactoNombre').value || null,
            telefono: document.getElementById('telefonoProveedor').value,
            email: document.getElementById('emailProveedor').value || null,
            direccion: document.getElementById('direccionProveedor').value || null,
            estado: document.getElementById('estadoProveedor').value
        };

        var boton = document.getElementById('btnActualizarProveedor');
        boton.disabled = true;

        window.supabaseClient.from('proveedores').update(cambios).eq('id', id).then(function (resultado) {
            boton.disabled = false;
            if (resultado.error) {
                mostrarMensajeFormulario(formulario, resultado.error.message, 'error');
                return;
            }
            window.location.href = 'proveedor_detalle.html?id=' + id;
        });
    });
}

function initProveedorDetalle() {
    var elemento = document.getElementById('detalleNombreProveedor');
    if (!elemento) {
        return;
    }

    var id = obtenerParametroUrl('id');
    if (!id) {
        return;
    }

    window.supabaseClient.from('proveedores').select('*').eq('id', id).single().then(function (resultado) {
        if (resultado.error || !resultado.data) {
            return;
        }
        var proveedor = resultado.data;
        document.getElementById('detalleNombreProveedor').textContent = proveedor.nombre_proveedor;
        document.getElementById('detalleRazonSocial').textContent = proveedor.razon_social || '—';
        document.getElementById('detalleRfc').textContent = proveedor.rfc || '—';
        document.getElementById('detalleContacto').textContent = proveedor.contacto_nombre || '—';
        document.getElementById('detalleTelefono').textContent = proveedor.telefono || '—';
        document.getElementById('detalleEmail').textContent = proveedor.email || '—';
        document.getElementById('detalleDireccion').textContent = proveedor.direccion || '—';
        document.getElementById('detalleEstado').textContent = proveedor.estado === 'activo' ? 'Activo' : 'Inactivo';

        var enlaceEditar = document.getElementById('enlaceEditarProveedor');
        if (enlaceEditar) {
            enlaceEditar.href = 'proveedor_editar.html?id=' + id;
        }
    });

    window.supabaseClient.from('productos').select('id, sku, nombre_producto, stock_actual').eq('proveedor_id', id).then(function (resultado) {
        var tbody = document.getElementById('tablaProductosProveedorBody');
        if (!tbody || resultado.error) {
            return;
        }
        if (!resultado.data.length) {
            tbody.innerHTML = '<tr><td colspan="3">Este proveedor aún no tiene productos asociados.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        resultado.data.forEach(function (producto) {
            var fila = document.createElement('tr');
            fila.innerHTML =
                '<td>' + escaparHtml(producto.sku) + '</td>' +
                '<td>' + escaparHtml(producto.nombre_producto) + '</td>' +
                '<td>' + producto.stock_actual + '</td>';
            tbody.appendChild(fila);
        });
    });

    window.supabaseClient.from('compras').select('id, folio, fecha, total').eq('proveedor_id', id).order('fecha', { ascending: false }).then(function (resultado) {
        var tbody = document.getElementById('tablaComprasProveedorBody');
        if (!tbody || resultado.error) {
            return;
        }
        if (!resultado.data.length) {
            tbody.innerHTML = '<tr><td colspan="3">No hay compras registradas para este proveedor.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        resultado.data.forEach(function (compra) {
            var fila = document.createElement('tr');
            fila.innerHTML =
                '<td>' + escaparHtml(compra.fecha) + '</td>' +
                '<td>' + escaparHtml(compra.folio || '—') + '</td>' +
                '<td>' + formatoMoneda(compra.total) + '</td>';
            tbody.appendChild(fila);
        });
    });
}

/* ---------------------------------------------------------------------- */
/* Clientes                                                                */
/* ---------------------------------------------------------------------- */

function initListadoClientes() {
    var tbody = document.getElementById('tablaClientesBody');
    if (!tbody) {
        return;
    }

    var formBusqueda = document.getElementById('formBuscarClientes');
    var inputBuscar = document.getElementById('buscarCliente');
    var selectEstado = document.getElementById('filtrarEstadoCliente');

    function cargar() {
        var busqueda = inputBuscar.value.trim();
        var estado = selectEstado.value;

        var consulta = window.supabaseClient
            .from('clientes')
            .select('id, nombre_cliente, telefono, email, estado')
            .order('nombre_cliente');

        if (busqueda) {
            consulta = consulta.or('nombre_cliente.ilike.%' + busqueda + '%,rfc.ilike.%' + busqueda + '%,email.ilike.%' + busqueda + '%');
        }
        if (estado) {
            consulta = consulta.eq('estado', estado);
        }

        consulta.then(function (resultado) {
            if (resultado.error) {
                tbody.innerHTML = '<tr><td colspan="5">Error al cargar clientes: ' + escaparHtml(resultado.error.message) + '</td></tr>';
                return;
            }
            renderizarFilasClientes(tbody, resultado.data);
        });
    }

    formBusqueda.addEventListener('submit', function (evento) {
        evento.preventDefault();
        cargar();
    });

    cargar();
}

function renderizarFilasClientes(tbody, clientes) {
    var spanTotal = document.getElementById('totalClientesListado');

    if (!clientes.length) {
        tbody.innerHTML = '<tr><td colspan="5">No se encontraron clientes.</td></tr>';
        if (spanTotal) {
            spanTotal.textContent = '0';
        }
        return;
    }

    tbody.innerHTML = '';
    clientes.forEach(function (cliente) {
        var fila = document.createElement('tr');
        fila.innerHTML =
            '<td>' + escaparHtml(cliente.nombre_cliente) + '</td>' +
            '<td>' + escaparHtml(cliente.telefono || '—') + '</td>' +
            '<td>' + escaparHtml(cliente.email || '—') + '</td>' +
            '<td>' + (cliente.estado === 'activo' ? 'Activo' : 'Inactivo') + '</td>' +
            '<td><a href="cliente_detalle.html?id=' + cliente.id + '">Ver</a> <a href="cliente_editar.html?id=' + cliente.id + '">Editar</a></td>';
        tbody.appendChild(fila);
    });

    if (spanTotal) {
        spanTotal.textContent = String(clientes.length);
    }
}

function initClienteNuevo() {
    var formulario = document.getElementById('formClienteNuevo');
    if (!formulario) {
        return;
    }

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        if (!formulario.checkValidity()) {
            formulario.reportValidity();
            return;
        }

        var nuevoCliente = {
            nombre_cliente: document.getElementById('nombreCliente').value,
            tipo_cliente: document.getElementById('tipoCliente').value,
            rfc: document.getElementById('rfcCliente').value || null,
            telefono: document.getElementById('telefonoCliente').value,
            email: document.getElementById('emailCliente').value || null,
            direccion: document.getElementById('direccionCliente').value || null,
            estado: document.getElementById('estadoCliente').value
        };

        var boton = document.getElementById('btnGuardarCliente');
        boton.disabled = true;

        window.supabaseClient.from('clientes').insert(nuevoCliente).then(function (resultado) {
            boton.disabled = false;
            if (resultado.error) {
                mostrarMensajeFormulario(formulario, resultado.error.message, 'error');
                return;
            }
            window.location.href = 'clientes.html';
        });
    });
}

function initClienteEditar() {
    var formulario = document.getElementById('formClienteEditar');
    if (!formulario) {
        return;
    }

    var id = obtenerParametroUrl('id');
    if (!id) {
        mostrarMensajeFormulario(formulario, 'No se especificó un cliente para editar.', 'error');
        return;
    }
    document.getElementById('clienteId').value = id;

    window.supabaseClient.from('clientes').select('*').eq('id', id).single().then(function (resultado) {
        if (resultado.error || !resultado.data) {
            mostrarMensajeFormulario(formulario, 'No se pudo cargar el cliente solicitado.', 'error');
            return;
        }
        var cliente = resultado.data;
        document.getElementById('nombreCliente').value = cliente.nombre_cliente || '';
        document.getElementById('tipoCliente').value = cliente.tipo_cliente;
        document.getElementById('rfcCliente').value = cliente.rfc || '';
        document.getElementById('telefonoCliente').value = cliente.telefono || '';
        document.getElementById('emailCliente').value = cliente.email || '';
        document.getElementById('direccionCliente').value = cliente.direccion || '';
        document.getElementById('estadoCliente').value = cliente.estado;
    });

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        if (!formulario.checkValidity()) {
            formulario.reportValidity();
            return;
        }

        var cambios = {
            nombre_cliente: document.getElementById('nombreCliente').value,
            tipo_cliente: document.getElementById('tipoCliente').value,
            rfc: document.getElementById('rfcCliente').value || null,
            telefono: document.getElementById('telefonoCliente').value,
            email: document.getElementById('emailCliente').value || null,
            direccion: document.getElementById('direccionCliente').value || null,
            estado: document.getElementById('estadoCliente').value
        };

        var boton = document.getElementById('btnActualizarCliente');
        boton.disabled = true;

        window.supabaseClient.from('clientes').update(cambios).eq('id', id).then(function (resultado) {
            boton.disabled = false;
            if (resultado.error) {
                mostrarMensajeFormulario(formulario, resultado.error.message, 'error');
                return;
            }
            window.location.href = 'cliente_detalle.html?id=' + id;
        });
    });
}

function initClienteDetalle() {
    var elemento = document.getElementById('detalleNombreCliente');
    if (!elemento) {
        return;
    }

    var id = obtenerParametroUrl('id');
    if (!id) {
        return;
    }

    window.supabaseClient.from('clientes').select('*').eq('id', id).single().then(function (resultado) {
        if (resultado.error || !resultado.data) {
            return;
        }
        var cliente = resultado.data;
        document.getElementById('detalleNombreCliente').textContent = cliente.nombre_cliente;
        document.getElementById('detalleTipoCliente').textContent = cliente.tipo_cliente === 'persona_fisica' ? 'Persona física' : 'Persona moral';
        document.getElementById('detalleRfc').textContent = cliente.rfc || '—';
        document.getElementById('detalleTelefono').textContent = cliente.telefono || '—';
        document.getElementById('detalleEmail').textContent = cliente.email || '—';
        document.getElementById('detalleDireccion').textContent = cliente.direccion || '—';
        document.getElementById('detalleEstado').textContent = cliente.estado === 'activo' ? 'Activo' : 'Inactivo';

        var enlaceEditar = document.getElementById('enlaceEditarCliente');
        if (enlaceEditar) {
            enlaceEditar.href = 'cliente_editar.html?id=' + id;
        }
    });

    window.supabaseClient.from('ventas').select('id, folio, fecha, total').eq('cliente_id', id).order('fecha', { ascending: false }).then(function (resultado) {
        var tbody = document.getElementById('tablaVentasClienteBody');
        if (!tbody || resultado.error) {
            return;
        }
        if (!resultado.data.length) {
            tbody.innerHTML = '<tr><td colspan="3">No hay ventas registradas para este cliente.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        resultado.data.forEach(function (venta) {
            var fila = document.createElement('tr');
            fila.innerHTML =
                '<td>' + escaparHtml(venta.fecha) + '</td>' +
                '<td>' + escaparHtml(venta.folio || '—') + '</td>' +
                '<td>' + formatoMoneda(venta.total) + '</td>';
            tbody.appendChild(fila);
        });
    });
}
