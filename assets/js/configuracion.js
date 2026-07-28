/*
 * Kharit — Fase 4 (Supabase)
 * Configuración: empresa, impuestos y moneda son tablas de una sola fila
 * (el formulario no soporta múltiples registros), así que se usa upsert
 * manual: si ya existe una fila se actualiza, si no existe se inserta.
 * Los respaldos siguen sin backend real (fuera de alcance de esta fase).
 */

document.addEventListener('DOMContentLoaded', function () {
    initConfiguracionEmpresa();
    initConfiguracionImpuestos();
    initConfiguracionMoneda();
});

function upsertConfiguracion(tabla, datos) {
    return window.supabaseClient.from(tabla).select('id').limit(1).then(function (resultado) {
        if (resultado.error) {
            return resultado;
        }
        if (resultado.data && resultado.data.length) {
            return window.supabaseClient.from(tabla).update(datos).eq('id', resultado.data[0].id);
        }
        return window.supabaseClient.from(tabla).insert(datos);
    });
}

function initConfiguracionEmpresa() {
    var formulario = document.getElementById('formConfiguracionEmpresa');
    if (!formulario) {
        return;
    }

    window.supabaseClient.from('configuracion_empresa').select('*').limit(1).then(function (resultado) {
        if (resultado.error || !resultado.data || !resultado.data.length) {
            return;
        }
        var empresa = resultado.data[0];
        document.getElementById('nombreEmpresa').value = empresa.nombre_empresa || '';
        document.getElementById('rfcEmpresa').value = empresa.rfc_empresa || '';
        document.getElementById('direccionEmpresa').value = empresa.direccion_empresa || '';
        document.getElementById('telefonoEmpresa').value = empresa.telefono_empresa || '';
    });

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        if (!formulario.checkValidity()) {
            formulario.reportValidity();
            return;
        }

        var datos = {
            nombre_empresa: document.getElementById('nombreEmpresa').value || null,
            rfc_empresa: document.getElementById('rfcEmpresa').value || null,
            direccion_empresa: document.getElementById('direccionEmpresa').value || null,
            telefono_empresa: document.getElementById('telefonoEmpresa').value || null
        };

        var boton = document.getElementById('btnGuardarEmpresa');
        boton.disabled = true;

        upsertConfiguracion('configuracion_empresa', datos).then(function (resultado) {
            boton.disabled = false;
            if (resultado.error) {
                mostrarMensajeFormulario(formulario, resultado.error.message, 'error');
                return;
            }
            mostrarMensajeFormulario(formulario, 'Datos de la empresa guardados.', 'success');
        });
    });
}

function initConfiguracionImpuestos() {
    var formulario = document.getElementById('formConfiguracionImpuestos');
    if (!formulario) {
        return;
    }

    window.supabaseClient.from('configuracion_impuestos').select('*').limit(1).then(function (resultado) {
        if (resultado.error || !resultado.data || !resultado.data.length) {
            return;
        }
        var impuesto = resultado.data[0];
        document.getElementById('nombreImpuesto').value = impuesto.nombre_impuesto || '';
        document.getElementById('porcentajeImpuesto').value = impuesto.porcentaje !== null ? impuesto.porcentaje : '';
        document.getElementById('impuestoActivoPorDefecto').checked = !!impuesto.activo_por_defecto;
    });

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();

        var datos = {
            nombre_impuesto: document.getElementById('nombreImpuesto').value || null,
            porcentaje: parseFloat(document.getElementById('porcentajeImpuesto').value) || 0,
            activo_por_defecto: document.getElementById('impuestoActivoPorDefecto').checked
        };

        var boton = document.getElementById('btnGuardarImpuestos');
        boton.disabled = true;

        upsertConfiguracion('configuracion_impuestos', datos).then(function (resultado) {
            boton.disabled = false;
            if (resultado.error) {
                mostrarMensajeFormulario(formulario, resultado.error.message, 'error');
                return;
            }
            mostrarMensajeFormulario(formulario, 'Impuestos guardados.', 'success');
        });
    });
}

function initConfiguracionMoneda() {
    var formulario = document.getElementById('formConfiguracionMoneda');
    if (!formulario) {
        return;
    }

    window.supabaseClient.from('configuracion_moneda').select('*').limit(1).then(function (resultado) {
        if (resultado.error || !resultado.data || !resultado.data.length) {
            return;
        }
        var moneda = resultado.data[0];
        document.getElementById('monedaBase').value = moneda.moneda_base;
        document.getElementById('simboloMoneda').value = moneda.simbolo_moneda;
        document.getElementById('formatoDecimales').value = moneda.decimales;
    });

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        if (!formulario.checkValidity()) {
            formulario.reportValidity();
            return;
        }

        var datos = {
            moneda_base: document.getElementById('monedaBase').value,
            simbolo_moneda: document.getElementById('simboloMoneda').value || '$',
            decimales: parseInt(document.getElementById('formatoDecimales').value, 10) || 2
        };

        var boton = document.getElementById('btnGuardarMoneda');
        boton.disabled = true;

        upsertConfiguracion('configuracion_moneda', datos).then(function (resultado) {
            boton.disabled = false;
            if (resultado.error) {
                mostrarMensajeFormulario(formulario, resultado.error.message, 'error');
                return;
            }
            mostrarMensajeFormulario(formulario, 'Moneda guardada.', 'success');
        });
    });
}
