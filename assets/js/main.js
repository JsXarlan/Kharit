/*
 * Kharit — Fase 3 (JavaScript)
 * Vainilla JS, sin frameworks ni módulos ES (evita fallos de CORS al abrir por file://).
 * Un único archivo cargado en las 43 páginas; cada init revisa primero si sus
 * elementos existen en la página actual antes de activarse.
 */

document.addEventListener('DOMContentLoaded', function () {
    initCalculoComprasVentas();
    initValidacionPassword();
    initDiferenciaAjuste();
    initAvisoSinBackend();
    initTogglePassword();
    initLoginForm();
    initRecuperarPasswordForm();
    initCambiarPasswordForm();
    initRestablecerPassword();
    initIndicadoresDashboard();
    initListadoProductos();
    initProductoNuevo();
    initProductoEditar();
    initProductoDetalle();
});

/* ---------------------------------------------------------------------- */
/* 1 y 2. Cálculo de totales + agregar/quitar línea (compras y ventas)     */
/* ---------------------------------------------------------------------- */

function initCalculoComprasVentas() {
    calcularTotalesDeTabla({
        tbodyId: 'tablaDetalleCompraBody',
        subtotalId: 'subtotalCompra',
        impuestosId: 'impuestosCompra',
        totalId: 'totalCompra'
    });

    calcularTotalesDeTabla({
        tbodyId: 'tablaDetalleVentaBody',
        subtotalId: 'subtotalVenta',
        impuestosId: 'impuestosVenta',
        totalId: 'totalVenta'
    });
}

function calcularTotalesDeTabla(config) {
    var tbody = document.getElementById(config.tbodyId);
    var subtotalInput = document.getElementById(config.subtotalId);
    var impuestosInput = document.getElementById(config.impuestosId);
    var totalInput = document.getElementById(config.totalId);

    if (!tbody || !subtotalInput || !impuestosInput || !totalInput) {
        return;
    }

    // Tasa fija como placeholder de Fase 3; en Fase 4 se leerá de configuracion_impuestos
    var TASA_IMPUESTO = 0.16;

    function recalcular() {
        var subtotalGeneral = 0;

        tbody.querySelectorAll('tr').forEach(function (fila) {
            var cantidadInput = fila.querySelector('input[name^="cantidad_"]');
            var precioInput = fila.querySelector('input[name^="precio_unitario_"]');
            var cantidad = parseFloat(cantidadInput && cantidadInput.value) || 0;
            var precio = parseFloat(precioInput && precioInput.value) || 0;
            var subtotalLinea = cantidad * precio;
            subtotalGeneral += subtotalLinea;

            var celdaSubtotal = fila.querySelector('td:last-child');
            var span = celdaSubtotal.querySelector('.linea-subtotal');
            var texto = formatoMoneda(subtotalLinea);
            if (span) {
                span.textContent = texto;
            } else {
                celdaSubtotal.textContent = texto;
            }
        });

        var impuestos = subtotalGeneral * TASA_IMPUESTO;
        var total = subtotalGeneral + impuestos;

        subtotalInput.value = subtotalGeneral.toFixed(2);
        impuestosInput.value = impuestos.toFixed(2);
        totalInput.value = total.toFixed(2);
    }

    tbody.addEventListener('input', recalcular);
    recalcular();

    initAgregarQuitarLinea(tbody, recalcular);
}

function initAgregarQuitarLinea(tbody, recalcular) {
    var fieldset = tbody.closest('fieldset');
    var contenedorBoton = fieldset ? fieldset.querySelector('p') : null;
    if (!contenedorBoton) {
        return;
    }

    var btnAgregar = document.createElement('button');
    btnAgregar.type = 'button';
    btnAgregar.className = 'btn-secondary';
    btnAgregar.textContent = 'Agregar producto';
    btnAgregar.addEventListener('click', function () {
        clonarFilaDeDetalle(tbody, recalcular);
        recalcular();
    });

    contenedorBoton.appendChild(btnAgregar);
}

function clonarFilaDeDetalle(tbody, recalcular) {
    var filas = tbody.querySelectorAll('tr');
    var ultimaFila = filas[filas.length - 1];
    var cantidadInput = ultimaFila.querySelector('input[name^="cantidad_"]');
    var coincidencia = cantidadInput.name.match(/_(\d+)$/);
    var n = parseInt(coincidencia[1], 10) + 1;

    var nuevaFila = ultimaFila.cloneNode(true);

    nuevaFila.querySelectorAll('[id]').forEach(function (el) {
        el.id = el.id.replace(/\d+$/, n);
    });
    nuevaFila.querySelectorAll('[name]').forEach(function (el) {
        el.name = el.name.replace(/_\d+$/, '_' + n);
    });
    nuevaFila.querySelectorAll('label[for]').forEach(function (el) {
        el.htmlFor = el.htmlFor.replace(/\d+$/, n);
        el.textContent = el.textContent.replace(/línea \d+/, 'línea ' + n);
    });
    nuevaFila.querySelectorAll('input').forEach(function (el) {
        el.value = '';
    });
    nuevaFila.querySelectorAll('select').forEach(function (el) {
        el.selectedIndex = 0;
    });

    var celdaSubtotal = nuevaFila.querySelector('td:last-child');
    celdaSubtotal.innerHTML = '';
    celdaSubtotal.classList.add('linea-subtotal-cell');

    var span = document.createElement('span');
    span.className = 'linea-subtotal';
    span.textContent = '$0.00';

    var btnQuitar = document.createElement('button');
    btnQuitar.type = 'button';
    btnQuitar.className = 'btn-quitar-linea';
    btnQuitar.setAttribute('aria-label', 'Quitar línea ' + n);
    btnQuitar.textContent = '✕ Quitar';
    btnQuitar.addEventListener('click', function () {
        nuevaFila.remove();
        recalcular();
    });

    celdaSubtotal.appendChild(span);
    celdaSubtotal.appendChild(btnQuitar);

    tbody.appendChild(nuevaFila);
}

function formatoMoneda(numero) {
    return '$' + numero.toFixed(2);
}

/* ---------------------------------------------------------------------- */
/* 3. Validación de coincidencia de contraseñas (perfil_password.html)     */
/* ---------------------------------------------------------------------- */

function initValidacionPassword() {
    var nueva = document.getElementById('passwordNueva');
    var confirmar = document.getElementById('passwordConfirmar');
    if (!nueva || !confirmar) {
        return;
    }

    var mensaje = document.createElement('p');
    mensaje.className = 'js-feedback js-feedback--error';
    mensaje.hidden = true;
    mensaje.textContent = 'Las contraseñas no coinciden.';
    confirmar.closest('.form-group').appendChild(mensaje);

    function validar() {
        if (confirmar.value && nueva.value !== confirmar.value) {
            confirmar.setCustomValidity('Las contraseñas no coinciden');
            mensaje.hidden = false;
        } else {
            confirmar.setCustomValidity('');
            mensaje.hidden = true;
        }
    }

    nueva.addEventListener('input', validar);
    confirmar.addEventListener('input', validar);
}

/* ---------------------------------------------------------------------- */
/* 4. Diferencia en vivo (inventario_ajuste.html)                         */
/* ---------------------------------------------------------------------- */

function initDiferenciaAjuste() {
    var sistema = document.getElementById('stockSistemaAjuste');
    var fisico = document.getElementById('stockFisicoAjuste');
    if (!sistema || !fisico) {
        return;
    }

    var resultado = document.createElement('p');
    resultado.className = 'js-feedback js-feedback--neutral';
    resultado.id = 'diferenciaAjuste';
    fisico.closest('.form-group').appendChild(resultado);

    function calcular() {
        var diferencia = (parseFloat(fisico.value) || 0) - (parseFloat(sistema.value) || 0);
        var signo = diferencia > 0 ? '+' : '';
        resultado.textContent = 'Diferencia: ' + signo + diferencia;

        resultado.classList.remove('js-feedback--success', 'js-feedback--error', 'js-feedback--neutral');
        if (diferencia > 0) {
            resultado.classList.add('js-feedback--success');
        } else if (diferencia < 0) {
            resultado.classList.add('js-feedback--error');
        } else {
            resultado.classList.add('js-feedback--neutral');
        }
    }

    fisico.addEventListener('input', calcular);
    sistema.addEventListener('input', calcular);
    calcular();
}

/* ---------------------------------------------------------------------- */
/* 5. Aviso de "sin backend todavía" al enviar formularios aún no          */
/*    conectados a Supabase (Fase 4 los va reemplazando módulo por módulo) */
/* ---------------------------------------------------------------------- */

function initAvisoSinBackend() {
    // A partir de Fase 4c, todos los formularios data-supabase-table tienen
    // lógica real propia (catalogos.js, compras-ventas.js, inventario.js,
    // configuracion.js, usuarios.js) y los de data-supabase-auth también
    // (main.js). Este selector queda vacío hoy; se deja como red de
    // seguridad para cualquier formulario nuevo que se agregue sin conectar.
    var TABLAS_YA_CONECTADAS = [
        'productos', 'categorias', 'proveedores', 'clientes',
        'compras', 'ventas', 'movimientos_inventario',
        'usuarios', 'roles', 'rol_permiso',
        'configuracion_empresa', 'configuracion_impuestos', 'configuracion_moneda'
    ];
    var selectorExclusion = TABLAS_YA_CONECTADAS.map(function (tabla) {
        return ':not([data-supabase-table="' + tabla + '"])';
    }).join('');
    var formularios = document.querySelectorAll('form[data-supabase-table]' + selectorExclusion);

    formularios.forEach(function (formulario) {
        formulario.addEventListener('submit', function (evento) {
            evento.preventDefault();

            if (!formulario.checkValidity()) {
                formulario.reportValidity();
                return;
            }

            mostrarAvisoSinBackend(formulario);
        });
    });
}

function mostrarAvisoSinBackend(formulario) {
    var aviso = formulario.querySelector('.js-feedback--submit');
    if (!aviso) {
        aviso = document.createElement('p');
        aviso.className = 'js-feedback js-feedback--success js-feedback--submit';
        formulario.appendChild(aviso);
    }
    aviso.textContent = 'Datos capturados correctamente. La conexión con Supabase se activará en la fase siguiente.';
    aviso.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ---------------------------------------------------------------------- */
/* 6. Mostrar/ocultar contraseña                                          */
/* ---------------------------------------------------------------------- */

function initTogglePassword() {
    document.querySelectorAll('input[type="password"]').forEach(function (input) {
        var boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'btn-toggle-password';
        boton.textContent = 'Mostrar contraseña';
        boton.setAttribute('aria-label', 'Mostrar u ocultar contraseña');

        boton.addEventListener('click', function () {
            var visible = input.type === 'text';
            input.type = visible ? 'password' : 'text';
            boton.textContent = visible ? 'Mostrar contraseña' : 'Ocultar contraseña';
        });

        input.insertAdjacentElement('afterend', boton);
    });
}

/* ---------------------------------------------------------------------- */
/* 7. Autenticación real con Supabase (Fase 4)                             */
/* ---------------------------------------------------------------------- */

function mostrarMensajeFormulario(formulario, texto, tipo) {
    var claseTipo = tipo === 'error' ? 'js-feedback--error' : 'js-feedback--success';
    var mensaje = formulario.querySelector('.js-feedback--resultado');
    if (!mensaje) {
        mensaje = document.createElement('p');
        mensaje.className = 'js-feedback js-feedback--resultado';
        formulario.appendChild(mensaje);
    }
    mensaje.classList.remove('js-feedback--success', 'js-feedback--error');
    mensaje.classList.add(claseTipo);
    mensaje.textContent = texto;
    mensaje.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function initLoginForm() {
    var formulario = document.getElementById('formLogin');
    if (!formulario) {
        return;
    }

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        if (!formulario.checkValidity()) {
            formulario.reportValidity();
            return;
        }

        var email = document.getElementById('email').value;
        var password = document.getElementById('password').value;
        var boton = document.getElementById('btnIniciarSesion');
        boton.disabled = true;

        window.supabaseClient.auth.signInWithPassword({ email: email, password: password })
            .then(function (resultado) {
                boton.disabled = false;
                if (resultado.error) {
                    mostrarMensajeFormulario(formulario, resultado.error.message, 'error');
                    return;
                }
                window.location.href = 'dashboard.html';
            });
    });
}

function initRecuperarPasswordForm() {
    var formulario = document.getElementById('formRecuperarPassword');
    if (!formulario) {
        return;
    }

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        if (!formulario.checkValidity()) {
            formulario.reportValidity();
            return;
        }

        var email = document.getElementById('email').value;
        var boton = document.getElementById('btnEnviarEnlace');
        boton.disabled = true;

        window.supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: KHARIT_SITE_URL + 'restablecer_password.html'
        }).then(function (resultado) {
            boton.disabled = false;
            if (resultado.error) {
                mostrarMensajeFormulario(formulario, resultado.error.message, 'error');
                return;
            }
            mostrarMensajeFormulario(formulario, 'Si el correo existe, te enviamos un enlace para restablecer tu contraseña.', 'success');
        });
    });
}

function initCambiarPasswordForm() {
    var formulario = document.getElementById('formCambiarPassword');
    if (!formulario) {
        return;
    }

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        if (!formulario.checkValidity()) {
            formulario.reportValidity();
            return;
        }

        var passwordActual = document.getElementById('passwordActual').value;
        var passwordNueva = document.getElementById('passwordNueva').value;
        var boton = document.getElementById('btnCambiarPassword');
        boton.disabled = true;

        window.supabaseClient.auth.getUser().then(function (resultadoUsuario) {
            var email = resultadoUsuario.data.user.email;
            return window.supabaseClient.auth.signInWithPassword({ email: email, password: passwordActual });
        }).then(function (resultadoReautenticacion) {
            if (resultadoReautenticacion.error) {
                boton.disabled = false;
                mostrarMensajeFormulario(formulario, 'La contraseña actual no es correcta.', 'error');
                return null;
            }
            return window.supabaseClient.auth.updateUser({ password: passwordNueva });
        }).then(function (resultadoActualizacion) {
            if (!resultadoActualizacion) {
                return;
            }
            boton.disabled = false;
            if (resultadoActualizacion.error) {
                mostrarMensajeFormulario(formulario, resultadoActualizacion.error.message, 'error');
                return;
            }
            mostrarMensajeFormulario(formulario, 'Contraseña actualizada correctamente.', 'success');
            formulario.reset();
        });
    });
}

function initRestablecerPassword() {
    var formulario = document.getElementById('formRestablecerPassword');
    if (!formulario) {
        return;
    }

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        if (!formulario.checkValidity()) {
            formulario.reportValidity();
            return;
        }

        var passwordNueva = document.getElementById('passwordNueva').value;
        var boton = document.getElementById('btnRestablecerPassword');
        boton.disabled = true;

        window.supabaseClient.auth.updateUser({ password: passwordNueva }).then(function (resultado) {
            boton.disabled = false;
            if (resultado.error) {
                mostrarMensajeFormulario(formulario, resultado.error.message, 'error');
                return;
            }
            mostrarMensajeFormulario(formulario, 'Contraseña actualizada. Ya puedes iniciar sesión.', 'success');
            formulario.reset();
            setTimeout(function () {
                window.location.href = 'login.html';
            }, 2000);
        });
    });
}

/* ---------------------------------------------------------------------- */
/* 8. Utilidades compartidas por los módulos conectados a Supabase         */
/* ---------------------------------------------------------------------- */

function obtenerParametroUrl(nombre) {
    var parametros = new URLSearchParams(window.location.search);
    return parametros.get(nombre);
}

function escaparHtml(texto) {
    if (texto === null || texto === undefined) {
        return '';
    }
    var div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

function poblarSelectCategorias(select) {
    if (!select) {
        return Promise.resolve();
    }
    return window.supabaseClient
        .from('categorias')
        .select('id, nombre_categoria')
        .eq('estado', 'activo')
        .order('nombre_categoria')
        .then(function (resultado) {
            if (resultado.error || !resultado.data) {
                return;
            }
            resultado.data.forEach(function (categoria) {
                var opcion = document.createElement('option');
                opcion.value = categoria.id;
                opcion.textContent = categoria.nombre_categoria;
                select.appendChild(opcion);
            });
        });
}

function poblarSelectProveedores(select) {
    if (!select) {
        return Promise.resolve();
    }
    return window.supabaseClient
        .from('proveedores')
        .select('id, nombre_proveedor')
        .eq('estado', 'activo')
        .order('nombre_proveedor')
        .then(function (resultado) {
            if (resultado.error || !resultado.data) {
                return;
            }
            resultado.data.forEach(function (proveedor) {
                var opcion = document.createElement('option');
                opcion.value = proveedor.id;
                opcion.textContent = proveedor.nombre_proveedor;
                select.appendChild(opcion);
            });
        });
}

/* ---------------------------------------------------------------------- */
/* 9. Módulo Productos (Fase 4 — implementación de referencia)             */
/* ---------------------------------------------------------------------- */

function initListadoProductos() {
    var tbody = document.getElementById('tablaProductosBody');
    if (!tbody) {
        return;
    }

    var formBusqueda = document.getElementById('formBuscarProductos');
    var selectCategoria = document.getElementById('filtrarCategoria');
    var selectProveedor = document.getElementById('filtrarProveedor');
    var selectEstado = document.getElementById('filtrarEstado');
    var inputBuscar = document.getElementById('buscarProducto');

    poblarSelectCategorias(selectCategoria);
    poblarSelectProveedores(selectProveedor);

    function cargarProductos() {
        var busqueda = inputBuscar.value.trim();
        var categoriaId = selectCategoria.value;
        var proveedorId = selectProveedor.value;
        var estado = selectEstado.value;

        var consulta = window.supabaseClient
            .from('productos')
            .select('id, sku, nombre_producto, precio_venta, stock_actual, stock_minimo, estado, categorias(nombre_categoria)')
            .order('nombre_producto');

        if (busqueda) {
            consulta = consulta.or('nombre_producto.ilike.%' + busqueda + '%,sku.ilike.%' + busqueda + '%');
        }
        if (categoriaId) {
            consulta = consulta.eq('categoria_id', categoriaId);
        }
        if (proveedorId) {
            consulta = consulta.eq('proveedor_id', proveedorId);
        }
        if (estado === 'activo' || estado === 'inactivo') {
            consulta = consulta.eq('estado', estado);
        }

        consulta.then(function (resultado) {
            if (resultado.error) {
                tbody.innerHTML = '<tr><td colspan="7">Error al cargar productos: ' + escaparHtml(resultado.error.message) + '</td></tr>';
                return;
            }

            var filas = resultado.data;
            if (estado === 'stock_bajo') {
                filas = filas.filter(function (producto) {
                    return producto.stock_actual < producto.stock_minimo;
                });
            }

            renderizarFilasProductos(tbody, filas);
        });
    }

    formBusqueda.addEventListener('submit', function (evento) {
        evento.preventDefault();
        cargarProductos();
    });

    cargarProductos();
}

function renderizarFilasProductos(tbody, productos) {
    var spanTotal = document.getElementById('totalProductosListado');

    if (!productos.length) {
        tbody.innerHTML = '<tr><td colspan="7">No se encontraron productos.</td></tr>';
        if (spanTotal) {
            spanTotal.textContent = '0';
        }
        return;
    }

    tbody.innerHTML = '';
    productos.forEach(function (producto) {
        var fila = document.createElement('tr');
        fila.innerHTML =
            '<td>' + escaparHtml(producto.sku) + '</td>' +
            '<td>' + escaparHtml(producto.nombre_producto) + '</td>' +
            '<td>' + escaparHtml(producto.categorias ? producto.categorias.nombre_categoria : 'Sin categoría') + '</td>' +
            '<td>' + formatoMoneda(producto.precio_venta) + '</td>' +
            '<td>' + producto.stock_actual + '</td>' +
            '<td>' + (producto.estado === 'activo' ? 'Activo' : 'Inactivo') + '</td>' +
            '<td><a href="producto_detalle.html?id=' + producto.id + '">Ver</a> <a href="producto_editar.html?id=' + producto.id + '">Editar</a></td>';
        tbody.appendChild(fila);
    });

    if (spanTotal) {
        spanTotal.textContent = String(productos.length);
    }
}

function initProductoNuevo() {
    var formulario = document.getElementById('formProductoNuevo');
    if (!formulario) {
        return;
    }

    poblarSelectCategorias(document.getElementById('categoriaProducto'));
    poblarSelectProveedores(document.getElementById('proveedorProducto'));

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        if (!formulario.checkValidity()) {
            formulario.reportValidity();
            return;
        }

        var nuevoProducto = {
            nombre_producto: document.getElementById('nombreProducto').value,
            sku: document.getElementById('skuProducto').value,
            codigo_barras: document.getElementById('codigoBarras').value || null,
            descripcion: document.getElementById('descripcionProducto').value || null,
            categoria_id: document.getElementById('categoriaProducto').value || null,
            proveedor_id: document.getElementById('proveedorProducto').value || null,
            unidad_medida: document.getElementById('unidadMedida').value,
            precio_compra: parseFloat(document.getElementById('precioCompra').value) || 0,
            precio_venta: parseFloat(document.getElementById('precioVenta').value) || 0,
            stock_actual: parseInt(document.getElementById('stockInicial').value, 10) || 0,
            stock_minimo: parseInt(document.getElementById('stockMinimo').value, 10) || 0,
            estado: document.getElementById('estadoProducto').value
        };

        var boton = document.getElementById('btnGuardarProducto');
        boton.disabled = true;

        window.supabaseClient.from('productos').insert(nuevoProducto).then(function (resultado) {
            boton.disabled = false;
            if (resultado.error) {
                mostrarMensajeFormulario(formulario, resultado.error.message, 'error');
                return;
            }
            window.location.href = 'productos.html';
        });
    });
}

function initProductoEditar() {
    var formulario = document.getElementById('formProductoEditar');
    if (!formulario) {
        return;
    }

    var idProducto = obtenerParametroUrl('id');
    if (!idProducto) {
        mostrarMensajeFormulario(formulario, 'No se especificó un producto para editar.', 'error');
        return;
    }

    document.getElementById('productoId').value = idProducto;

    Promise.all([
        window.supabaseClient.from('productos').select('*').eq('id', idProducto).single(),
        poblarSelectCategorias(document.getElementById('categoriaProducto')),
        poblarSelectProveedores(document.getElementById('proveedorProducto'))
    ]).then(function (resultados) {
        var resultadoProducto = resultados[0];
        if (resultadoProducto.error || !resultadoProducto.data) {
            mostrarMensajeFormulario(formulario, 'No se pudo cargar el producto solicitado.', 'error');
            return;
        }

        var producto = resultadoProducto.data;
        document.getElementById('nombreProducto').value = producto.nombre_producto || '';
        document.getElementById('skuProducto').value = producto.sku || '';
        document.getElementById('codigoBarras').value = producto.codigo_barras || '';
        document.getElementById('descripcionProducto').value = producto.descripcion || '';
        document.getElementById('categoriaProducto').value = producto.categoria_id || '';
        document.getElementById('proveedorProducto').value = producto.proveedor_id || '';
        document.getElementById('unidadMedida').value = producto.unidad_medida || 'pieza';
        document.getElementById('precioCompra').value = producto.precio_compra;
        document.getElementById('precioVenta').value = producto.precio_venta;
        document.getElementById('stockActual').value = producto.stock_actual;
        document.getElementById('stockMinimo').value = producto.stock_minimo;
        document.getElementById('estadoProducto').value = producto.estado;
    });

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        if (!formulario.checkValidity()) {
            formulario.reportValidity();
            return;
        }

        var cambios = {
            nombre_producto: document.getElementById('nombreProducto').value,
            sku: document.getElementById('skuProducto').value,
            codigo_barras: document.getElementById('codigoBarras').value || null,
            descripcion: document.getElementById('descripcionProducto').value || null,
            categoria_id: document.getElementById('categoriaProducto').value || null,
            proveedor_id: document.getElementById('proveedorProducto').value || null,
            unidad_medida: document.getElementById('unidadMedida').value,
            precio_compra: parseFloat(document.getElementById('precioCompra').value) || 0,
            precio_venta: parseFloat(document.getElementById('precioVenta').value) || 0,
            stock_minimo: parseInt(document.getElementById('stockMinimo').value, 10) || 0,
            estado: document.getElementById('estadoProducto').value
        };

        var boton = document.getElementById('btnActualizarProducto');
        boton.disabled = true;

        window.supabaseClient.from('productos').update(cambios).eq('id', idProducto).then(function (resultado) {
            boton.disabled = false;
            if (resultado.error) {
                mostrarMensajeFormulario(formulario, resultado.error.message, 'error');
                return;
            }
            window.location.href = 'producto_detalle.html?id=' + idProducto;
        });
    });
}

function initProductoDetalle() {
    var elementoNombre = document.getElementById('detalleNombre');
    if (!elementoNombre) {
        return;
    }

    var idProducto = obtenerParametroUrl('id');
    if (!idProducto) {
        return;
    }

    window.supabaseClient
        .from('productos')
        .select('*, categorias(nombre_categoria), proveedores(nombre_proveedor)')
        .eq('id', idProducto)
        .single()
        .then(function (resultado) {
            if (resultado.error || !resultado.data) {
                return;
            }

            var producto = resultado.data;
            document.getElementById('detalleSku').textContent = producto.sku;
            document.getElementById('detalleNombre').textContent = producto.nombre_producto;
            document.getElementById('detalleCategoria').textContent = producto.categorias ? producto.categorias.nombre_categoria : 'Sin categoría';
            document.getElementById('detalleProveedor').textContent = producto.proveedores ? producto.proveedores.nombre_proveedor : 'Sin proveedor';
            document.getElementById('detalleCodigoBarras').textContent = producto.codigo_barras || '—';
            document.getElementById('detalleDescripcion').textContent = producto.descripcion || '—';
            document.getElementById('detalleEstado').textContent = producto.estado === 'activo' ? 'Activo' : 'Inactivo';
            document.getElementById('detallePrecioCompra').textContent = formatoMoneda(producto.precio_compra);
            document.getElementById('detallePrecioVenta').textContent = formatoMoneda(producto.precio_venta);
            document.getElementById('detalleStockActual').textContent = producto.stock_actual;
            document.getElementById('detalleStockMinimo').textContent = producto.stock_minimo;

            var enlaceEditar = document.getElementById('enlaceEditarProducto');
            if (enlaceEditar) {
                enlaceEditar.href = 'producto_editar.html?id=' + idProducto;
            }
        });
}

/* ---------------------------------------------------------------------- */
/* 10. Indicadores reales del dashboard                                   */
/* ---------------------------------------------------------------------- */

function initIndicadoresDashboard() {
    var elementoTotal = document.getElementById('indicadorTotalProductos');
    if (!elementoTotal) {
        return;
    }

    window.supabaseClient
        .from('productos')
        .select('id, nombre_producto, stock_actual, stock_minimo', { count: 'exact' })
        .then(function (resultado) {
            if (resultado.error || !resultado.data) {
                return;
            }

            elementoTotal.textContent = String(resultado.count !== null ? resultado.count : resultado.data.length);

            var stockBajo = resultado.data.filter(function (producto) {
                return producto.stock_actual < producto.stock_minimo;
            });

            var elementoStockBajo = document.getElementById('indicadorStockBajo');
            if (elementoStockBajo) {
                elementoStockBajo.textContent = String(stockBajo.length);
            }

            renderizarTablaStockBajo(stockBajo);
        });
}

function renderizarTablaStockBajo(productos) {
    var tbody = document.getElementById('tablaStockBajoBody');
    if (!tbody) {
        return;
    }

    if (!productos.length) {
        tbody.innerHTML = '<tr><td colspan="4">No hay productos con stock bajo por el momento.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    productos.forEach(function (producto) {
        var fila = document.createElement('tr');
        fila.innerHTML =
            '<td>' + escaparHtml(producto.nombre_producto) + '</td>' +
            '<td>' + producto.stock_actual + '</td>' +
            '<td>' + producto.stock_minimo + '</td>' +
            '<td><a href="productos/producto_editar.html?id=' + producto.id + '">Editar</a></td>';
        tbody.appendChild(fila);
    });
}
