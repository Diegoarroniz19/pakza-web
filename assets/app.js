/* PAKZA · pakza.com.mx · app.js (sin librerías).
   Precios y montos: SOLO de datos/catalogo.json (lo genera el sistema). Kits: datos/kits.json (ids y cantidades).
   El pedido vive en el navegador (localStorage "pakza_pedido_v1", solo ids y cantidades) y se manda por WhatsApp con [WEB].
   MODO SIN PRECIOS (Diego, 03/11/2026): con "mostrar_precios": false en catalogo.json (o si ningún producto trae precio) la página no pinta
   ningún monto de producto y pide cotización por WhatsApp. El HTML ya viene en esa versión; cada texto con precios vive en data-con-precios
   y este archivo lo pone solo si hay precios. La lógica de precios sigue aquí, condicionada por SIN. */
(function () {
  'use strict';
  var d = document, raiz = d.documentElement, cuerpo = d.body;
  var BASE = new URL('../', d.currentScript.src).href;
  var SITIO = 'https://pakza.com.mx/';
  var CLAVE = 'pakza_pedido_v1';
  var EFECTIVO_HASTA = 1000; // Regla "Forma de pago" del bot. Si catalogo.json trae "efectivo_hasta", manda ese valor.
  var GENERAL = 'Hola PAKZA, vi su página y quiero cotizar [WEB]';
  var FAM = { // botón, título de la sección y línea de ayuda (brief/contenido.md 3.3)
    playo: ['Playo', 'Playo y emplaye', 'Película estirable para emplayar tarimas, muebles y bultos. El calibre es el grosor: 50 y 60 para cargas ligeras; 70 y 80 para pesadas.'],
    cinta: ['Cintas', 'Cintas', 'Transparente y canela para cerrar cajas, ducto para trabajo pesado y delimitadora para marcar pisos y áreas.'],
    cajas: ['Cajas', 'Cajas de cartón', 'Cartón corrugado por pieza: paquetería, mudanza, archivo y calzado. A mayor ECT, más resistente; el doble corrugado es para lo pesado.'],
    burbuja: ['Burbuja', 'Burbuja y protección', 'Poliburbuja y espuma de polietileno para proteger vidrio, cerámica, electrónicos y muebles.'],
    bolsas: ['Bolsas', 'Bolsas para paquetería', 'Bolsas de seguridad autoadheribles para mandar ropa y productos que no se rompen.'],
    kraft: ['Kraft', 'Papel kraft', 'Para envolver, rellenar huecos en la caja y proteger superficies.']
  };
  var esCatalogo = cuerpo.getAttribute('data-pagina') === 'catalogo';
  var escritorio = matchMedia('(min-width:1024px)');
  var tel = '523313673566', cat = null, kits = { destacados: [], kits: [] }, porId = {}, items = [], respaldo = null, imagenes = {};
  var SIN = true; // modo sin precios. Vale así antes de leer el JSON y si el JSON falla: un monto de producto nunca sale por error
  var COTIZA = 'Te cotizamos al momento por WhatsApp';
  // Imagen de cada producto para Google: datos/imagenes.json (id -> img/c-…-768.webp). Si falta el id, la de su familia; nunca la de otra.
  var IMG_FAM = { playo: 'c-playo-18', cinta: 'c-cinta-transparente', cajas: 'c-caja', burbuja: 'c-burbuja-chica', bolsas: 'c-bolsas', kraft: 'c-kraft' };
  var panel = d.getElementById('pedido'), velo = $('[data-velo]'), barra = $('[data-barra]'), modal = null, abridor = null;
  var tTira = 0, tAviso = 0, tDeshacer = 0;

  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function ico(id, cls) { return '<svg class="ico' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; }
  var f0 = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  var f2 = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function dinero(n) { n = Math.round(n * 100) / 100; return (n % 1 ? f2 : f0).format(n); }
  function wa(texto) { return 'https://wa.me/' + tel + '?text=' + encodeURIComponent(texto); }
  // Medidas con "×" y sin cortes a media medida, solo para pintar. El mensaje de WhatsApp sigue con "x" (brief/contenido.md 3.6).
  function medida(s) {
    return String(s).replace(/ x /g, ' × ').replace(/(\d) (cm|mm|m|kg|g|ft)\b/g, '$1 $2').replace(/\b(calibre|ECT) (\d)/gi, '$1 $2');
  }
  function conPrecio(p) { return !!p && typeof p.precio === 'number' && p.precio > 0; }
  function fecha(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
    return m ? new Date(+m[1], m[2] - 1, +m[3]).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  }

  /* ---------- Productos: unidad, piezas y "sale a" (brief/contenido.md, regla 0.3) ---------- */
  function piezas(p) {
    if (p.familia === 'kraft' || /kg/i.test(p.presentacion)) return 1;
    if (p.piezas > 1) return p.piezas;
    var m = /^(?:paquete|caja)\s+(\d+)/i.exec(p.presentacion);
    return m ? +m[1] : 1;
  }
  function unidad(p) {
    var pr = String(p.presentacion).trim(), m;
    if (/^rollo$/i.test(pr)) return 'el rollo';
    if (/^pieza$/i.test(pr)) return { cajas: 'la caja', bolsas: 'la bolsa', playo: 'el rollo', cinta: 'el rollo', burbuja: 'el rollo' }[p.familia] || 'la pieza';
    if ((m = /^paquete\s+(.+)$/i.exec(pr))) return 'el paquete de ' + m[1];
    if ((m = /^caja\s+(.+)$/i.exec(pr))) return 'la caja de ' + m[1];
    return pr.toLowerCase();
  }
  function saleA(p) {
    var n = piezas(p);
    if (n <= 1) return '';
    var pu = p.precio_pieza != null ? p.precio_pieza : p.precio / n;
    var suelta = cat.productos.filter(function (q) { return q.producto === p.producto && q.id !== p.id && piezas(q) === 1; })[0];
    if (suelta && pu >= suelta.precio) return '';
    return 'sale a <b>' + dinero(pu) + '</b> + IVA por ' + ({ cajas: 'caja', bolsas: 'bolsa' }[p.familia] || 'rollo');
  }
  function bloquePrecio(p) {
    if (SIN) return '<p class="cotiza">' + ico('wa', 'ico--marca') + '<span>' + COTIZA + '</span></p>';
    var s = saleA(p);
    return '<p class="precio"><span class="precio__monto">' + dinero(p.precio) + '</span> <span class="precio__unidad">' + esc(unidad(p)) +
      '</span></p>' + (s ? '<p class="precio__sale">' + s + '</p>' : '') + '<p class="precio__iva">+ IVA</p>';
  }
  function imagen(p) {
    var r = imagenes[p.id];
    if (!(typeof r === 'string' && /^img\/[\w-]+\.webp$/.test(r))) r = IMG_FAM[p.familia] ? 'img/' + IMG_FAM[p.familia] + '-768.webp' : '';
    return r ? SITIO + r : '';
  }
  function preguntar(p) { return 'Hola PAKZA, quiero información de: ' + p.producto + ', ' + p.presentacion + ' (' + p.id + ') [WEB]'; }

  /* ---------- Pedido ---------- */
  function cant(id) { for (var i = 0; i < items.length; i++) if (items[i][0] === id) return items[i][1]; return 0; }
  function poner(id, c) {
    c = Math.max(0, Math.min(999, Math.floor(+c) || 0));
    for (var i = 0; i < items.length && items[i][0] !== id; i++);
    if (i < items.length) { if (c) items[i][1] = c; else items.splice(i, 1); } else if (c) items.push([id, c]);
  }
  /* Desde 03/11/2026 (Diego): el precio publicado va SIN IVA y con "+ IVA". El minimo y la entrega gratis se miden con el total con IVA. */
  function r2(n) { return Math.round(n * 100) / 100; }
  function suma(lista) { return r2(lista.reduce(function (s, x) { return s + x[1] * porId[x[0]].precio; }, 0)); } // subtotal sin IVA
  function desglose(lista) { var sub = suma(lista), iva = r2(sub * 0.16); return { sub: sub, iva: iva, tot: r2(sub + iva) }; }
  function total() { return desglose(items).tot; } // total con IVA
  function leer() {
    var v = null, vistos = {};
    try { v = JSON.parse(localStorage.getItem(CLAVE) || 'null'); } catch (e) { v = null; }
    return (v && Array.isArray(v.items) ? v.items : []).filter(function (x) {
      var ok = Array.isArray(x) && porId[x[0]] && x[1] >= 1 && !vistos[x[0]];
      if (ok) vistos[x[0]] = 1;
      return ok;
    }).map(function (x) { return [x[0], Math.min(999, Math.floor(x[1]))]; });
  }
  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify({ items: items })); } catch (e) { /* sin guardar */ } }

  function htmlAccion(id, osc, sinEtiqueta) {
    var c = cant(id), p = porId[id];
    if (!c) {
      return '<button type="button" class="btn ' + (osc ? 'btn--inverso' : 'btn--secundario') + '" data-agregar="' + id + '"' +
        // el texto visible es "Agregar" también sin precios: "Agregar a mi lista" no cabía en 1 renglón a 390 px y se cortaba
        (SIN ? ' aria-label="' + esc('Agregar a mi lista: ' + p.producto + ', ' + p.presentacion) + '">Agregar' : '>Agregar') + '</button>';
    }
    var n = esc('Cantidad de ' + p.producto + ', ' + p.presentacion);
    return '<div class="cant' + (osc ? ' cant--osc' : '') + '" role="group" aria-label="' + n + '">' +
      '<button type="button" class="cant__btn" data-menos="' + id + '" aria-label="Quitar uno">' + ico('menos') + '</button>' +
      '<input class="cant__num" type="number" inputmode="numeric" min="0" max="999" value="' + c + '" data-cant="' + id + '" aria-label="' + n + '">' +
      '<button type="button" class="cant__btn" data-mas="' + id + '" aria-label="Agregar uno">' + ico('mas') + '</button></div>' +
      (sinEtiqueta ? '' : '<p class="en-pedido">' + ico('check') + (SIN ? 'En tu lista' : 'En tu pedido') + '</p>');
  }
  function pintarAcciones(id) {
    $$(id ? '[data-accion="' + id + '"]' : '[data-accion]').forEach(function (el) {
      var i = el.getAttribute('data-accion'), c = cant(i), inp = $('input', el);
      if (!porId[i]) return;
      if (c && inp) { if (inp !== d.activeElement) inp.value = c; return; }
      if (!c && !inp && el.firstElementChild) return;
      el.innerHTML = htmlAccion(i, el.hasAttribute('data-osc'), el.hasAttribute('data-sin-etiqueta'));
      var t = el.closest('.tprecio');
      if (t) t.classList.toggle('tprecio--lleno', !!c);
    });
  }
  function avance(t) {
    var min = cat.pedido_minimo, gr = cat.envio_gratis_desde;
    if (t < min) return { largo: 'Te faltan <strong>' + dinero(min - t) + '</strong> para el pedido mínimo de ' + dinero(min) + '.',
      corto: 'Te faltan <b>' + dinero(min - t) + '</b> para el pedido mínimo', pct: t / min };
    if (t < gr) return { largo: 'Ya pasaste el mínimo. Te faltan <strong>' + dinero(gr - t) + '</strong> para la entrega gratis a domicilio; si no, lo recoges sin costo.',
      corto: 'Te faltan <b>' + dinero(gr - t) + '</b> para la entrega gratis', pct: t / gr };
    return { ok: 1, largo: ico('check') + '<span>Tu pedido ya tiene entrega gratis a domicilio en la ZMG.</span>', corto: 'Tu pedido ya tiene entrega gratis', pct: 1 };
  }
  function pintarLineas() {
    var ul = $('[data-lineas]', panel), viejas = {};
    $$('[data-linea]', ul).forEach(function (li) { viejas[li.getAttribute('data-linea')] = li; });
    items.forEach(function (x, i) {
      var p = porId[x[0]], li = viejas[x[0]];
      if (!li) {
        li = d.createElement('li');
        li.className = 'linea';
        li.setAttribute('data-linea', p.id);
        li.innerHTML = '<p class="linea__nombre">' + esc(medida(p.producto)) + '</p><p class="linea__pres">' + esc(medida(p.presentacion)) + '</p>' +
          '<div class="linea__fila"><div class="accion" data-accion="' + p.id + '" data-sin-etiqueta></div>' +
          '<button type="button" class="liga" data-quitar="' + p.id + '" aria-label="' + esc('Quitar ' + p.producto + ', ' + p.presentacion) + '">Quitar</button>' +
          (SIN ? '' : '<span class="linea__importe"></span>') + '</div>';
      }
      if (ul.children[i] !== li) ul.insertBefore(li, ul.children[i] || null);
      if (!SIN) $('.linea__importe', li).textContent = dinero(x[1] * p.precio);
      delete viejas[x[0]];
    });
    Object.keys(viejas).forEach(function (k) { viejas[k].remove(); });
  }
  function pintarTira(a) {
    if (!barra) return;
    if (tTira) { // el aviso "Agregaste…" sigue a la vista, pero con el total de ahora (QA 3)
      var b = $('[data-llevas]', barra);
      if (b) b.textContent = dinero(total()) + ' con IVA';
      return;
    }
    if (SIN) { $('[data-tira]', barra).textContent = COTIZA; return; } // sin total no hay avance: la barra solo invita a cotizar
    a = a || avance(total());
    $('[data-tira]', barra).innerHTML = a.corto;
  }
  function pintarPedido() {
    if (!cat) return;
    var n = items.length, t = SIN ? 0 : total(), a = SIN ? null : avance(t), cuantos = n + (n === 1 ? ' producto' : ' productos');
    $$('[data-n]').forEach(function (el) { el.textContent = n; });
    if (!SIN) $$('[data-total]').forEach(function (el) { el.textContent = dinero(t) + (el.closest('[data-total-fila]') ? '' : ' con IVA'); });
    $$('.btn--mipedido').forEach(function (b) { b.hidden = !n; b.setAttribute('aria-label', (SIN ? 'Mi lista, ' : 'Mi pedido, ') + cuantos); });
    if (panel) {
      $('.pedido__titulo small', panel).textContent = '(' + cuantos + ')';
      $('[data-vacio]', panel).hidden = !!n;
      $('[data-lleno]', panel).hidden = !n;
      if (!SIN) {
        var fila = $('[data-total-fila]', panel), dz = desglose(items), des = $('[data-desglose]', panel);
        fila.hidden = !n; // sin precios no hay total: la fila se queda escondida
        if (!des) { des = d.createElement('div'); des.className = 'pedido__desglose'; des.setAttribute('data-desglose', ''); fila.parentNode.insertBefore(des, fila); }
        des.hidden = !n;
        des.innerHTML = '<p><span>Subtotal (sin IVA)</span><span>' + dinero(dz.sub) + '</span></p><p><span>IVA 16%</span><span>' + dinero(dz.iva) + '</span></p>';
      }
      if (n) $('[data-deshacer-caja]', panel).hidden = true;
      pintarLineas();
      var e = $('#entrega');
      if (SIN) { // el aviso del flete sale con cualquier entrega a domicilio; el mínimo y la entrega gratis ya están escritos arriba
        $('[data-flete]', panel).hidden = !(e && e.value && e.value !== 'recojo');
      } else {
        var av = $('[data-avance]', panel);
        av.innerHTML = a.largo;
        av.classList.toggle('ok', !!a.ok);
        $('[data-pista]', panel).style.width = Math.min(100, a.pct * 100) + '%';
        $('[data-flete]', panel).hidden = !(e && e.value && e.value !== 'recojo' && t < cat.envio_gratis_desde);
      }
      $('[data-mandar]', panel).href = wa(n ? mensajePedido() : GENERAL);
      $('[data-mandar-txt]', panel).textContent = n ? (SIN ? 'Pedir cotización por WhatsApp' : 'Mandar mi pedido por WhatsApp') : 'Cotizar por WhatsApp';
    }
    pintarAcciones();
    if (barra) {
      if (n && barra.hidden) {
        barra.hidden = false;
        void barra.offsetWidth; // fija la posición de salida para que la barra suba con transición
        barra.classList.remove('fuera');
      } else if (!n) { barra.hidden = true; barra.classList.add('fuera'); }
      cuerpo.classList.toggle('con-barra', !!n);
      if (!SIN) $('[data-pista]', barra).style.width = Math.min(100, a.pct * 100) + '%';
      $('[data-abrir-pedido]', barra).setAttribute('aria-label', SIN ? 'Ver mi lista: ' + cuantos : 'Ver mi pedido: ' + cuantos + ', total ' + dinero(t) + ' con IVA');
      pintarTira(a);
    }
  }
  function cambiar(id, c) { poner(id, c); guardar(); pintarPedido(); }
  function avisar(nombre) {
    var t = SIN ? '' : dinero(total()) + ' con IVA';
    nombre = medida(nombre);
    if (barra && !escritorio.matches) {
      clearTimeout(tTira);
      $('[data-tira]', barra).innerHTML = SIN ? '<span class="corta">Agregaste ' + esc(nombre) + '</span><span>a tu lista.</span>' :
        '<span class="corta">Agregaste ' + esc(nombre) + '.</span><span>Llevas <b data-llevas>' + t + '</b>.</span>';
      tTira = setTimeout(function () { tTira = 0; pintarTira(); }, 3000);
      return;
    }
    var a = $('[data-aviso]');
    if (!a) return;
    a.textContent = SIN ? 'Agregaste ' + nombre + ' a tu lista.' : 'Agregaste ' + nombre + '. Llevas ' + t + '.';
    a.classList.add('visible');
    clearTimeout(tAviso);
    tAviso = setTimeout(function () { a.classList.remove('visible'); }, 3000);
  }

  /* ---------- Mensajes de WhatsApp (brief/contenido.md 3.6) ---------- */
  function mensaje(inicio, lista, extras) {
    if (SIN) { // sin precios: productos y cantidades, sin importes ni total; el bot contesta con el precio (Diego, 03/11/2026)
      var s = [inicio, ''];
      lista.forEach(function (x) {
        var q = porId[x[0]];
        s.push('- ' + x[1] + ' x ' + q.producto + ', ' + q.presentacion + ' (' + q.id + ')');
      });
      if (extras && extras.length) s.push('');
      s = s.concat(extras || []);
      s.push('', '¿Me pasan el precio y el día de entrega?');
      return s.join('\n');
    }
    var z = desglose(lista), t = z.tot, l = [inicio, ''];
    lista.forEach(function (x) {
      var p = porId[x[0]];
      l.push('- ' + x[1] + ' x ' + p.producto + ', ' + p.presentacion + ' (' + p.id + '): ' + dinero(x[1] * p.precio) + ' + IVA');
    });
    l.push('', 'Subtotal sin IVA: ' + dinero(z.sub), 'IVA 16%: ' + dinero(z.iva), 'Total con IVA: ' + dinero(t));
    l = l.concat(extras || [], ['']);
    if (t < cat.pedido_minimo) l.push('Todavía no llego al mínimo de ' + dinero(cat.pedido_minimo) + ' con IVA: ¿qué me recomiendan agregar?');
    l.push('¿Me confirman el total y el día de entrega?');
    return l.join('\n');
  }
  function mensajePedido() {
    var ex = [], e = $('#entrega'), f = $('[data-factura]'), v = e ? e.value : '';
    if (v) ex.push('Entrega: ' + (v === 'recojo' ? 'lo recojo sin costo' : v === 'otro' ? 'a domicilio en otro municipio' : 'a domicilio en ' + v));
    if (f && f.checked) ex.push('Factura: sí');
    return mensaje(SIN ? 'Hola PAKZA, quiero cotizar esto desde su página [WEB]:' : 'Hola PAKZA, quiero hacer este pedido desde su página [WEB]:', items, ex);
  }
  function encabezadoKit(k) { return (SIN ? 'Hola PAKZA, quiero cotizar el ' : 'Hola PAKZA, quiero el ') + k.nombre + ' de su página [WEB]:'; }

  /* ---------- Kits ---------- */
  function kitPorId(id) { return kits.kits.filter(function (k) { return k.id === id; })[0]; }
  function kitValido(k) {
    return k && Array.isArray(k.items) && k.items.length && k.items.every(function (x) { return porId[x.id] && x.cantidad >= 1; });
  }
  function kitLista(k) { return k.items.map(function (x) { return [x.id, Math.floor(x.cantidad)]; }); }
  function pintarKits() {
    var validos = kits.kits.filter(kitValido);
    $$('[data-kits]').forEach(function (cont) {
      var compacto = cont.getAttribute('data-kits') === 'compacto';
      cont.innerHTML = validos.map(function (k) {
        var dk = SIN ? null : desglose(kitLista(k)), tot = SIN ? '' : dinero(dk.sub), totIva = SIN ? '' : dinero(dk.tot), cosas = k.items.map(function (x) { return medida(x.texto); });
        if (compacto) {
          return '<article class="kitc"><h3>' + esc(k.nombre) + '</h3><p class="kitc__trae">' + esc(cosas.join('\u00a0· ')) + '</p>' +
            (SIN ? '' : '<p class="kitc__total"><b>' + tot + '</b> + IVA <small>(total ' + totIva + ' con IVA)</small></p>') +
            '<button type="button" class="btn btn--secundario btn--ancho" data-agregar-kit="' + esc(k.id) + '">' + (SIN ? 'Agregar kit a mi lista' : 'Agregar kit') + '</button></article>';
        }
        var f = k.foto ? BASE + k.foto : '', srcset = /-720\.webp$/.test(f) ? ' srcset="' + [480, 600, 720].map(function (a) {
          return esc(f.replace(/-720\.webp$/, '-' + a + '.webp')) + ' ' + a + 'w'; }).join(', ') + '" sizes="(min-width:1024px) 384px, (min-width:600px) 560px, calc(100vw - 32px)"' : '';
        var boton = '<button type="button" class="btn btn--inverso btn--ancho" data-agregar-kit="' + esc(k.id) + '">' +
          (SIN ? 'Agregar kit a mi lista' : 'Agregar kit a mi pedido') + '</button>',
          liga = '<a class="liga" href="' + esc(wa(mensaje(encabezadoKit(k), kitLista(k)))) +
          '" target="_blank" rel="noopener">' + ico('wa', 'ico--marca') + (SIN ? 'Cotizar este kit por WhatsApp' : 'Pedir por WhatsApp') + '</a>';
        return '<article class="kit">' + (f ? '<img class="kit__foto" src="' + esc(f) + '"' + srcset + ' width="720" height="405" alt="' +
          esc(k.alt || '') + '" loading="lazy" decoding="async">' : '') + '<div class="kit__cuerpo"><h3>' + esc(k.nombre) + '</h3>' +
          '<p class="kit__sub">' + esc(k.subtitulo || '') + '</p><ul class="lista-check">' +
          cosas.map(function (c) { return '<li>' + ico('check') + '<span>' + esc(c) + '</span></li>'; }).join('') + '</ul>' +
          (SIN ? '<div class="kit__acciones">' + boton + liga + '</div>' : '<p class="kit__total"><b>' + tot + '</b><span>+ IVA (IVA ' + dinero(dk.iva) + ' · total ' + totIva + ' con IVA)</span></p>' + boton + liga) +
          '</div></article>';
      }).join('');
      var sec = cont.closest('section');
      if (!validos.length && sec) sec.hidden = true;
    });
  }
  function agregarKit(k, btn) {
    kitLista(k).forEach(function (x) { poner(x[0], cant(x[0]) + x[1]); });
    guardar();
    pintarPedido();
    avisar(k.nombre);
    if (btn.getAttribute('data-txt') == null) btn.setAttribute('data-txt', btn.textContent);
    btn.innerHTML = ico('check') + (SIN ? 'Agregado a tu lista' : 'Agregado a tu pedido');
    clearTimeout(btn._t);
    btn._t = setTimeout(function () { btn.textContent = btn.getAttribute('data-txt'); }, 3000);
  }

  /* ---------- Textos con montos y productos fijos ---------- */
  function monto(clave) { // un monto por su clave: reglas de venta siempre; precios, kits y fecha solo con precios
    var k = String(clave).split(':'), kit;
    if (k[0] === 'min') return dinero(cat.pedido_minimo);
    if (k[0] === 'gratis') return dinero(cat.envio_gratis_desde);
    if (k[0] === 'efectivo') return dinero(cat.efectivo_hasta || EFECTIVO_HASTA);
    if (k[0] === 'n') return String(cat.productos.length);
    if (k[0] === 'cajas') return cat.familias_web && cat.familias_web.cajas && cat.familias_web.cajas.modelos > 0 ? String(cat.familias_web.cajas.modelos) : '';
    if (SIN) return ''; // sin precios: nunca el monto de un producto, el total de un kit ni "precios del <fecha>"
    if (k[0] === 'actualizado') return fecha(cat.actualizado);
    if (k[0] === 'P' && porId[k[1]]) return dinero(porId[k[1]].precio);
    if (k[0] === 'X' && porId[k[2]]) return dinero(desglose([[k[2], +k[1]]]).tot); // con IVA: se compara contra el minimo, que es con IVA
    if (k[0] === 'KIT' && kitValido(kit = kitPorId(k[1]))) return dinero(suma(kitLista(kit)));
    return '';
  }
  function plantilla(s) { return String(s).replace(/\{([^}]+)\}/g, function (m, k) { return monto(k); }); }
  function llenarMontos() {
    $$('[data-requiere]').forEach(function (el) { if (!porId[el.getAttribute('data-requiere')]) el.hidden = true; });
    $$('[data-m]').forEach(function (el) { el.textContent = monto(el.getAttribute('data-m')); });
  }
  /* El HTML viene en la versión SIN precios (así se ve sin JavaScript o si falla el JSON). Con precios, cada texto de data-con-precios
     (con marcadores {min}, {gratis}, {P:P17}, {X:12:P16}, {actualizado}) reemplaza al de sin precios, y se muestra lo de data-solo-precios. */
  function aplicarModo() {
    raiz.classList.toggle('sin-precios', SIN);
    if (SIN) return;
    $$('[data-con-precios]').forEach(function (el) {
      var etiqueta = el.tagName, v = plantilla(el.getAttribute('data-con-precios'));
      if (etiqueta === 'SCRIPT') return; // el JSON-LD lo arma datosEstructurados
      if (etiqueta === 'TITLE') d.title = v;
      else if (etiqueta === 'META') el.setAttribute('content', v);
      else { el.textContent = v; el.hidden = false; }
    });
    $$('[data-con-aria]').forEach(function (el) { el.setAttribute('aria-label', el.getAttribute('data-con-aria')); });
    $$('[data-solo-precios]').forEach(function (el) { el.hidden = false; });
    $$('[data-sin-precios]').forEach(function (el) { el.hidden = true; });
  }
  function pintarFijos() {
    $$('[data-prod]').forEach(function (el) {
      var p = porId[el.getAttribute('data-prod')], x;
      if (!p) { el.hidden = true; return; }
      if (SIN) {
        $$('button[data-agregar="' + p.id + '"]', el).forEach(function (b) { b.setAttribute('aria-label', 'Agregar a mi lista: ' + p.producto + ', ' + p.presentacion); });
      } else {
        if ((x = $('[data-precio-bloque]', el))) x.innerHTML = bloquePrecio(p);
        if ((x = $('[data-precio]', el))) x.textContent = dinero(p.precio);
        if ((x = $('[data-unidad]', el))) x.textContent = unidad(p);
      }
      if ((x = $('[data-preguntar]', el))) {
        x.href = wa(preguntar(p));
        x.setAttribute('aria-label', 'Preguntar por ' + p.producto + ', ' + p.presentacion);
      }
    });
  }
  function datosEstructurados(lista) { // agrega a la tienda del JSON-LD cada Product con su propia Offer en MXN (QA 5). Sin precios: la tienda sola
    var s = d.getElementById('ld-tienda');
    if (SIN || !s || !lista.length) return;
    try {
      var o = JSON.parse(s.textContent);
      if (s.hasAttribute('data-con-precios')) o.description = s.getAttribute('data-con-precios'); // la descripción de antes, con precios
      o.hasOfferCatalog = { '@type': 'OfferCatalog', name: 'Empaque y embalaje', itemListElement: lista.map(function (p) {
        var pr = p.precio.toFixed(2), img = imagen(p), prod = { '@type': 'Product', name: p.producto + ', ' + p.presentacion, sku: p.id,
          category: cat.familias && cat.familias[p.familia] || p.familia,
          offers: { '@type': 'Offer', price: pr, priceCurrency: 'MXN', url: SITIO + 'catalogo.html#' + p.id, seller: { '@id': SITIO + '#tienda' },
            priceSpecification: { '@type': 'UnitPriceSpecification', price: pr, priceCurrency: 'MXN', valueAddedTaxIncluded: false } } };
        if (img) prod.image = img;
        return prod;
      }) };
      s.textContent = JSON.stringify(o);
    } catch (e) { /* se queda la tienda sola */ }
  }

  /* ---------- Familias: tarjetas, vista de familia y búsqueda (brief/familias_diseno.md) ---------- */
  var est = { fam: '', q: '' }, buscar = null, tBusca = 0, barraFam = null, tituloBase = '', tSenal = 0;
  var CORTO = { playo: 'Emplaye', cinta: 'Cintas', cajas: 'Cajas', bolsas: 'Bolsas', burbuja: 'Burbuja', kraft: 'Kraft' };
  var ALT = { playo: 'Rollo de playo para emplayar', cinta: 'Rollo de cinta canela', cajas: 'Caja de cartón corrugado',
    bolsas: 'Bolsas de seguridad para paquetería', burbuja: 'Rollo de poliburbuja', kraft: 'Rollo de papel kraft' };
  var VACIAS = /^(de|del|la|las|el|los|y|e|para|con|en|a|al|por|un|una|unos|unas)$/;
  function normal(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[“”″]/g, '"')
      .replace(/(\d)\s*(?:"|''|pulgadas?\b|pulg\b\.?|inch(?:es)?\b|in\b)/g, '$1in')
      .replace(/(\d)\s*[x×]\s*(?=\d)/g, '$1x')
      .replace(/\bcal(?:ibre)?\.?\s*(?=\d)/g, 'cal')
      .replace(/\bect\s*(?=\d)/g, 'ect')
      .replace(/[^a-z0-9./]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function extras(p) {
    var n = p.producto.toLowerCase(), e = [];
    if (p.familia === 'playo') e.push('playo emplaye emplayar pelicula stretch film plastico');
    if (/poliburbuja/.test(n)) e.push('burbuja burbujas plastico');
    if (/polipack/.test(n)) e.push('espuma foam');
    if (/canela/.test(n)) e.push('cafe');
    if (/transparente/.test(n)) e.push('cristal');
    if (/doble corrugado/.test(n) || (p.familia === 'playo' && /18"/.test(n))) e.push('mudanza mudanzas');
    if (p.familia === 'bolsas' || /paqueter/.test(n)) e.push('envio envios paqueteria sobre sobres');
    if (/calzado/.test(n)) e.push('zapatos zapato tenis');
    if (p.familia === 'kraft') e.push('papel envolver relleno rellenar');
    if (/huevera/.test(n)) e.push('huevo huevos');
    return e.join(' ');
  }
  function pajar(p) {
    if (!p._h) p._h = ' ' + normal([p.producto, p.presentacion, p.pres_web, p.titulo, p.detalle, p.tipo, cat.familias && cat.familias[p.familia],
      FAM[p.familia] && FAM[p.familia][1], p.id, extras(p)].join(' ')) + ' ';
    return p._h;
  }
  function tokens(q) { return normal(q).split(' ').filter(function (t) { return t && !VACIAS.test(t); }); }
  function coincide(p, toks) {
    var h = pajar(p);
    return toks.every(function (t) {
      return h.indexOf(t) >= 0 || (t.length > 3 && /s$/.test(t) && h.indexOf(t.slice(0, /es$/.test(t) ? -2 : -1)) >= 0);
    });
  }
  function nombreFam(k) { return FAM[k] ? FAM[k][0] : (cat.familias && cat.familias[k]) || k; }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  function slug(s) { return normal(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function nMedidas(n) { return n + (n === 1 ? ' medida' : ' medidas'); }
  function claves() {
    var o = Array.isArray(cat.orden_familias) ? cat.orden_familias.slice() : [];
    cat.productos.forEach(function (p) { if (p.familia && o.indexOf(p.familia) < 0) o.push(p.familia); });
    return o.filter(function (k) { return cat.productos.some(function (p) { return p.familia === k; }); });
  }
  function famInfo(k) { // todo sale de familias_web del JSON; si falta algo, se arma con lo que haya (nunca la foto de otra familia)
    var w = (cat.familias_web || {})[k] || {}, ps = cat.productos.filter(function (p) { return p.familia === k; });
    return { nombre: w.nombre || nombreFam(k), boton: w.boton || 'Ver ' + nombreFam(k).toLowerCase(), foto: w.foto || '',
      modelos: w.modelos || uniq(ps.map(function (p) { return p.producto; })).length,
      tabla: Array.isArray(w.tabla) ? w.tabla : [], tipos: Array.isArray(w.tipos) ? w.tipos : [] };
  }
  function filaTabla(r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(medida(r[1])) + '</dd></div>'; }
  function desdeFam(k) { // solo con precios: el menor precio por pieza de la familia
    var v = cat.productos.filter(function (p) { return p.familia === k && conPrecio(p); }).map(function (p) { return p.precio_pieza || p.precio; });
    return v.length ? dinero(Math.min.apply(null, v)) + ' + IVA' : '';
  }
  function imgFam(k, f) {
    var m = /^img\/(fam-[\w-]+)$/.exec(f.foto || ''), alt = esc(ALT[k] || '');
    if (m) return '<img src="img/' + m[1] + '-480.webp" srcset="img/' + m[1] + '-480.webp 480w, img/' + m[1] + '-768.webp 768w" sizes="(min-width:1024px) 384px, calc(100vw - 32px)" width="480" height="300" alt="' + alt + '" loading="lazy" decoding="async">';
    if (/^img\/[\w-]+\.webp$/.test(f.foto || '')) return '<img src="' + f.foto + '" width="480" height="300" alt="' + alt + '" loading="lazy" decoding="async">';
    return '';
  }
  function tarjeta(k) {
    var f = famInfo(k), ds = SIN ? '' : desdeFam(k);
    var tab = (ds ? '<div class="fam__desde"><dt>Desde</dt><dd>' + esc(ds) + '</dd></div>' : '') + f.tabla.map(filaTabla).join('');
    return '<a class="fam" href="catalogo.html?familia=' + esc(k) + '" data-fam-card="' + esc(k) + '" aria-label="' + esc(f.boton + ': ' + nMedidas(f.modelos)) + '">' +
      '<div class="fam__foto">' + imgFam(k, f) + (f.modelos ? '<span class="fam__n">' + nMedidas(f.modelos) + '</span>' : '') +
      '<h3 class="fam__nombre">' + esc(f.nombre) + '</h3></div>' + (tab ? '<dl class="fam__tabla">' + tab + '</dl>' : '') +
      '<span class="fam__btn">' + esc(f.boton) + ' <span aria-hidden="true">→</span></span></a>';
  }
  function pintarFamilias() { $$('[data-familias]').forEach(function (el) { el.innerHTML = claves().map(tarjeta).join(''); }); }

  /* Componente B: grupo por tipo, un renglón por producto con sus presentaciones */
  function unidadPieza(p) { return { cajas: 'pieza', bolsas: 'bolsa', kraft: 'paquete' }[p.familia] || 'rollo'; }
  function lineaPres(p) {
    var pr = '';
    if (!SIN && conPrecio(p)) {
      pr = '<div class="rgl__precio"><b>' + dinero(p.precio) + '</b> <small>+ IVA</small>' +
        (p.precio_pieza ? '<small class="rgl__pieza">' + dinero(p.precio_pieza) + ' por ' + unidadPieza(p) + '</small>' : '') + '</div>';
    }
    return '<div class="rgl" id="' + esc(p.id) + '"><p class="rgl__pres">' + esc(medida(p.pres_web || p.presentacion)) + '</p>' + pr +
      '<div class="rgl__acc"><div class="accion" data-accion="' + esc(p.id) + '">' + htmlAccion(p.id) + '</div></div></div>';
  }
  function renglon(ps) {
    var p = ps[0];
    return '<li class="rg"><div class="rg__med"><p class="rg__tit">' + esc(medida(p.titulo || p.producto)) + '</p>' +
      (p.detalle ? '<p class="rg__det">' + esc(medida(p.detalle)) + '</p>' : '') + '</div><div class="rg__pres">' + ps.map(lineaPres).join('') + '</div></li>';
  }
  function claveOrden(p) {
    var m = p.medidas || {}, n = function (x) { return typeof x === 'number' ? x : -1; };
    if (p.familia === 'playo') return [n(m.ancho_in), n(m.calibre), n(m.largo_ft)];
    if (p.familia === 'cinta') return [n(m.largo_m)];
    if (p.familia === 'cajas') return [typeof m.largo_cm === 'number' ? m.largo_cm * m.ancho_cm * m.alto_cm : 1e12];
    if (p.familia === 'bolsas') return [n(m.ancho_cm)];
    return null;
  }
  function renglones(lista) { // agrupa por producto exacto (rollo y paquete juntos) y ordena por medida
    var g = [], por = {};
    lista.forEach(function (p) {
      if (!por[p.producto]) { por[p.producto] = []; g.push(por[p.producto]); }
      por[p.producto].push(p);
    });
    g.forEach(function (ps) { ps.sort(function (a, b) { return piezas(a) - piezas(b); }); });
    var pos = g.map(function (ps, i) { return i; });
    return g.map(function (ps, i) { return { ps: ps, i: i, k: claveOrden(ps[0]) }; }).sort(function (a, b) {
      if (a.k && b.k) for (var j = 0; j < a.k.length; j++) if (a.k[j] !== b.k[j]) return a.k[j] - b.k[j];
      return a.i - b.i;
    }).map(function (x) { return x.ps; });
  }
  function gruposDe(k, lista) {
    var f = famInfo(k), tipos = f.tipos.slice();
    lista.forEach(function (p) {
      var n = p.tipo || f.nombre;
      if (!tipos.some(function (t) { return t.nombre === n; })) tipos.push({ nombre: n, texto: '', foto: '' });
    });
    return tipos.map(function (t) { return { t: t, ps: lista.filter(function (p) { return (p.tipo || f.nombre) === t.nombre; }) }; })
      .filter(function (g) { return g.ps.length; });
  }
  function grupo(t, ps, mini) {
    var fm = /^img\/c-([\w-]+)-768\.webp$/.exec(t.foto || ''), h = mini ? 'h3' : 'h2', id = 'tipo-' + slug(t.nombre);
    var cols = '<div class="rg__cols" aria-hidden="true"><span>Medida</span><span>Presentación</span>' + (SIN ? '' : '<span>Precio + IVA</span>') + '<span></span></div>';
    return '<section class="rgrupo' + (mini ? ' rgrupo--mini' : '') + '" id="' + id + '" aria-labelledby="' + id + '-t"><div class="rgrupo__cab">' +
      (fm && !mini ? '<img class="rgrupo__foto" src="img/g-c-' + fm[1] + '-192.webp" width="192" height="192" alt="' + esc(t.nombre) + '" loading="lazy" decoding="async">' : '') +
      '<div><' + h + ' class="rgrupo__nom" id="' + id + '-t">' + esc(t.nombre) + '</' + h + '>' + (t.texto && !mini ? '<p class="rgrupo__txt">' + esc(t.texto) + '</p>' : '') +
      '</div></div>' + cols + '<ul class="rgrupo__lista">' + renglones(ps).map(renglon).join('') + '</ul></section>';
  }
  function vistaFamilia(k) {
    var f = famInfo(k), g = gruposDe(k, cat.productos.filter(function (p) { return p.familia === k; }));
    var atajos = g.length > 1 ? '<nav class="atajos" aria-label="Ir a un tipo">' + g.map(function (x) {
      return '<a class="atajo" href="#tipo-' + slug(x.t.nombre) + '">' + esc(x.t.nombre.replace('Transparente económica', 'Económica')) + '</a>'; }).join('') + '</nav>' : '';
    var nombre = f.nombre.toLowerCase();
    return atajos + g.map(function (x) { return grupo(x.t, x.ps, false); }).join('') +
      '<div class="no-medida"><h2>¿No ves tu medida?</h2><p>Te la buscamos.</p><a class="btn btn--contorno" href="' +
      esc(wa('Hola PAKZA, busco ' + nombre + ' en otra medida [WEB]')) + '" target="_blank" rel="noopener">Pregúntanos por WhatsApp</a></div>';
  }
  function pintarCabFamilia(k) {
    var f = famInfo(k);
    $('[data-fam-h1]').textContent = f.nombre;
    $('[data-fam-linea]').textContent = nMedidas(f.modelos) + ' · ' + (SIN ? COTIZA : 'Precios + IVA');
    $('[data-fam-tabla]').innerHTML = f.tabla.filter(function (r) { return r[0] !== 'Viene en'; }).map(filaTabla).join('');
    d.title = f.nombre + ' para empaque en Guadalajara | PAKZA';
  }
  function render(sinUrl) {
    var toks = tokens(est.q), modo = est.fam ? 'fam' : est.q ? 'busca' : 'general', n = 0, lista;
    $('[data-barra-fam]').hidden = modo !== 'fam';
    $('[data-cab-general]').hidden = modo === 'fam';
    $('[data-cab-fam]').hidden = modo !== 'fam';
    $('[data-busqueda]').hidden = modo === 'fam';
    $('[data-familias]').hidden = modo !== 'general';
    $('[data-resultados]').hidden = modo !== 'busca';
    $('[data-vista-fam]').hidden = modo !== 'fam';
    $('[data-kits-cat]').hidden = modo === 'fam';
    d.title = tituloBase;
    if (modo === 'fam') {
      pintarCabFamilia(est.fam);
      $('[data-vista-fam]').innerHTML = vistaFamilia(est.fam);
    } else if (modo === 'busca') {
      lista = cat.productos.filter(function (p) { return coincide(p, toks); });
      n = lista.length;
      $('[data-conteo]').textContent = n === 1 ? '1 producto' : n + ' productos';
      $('[data-resultados-lista]').innerHTML = claves().map(function (k) {
        var l = lista.filter(function (p) { return p.familia === k; });
        return l.length ? '<section class="res-fam"><h2 class="res-fam__nom">' + esc(famInfo(k).nombre) + '</h2>' +
          gruposDe(k, l).map(function (g) { return grupo(g.t, g.ps, true); }).join('') + '</section>' : '';
      }).join('');
      $('[data-sin-txt]').textContent = 'No encontramos "' + est.q + '". Escríbenos: si no está en el catálogo, lo buscamos por ti.';
      $('[data-sin-wa]').href = wa('Hola PAKZA, busco "' + est.q + '" y no lo encontré en su página [WEB]');
    }
    $('[data-sin]').hidden = !(modo === 'busca' && !n);
    $$('[data-fam]', barraFam).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-fam') === est.fam)); });
    cuerpo.classList.toggle('en-familia', modo === 'fam');
    if (!sinUrl) {
      var u = new URL(location.href);
      if (est.fam) u.searchParams.set('familia', est.fam); else u.searchParams.delete('familia');
      if (est.q && !est.fam) u.searchParams.set('buscar', est.q); else u.searchParams.delete('buscar');
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    }
  }
  function alInicio() {
    var y = $('main').getBoundingClientRect().top + scrollY - (escritorio.matches ? 72 : 0);
    raiz.style.scrollBehavior = 'auto';
    scrollTo(0, Math.max(0, y));
    raiz.style.scrollBehavior = '';
  }
  function irFamilia(k) {
    est.fam = k || ''; est.q = ''; buscar.value = ''; $('[data-borrar-busqueda]').hidden = true;
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    render();
    alInicio();
  }
  function senalar() {
    var id, el, p;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (e) { return; } // liga con "%" suelto: se ignora
    if (!id || !porId[id]) return;
    p = porId[id];
    if (est.fam !== p.familia || est.q) { est.fam = p.familia; est.q = ''; buscar.value = ''; render(true); }
    $$('.rgl.senalada').forEach(function (x) { x.classList.remove('senalada'); });
    if ((el = d.getElementById(id))) {
      el.classList.add('senalada');
      raiz.style.scrollBehavior = 'auto';
      el.scrollIntoView({ block: 'center' });
      raiz.style.scrollBehavior = '';
      clearTimeout(tSenal);
      tSenal = setTimeout(function () { el.classList.remove('senalada'); }, 2500);
    }
  }
  function iniciarCatalogo() {
    var q = new URLSearchParams(location.search), f = (q.get('familia') || '').toLowerCase(), borrar = $('[data-borrar-busqueda]');
    buscar = d.getElementById('buscar');
    barraFam = $('[data-chips]');
    tituloBase = d.title;
    barraFam.innerHTML = '<a class="chip chip--todas" href="catalogo.html" data-ir-todas>← Todas</a>' + claves().map(function (k) {
      return '<button type="button" class="chip" data-fam="' + esc(k) + '" aria-pressed="false">' + esc(CORTO[k] || nombreFam(k)) + '</button>'; }).join('') +
      '<button type="button" class="chip chip--lupa" data-ir-buscar aria-label="Buscar">' + ico('buscar') + '</button>';
    est.fam = cat.productos.some(function (p) { return p.familia === f; }) ? f : '';
    est.q = est.fam ? '' : (q.get('buscar') || '').trim().slice(0, 80);
    buscar.value = est.q;
    borrar.hidden = !est.q;
    pintarFamilias();
    render(true);
    senalar();
    addEventListener('hashchange', senalar);
    buscar.addEventListener('input', function () {
      borrar.hidden = !buscar.value;
      clearTimeout(tBusca);
      tBusca = setTimeout(function () { est.q = buscar.value.trim().slice(0, 80); render(); }, 150);
    });
    buscar.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); clearTimeout(tBusca); est.q = buscar.value.trim().slice(0, 80); render(); buscar.blur(); }
    });
    borrar.addEventListener('click', function () { buscar.value = ''; borrar.hidden = true; est.q = ''; render(); buscar.focus(); });
  }

  /* ---------- Paneles (pedido y menú): foco atrapado, Esc y fondo quieto ---------- */
  function columna() { return esCatalogo && escritorio.matches; }
  function abrir(el, desde) {
    if (modal) cerrar(true);
    modal = el;
    abridor = desde || d.activeElement;
    el.removeAttribute('inert');
    el.classList.add('abierto');
    raiz.classList.add('modal');
    if (el === panel && velo) { velo.hidden = false; void velo.offsetWidth; velo.classList.add('abierto'); }
    if (el.id === 'menu-movil') $$('.menu-btn').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    setTimeout(function () { var f = el === panel ? d.getElementById('pedido-titulo') : $('[data-cerrar]', el); if (f) f.focus(); }, 60);
  }
  function cerrar(sinFoco) {
    var el = modal;
    if (!el) return;
    modal = null;
    el.classList.remove('abierto');
    el.setAttribute('inert', '');
    raiz.classList.remove('modal');
    if (el === panel && velo) { velo.classList.remove('abierto'); setTimeout(function () { if (modal !== panel) velo.hidden = true; }, 240); }
    if (el.id === 'menu-movil') $$('.menu-btn').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (!sinFoco && abridor && abridor.isConnected) abridor.focus();
  }
  function modoPanel() {
    if (!panel) return;
    if (columna()) {
      if (modal === panel) cerrar(true);
      panel.removeAttribute('role');
      panel.removeAttribute('aria-modal');
      panel.removeAttribute('inert');
    } else {
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      if (modal !== panel) panel.setAttribute('inert', '');
    }
    if (escritorio.matches && modal && modal.id === 'menu-movil') cerrar(true);
    // Columna fija del catálogo: solo el aviso [data-aviso] habla; el avance y el total no se anuncian 3 veces juntos (QA 12c)
    $$('[data-avance],[data-total]', panel).forEach(function (el) {
      if (columna()) el.removeAttribute('aria-live'); else el.setAttribute('aria-live', 'polite');
    });
  }
  function abrirPedido(desde) {
    if (!panel) return;
    if (columna()) { panel.scrollIntoView({ block: 'nearest' }); d.getElementById('pedido-titulo').focus(); return; }
    abrir(panel, desde);
  }
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

  /* ---------- Clics y cambios ---------- */
  d.addEventListener('click', function (e) {
    var t = e.target.closest('button,a');
    if (!t) return;
    var a = t.getAttribute.bind(t), id, cont, k;
    if ((id = a('data-agregar'))) {
      var pa = porId[id];
      if (!pa) return;
      cont = t.closest('[data-accion]');
      cambiar(id, cant(id) + 1);
      // Si no es pieza ni rollo suelto, el aviso dice la presentación ("…, Paquete 16") (QA 4)
      avisar(/^(pieza|rollo)$/i.test(String(pa.presentacion).trim()) ? pa.producto : pa.producto + ', ' + pa.presentacion);
      if (cont && (k = $('[data-mas]', cont))) k.focus();
    } else if ((id = a('data-mas'))) {
      cambiar(id, cant(id) + 1);
    } else if ((id = a('data-menos'))) {
      cont = t.closest('[data-accion]');
      cambiar(id, cant(id) - 1);
      if (!cant(id)) { k = cont && cont.isConnected && $('[data-agregar]', cont); (k || d.getElementById('pedido-titulo') || cuerpo).focus(); }
    } else if ((id = a('data-quitar'))) {
      var li = t.closest('[data-linea]'), sig = li && li.nextElementSibling;
      cambiar(id, 0);
      k = sig && sig.isConnected && $('[data-quitar]', sig);
      (k || d.getElementById('pedido-titulo')).focus();
    } else if ((id = a('data-agregar-kit'))) {
      if (kitValido(k = kitPorId(id))) agregarKit(k, t);
    } else if (t.hasAttribute('data-abrir-pedido')) {
      abrirPedido(t);
    } else if (t.hasAttribute('data-cerrar')) {
      cerrar();
    } else if (t.classList.contains('menu-btn')) {
      abrir(d.getElementById('menu-movil'), t);
    } else if (t.hasAttribute('data-vaciar')) {
      respaldo = items.slice();
      items = [];
      guardar();
      pintarPedido();
      $('[data-deshacer-caja]', panel).hidden = false;
      d.getElementById('pedido-titulo').focus();
      clearTimeout(tDeshacer);
      tDeshacer = setTimeout(function () { $('[data-deshacer-caja]', panel).hidden = true; respaldo = null; }, 8000);
    } else if (t.hasAttribute('data-deshacer')) {
      if (respaldo) { items = respaldo; respaldo = null; guardar(); pintarPedido(); }
      clearTimeout(tDeshacer);
      d.getElementById('pedido-titulo').focus();
    } else if (t.hasAttribute('data-fam')) {
      irFamilia(a('data-fam'));
    } else if (esCatalogo && t.hasAttribute('data-ir-todas')) {
      e.preventDefault();
      irFamilia('');
    } else if (esCatalogo && t.hasAttribute('data-ir-buscar')) {
      irFamilia('');
      buscar.focus();
    } else if (esCatalogo && t.hasAttribute('data-fam-card')) {
      e.preventDefault();
      irFamilia(a('data-fam-card'));
    } else if (modal && t.tagName === 'A' && (a('href') || '').charAt(0) === '#') {
      cerrar(true);
    }
  });
  d.addEventListener('input', function (e) {
    var t = e.target, id = t.getAttribute('data-cant'), v = parseInt(t.value, 10);
    if (id && v > 0) cambiar(id, v);
  });
  d.addEventListener('change', function (e) {
    var t = e.target, id = t.getAttribute('data-cant');
    if (id) {
      var cont = t.closest('[data-accion]');
      cambiar(id, parseInt(t.value, 10) || 0);
      if (cant(id)) t.value = cant(id);
      else { var k = cont && cont.isConnected && $('[data-agregar]', cont); (k || d.getElementById('pedido-titulo') || cuerpo).focus(); }
    } else if (t.id === 'entrega' || t.hasAttribute('data-factura')) pintarPedido();
  });
  if (velo) velo.addEventListener('click', function () { cerrar(); });
  if (escritorio.addEventListener) escritorio.addEventListener('change', modoPanel); else if (escritorio.addListener) escritorio.addListener(modoPanel); // iOS 13 o anterior
  addEventListener('storage', function (e) { if (e.key === CLAVE && cat) { items = leer(); pintarPedido(); } });

  /* Botón flotante: en la portada se esconde mientras se ve un botón principal de WhatsApp ([data-oculta-flota]) */
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

  /* ---------- Arranque ---------- */
  function fallo() { // sin precios no se muestra ningún monto: se invita a cotizar por WhatsApp
    if (esCatalogo) { $('[data-familias]').hidden = true; $('[data-error]').hidden = false; }
    $$('[data-precio-bloque]').forEach(function (el) { el.innerHTML = '<p class="precio__iva">Cotiza por WhatsApp</p>'; });
    $$('.tprecio,#kits,.kits-cat,[data-accion],[data-requiere]').forEach(function (el) { el.hidden = true; });
    $$('[data-m]').forEach(function (el) {
      var k = el.getAttribute('data-m'), c = el.closest('li,p');
      if (k === 'efectivo') { el.textContent = dinero(EFECTIVO_HASTA); return; } // regla del bot, no depende del JSON
      if (!c) return;
      // En Preguntas frecuentes la respuesta no se queda vacía: invita a preguntar (QA 10). Lo demás se esconde.
      if (c.closest('.faq__resp')) c.textContent = 'Escríbenos por WhatsApp y te lo confirmamos.'; else c.hidden = true;
    });
  }
  addEventListener('pageshow', function (e) { if (e.persisted && modal) cerrar(true); });
  modoPanel();
  Promise.all([
    fetch(BASE + 'datos/catalogo.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }),
    fetch(BASE + 'datos/kits.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
    fetch(BASE + 'datos/imagenes.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
  ]).then(function (r) {
    cat = r[0];
    kits = { destacados: Array.isArray(r[1].destacados) ? r[1].destacados : [], kits: Array.isArray(r[1].kits) ? r[1].kits : [] };
    imagenes = (r[2] && r[2].imagenes) || {};
    if (cat.whatsapp) tel = String(cat.whatsapp).replace(/\D/g, '') || tel;
    var crudos = Array.isArray(cat.productos) ? cat.productos : [];
    // Modo sin precios: "mostrar_precios": false, o ningún producto con precio. Solo con true y precios se pintan montos de producto.
    SIN = cat.mostrar_precios === false || !crudos.some(conPrecio);
    cat.productos = crudos.filter(function (p) { return p && p.id && p.producto && (SIN || conPrecio(p)); });
    if (!cat.productos.length || !(cat.pedido_minimo >= 0) || !(cat.envio_gratis_desde >= 0)) throw new Error('catálogo vacío');
    cat.productos.forEach(function (p) { porId[p.id] = p; });
    items = leer();
    aplicarModo();
    llenarMontos();
    pintarFijos();
    pintarKits();
    if (esCatalogo) iniciarCatalogo(); else pintarFamilias();
    datosEstructurados(esCatalogo ? cat.productos : kits.destacados.map(function (i) { return porId[i]; }).filter(Boolean));
    pintarPedido();
    raiz.classList.add('listo');
  }).catch(fallo);
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
   Un mismo clic no se cuenta dos veces (el enlace y el carrito pueden disparar a la vez). */
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
