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
      /* Si se ha saltado de golpe (un enlace del menú, un scroll rápido), lo que quedó
         atrás también se muestra: nada se queda invisible por encima de la pantalla. */
      document.querySelectorAll('.revelar.pendiente').forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) { el.classList.add('visto'); observador.unobserve(el); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revelables.forEach(function (el) {
      /* Solo se esconde lo que aún no se ve: lo que ya está en pantalla se queda como está. */
      if (el.getBoundingClientRect().top > window.innerHeight * 0.92) {
        el.classList.add('pendiente');
        observador.observe(el);
      } else {
        el.classList.add('visto');
      }
    });
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

  /* ---------- Demostración del teléfono ----------
     Reproduce el uso real de la app: en la pantalla principal se escribe una cosa (o se dicta)
     y se guarda con un aviso «Guardado»; el botón de arriba a la izquierda abre la lista, donde
     se tacha una cosa, se borra otra y se recupera con «Deshacer»; y se vuelve al inicio. */

  var telefono = document.querySelector('.hero .telefono');
  var lista = document.getElementById('demo-lista');
  var campo = document.getElementById('demo-campo');
  var pildora = document.getElementById('demo-pildora');
  var micro = document.getElementById('demo-micro');
  var botonEnviar = document.getElementById('demo-enviar');
  var botonLista = document.getElementById('demo-boton-lista');
  var botonVolver = document.getElementById('demo-boton-volver');
  var toastInicio = document.getElementById('demo-toast-inicio');
  var toastLista = document.getElementById('demo-toast-lista');
  var botonDeshacer = document.getElementById('demo-deshacer');
  var dedo = document.getElementById('demo-dedo');

  var ICONO_CHECK = '<svg viewBox="0 0 24 24"><path d="M19 7 10 16.5 5 12"/></svg>';
  var ICONO_BORRAR = '<svg viewBox="0 0 24 24"><path d="M4 7h16M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6.5 7l.8 11.2a2 2 0 0 0 2 1.8h5.4a2 2 0 0 0 2-1.8L17.5 7M10 11v5M14 11v5"/></svg>';

  function fila(texto) {
    var li = document.createElement('li');
    li.className = 'tel-fila';
    li.innerHTML = '<span class="tel-check">' + ICONO_CHECK + '</span><span class="tel-texto"></span><span class="tel-borrar">' + ICONO_BORRAR + '</span>';
    li.querySelector('.tel-texto').textContent = texto;
    return li;
  }

  var demoVisible = true;
  var guardadas = [];

  function espera(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* Mientras el teléfono no se ve, la demostración se queda quieta y sigue al volver. */
  function visible() {
    return new Promise(function (r) { (function comprobar() { if (demoVisible) r(); else setTimeout(comprobar, 300); })(); });
  }

  function paso(ms) { return visible().then(function () { return espera(ms); }); }

  /* El «dedo» aparece donde se toca; los botones redondos se hunden un instante. */
  function tocar(el) {
    var pantalla = telefono.querySelector('.pantalla');
    var a = el.getBoundingClientRect();
    var b = pantalla.getBoundingClientRect();
    dedo.style.left = (a.left + a.width / 2 - b.left) + 'px';
    dedo.style.top = (a.top + a.height / 2 - b.top) + 'px';
    dedo.classList.remove('tocando');
    void dedo.offsetWidth;
    dedo.classList.add('tocando');
    if (el.classList.contains('tel-redondo')) {
      el.classList.add('pulsado');
      setTimeout(function () { el.classList.remove('pulsado'); }, 160);
    }
    return espera(240);
  }

  function aviso(el, ms) {
    el.classList.add('visible');
    return espera(ms).then(function () { el.classList.remove('visible'); });
  }

  function escribir(texto) {
    return visible().then(function () {
      return new Promise(function (resolver) {
        var i = 0;
        pildora.classList.add('escribiendo');
        (function tecla() {
          if (!demoVisible) return setTimeout(tecla, 300);
          i += 1;
          campo.textContent = texto.slice(0, i);
          pildora.classList.add('con-texto');
          if (i < texto.length) setTimeout(tecla, 45 + Math.random() * 60);
          else resolver();
        })();
      });
    });
  }

  /* Dictar: se toca el micrófono, late mientras escucha y el texto llega por palabras. */
  function dictar(texto) {
    var palabras = texto.split(' ');
    return tocar(micro).then(function () {
      micro.classList.add('escuchando');
      pildora.classList.add('escuchando');
      return paso(600);
    }).then(function () {
      return new Promise(function (resolver) {
        var i = 0;
        (function palabra() {
          if (!demoVisible) return setTimeout(palabra, 300);
          i += 1;
          campo.textContent = palabras.slice(0, i).join(' ');
          if (i < palabras.length) setTimeout(palabra, 280 + Math.random() * 220);
          else resolver();
        })();
      });
    }).then(function () { return paso(550); }).then(function () {
      micro.classList.remove('escuchando');
      pildora.classList.remove('escuchando');
      pildora.classList.add('con-texto');
      return paso(420);
    });
  }

  function guardar() {
    return tocar(botonEnviar).then(function () {
      guardadas.unshift(campo.textContent);
      campo.textContent = '';
      pildora.classList.remove('con-texto', 'escribiendo');
      aviso(toastInicio, 1100);
      return paso(1350);
    });
  }

  function abrirLista() {
    return tocar(botonLista).then(function () {
      lista.innerHTML = '';
      guardadas.forEach(function (t) { lista.appendChild(fila(t)); });
      telefono.dataset.pantalla = 'lista';
      return paso(1300);
    });
  }

  /* Al tachar, la fila baja al final y las demás se deslizan (Web Animations, como en la app). */
  function marcar(li) {
    return tocar(li.querySelector('.tel-check')).then(function () {
      var antes = new Map();
      Array.prototype.forEach.call(lista.children, function (f) { antes.set(f, f.getBoundingClientRect().top); });
      li.classList.add('hecha');
      return espera(380);
    }).then(function () {
      var antes = new Map();
      Array.prototype.forEach.call(lista.children, function (f) { antes.set(f, f.getBoundingClientRect().top); });
      lista.appendChild(li);
      Array.prototype.forEach.call(lista.children, function (f) {
        var d = antes.get(f) - f.getBoundingClientRect().top;
        if (d && f.animate) f.animate([{ transform: 'translateY(' + d + 'px)' }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
      });
      return paso(1100);
    });
  }

  /* Borrar pliega la fila y saca el aviso «Eliminada · Deshacer»; se toca «Deshacer» y vuelve. */
  function borrar(li) {
    return tocar(li.querySelector('.tel-borrar')).then(function () {
      li.style.height = li.offsetHeight + 'px';
      void li.offsetHeight;
      li.classList.add('plegada');
      toastLista.classList.add('visible');
      return paso(1500);
    }).then(function () {
      return tocar(botonDeshacer);
    }).then(function () {
      toastLista.classList.remove('visible');
      li.classList.remove('plegada');
      setTimeout(function () { li.style.height = ''; }, 260);
      return paso(1500);
    });
  }

  function volver() {
    return tocar(botonVolver).then(function () {
      telefono.dataset.pantalla = 'inicio';
      return paso(1400);
    });
  }

  function reiniciar() {
    guardadas = [];
    lista.innerHTML = '';
    campo.textContent = '';
    pildora.classList.remove('con-texto', 'escribiendo', 'escuchando');
    micro.classList.remove('escuchando');
    toastInicio.classList.remove('visible');
    toastLista.classList.remove('visible');
    telefono.dataset.pantalla = 'inicio';
  }

  function ciclo() {
    reiniciar();
    return paso(900)
      .then(function () { return escribir('Comprar pan'); })
      .then(function () { return paso(380); })
      .then(guardar)
      .then(function () { return paso(250); })
      .then(function () { return dictar('Llamar a Marta'); })
      .then(guardar)
      .then(function () { return paso(250); })
      .then(function () { return escribir('Regar las plantas'); })
      .then(function () { return paso(380); })
      .then(guardar)
      .then(function () { return paso(300); })
      .then(abrirLista)
      .then(function () { return marcar(lista.children[0]); })
      .then(function () { return borrar(lista.children[0]); })
      .then(function () { return paso(500); })
      .then(volver)
      .then(function () { return paso(900); })
      .then(ciclo);
  }

  if (telefono && lista && campo) {
    if (menosMovimiento) {
      /* Sin movimiento: la lista, quieta, con una cosa ya tachada. */
      ['Regar las plantas', 'Llamar a Marta', 'Comprar pan'].forEach(function (t) { lista.appendChild(fila(t)); });
      lista.lastElementChild.classList.add('hecha');
      telefono.dataset.pantalla = 'lista';
    } else {
      var demoEmpezada = false;
      var arrancarDemo = function () { if (!demoEmpezada) { demoEmpezada = true; ciclo(); } };
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entradas) {
          demoVisible = entradas[0].isIntersecting;
          if (demoVisible) arrancarDemo();
        }, { threshold: 0.2 }).observe(telefono);
      } else {
        arrancarDemo();
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
