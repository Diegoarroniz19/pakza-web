/* PAKZA · assets/portada.js · solo index.html (diseno_final.md §8). Sin librerías. Se carga con defer, después de app.js. */
(function () {
  'use strict';
  var d = document, raiz = d.documentElement;
  if (!raiz.classList.contains('js')) return; // el seguro del <head> ya dejó la página en modo "sin JS": se queda así
  window.pzListo = true;
  var TEL = '523313673566';
  var quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var celular = window.matchMedia('(max-width: 1023.98px)').matches;
  var IO = 'IntersectionObserver' in window;
  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }
  function wa(lineas) { return 'https://wa.me/' + TEL + '?text=' + encodeURIComponent(lineas.join('\n')); }
  function texto(s) { return String(s == null ? '' : s).trim(); }

  /* 1. Barra que se asienta (solo se nota en escritorio, donde la barra es fija) */
  var cab = $('.encabezado'), centinela = $('[data-centinela]');
  if (cab && centinela && IO) new IntersectionObserver(function (e) { cab.classList.toggle('pz-asentada', !e[0].isIntersecting); }).observe(centinela);

  /* 2. Aparición al bajar: una sola vez; en grupos, 70 ms entre tarjetas (variable --i) */
  var aparecen = $$('.pz-aparece');
  if (IO && !quieto) {
    var obsAp = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visto'); obsAp.unobserve(e.target); } });
    }, { threshold: 0.15 });
    aparecen.forEach(function (el) { obsAp.observe(el); });
  } else aparecen.forEach(function (el) { el.classList.add('visto'); });

  /* 3. Franjas que se mueven (giros y clientes): botón Pausar / Reanudar */
  $$('[data-pausa]').forEach(function (b) {
    var franja = d.getElementById(b.getAttribute('aria-controls'));
    if (!franja) return;
    b.addEventListener('click', function () {
      var pausar = !franja.classList.contains('pz-pausada');
      franja.classList.toggle('pz-pausada', pausar);
      $('.pz-pausa__txt', b).textContent = pausar ? 'Reanudar' : 'Pausar';
      $('use', b).setAttribute('href', pausar ? '#i-play' : '#i-pausa');
    });
  });

  /* 4. Contador de {cajas}: cuenta una vez, cuando app.js ya puso el número (html.listo) */
  function contar() {
    if (quieto || !IO) return;
    $$('[data-contar]').forEach(function (el) {
      var fin = parseInt(el.textContent, 10);
      if (!(fin > 0)) return;
      var obs = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        obs.disconnect();
        var t0 = performance.now(), hecho = false;
        // Seguro: a los 1,000 ms queda el número final aunque no corran los cuadros (pestaña oculta, buscadores, capturas)
        setTimeout(function () { hecho = true; el.textContent = String(fin); }, 1000);
        (function paso(t) {
          if (hecho) return;
          var x = Math.min(1, Math.max(0, (t - t0) / 900));
          el.textContent = String(Math.round(fin * (1 - Math.pow(1 - x, 3))));
          if (x < 1) requestAnimationFrame(paso); else hecho = true;
        })(t0);
      }, { threshold: 0.6 });
      obs.observe(el);
    });
  }
  if (raiz.classList.contains('listo')) contar();
  else if ('MutationObserver' in window) {
    var mo = new MutationObserver(function () { if (raiz.classList.contains('listo')) { mo.disconnect(); contar(); } });
    mo.observe(raiz, { attributes: true, attributeFilter: ['class'] });
  }

  /* 5. Te ayudamos a elegir: cada tarjeta abre su resultado (uno a la vez). El WhatsApp lleva solo los productos que siguen
        en el catálogo (app.js esconde los [data-prod] que ya no existen) */
  var rec = $('[data-rec]');
  if (rec) {
    var casos = $$('[data-caso]', rec);
    casos.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var abrir = btn.getAttribute('aria-expanded') !== 'true';
        casos.forEach(function (b) {
          b.setAttribute('aria-expanded', 'false');
          d.getElementById(b.getAttribute('aria-controls')).classList.remove('abierto');
        });
        if (!abrir) return;
        var res = d.getElementById(btn.getAttribute('aria-controls'));
        btn.setAttribute('aria-expanded', 'true');
        res.classList.add('abierto');
        if (celular && res.scrollIntoView) res.scrollIntoView({ block: 'nearest', behavior: quieto ? 'auto' : 'smooth' });
      });
    });
    $$('[data-rec-wa]', rec).forEach(function (a) {
      a.addEventListener('click', function () {
        var res = a.closest('.pz-rec__res'), lineas = [a.getAttribute('data-rec-wa')];
        var prods = $$('[data-prod]', res).filter(function (li) { return !li.hidden; })
          .map(function (li) { return li.getAttribute('data-nombre') + ' (' + li.getAttribute('data-prod') + ')'; });
        if (prods.length) lineas.push('Me interesa: ' + prods.join(', ') + '.');
        a.href = wa(lineas);
      });
    });
  }

  /* 6. Cajas con tu marca: tocar un tipo lo elige (uno a la vez; tocarlo otra vez lo quita) y lo pone en el mensaje */
  var BASE_MARCA = 'Hola PAKZA, quiero cotizar cajas con mi marca [WEB]';
  var med = $('[data-medida]'), tipos = med ? $$('[data-tipo]', med) : [], flota = $('.wa-flota');
  function msjMarca() {
    var t = tipos.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0], l = [BASE_MARCA];
    if (t) l.push('Tipo: ' + t.getAttribute('data-tipo'));
    l.push('Piezas: ', 'Medidas (largo x ancho x alto, en cm): ');
    return wa(l);
  }
  if (med) {
    var aviso = $('[data-tipo-elegido]', med), botonMarca = $('[data-marca-wa]', med);
    tipos.forEach(function (b) {
      b.addEventListener('click', function () {
        var elegir = b.getAttribute('aria-pressed') !== 'true';
        tipos.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        if (elegir) b.setAttribute('aria-pressed', 'true');
        if (aviso) aviso.textContent = elegir ? 'Vas a cotizar: ' + b.getAttribute('data-tipo') + '.' : 'Toca un tipo para incluirlo en tu mensaje.';
        if (botonMarca) botonMarca.href = msjMarca();
        if (flota && flota.classList.contains('pz-flota--marca')) flota.href = msjMarca();
      });
    });
    var puntos = $$('[data-punto]', med), riel = $('.pz-tipos', med);
    if (celular && IO && riel && puntos.length === tipos.length) {
      var obsPt = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          var i = tipos.indexOf(e.target);
          puntos.forEach(function (p, j) { p.classList.toggle('activo', i === j); });
        });
      }, { root: riel, threshold: 0.6 });
      tipos.forEach(function (t) { obsPt.observe(t); });
    }
  }

  /* 7. Botón flotante (celular): mientras "Con tu marca" pasa por el centro de la pantalla dice "Cotiza tu caja" */
  var secMarca = $('#a-la-medida');
  if (flota && secMarca && IO) {
    var txtFlota = $('.wa-flota__txt', flota), hrefGeneral = flota.getAttribute('href'), nombreGeneral = flota.getAttribute('aria-label');
    new IntersectionObserver(function (es) {
      var dentro = es[es.length - 1].isIntersecting;
      flota.classList.toggle('pz-flota--marca', dentro);
      if (txtFlota) txtFlota.textContent = dentro ? 'Cotiza tu caja' : 'WhatsApp';
      flota.setAttribute('href', dentro ? msjMarca() : hrefGeneral);
      flota.setAttribute('aria-label', dentro ? 'Cotiza tu caja con tu marca por WhatsApp' : nombreGeneral);
    }, { rootMargin: '-40% 0px -40% 0px' }).observe(secMarca);
  }

  /* 8. Clientes y opiniones reales (datos/confianza.json). Si falla o viene vacío se queda lo que ya trae el HTML */
  function nodo(tag, clase, txt) { var n = d.createElement(tag); if (clase) n.className = clase; if (txt != null) n.textContent = txt; return n; }
  function esDeGoogle(u) {
    try { return /^https:\/\//.test(u) && /(^|\.)(google\.com(\.mx)?|g\.page|goo\.gl)$/.test(new URL(u).hostname); }
    catch (e) { return false; }
  }
  function pintarClientes(lista) {
    var caja = $('[data-clientes]'), fila = caja && $('[data-clientes-fila]', caja);
    if (!fila) return;
    lista.forEach(function (c) {
      var li = nodo('li', 'pz-cliente'), logo = texto(c.logo);
      if (/^img\/[a-z0-9-]+\.(webp|png|svg)$/i.test(logo)) {
        var im = nodo('img'); im.src = logo; im.alt = texto(c.nombre); im.height = 32; im.decoding = 'async';
        im.onerror = function () { li.textContent = texto(c.nombre); };
        li.appendChild(im);
      } else li.textContent = texto(c.nombre);
      fila.appendChild(li);
    });
    if (lista.length >= 4) { // de 4 en adelante, franja que se mueve (con copia oculta y botón de pausa)
      var copia = fila.cloneNode(true);
      copia.removeAttribute('data-clientes-fila'); copia.setAttribute('aria-hidden', 'true'); copia.classList.add('pz-franja__copia');
      fila.parentNode.appendChild(copia);
      caja.classList.add('pz-clientes--mueve');
      var p = $('[data-pausa]', caja); if (p) p.hidden = false;
    }
    var tt = $$('[data-tit-clientes]', caja); if (tt[0]) tt[0].textContent = 'Clientes'; if (tt[1]) tt[1].textContent = 'Empresas que confían en nosotros';
    caja.hidden = false;
  }
  function estrellas(n) {
    var p = nodo('p', 'pz-estrellas'); p.setAttribute('role', 'img'); p.setAttribute('aria-label', n + ' de 5 estrellas');
    for (var i = 1; i <= 5; i++) p.insertAdjacentHTML('beforeend', '<svg class="ico' + (i <= n ? ' llena' : '') + '" aria-hidden="true"><use href="#i-estrella"/></svg>');
    return p;
  }
  function pintarOpiniones(lista) {
    var sec = $('#opiniones'), cont = sec && $('[data-opiniones]', sec);
    if (!cont) return;
    lista.slice(0, 3).forEach(function (o) {
      var t = texto(o.texto), largo = t.length > 220, art = nodo('article', 'pz-opinion');
      art.appendChild(estrellas(o.estrellas));
      art.appendChild(nodo('p', 'pz-opinion__txt', largo ? t.slice(0, 219).replace(/\s+\S*$/, '') + '…' : t));
      var autor = nodo('p', 'pz-opinion__autor', texto(o.autor));
      if (texto(o.negocio)) autor.appendChild(nodo('span', null, texto(o.negocio)));
      art.appendChild(autor);
      var a = nodo('a', 'liga', largo ? 'Leer en Google' : 'Ver en Google');
      a.href = o.url; a.target = '_blank'; a.rel = 'noopener';
      a.insertAdjacentHTML('beforeend', '<svg class="ico" aria-hidden="true"><use href="#i-externo"/></svg><span class="pz-sr"> (se abre en otra pestaña)</span>');
      art.appendChild(a);
      cont.appendChild(art);
    });
    var to = $$('[data-tit-opiniones]', sec); if (to[0]) to[0].textContent = 'Opiniones'; if (to[1]) to[1].textContent = 'Lo que dicen nuestros clientes'; if (to[2]) to[2].textContent = 'Opiniones reales en Google.';
    $$('[data-con-opiniones]', sec).forEach(function (el) { el.hidden = false; });
    $$('[data-sin-opiniones]', sec).forEach(function (el) { el.hidden = true; });
  }
  fetch('datos/confianza.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : {}; })
    .catch(function () { return {}; })
    .then(function (c) {
      c = c || {};
      var clientes = (Array.isArray(c.clientes) ? c.clientes : []).filter(function (x) { return x && x.permiso === true && texto(x.nombre); });
      var opiniones = (Array.isArray(c.opiniones) ? c.opiniones : []).filter(function (o) {
        return o && o.fuente === 'Google' && texto(o.texto) && texto(o.autor) && esDeGoogle(o.url) &&
          typeof o.estrellas === 'number' && o.estrellas % 1 === 0 && o.estrellas >= 1 && o.estrellas <= 5;
      });
      if (clientes.length) pintarClientes(clientes);
      if (opiniones.length) pintarOpiniones(opiniones);
    });
})();
