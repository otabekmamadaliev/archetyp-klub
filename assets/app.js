/* ARCHETYP KLUB — skrypt tylko tej strony. Bez zależności.
 *
 * Zapis na trening próbny działa BEZ SERWERA: formularz waliduje, składa
 * czytelne zgłoszenie i przekazuje je na telefon klubu (WhatsApp, SMS jako
 * zapas). U realnego klienta podmienia się wyłącznie numer w site.config.json.
 */
(function () {
  'use strict';

  var T = {}, D = {};
  try { T = JSON.parse(document.getElementById('i18n').textContent) || {}; } catch (e) {}
  try { D = JSON.parse(document.getElementById('dane').textContent) || {}; } catch (e) {}
  var t = function (k, d) { return T[k] || d || ''; };
  var spokojnie = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s) { return document.querySelector(s); };

  var belka = $('.belka');
  if (belka) {
    var cien = function () { belka.classList.toggle('przewiniety', window.scrollY > 30); };
    cien(); window.addEventListener('scroll', cien, { passive: true });
  }

  var btnMenu = $('.ham'), menu = document.getElementById('mm');
  if (btnMenu && menu) {
    var etyk = btnMenu.getAttribute('aria-label');
    btnMenu.addEventListener('click', function () {
      var otwarte = menu.classList.toggle('otwarte');
      btnMenu.setAttribute('aria-expanded', String(otwarte));
      btnMenu.setAttribute('aria-label', otwarte ? t('closeMenu', etyk) : etyk);
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { menu.classList.remove('otwarte'); btnMenu.setAttribute('aria-expanded', 'false'); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('otwarte')) btnMenu.click();
    });
  }

  if ('IntersectionObserver' in window && !spokojnie) {
    var cele = document.querySelectorAll('.grupa, .plan tbody tr, .skladka, .opinia, .sala figure, .atuty li');
    var io = new IntersectionObserver(function (wpisy) {
      wpisy.forEach(function (w) {
        if (!w.isIntersecting) return;
        w.target.style.transition = 'opacity .3s linear, transform .3s cubic-bezier(.3,.7,.3,1)';
        w.target.style.opacity = 1; w.target.style.transform = 'none';
        io.unobserve(w.target);
      });
    }, { rootMargin: '0px 0px -5% 0px', threshold: .05 });
    [].forEach.call(cele, function (el, i) {
      el.style.opacity = 0; el.style.transform = 'translateY(10px)';
      el.style.transitionDelay = (i % 6) * 40 + 'ms';
      io.observe(el);
    });
  }

  [].forEach.call(document.querySelectorAll('a.lang'), function (a) {
    a.addEventListener('click', function () {
      try { localStorage.setItem('jezyk', (a.getAttribute('hreflang') || a.textContent).trim().toLowerCase().slice(0, 2)); } catch (e) {}
    });
  });

  /* ============================================================== zapis */
  var form = document.getElementById('zapis-form');
  if (!form) return;

  var poleGrupa = document.getElementById('pole-grupa');
  var poleDzien = document.getElementById('pole-dzien');
  var poleWiek = document.getElementById('pole-wiek');
  var komunikat = document.getElementById('zapis-komunikat');

  function wypelnij(select, lista, zPusta) {
    select.innerHTML = '';
    if (zPusta) {
      var p = document.createElement('option');
      p.value = ''; p.textContent = (D.slowa && D.slowa.choose) || '—';
      select.appendChild(p);
    }
    (lista || []).forEach(function (v) {
      var o = document.createElement('option');
      o.value = v; o.textContent = v;
      select.appendChild(o);
    });
  }
  wypelnij(poleGrupa, D.grupy, true);
  wypelnij(poleDzien, D.dni, true);

  /* Wpisany wiek podpowiada grupę. Rodzic nie musi wiedzieć, do którego
     przedziału trafia jego dziecko — od tego jest strona, a nie telefon. */
  poleWiek.addEventListener('input', function () {
    var w = parseInt(poleWiek.value, 10);
    if (!w || poleGrupa.value) return;
    var idx = w <= 9 ? 0 : w <= 13 ? 1 : w <= 17 ? 2 : 3;
    var opcja = poleGrupa.options[idx + 1];
    if (opcja) poleGrupa.value = opcja.value;
  });

  function pokaz(txt, zle) {
    komunikat.textContent = txt;
    komunikat.className = 'zapis-komunikat ' + (zle ? 'zle' : 'ok');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var kto = form.querySelector('input[name="kto"]:checked');
    var grupa = poleGrupa.value;
    var wiek = poleWiek.value.trim();
    var dzien = poleDzien.value;
    var imie = document.getElementById('pole-imie').value.trim();
    var tel = document.getElementById('pole-tel').value.trim();

    if (!grupa || !wiek) { pokaz(t('kFill'), true); return; }
    if (!imie || tel.replace(/\D/g, '').length < 9) { pokaz(t('kPhone'), true); return; }

    var etykietaKto = kto ? kto.parentElement.querySelector('span').textContent : '';
    var tresc = [
      D.firma, '---',
      etykietaKto,
      grupa + ', ' + wiek,
      dzien || '',
      '---', imie, tel
    ].filter(Boolean).join('\n');

    var numer = String(D.tel || '').replace(/\D/g, '');
    if (!numer) { pokaz(t('kNoChannel'), true); return; }

    pokaz(t('kOpening'), false);
    var okno = window.open('https://wa.me/' + numer + '?text=' + encodeURIComponent(tresc), '_blank', 'noopener');
    if (!okno) location.href = 'sms:+' + numer + '?body=' + encodeURIComponent(tresc);
    setTimeout(function () { pokaz(t('kDone'), false); }, 900);
  });
  /* Kartka "otwarte teraz". Liczona z PRAWDZIWYCH godzin — wpisany na sztywno
     wolny termin zestarzalby sie w tydzien. Gdy dzien nie ma znanych godzin,
     kartka zostaje ukryta zamiast zgadywac. */
  (function(){
    var k=document.getElementById('kartka-stan');
    if(!k||!D.godziny||!D.stan) return;
    var g=D.godziny, teraz=new Date(), dzis=(teraz.getDay()+6)%7;
    var minuty=teraz.getHours()*60+teraz.getMinutes();
    var hhmm=function(m){return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');};
    var tytul=k.querySelector('[data-stan-tytul]'), opis=k.querySelector('[data-stan-opis]');
    var dzisiaj=g[dzis];
    if(dzisiaj && minuty>=dzisiaj[0] && minuty<dzisiaj[1]){
      tytul.textContent=D.stan.terazOtwarte;
      opis.textContent=D.stan.doGodz.replace('{g}',hhmm(dzisiaj[1]));
      k.hidden=false; k.classList.add('kartka--otwarte'); return;
    }
    for(var i=0;i<7;i++){
      var d=(dzis+i)%7, z=g[d];
      if(!z) continue;
      if(i===0 && minuty>=z[0]) continue;
      tytul.textContent=D.stan.zamkniete;
      opis.textContent=D.stan.otwieramy
        .replace('{d}', i===0 ? '' : (D.dniTyg&&D.dniTyg[d]||''))
        .replace('{g}', hhmm(z[0])).replace(/\s+/g,' ').trim();
      k.hidden=false; return;
    }
  })();

})();
