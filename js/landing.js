/* cosas.es · portada
   Animaciones de la portada: la cabecera al hacer scroll, los bloques que aparecen,
   la demostración del teléfono, las muestras de color, las pestañas de instalar
   y el nombre que cambia en «Cosas con». Todo se apaga con «reducir movimiento». */

(function () {
  'use strict';

  var menosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Cabecera ---------- */

  var cabecera = document.getElementById('cabecera');
  function pegar() { cabecera.classList.toggle('pegada', window.scrollY > 8); }
  window.addEventListener('scroll', pegar, { passive: true });
  pegar();

  /* ---------- Aparecer al hacer scroll ---------- */

  var revelables = document.querySelectorAll('.revelar');
  if ('IntersectionObserver' in window && !menosMovimiento) {
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('visto'); observador.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revelables.forEach(function (el) { observador.observe(el); });
  } else {
    revelables.forEach(function (el) { el.classList.add('visto'); });
  }

  /* ---------- Tono según el color (la misma fórmula que la app) ---------- */

  function tono(hex) {
    var canal = function (i) {
      var v = parseInt(hex.substr(i, 2), 16) / 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    var l = 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5) + 0.05;
    return 1.05 / l >= l / 0.0530353 ? 'oscuro' : 'claro';
  }

  /* ---------- Muestras de color ---------- */

  var telefonos = document.querySelectorAll('[data-telefono]');
  var grupos = document.querySelectorAll('[data-muestras]');
  var hero = document.querySelector('.hero');

  function pintar(color) {
    var t = tono(color);
    telefonos.forEach(function (tel) {
      tel.style.setProperty('--fondo', color);
      tel.setAttribute('data-tono', t);
    });
    if (hero) hero.style.setProperty('--halo', color === '#FFFFFF' ? '#2F6FED' : color);
    grupos.forEach(function (g) {
      g.querySelectorAll('.muestra').forEach(function (m) {
        m.setAttribute('aria-pressed', m.dataset.color === color ? 'true' : 'false');
      });
    });
  }

  grupos.forEach(function (g) {
    g.addEventListener('click', function (ev) {
      var m = ev.target.closest('.muestra');
      if (m) pintar(m.dataset.color);
    });
  });

  /* ---------- Demostración del teléfono ---------- */

  var lista = document.getElementById('demo-lista');
  var campo = document.getElementById('demo-campo');
  var pildora = document.getElementById('demo-pildora');

  var ICONO_CHECK = '<svg viewBox="0 0 24 24"><path d="M19 7 10 16.5 5 12"/></svg>';
  var ICONO_BORRAR = '<svg viewBox="0 0 24 24"><path d="M4 7h16M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6.5 7l.8 11.2a2 2 0 0 0 2 1.8h5.4a2 2 0 0 0 2-1.8L17.5 7M10 11v5M14 11v5"/></svg>';

  function fila(texto) {
    var li = document.createElement('li');
    li.className = 'tel-fila';
    li.innerHTML = '<span class="tel-check">' + ICONO_CHECK + '</span><span class="tel-texto"></span><span class="tel-borrar">' + ICONO_BORRAR + '</span>';
    li.querySelector('.tel-texto').textContent = texto;
    return li;
  }

  var COSAS = ['Comprar pan', 'Llamar a Marta', 'Regar las plantas', 'Renovar el DNI'];

  function espera(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  var demoActiva = false;
  var demoVisible = true;

  function escribir(texto) {
    return new Promise(function (resolver) {
      var i = 0;
      pildora.classList.add('escribiendo');
      (function paso() {
        if (!demoVisible) { return setTimeout(paso, 300); }
        i += 1;
        campo.textContent = texto.slice(0, i);
        pildora.classList.toggle('con-texto', i > 0);
        if (i < texto.length) setTimeout(paso, 45 + Math.random() * 60);
        else resolver();
      })();
    });
  }

  function enviar() {
    var texto = campo.textContent;
    campo.textContent = '';
    pildora.classList.remove('con-texto', 'escribiendo');
    var li = fila(texto);
    lista.appendChild(li);
    while (lista.children.length > 4) lista.removeChild(lista.firstChild);
  }

  function marcar(li) {
    li.classList.add('hecha');
  }

  function vaciar() {
    var filas = Array.prototype.slice.call(lista.children);
    filas.forEach(function (f, i) { setTimeout(function () { f.classList.add('saliendo'); }, i * 60); });
    return espera(filas.length * 60 + 260).then(function () { lista.innerHTML = ''; });
  }

  function bucle() {
    if (demoActiva) return;
    demoActiva = true;
    (function ciclo() {
      var p = Promise.resolve();
      COSAS.slice(0, 3).forEach(function (texto, i) {
        p = p.then(function () { return espera(i === 0 ? 900 : 700); })
          .then(function () { return escribir(texto); })
          .then(function () { return espera(420); })
          .then(enviar);
      });
      p = p.then(function () { return espera(1100); })
        .then(function () { marcar(lista.children[0]); })
        .then(function () { return espera(800); })
        .then(function () { return escribir(COSAS[3]); })
        .then(function () { return espera(420); })
        .then(enviar)
        .then(function () { return espera(900); })
        .then(function () { marcar(lista.children[2]); })
        .then(function () { return espera(2600); })
        .then(vaciar)
        .then(function () { return espera(600); })
        .then(ciclo);
    })();
  }

  if (lista && campo) {
    if (menosMovimiento) {
      /* Sin movimiento: una lista ya hecha, quieta. */
      COSAS.slice(0, 3).forEach(function (t) { lista.appendChild(fila(t)); });
      lista.children[0].classList.add('hecha');
    } else {
      var telefono = lista.closest('.telefono');
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entradas) {
          demoVisible = entradas[0].isIntersecting;
          if (demoVisible) bucle();
        }, { threshold: 0.2 }).observe(telefono);
      } else {
        bucle();
      }
    }
  }

  /* ---------- Pestañas de instalar ---------- */

  var pestanas = document.querySelectorAll('.pestana');
  var indicador = document.querySelector('.pestana-indicador');

  function moverIndicador(pestana) {
    if (!indicador) return;
    indicador.style.width = pestana.offsetWidth + 'px';
    indicador.style.transform = 'translateX(' + (pestana.offsetLeft - 4) + 'px)';
  }

  function elegirPestana(pestana) {
    pestanas.forEach(function (p) {
      var activa = p === pestana;
      p.setAttribute('aria-selected', activa ? 'true' : 'false');
      var panel = document.getElementById(p.getAttribute('aria-controls'));
      if (panel) { panel.hidden = !activa; panel.classList.toggle('activo', activa); }
    });
    moverIndicador(pestana);
  }

  pestanas.forEach(function (p) {
    p.addEventListener('click', function () { elegirPestana(p); });
    p.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
        var lista = Array.prototype.slice.call(pestanas);
        var i = lista.indexOf(p);
        var siguiente = lista[(i + (ev.key === 'ArrowRight' ? 1 : -1) + lista.length) % lista.length];
        siguiente.focus();
        elegirPestana(siguiente);
      }
    });
  });

  if (pestanas.length) {
    /* Android: se preselecciona si el visitante viene de un Android. */
    var esAndroid = /Android/i.test(navigator.userAgent);
    var inicial = esAndroid ? pestanas[1] : pestanas[0];
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { elegirPestana(inicial); });
    } else {
      elegirPestana(inicial);
    }
    window.addEventListener('resize', function () {
      var activa = document.querySelector('.pestana[aria-selected="true"]');
      if (activa) moverIndicador(activa);
    });
  }

  /* ---------- Nombre que cambia en «Cosas con» ---------- */

  var rotando = document.getElementById('nombre-rotando');
  if (rotando && !menosMovimiento) {
    var nombres = rotando.children;
    var actual = 0;
    setInterval(function () {
      nombres[actual].classList.remove('activo');
      actual = (actual + 1) % nombres.length;
      nombres[actual].classList.add('activo');
    }, 2400);
  }

  /* ---------- Dos móviles con la misma lista ---------- */

  var conDemo = document.getElementById('con-demo');
  if (conDemo && !menosMovimiento) {
    var listas = conDemo.querySelectorAll('.tel-lista-con');
    var COSAS_CON = [
      { t: 'Leche', q: 'R', c: '#2F6FED' },
      { t: 'Pilas para el mando', q: 'A', c: '#EF5B5B' },
      { t: 'Regalo de Jorge', q: 'R', c: '#2F6FED' },
      { t: 'Papel de horno', q: 'A', c: '#EF5B5B' }
    ];

    function filaCon(cosa) {
      var div = document.createElement('div');
      div.className = 'tel-fila nueva';
      div.innerHTML = '<span class="tel-check">' + ICONO_CHECK + '</span><span class="tel-texto"></span><span class="con-avatar"></span>';
      div.querySelector('.tel-texto').textContent = cosa.t;
      var av = div.querySelector('.con-avatar');
      av.textContent = cosa.q;
      av.style.setProperty('--avatar', cosa.c);
      return div;
    }

    var conVisible = false;
    var conActiva = false;

    function cicloCon() {
      if (conActiva) return;
      conActiva = true;
      var i = 0;
      (function paso() {
        if (!conVisible) return setTimeout(paso, 400);
        if (i >= COSAS_CON.length) {
          /* Marca una, espera y vuelve a empezar. */
          setTimeout(function () {
            listas.forEach(function (l) { if (l.children[1]) l.children[1].classList.add('hecha'); });
            setTimeout(function () {
              listas.forEach(function (l) { l.innerHTML = ''; });
              i = 0;
              setTimeout(paso, 700);
            }, 2400);
          }, 900);
          return;
        }
        var cosa = COSAS_CON[i];
        /* Aparece primero en el móvil de quien la escribe y, un instante después, en el otro. */
        var primero = cosa.q === 'R' ? 0 : 1;
        listas[primero].appendChild(filaCon(cosa));
        setTimeout(function () { listas[1 - primero].appendChild(filaCon(cosa)); }, 420);
        i += 1;
        setTimeout(paso, 1500);
      })();
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entradas) {
        conVisible = entradas[0].isIntersecting;
        if (conVisible) cicloCon();
      }, { threshold: 0.2 }).observe(conDemo);
    } else {
      conVisible = true;
      cicloCon();
    }
  } else if (conDemo) {
    conDemo.querySelectorAll('.tel-lista-con').forEach(function (l) {
      l.innerHTML = '<div class="tel-fila"><span class="tel-check">' + ICONO_CHECK + '</span><span class="tel-texto">Leche</span></div><div class="tel-fila"><span class="tel-check">' + ICONO_CHECK + '</span><span class="tel-texto">Pilas para el mando</span></div>';
    });
  }
})();
