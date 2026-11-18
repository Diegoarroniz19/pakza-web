/* PAKZA · pakza.com.mx · app.js (sin librerías).
   18/11/2026: PAKZA solo vende empaque personalizado. Ya no hay carrito, kits ni precios de producto.
   Aquí viven: menú del celular, botón flotante de WhatsApp, catálogo de medidas de línea (buscador y mensaje de WhatsApp con
   el código PKZ y [WEB]), origen por campaña de Google (?o=GOO) y la conversión de clic a WhatsApp (Google Ads).
   El catálogo ya viene escrito en el HTML (lo genera Web\herramientas\lista_estatica.py): sin JavaScript también se ve completo. */
(function () {
  'use strict';
  var d = document, raiz = d.documentElement, cuerpo = d.body;
  var TEL = '523313673566';
  var esCatalogo = cuerpo.getAttribute('data-pagina') === 'catalogo';
  var escritorio = matchMedia('(min-width:1024px)');
  var modal = null, abridor = null;

  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }
  function wa(texto) { return 'https://wa.me/' + TEL + '?text=' + encodeURIComponent(texto); }

  /* ---------- Menú del celular: foco atrapado, Esc y fondo quieto ---------- */
  function abrir(el, desde) {
    if (!el) return;
    if (modal) cerrar(true);
    modal = el;
    abridor = desde || d.activeElement;
    el.removeAttribute('inert');
    el.classList.add('abierto');
    raiz.classList.add('modal');
    $$('.menu-btn').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    setTimeout(function () { var f = $('[data-cerrar]', el); if (f) f.focus(); }, 60);
  }
  function cerrar(sinFoco) {
    var el = modal;
    if (!el) return;
    modal = null;
    el.classList.remove('abierto');
    el.setAttribute('inert', '');
    raiz.classList.remove('modal');
    $$('.menu-btn').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (!sinFoco && abridor && abridor.isConnected) abridor.focus();
  }
  function alCambiarPantalla() { if (escritorio.matches && modal) cerrar(true); }
  if (escritorio.addEventListener) escritorio.addEventListener('change', alCambiarPantalla); else if (escritorio.addListener) escritorio.addListener(alCambiarPantalla);
  d.addEventListener('keydown', function (e) {
    if (!modal) return;
    if (e.key === 'Escape') { e.preventDefault(); cerrar(); return; }
    if (e.key !== 'Tab') return;
    var f = $$('a[href],button,input,select,[tabindex="0"]', modal).filter(function (x) { return !x.disabled && x.getClientRects().length; });
    if (!f.length) return;
    var i = f.indexOf(d.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
  });
  addEventListener('pageshow', function (e) { if (e.persisted && modal) cerrar(true); });

  /* ---------- Botón flotante: en la portada se esconde mientras se ve un botón principal de WhatsApp ([data-oculta-flota]) ---------- */
  var flota = $('.wa-flota'), ocultan = $$('[data-oculta-flota]');
  if (flota && ocultan.length) {
    if ('IntersectionObserver' in window) {
      var vistos = [];
      var obsFlota = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var i = vistos.indexOf(e.target);
          if (e.isIntersecting && i < 0) vistos.push(e.target);
          else if (!e.isIntersecting && i >= 0) vistos.splice(i, 1);
        });
        flota.classList.toggle('oculto', vistos.length > 0);
      });
      ocultan.forEach(function (el) { obsFlota.observe(el); });
    } else flota.classList.remove('oculto');
  }

  /* ---------- Catálogo de medidas de línea ---------- */
  function quitaAcentos(s) { return String(s).toLowerCase().normalize ? String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') : String(s).toLowerCase(); }
  function abrirDestino() { // #CS-001 abre su grupo y marca la fila; #tc abre ese grupo
    var id = decodeURIComponent((location.hash || '').slice(1)), el = id && d.getElementById(id);
    if (!el) return;
    var g = el.closest ? el.closest('details') : null;
    if (g) g.open = true;
    if (el.classList.contains('lin-fila')) {
      el.classList.add('lin-marca');
      setTimeout(function () { if (el.scrollIntoView) el.scrollIntoView({ block: 'center' }); }, 30);
    }
  }
  function iniciarCatalogo() {
    var buscar = $('#buscar'), borrar = $('[data-borrar-busqueda]'), conteo = $('[data-conteo]'), sin = $('[data-sin]');
    var grupos = $$('.lin-grupo'), filas = $$('.lin-fila');
    var abiertoAntes = null;
    function filtrar() {
      var q = quitaAcentos(buscar.value.trim().replace(/(\d)\s*[x×]\s*(?=\d)/gi, '$1 ').replace(/\s+/g, ' ')), hay = 0;
      var crudo = quitaAcentos(buscar.value.trim());
      if (borrar) borrar.hidden = !buscar.value;
      if (q && !abiertoAntes) abiertoAntes = grupos.map(function (g) { return g.open; });
      var palabras = q ? q.split(' ') : [];
      filas.forEach(function (f) {
        var t = quitaAcentos(f.getAttribute('data-q') || '');
        var ok = !palabras.length || palabras.every(function (p) { return t.indexOf(p) > -1; }) || (crudo && t.indexOf(crudo) > -1);
        f.hidden = !ok;
        if (ok) hay++;
      });
      grupos.forEach(function (g, i) {
        var n = $$('.lin-fila:not([hidden])', g).length;
        g.hidden = !!palabras.length && !n;
        if (palabras.length && n) g.open = true;
        else if (!palabras.length && abiertoAntes) g.open = abiertoAntes[i];
      });
      if (!palabras.length) abiertoAntes = null;
      if (conteo) conteo.textContent = palabras.length ? (hay === 1 ? '1 medida' : hay + ' medidas') : '';
      if (sin) sin.hidden = !(palabras.length && !hay);
    }
    if (buscar) {
      buscar.addEventListener('input', filtrar);
      buscar.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); buscar.blur(); } });
    }
    if (borrar) borrar.addEventListener('click', function () { buscar.value = ''; filtrar(); buscar.focus(); });
    // WhatsApp de cada medida: con el código PKZ, la medida, las piezas por llenar y [WEB] al final
    $$('[data-cotizar]').forEach(function (a) {
      a.addEventListener('click', function () {
        var f = a.closest('.lin-fila'), g = a.closest('.lin-grupo');
        if (!f) return;
        var cod = $('.lin-cod', f).textContent, med = $('.lin-med', f).textContent.replace(/ × /g, ' x '), tipo = g ? $('.lin-tit b', g).textContent : '';
        a.href = wa('Hola PAKZA, quiero cotizar la caja ' + cod + ' (' + med + '), ' + tipo.toLowerCase() + '.\nPiezas: \nCon mi logo (sí o no): \n[WEB]');
      });
    });
    // WhatsApp de "medida personalizada" por grupo
    $$('[data-cotizar-medida]').forEach(function (a) {
      a.addEventListener('click', function () {
        var g = a.closest('.lin-grupo'), ahorra = !!$('.lin-suaje', g), tipo = $('.lin-tit b', g).textContent;
        a.href = wa('Hola PAKZA, quiero cotizar una caja a mi medida' + (ahorra ? ' (con suaje)' : ' (sin suaje)') + '.\nTipo: ' + tipo +
          '\nPiezas: \nMedidas (largo x ancho x alto, en cm): \n[WEB]');
      });
    });
    // Los botones de arriba abren el grupo al que llevan
    $$('.chips a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function () { var g = d.getElementById(a.getAttribute('href').slice(1)); if (g && g.tagName === 'DETAILS') g.open = true; });
    });
    addEventListener('hashchange', abrirDestino);
    abrirDestino();
  }

  /* ---------- Clics ---------- */
  d.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('button,a');
    if (!t) return;
    if (t.classList.contains('menu-btn')) abrir(d.getElementById('menu-movil'), t);
    else if (t.hasAttribute('data-cerrar')) cerrar();
    else if (modal && t.tagName === 'A' && (t.getAttribute('href') || '').charAt(0) === '#') cerrar(true);
  });

  if (esCatalogo) iniciarCatalogo();
  raiz.classList.add('listo');
})();

/* Origen por campaña (06/11/2026, Google Ads): si la página se abre con ?o=GOO-CM (o GOO-PL...), todos los enlaces de
   WhatsApp cambian el código [WEB] por [GOO-CM], así el bot sabe que el cliente llegó por el anuncio de Google.
   El origen se recuerda mientras la pestaña siga abierta (sessionStorage). */
(function () {
  var o = null;
  try {
    var m = /[?&]o=([A-Za-z]{2,3}(?:-[A-Za-z0-9]{1,4})?)(?:&|#|$)/.exec(location.search);
    if (m) { o = m[1].toUpperCase(); sessionStorage.setItem('pakza_origen', o); }
    else { o = sessionStorage.getItem('pakza_origen'); }
  } catch (e) {}
  if (!o || o === 'WEB') return;
  function cambia(a) {
    if (!a || !a.href || a.href.indexOf('wa.me/') < 0) return;
    a.href = a.href.split('%5BWEB%5D').join('%5B' + o + '%5D').split('[WEB]').join('[' + o + ']');
  }
  function alClic(e) { var a = e.target && e.target.closest ? e.target.closest('a') : null; cambia(a); }
  document.addEventListener('click', alClic, false);
  document.addEventListener('auxclick', alClic, false);
  document.addEventListener('contextmenu', alClic, false);
  var abrir = window.open;
  window.open = function (u) {
    if (typeof u === 'string' && u.indexOf('wa.me/') > -1) {
      arguments[0] = u.split('%5BWEB%5D').join('%5B' + o + '%5D').split('[WEB]').join('[' + o + ']');
    }
    return abrir.apply(window, arguments);
  };
})();

/* Conversión de Google Ads «Clic a WhatsApp (pakza.com.mx)» (07/11/2026). Diego: que Google mida clics de valor, no basura.
   Cada clic a WhatsApp (o a llamar) avisa a Google Ads; así se ve qué palabras traen clientes que escriben, no solo visitas.
   Un mismo clic no se cuenta dos veces. */
(function () {
  var ENVIO = 'AW-18561039715/WqjZCJ-WjLQdEOP6y5JF', ultimo = 0;
  function esContacto(u) { return typeof u === 'string' && /wa\.me\/|api\.whatsapp\.com|whatsapp:\/\/|^tel:/i.test(u); }
  function avisa() {
    var ahora = Date.now();
    if (ahora - ultimo < 1500 || typeof window.gtag !== 'function') return;
    ultimo = ahora;
    try { window.gtag('event', 'conversion', { send_to: ENVIO, transport_type: 'beacon' }); } catch (e) {}
  }
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (a && esContacto(a.getAttribute('href') || a.href)) avisa();
  }, true);
  var abrir = window.open;
  window.open = function (u) {
    if (esContacto(u)) avisa();
    return abrir.apply(window, arguments);
  };
})();
