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
/* 5. Aviso de "sin backend todavía" al enviar cualquier formulario        */
/* ---------------------------------------------------------------------- */

function initAvisoSinBackend() {
    var formularios = document.querySelectorAll('form[data-supabase-table], form[data-supabase-auth]');

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
