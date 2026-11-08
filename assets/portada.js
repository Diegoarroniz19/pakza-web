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

  /* 0. Intro del logo + entrada del héroe (WOW). Las clases las pone el <head>: pz-prep (héroe escondido), pz-intro (pantalla de entrada).
        Seguros: la pantalla sale sola por CSS a los 3.4 s, el <head> quita pz-intro a los 3.7 s y el héroe se revela solo a los 4.5 s. */
  var ov = $('.pz-ov'), tSalir = 0, tFin = 0;
  function dividir(el) { // parte un título en palabras (.pw con --w); la puntuación pegada a un elemento viaja con él
    var n = 0, prev = null;
    Array.prototype.slice.call(el.childNodes).forEach(function (nodo) {
      if (nodo.nodeType === 1) { prev = nodo; return; }
      if (nodo.nodeType !== 3) return;
      var fr = d.createDocumentFragment();
      nodo.nodeValue.split(/([ \t\n\r]+)/).forEach(function (p, k) {
        if (!p) return;
        if (/^[ \t\n\r]+$/.test(p)) { fr.appendChild(d.createTextNode(' ')); return; }
        if (k === 0 && prev) { // ej. el punto después de <span>WhatsApp</span>
          var g = d.createElement('span'); g.className = 'pw pwg'; g.style.setProperty('--w', n++);
          prev.parentNode.insertBefore(g, prev); g.appendChild(prev); g.appendChild(d.createTextNode(p)); prev = null; return;
        }
        var s = d.createElement('span'); s.className = 'pw'; s.style.setProperty('--w', n++); s.textContent = p; fr.appendChild(s);
      });
      nodo.parentNode.replaceChild(fr, nodo);
      prev = null;
    });
    $$(':scope > :not(.pw)', el).forEach(function (x) { x.classList.add('pw'); x.style.setProperty('--w', n++); });
  }
  var h1 = $('.pz-heroe .pz-h1');
  if (h1 && !quieto) try { dividir(h1); } catch (e) { /* si falla, el título entra completo */ }
  var huboIntro = raiz.classList.contains('pz-intro');
  function heroIn() {
    if (quieto || raiz.classList.contains('pz-hero-in')) return;
    if (!huboIntro) raiz.classList.add('pz-rapido');
    raiz.classList.remove('pz-prep');
    raiz.classList.add('pz-hero-in');
  }
  function finIntro() { clearTimeout(tFin); raiz.classList.remove('pz-intro'); if (ov) ov.classList.remove('salir'); }
  function salirIntro() {
    clearTimeout(tSalir);
    if (!ov || !raiz.classList.contains('pz-intro')) return;
    ov.classList.add('salir');
    heroIn();
    tFin = setTimeout(finIntro, 750);
  }
  function mostrarIntro() { // repetir la intro al tocar el logo del encabezado
    if (!ov || quieto) return;
    clearTimeout(tSalir); clearTimeout(tFin);
    raiz.classList.remove('pz-intro'); ov.classList.remove('salir');
    void ov.offsetWidth; // reinicia las animaciones
    raiz.classList.add('pz-intro');
    tSalir = setTimeout(salirIntro, 2600);
  }
  if (ov && !quieto) {
    ov.addEventListener('pointerdown', salirIntro);
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') salirIntro(); });
    var logoEnc = $('.encabezado .ficha-logo');
    if (logoEnc) logoEnc.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault();
      window.scrollTo(0, 0);
      mostrarIntro();
    });
  }
  if (huboIntro) {
    var corrido = Date.now() - (window.pzT0 || Date.now());
    if (corrido >= 3300) { raiz.classList.remove('pz-intro'); heroIn(); }
    else tSalir = setTimeout(salirIntro, Math.max(0, 2600 - corrido));
  } else heroIn();

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

  /* 9. Secciones bajo el pliegue con content-visibility: al ir a un ancla se desactiva un momento para que el salto caiga exacto */
  function sinCv() {
    raiz.classList.add('pz-cv-off');
    clearTimeout(sinCv.t);
    sinCv.t = setTimeout(function () { raiz.classList.remove('pz-cv-off'); }, 1800);
  }
  if (location.hash) sinCv();
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (a && a.getAttribute('href').length > 1) sinCv();
  });
  addEventListener('hashchange', sinCv);

  /* 10. Interacciones (todo apagado con movimiento reducido; solo transform/opacity; listeners passive; rAF) */
  if (quieto) return;
  var fino = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  var escritorio = window.matchMedia('(min-width: 1024px)').matches;

  // 10a. Títulos de sección: las palabras suben escalonadas al aparecer
  if (IO) {
    var obsH = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('pz-hv'); obsH.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    $$('.pz-h2').forEach(function (h) {
      if (h.hasAttribute('data-tit-clientes') || h.hasAttribute('data-tit-opiniones')) return; // los llena portada.js después
      try { dividir(h); h.classList.add('pz-pal'); obsH.observe(h); } catch (e) { /* queda el título entero */ }
    });
  }

  // 10b. Barra de lectura y parallax del héroe (un solo listener de scroll, un solo rAF)
  var barra = d.createElement('div');
  barra.className = 'pz-prog'; barra.setAttribute('aria-hidden', 'true');
  d.body.appendChild(barra);
  var heroe = $('.pz-heroe'), visual = $('.pz-heroe__visual'), par = !!(escritorio && visual && heroe), altoHeroe = 0, espera = false;
  if (par) raiz.classList.add('pz-par');
  function medir() { altoHeroe = heroe ? heroe.offsetHeight : 0; }
  function pintarScroll() {
    espera = false;
    var y = window.pageYOffset || raiz.scrollTop, max = raiz.scrollHeight - window.innerHeight;
    barra.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0).toFixed(4) + ')';
    if (par && y < altoHeroe + 120) visual.style.transform = 'translate3d(0,' + Math.min(50, y * 0.22).toFixed(1) + 'px,0)';
  }
  function pedir() { if (!espera) { espera = true; requestAnimationFrame(pintarScroll); } }
  medir(); pintarScroll();
  addEventListener('scroll', pedir, { passive: true });
  addEventListener('resize', function () { medir(); pedir(); }, { passive: true });

  // 10c. Tarjetas: inclinación 3D suave (máx. 6°) con brillo que sigue al cursor
  if (fino) {
    $$('.pz-fam, .pz-tipo').forEach(function (c) {
      var r = null, sy0 = 0, px = .5, py = .5, raf = 0;
      c.classList.add('pz-tilt');
      function pintar() {
        raf = 0;
        c.style.setProperty('--ry', ((px - .5) * 12).toFixed(2) + 'deg');
        c.style.setProperty('--rx', ((.5 - py) * 12).toFixed(2) + 'deg');
        c.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        c.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      }
      c.addEventListener('pointerenter', function () { r = c.getBoundingClientRect(); sy0 = window.pageYOffset; }, { passive: true });
      c.addEventListener('pointermove', function (e) {
        if (!r) { r = c.getBoundingClientRect(); sy0 = window.pageYOffset; }
        var top = r.top - (window.pageYOffset - sy0); // el rectángulo se guarda una vez: sin leer el layout en cada movimiento
        px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
        py = Math.min(1, Math.max(0, (e.clientY - top) / r.height));
        if (!raf) raf = requestAnimationFrame(pintar);
      }, { passive: true });
      c.addEventListener('pointerleave', function () {
        r = null; px = .5; py = .5;
        if (!raf) raf = requestAnimationFrame(pintar);
      }, { passive: true });
    });

    // 10d. Botones principales de WhatsApp: efecto magnético leve y destello (el destello es CSS)
    $$('#heroe-wa, .pz-cierre .btn--primario, .btn--enc').forEach(function (b) {
      var rb = null, raf = 0, tx = 0, ty = 0;
      b.classList.add('pz-mag');
      function mover() { raf = 0; b.style.setProperty('--tx', tx.toFixed(1) + 'px'); b.style.setProperty('--ty', ty.toFixed(1) + 'px'); }
      b.addEventListener('pointerenter', function () { rb = b.getBoundingClientRect(); }, { passive: true });
      b.addEventListener('pointermove', function (e) {
        if (!rb) rb = b.getBoundingClientRect();
        tx = Math.max(-7, Math.min(7, (e.clientX - rb.left - rb.width / 2) * .16));
        ty = Math.max(-5, Math.min(5, (e.clientY - rb.top - rb.height / 2) * .22));
        if (!raf) raf = requestAnimationFrame(mover);
      }, { passive: true });
      b.addEventListener('pointerleave', function () { rb = null; tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(mover); }, { passive: true });
    });
  }
})();
