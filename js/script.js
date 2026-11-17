// =============================================================
//  Alerta para Todos · interacciones de la interfaz
//  Botones, toggles, filtros, pasos y lectura en voz alta.
// =============================================================
(function () {
  'use strict';

  var CLAVE = 'alertaParaTodos.preferencias';
  var pantalla = document.body.getAttribute('data-pantalla') || '';
  var $ = function (sel, raiz) { return (raiz || document).querySelector(sel); };
  var $$ = function (sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); };

  // ---------- utilidades ----------
  function leerPrefs() {
    try { return JSON.parse(localStorage.getItem(CLAVE)) || null; } catch (e) { return null; }
  }
  function guardarPrefs(p) {
    try { localStorage.setItem(CLAVE, JSON.stringify(p)); } catch (e) { /* sin almacenamiento */ }
  }
  var temporizador;
  function aviso(texto) {
    var el = $('#aviso');
    if (!el) return;
    el.textContent = texto;
    el.classList.add('ver');
    clearTimeout(temporizador);
    temporizador = setTimeout(function () { el.classList.remove('ver'); }, 2600);
  }
  function hablar(texto) {
    if (!('speechSynthesis' in window)) { aviso('Tu navegador no permite lectura en voz alta'); return; }
    window.speechSynthesis.cancel();
    var voz = new SpeechSynthesisUtterance(texto);
    voz.lang = 'es-PE';
    voz.rate = 0.95;
    window.speechSynthesis.speak(voz);
    aviso('Leyendo en voz alta…');
  }
  function textoDe(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }

  // ---------- escala del lienzo web (1440 px) en pantallas más chicas ----------
  var lienzo = $('.lienzo');
  function escalar() {
    if (!lienzo) return;
    var z = Math.min(1, window.innerWidth / 1440);
    lienzo.style.zoom = z < 1 ? z : '';
  }
  escalar();
  window.addEventListener('resize', escalar);

  // ---------- toggles ----------
  function pintarToggle(t, on) {
    t.classList.toggle('on', on);
    t.setAttribute('aria-checked', on ? 'true' : 'false');
    var estado = t.parentElement && $('[data-rol="estado-toggle"]', t.parentElement);
    if (estado) {
      estado.textContent = on ? 'Activado' : 'Desactivado';
      estado.style.color = on ? '#2E7D32' : '#616161';
    }
  }
  $$('[data-rol="toggle"]').forEach(function (t) {
    var fila = t.parentElement;
    var nombre = textoDe(fila).replace(/Activado|Desactivado/g, '').trim();
    t.setAttribute('aria-label', nombre);
    t.addEventListener('click', function () {
      var on = !t.classList.contains('on');
      pintarToggle(t, on);
      aviso(nombre.split(' ').slice(0, 3).join(' ') + (on ? ': activado' : ': desactivado'));
    });
  });

  // ---------- checkbox ----------
  $$('[data-rol="checkbox"]').forEach(function (c) {
    c.setAttribute('aria-label', 'Avisar a mi contacto de confianza');
    c.addEventListener('click', function () {
      var on = c.getAttribute('aria-checked') !== 'true';
      c.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  });

  // ---------- steppers (tamaño de texto y de botones) ----------
  var TAMANOS_BOTON = ['Pequeño', 'Mediano', 'Grande'];
  function valorStepper(s) { return textoDe($('[data-rol="valor"]', s)); }
  function ponerValor(s, v) { $('[data-rol="valor"] div', s).textContent = v; }
  $$('[data-rol="stepper"]').forEach(function (s) {
    var tipo = s.getAttribute('data-tipo');
    function cambiar(d) {
      var v = valorStepper(s);
      if (tipo === 'texto') {
        var n = parseInt(v, 10) + d * 2;
        n = Math.max(14, Math.min(28, n));
        ponerValor(s, n + ' px');
        aviso('Tamaño de texto: ' + n + ' px');
      } else {
        var i = TAMANOS_BOTON.indexOf(v) + d;
        i = Math.max(0, Math.min(TAMANOS_BOTON.length - 1, i));
        ponerValor(s, TAMANOS_BOTON[i]);
        aviso('Tamaño de botones: ' + TAMANOS_BOTON[i]);
      }
    }
    $('[data-accion="menos"]', s).addEventListener('click', function () { cambiar(-1); });
    $('[data-accion="mas"]', s).addEventListener('click', function () { cambiar(1); });
  });

  // ---------- preferencias de accesibilidad (se guardan entre sesiones) ----------
  var esConfig = pantalla === 'MW-03' || pantalla === 'MM-03';
  function estadoActual() {
    var toggles = $$('[data-rol="toggle"]').map(function (t) { return t.classList.contains('on'); });
    var steppers = $$('[data-rol="stepper"]').map(valorStepper);
    var contraste = $$('[data-rol="toggle"]').some(function (t) {
      return /Alto contraste/.test(textoDe(t.parentElement)) && t.classList.contains('on');
    });
    return { toggles: toggles, steppers: steppers, contraste: contraste };
  }
  if (esConfig) {
    var inicial = estadoActual();
    var guardadas = leerPrefs();
    if (guardadas && guardadas.pantalla === pantalla) {
      $$('[data-rol="toggle"]').forEach(function (t, i) { if (i in guardadas.toggles) pintarToggle(t, guardadas.toggles[i]); });
      $$('[data-rol="stepper"]').forEach(function (s, i) { if (guardadas.steppers[i]) ponerValor(s, guardadas.steppers[i]); });
    }
    $$('a.boton').forEach(function (a) {
      if (/Guardar/.test(textoDe(a))) {
        a.addEventListener('click', function () {
          var e = estadoActual();
          e.pantalla = pantalla;
          guardarPrefs(e);
          try { sessionStorage.setItem('alertaParaTodos.aviso', 'Preferencias guardadas'); } catch (err) { }
        });
      }
    });
    $$('[data-accion="restablecer"]').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('[data-rol="toggle"]').forEach(function (t, i) { pintarToggle(t, inicial.toggles[i]); });
        $$('[data-rol="stepper"]').forEach(function (s, i) { ponerValor(s, inicial.steppers[i]); });
        try { localStorage.removeItem(CLAVE); } catch (e) { }
        aviso('Preferencias restablecidas');
      });
    });
  }

  // mensaje guardado al volver al inicio
  try {
    var pendiente = sessionStorage.getItem('alertaParaTodos.aviso');
    if (pendiente) { sessionStorage.removeItem('alertaParaTodos.aviso'); setTimeout(function () { aviso(pendiente); }, 300); }
  } catch (e) { }

  // mobile: si el usuario guardó "Alto contraste", la alerta se abre en ese modo (MM-08)
  var prefs = leerPrefs();
  if (prefs && prefs.contraste && document.body.classList.contains('mobile')) {
    $$('a[data-alerta]').forEach(function (a) { a.setAttribute('href', 'alerta-alto-contraste.html'); });
  }

  // ---------- probar voz / vibración, registrar contacto ----------
  $$('[data-accion="probar"]').forEach(function (b) {
    var tarjeta = b.parentElement.parentElement;
    var esVibracion = /Vibración/.test(textoDe(tarjeta));
    b.addEventListener('click', function () {
      if (esVibracion) {
        if (navigator.vibrate) navigator.vibrate([600, 200, 600, 200, 600]);
        aviso('Probando patrón de vibración');
      } else {
        hablar('Hola. Esta es una prueba de voz de Alerta para Todos.');
      }
    });
  });
  $$('[data-accion="registrar"]').forEach(function (b) {
    b.addEventListener('click', function () {
      var campo = $('input', b.parentElement);
      var v = campo ? campo.value.trim() : '';
      if (!v) { aviso('Escribe el nombre o teléfono del contacto'); if (campo) campo.focus(); return; }
      aviso('Contacto registrado: ' + v);
      campo.value = '';
    });
  });
  $$('[data-accion="anadir-contacto"]').forEach(function (b) {
    b.addEventListener('click', function () { aviso('Elige un contacto de tu agenda para añadirlo'); });
  });

  // ---------- solicitar ayuda: tipo de asistencia ----------
  var opciones = $$('[data-rol="opcion-ayuda"]');
  if (opciones.length) {
    var selec = opciones.filter(function (o) { return o.getAttribute('aria-checked') === 'true'; })[0];
    var otra = opciones.filter(function (o) { return o !== selec; })[0];
    var claseSel = selec.className, claseNo = otra.className;
    var radio = function (o) { var ics = o.querySelectorAll('span'); return ics[ics.length - 1]; };
    var radioSel = radio(selec), radioNo = radio(otra);
    var html = { si: radioSel.innerHTML, no: radioNo.innerHTML, clsSi: radioSel.className, clsNo: radioNo.className };
    opciones.forEach(function (o) {
      o.addEventListener('click', function () {
        opciones.forEach(function (x) {
          var on = x === o, r = radio(x);
          x.className = on ? claseSel : claseNo;
          x.setAttribute('aria-checked', on ? 'true' : 'false');
          r.innerHTML = on ? html.si : html.no;
          r.className = on ? html.clsSi : html.clsNo;
        });
        try { sessionStorage.setItem('alertaParaTodos.tipo', o.getAttribute('data-tipo')); } catch (e) { }
      });
    });
    try { sessionStorage.setItem('alertaParaTodos.tipo', selec.getAttribute('data-tipo')); } catch (e) { }
  }

  // confirmación: muestra el tipo de solicitud elegido
  if (pantalla === 'MW-07') {
    var tipo = null;
    try { tipo = sessionStorage.getItem('alertaParaTodos.tipo'); } catch (e) { }
    if (tipo) {
      $$('div').forEach(function (d) {
        if (d.children.length === 0 && /Tu solicitud de EMERGENCIA/.test(d.textContent)) {
          d.textContent = d.textContent.replace('EMERGENCIA', tipo.toUpperCase());
        }
      });
    }
  }

  // ---------- historial: búsqueda y filtros ----------
  var filas = $$('[data-rol="fila"]');
  if (filas.length) {
    var buscador = $('[data-rol="buscador"]');
    var contador = $('[data-rol="contador-filas"]');
    var chips = $$('[data-rol="chip"]');
    var tipoChip = 'Todas';
    function quitarAcentos(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
    function filtrar() {
      var q = buscador ? quitarAcentos(buscador.value.trim()) : '';
      var selTipo = 'Todos', selEstado = 'Todos';
      $$('[data-rol="filtro"]').forEach(function (s) {
        if (/^Tipo:/.test(s.value)) selTipo = s.value.replace('Tipo: ', '');
        if (/^Estado:/.test(s.value)) selEstado = s.value.replace('Estado: ', '');
      });
      var visibles = 0;
      filas.forEach(function (f) {
        var t = quitarAcentos(textoDe(f));
        var tipoFila = f.getAttribute('data-tipo');
        var ok = (!q || t.indexOf(q) !== -1) &&
          (selTipo === 'Todos' || tipoFila.indexOf(selTipo) === 0) &&
          (selEstado === 'Todos' || textoDe(f).indexOf(selEstado) !== -1) &&
          (tipoChip === 'Todas' || tipoFila.indexOf(tipoChip) === 0);
        f.classList.toggle('oculto', !ok);
        if (ok) visibles++;
      });
      if (contador) contador.textContent = 'Mostrando ' + visibles + ' de ' + filas.length + ' alertas';
      return visibles;
    }
    if (buscador) buscador.addEventListener('input', filtrar);
    $$('[data-rol="filtro"]').forEach(function (s) { s.addEventListener('change', filtrar); });
    $$('[data-accion="buscar"]').forEach(function (b) {
      b.addEventListener('click', function () { var n = filtrar(); aviso(n ? n + ' alerta(s) encontradas' : 'No hay alertas con ese filtro'); });
    });
    if (chips.length) {
      var activo = chips[0], inactivo = chips[1];
      var cA = activo.className, cI = inactivo.className;
      var tA = activo.querySelector('div').className, tI = inactivo.querySelector('div').className;
      chips.forEach(function (c) {
        c.setAttribute('aria-pressed', c === activo ? 'true' : 'false');
        c.addEventListener('click', function () {
          chips.forEach(function (x) {
            var on = x === c;
            x.className = on ? cA : cI;
            x.querySelector('div').className = on ? tA : tI;
            x.setAttribute('aria-pressed', on ? 'true' : 'false');
          });
          tipoChip = c.getAttribute('data-valor');
          filtrar();
        });
      });
    }
  }

  // ---------- alerta activa: pasos, voz y tamaño de texto ----------
  var PASOS = [
    'Agáchate, cúbrete y sujétate.',
    'Cuando termine el movimiento, evacúa por la ruta señalizada.',
    'Dirígete al punto de reunión y espera indicaciones.'
  ];
  var pasos = $$('[data-rol="paso"]');
  var instruccion = $('[data-rol="texto-instruccion"]');
  var pasoActual = 0;
  var esAlerta = pantalla === 'MW-02' || pantalla === 'MM-02' || pantalla === 'MM-08';
  function actualizarProgreso() {
    var c = $('[data-rol="contador-paso"]');
    if (c) c.textContent = /PASO/.test(c.textContent) ? 'PASO ' + (pasoActual + 1) + ' DE 3' : 'Paso ' + (pasoActual + 1) + ' de 3';
    var barra = $('[data-rol="progreso"] > div');
    if (barra) { barra.style.width = ((pasoActual + 1) / 3 * 100) + '%'; barra.style.transition = 'width .3s'; }
  }
  if (esAlerta && pasos.length) {
    if (pasos.length === 3) {
      // web: los 3 pasos están visibles; al hacer clic en uno se marca como actual
      var claseActual = pasos[0].className, claseSig = pasos[1].className;
      var circActual = pasos[0].firstElementChild.className, circSig = pasos[1].firstElementChild.className;
      var numActual = pasos[0].firstElementChild.firstElementChild.className, numSig = pasos[1].firstElementChild.firstElementChild.className;
      var txtActual = pasos[0].lastElementChild.className, txtSig = pasos[1].lastElementChild.className;
      var irA = function (i) {
        pasoActual = i;
        pasos.forEach(function (p, k) {
          var on = k === i;
          p.className = on ? claseActual : claseSig;
          p.firstElementChild.className = on ? circActual : circSig;
          p.firstElementChild.firstElementChild.className = on ? numActual : numSig;
          p.lastElementChild.className = on ? txtActual : txtSig;
          p.setAttribute('aria-current', on ? 'step' : 'false');
        });
        actualizarProgreso();
      };
      pasos.forEach(function (p, k) {
        p.style.cursor = 'pointer';
        p.setAttribute('tabindex', '0');
        p.addEventListener('click', function () { irA(k); });
        p.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); irA(k); } });
      });
    }
    $$('[data-accion="siguiente-paso"]').forEach(function (b) {
      b.addEventListener('click', function () {
        pasoActual = (pasoActual + 1) % 3;
        var p = pasos[0];
        p.firstElementChild.firstElementChild.textContent = String(pasoActual + 1);
        $('[data-rol="texto-paso"]', p).textContent = PASOS[pasoActual];
        actualizarProgreso();
      });
    });
  }
  function textoPaso() { return PASOS[pasoActual]; }
  $$('[data-accion="escuchar-instrucciones"], [data-accion="escuchar"]').forEach(function (b) {
    b.addEventListener('click', function () {
      hablar('Alerta de sismo. ' + textoDe(instruccion).replace(/[“”]/g, '') + ' Paso ' + (pasoActual + 1) + ': ' + textoPaso());
    });
  });
  $$('[data-accion="repetir-paso"], [data-accion="repetir"]').forEach(function (b) {
    b.addEventListener('click', function () { hablar('Paso ' + (pasoActual + 1) + ': ' + textoPaso()); });
  });
  $$('[data-accion="aumentar-texto"], [data-accion="texto"]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!instruccion) return;
      var actual = parseFloat(getComputedStyle(instruccion).fontSize);
      var base = parseFloat(instruccion.getAttribute('data-base') || actual);
      instruccion.setAttribute('data-base', base);
      var nuevo = actual + 2 > base + 8 ? base : actual + 2;
      instruccion.style.fontSize = nuevo + 'px';
      aviso(nuevo === base ? 'Texto en tamaño normal' : 'Texto más grande');
    });
  });

})();
