/* Фонд Святителей земли русской — интерактив
   Зависимости: GSAP 3.13 + ScrollTrigger, Lenis (локально в /vendor). */

(() => {
  'use strict';

  // Куда отправлять форму. Пусто — демо-режим (форма показывает «Спасибо», ничего не шлёт).
  // Подставь URL вебхука (Telegram-бот, Formspree, n8n) — форма пошлёт JSON {role, name, contact, message}.
  const CONFIG = { formEndpoint: '' };

  const html = document.documentElement;
  // ?motion=1 принудительно включает анимации (даже если в системе стоит «Уменьшить движение»)
  // Один раз открыл с ?motion=1 — браузер запомнит; ?motion=0 сбрасывает.
  const q = new URLSearchParams(location.search).get('motion');
  let forceMotion = false;
  try {
    if (q === '1') localStorage.setItem('fond-motion', '1');
    if (q === '0') localStorage.removeItem('fond-motion');
    forceMotion = localStorage.getItem('fond-motion') === '1';
  } catch (e) { forceMotion = q === '1'; }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches && !forceMotion;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isMobile = () => matchMedia('(max-width: 900px)').matches;
  const hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  const motion = hasGsap && !reduce;

  if (hasGsap) gsap.registerPlugin(ScrollTrigger);
  if (!motion) html.classList.add('reduced');

  /* ---------- Плавный скролл ---------- */
  let lenis = null;
  if (motion && typeof Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true, autoRaf: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const navH = () => parseFloat(getComputedStyle(html).getPropertyValue('--nav-h')) || 84;

  const scrollTo = (target) => {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -navH() + 1, duration: 1.4 });
    else {
      const y = el.getBoundingClientRect().top + window.scrollY - navH() + 1;
      window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    }
  };

  /* ---------- Меню (мобильное) ---------- */
  const burger = document.getElementById('burger');
  const menu = document.getElementById('menu');
  const openMenu = () => {
    menu.hidden = false;
    burger.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Закрыть меню');
    document.body.classList.add('menu-open');
    lenis && lenis.stop();
  };
  const closeMenu = () => {
    if (menu.hidden) return;
    menu.hidden = true;
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Открыть меню');
    document.body.classList.remove('menu-open');
    lenis && lenis.start();
  };
  burger.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  /* ---------- Якоря ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2 || !document.querySelector(id)) return;
      e.preventDefault();
      closeMenu();
      if (id === '#top') {
        lenis ? lenis.scrollTo(0, { duration: 1.4 }) : window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      } else {
        scrollTo(id);
      }
      history.replaceState(null, '', id === '#top' ? ' ' : id);
    });
  });

  /* ---------- Шапка при скролле ---------- */
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
  if (lenis) lenis.on('scroll', onScroll);
  else window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Орнамент: из героя в шапку ---------- */
  const orn = document.getElementById('orn');
  const ornImg = document.getElementById('ornImg');
  const space = document.getElementById('ornSpace');
  const slot = document.getElementById('brandSlot');
  const hero = document.getElementById('hero');

  // Координаты в документе без учёта transform-ов (offsetTop по цепочке)
  const docRect = (el) => {
    let top = 0, left = 0, n = el;
    while (n) { top += n.offsetTop; left += n.offsetLeft; n = n.offsetParent; }
    return { top, left, width: el.offsetWidth };
  };

  let A = null, B = null, progress = 0;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const place = () => {
    if (!A || !B) return;
    const e = easeInOut(progress);
    const sy = window.scrollY;
    const x = A.left + (B.left - A.left) * e;
    const y = (A.top - sy) + (B.top - (A.top - sy)) * e;
    const s = 1 + (B.width / A.width - 1) * e;
    orn.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
  };

  const measure = () => {
    A = docRect(space);
    const r = slot.getBoundingClientRect();
    B = { top: r.top, left: r.left, width: r.width };
    orn.style.width = A.width + 'px';
    place();
    html.classList.add('is-measured');
  };

  if (motion) {
    ScrollTrigger.create({
      trigger: hero,
      start: 'top top',
      end: () => '+=' + Math.round(hero.offsetHeight * 0.85),
      onUpdate: (self) => { progress = self.progress; place(); },
      onRefresh: measure,
    });
    // Между обновлениями ScrollTrigger (пока progress < 1) позиция зависит от scrollY
    if (lenis) lenis.on('scroll', () => { if (progress < 1) place(); });
    else window.addEventListener('scroll', () => { if (progress < 1) place(); }, { passive: true });
  }

  /* ---------- Интро ---------- */
  const counter = document.getElementById('counter');
  const intro = () => {
    if (!motion) { html.classList.add('is-ready'); return; }
    measure();
    html.classList.add('is-ready');

    const n = { v: 0 };
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.to(n, {
      v: 100, duration: 1.3, ease: 'power2.inOut',
      onUpdate: () => { counter.textContent = String(Math.round(n.v)).padStart(3, '0'); },
    }, 0)
      .fromTo(ornImg, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1.5, ease: 'power2.inOut' }, 0)
      .fromTo('.orn__shine', { backgroundPosition: '130% 0', opacity: 1 }, { backgroundPosition: '-30% 0', duration: 1.7, ease: 'power2.inOut' }, 0.15)
      .to('.orn__shine', { opacity: 0, duration: 0.6 }, 1.55)
      .to(counter, { opacity: 0, duration: 0.5 }, 1.3)
      .fromTo('.hero__tag', { opacity: 0, letterSpacing: '0.5em' }, { opacity: 1, letterSpacing: '0.22em', duration: 1.3 }, 0.95)
      .to('.hero__title .line > span', { yPercent: 0, y: 0, duration: 1.15, stagger: 0.13, ease: 'power4.out' }, 1.1)
      .fromTo(['.hero__lead', '.hero__cta'], { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12 }, 1.45)
      .to('.hero__scroll', { opacity: 1, duration: 0.8 }, 2.0);
  };

  // Ждём шрифты и орнамент (не дольше 2.5 с)
  const imgReady = new Promise((res) => {
    if (ornImg.complete && ornImg.naturalWidth) return res();
    ornImg.addEventListener('load', res, { once: true });
    ornImg.addEventListener('error', res, { once: true });
  });
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  const timeout = new Promise((res) => setTimeout(res, 2500));
  Promise.race([Promise.all([imgReady, fontsReady]), timeout]).then(intro);

  if (!motion) return finishStatic();

  /* ---------- Скролл-анимации ---------- */

  // Герой: текст уходит вверх и растворяется
  gsap.to(['.hero__tag', '.hero__title', '.hero__lead', '.hero__cta'], {
    y: -70, opacity: 0, stagger: 0.03, ease: 'none',
    scrollTrigger: { trigger: hero, start: 'top top', end: '75% top', scrub: true },
  });
  gsap.to('.hero__scroll', { opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '20% top', scrub: true } });

  // Заголовки: построчный подъём
  document.querySelectorAll('.reveal').forEach((el) => {
    const spans = el.querySelectorAll('.line > span');
    if (!spans.length) return;
    gsap.fromTo(spans, { yPercent: 112, y: 0 }, {
      yPercent: 0, y: 0, duration: 1.15, stagger: 0.1, ease: 'power4.out',
      scrollTrigger: { trigger: el, start: 'top 86%', once: true },
    });
  });

  // Столпы миссии
  gsap.utils.toArray('.pillar').forEach((p) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: p, start: 'top 82%', once: true } });
    tl.fromTo(p.querySelector('.pillar__name .line > span'), { yPercent: 112, y: 0 }, { yPercent: 0, y: 0, duration: 1.05, ease: 'power4.out' })
      .fromTo(p.querySelector('.pillar__tags'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.7 }, 0.3);
  });

  // Золотая нить
  const path = document.getElementById('threadPath');
  if (path) {
    const len = path.getTotalLength();
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = String(len);
    gsap.to(path, {
      strokeDashoffset: 0, ease: 'none',
      scrollTrigger: { trigger: '#pillars', start: 'top 78%', end: 'bottom 55%', scrub: 0.6 },
    });
  }

  // Люди
  ScrollTrigger.batch('.role', {
    start: 'top 88%', once: true,
    onEnter: (batch) => gsap.fromTo(batch, { opacity: 0, y: 26 }, {
      opacity: 1, y: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out',
      onStart: () => batch.forEach((el) => el.classList.add('is-in')),
    }),
  });

  // Фон секции «Присоединяйтесь»
  gsap.fromTo('.join__bg img', { yPercent: -10 }, {
    yPercent: 10, ease: 'none',
    scrollTrigger: { trigger: '#join', start: 'top bottom', end: 'bottom top', scrub: true },
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => ScrollTrigger.refresh(), 150); });

  /* ---------- Золотая пыль в герое ---------- */
  const canvas = document.getElementById('dust');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, parts = [], visible = true, raf = 0;
    const N = 70;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const seed = () => {
      parts = Array.from({ length: N }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: 0.6 + Math.random() * 1.5,
        vx: (Math.random() - 0.5) * 0.12, vy: -0.05 - Math.random() * 0.16,
        a: 0.12 + Math.random() * 0.4, ph: Math.random() * Math.PI * 2,
      }));
    };
    const tick = (t) => {
      if (!visible) return;
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.x += p.vx + Math.sin(t / 1800 + p.ph) * 0.08;
        p.y += p.vy;
        if (p.y < -6) { p.y = h + 6; p.x = Math.random() * w; }
        if (p.x < -6) p.x = w + 6; else if (p.x > w + 6) p.x = -6;
        const tw = 0.6 + 0.4 * Math.sin(t / 900 + p.ph);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226, 201, 139, ${(p.a * tw).toFixed(3)})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    resize(); seed(); raf = requestAnimationFrame(tick);
    new IntersectionObserver(([e]) => {
      const was = visible; visible = e.isIntersecting;
      if (visible && !was) raf = requestAnimationFrame(tick);
    }).observe(canvas);
    window.addEventListener('resize', () => { resize(); seed(); });
  }

  finishStatic();

  /* ---------- Всё, что работает и без анимаций ---------- */
  function finishStatic() {
    // Шапка светлеет над кремовыми секциями
    const navEl = document.getElementById('nav');
    const papers = document.querySelectorAll('.paper');
    let io = null;
    const onPaper = new Set();
    const watchPapers = () => {
      io && io.disconnect(); onPaper.clear();
      io = new IntersectionObserver((entries) => {
        entries.forEach((en) => (en.isIntersecting ? onPaper.add(en.target) : onPaper.delete(en.target)));
        navEl.classList.toggle('is-light', onPaper.size > 0);
      }, { rootMargin: `-${Math.round(navH() / 2)}px 0px -${Math.max(0, window.innerHeight - Math.round(navH() / 2) - 1)}px 0px`, threshold: 0 });
      papers.forEach((p) => io.observe(p));
    };
    watchPapers();
    let wt;
    window.addEventListener('resize', () => { clearTimeout(wt); wt = setTimeout(watchPapers, 200); });

    // Инициативы: hover/фокус активирует сцену на десктопе, тап раскрывает описание на мобильном
    const items = Array.from(document.querySelectorAll('.init__item'));
    const stageText = document.getElementById('stageText');
    const stageArt = document.getElementById('stageArt');
    const setActive = (item) => {
      items.forEach((i) => {
        const on = i === item;
        i.classList.toggle('is-active', on);
        if (!isMobile()) i.querySelector('.init__row').setAttribute('aria-expanded', String(on));
      });
      stageArt.style.setProperty('--x', item.dataset.x);
      stageArt.style.setProperty('--y', item.dataset.y);
      const swap = () => { stageText.textContent = item.dataset.desc; };
      if (motion) gsap.fromTo(stageText, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', onStart: swap });
      else swap();
    };
    items.forEach((item) => {
      const row = item.querySelector('.init__row');
      row.addEventListener('mouseenter', () => { if (finePointer && !isMobile() && !item.classList.contains('is-active')) setActive(item); });
      row.addEventListener('focus', () => { if (!isMobile() && !item.classList.contains('is-active')) setActive(item); });
      row.addEventListener('click', () => {
        if (isMobile()) {
          const open = item.classList.toggle('is-open');
          row.setAttribute('aria-expanded', String(open));
        } else if (!item.classList.contains('is-active')) {
          setActive(item);
        }
      });
    });
    if (isMobile()) items.forEach((i) => i.querySelector('.init__row').setAttribute('aria-expanded', 'false'));

    // Форма
    const modal = document.getElementById('formModal');
    const form = document.getElementById('joinForm');
    const done = modal.querySelector('.form__done');
    const title = document.getElementById('formTitle');
    const sub = document.getElementById('formSub');
    const roleInput = document.getElementById('formRole');
    const titles = {
      'Поддержать': ['Поддержать фонд', 'Расскажите о себе — мы свяжемся и обсудим формат поддержки.'],
      'Партнёрство': ['Стать партнёром', 'Опишите проект или направление — обсудим совместную работу.'],
      'Инициатива': ['Предложить инициативу', 'Коротко об идее — фонд открыт для новых проектов.'],
    };
    let lastTrigger = null;

    const openForm = (role, trigger) => {
      lastTrigger = trigger || null;
      const [t, s] = titles[role] || ['Написать фонду', 'Расскажите о себе — мы ответим лично.'];
      title.textContent = t; sub.textContent = s; roleInput.value = role || '';
      form.hidden = false; done.hidden = true;
      if (typeof modal.showModal === 'function') modal.showModal(); else modal.setAttribute('open', '');
      lenis && lenis.stop();
      const first = form.querySelector('input[name="name"]');
      first && setTimeout(() => first.focus(), 50);
    };
    const closeForm = () => { if (modal.open) modal.close(); else modal.removeAttribute('open'); };

    document.querySelectorAll('[data-open-form]').forEach((b) => b.addEventListener('click', () => { closeMenu(); openForm(b.dataset.role, b); }));
    modal.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeForm));
    modal.addEventListener('click', (e) => { if (e.target === modal) closeForm(); });
    modal.addEventListener('close', () => { lenis && lenis.start(); lastTrigger && lastTrigger.focus(); });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const btn = form.querySelector('[type="submit"]');
      const data = Object.fromEntries(new FormData(form));
      data.page = location.href;
      btn.disabled = true; btn.textContent = 'Отправляем…';
      try {
        if (CONFIG.formEndpoint) {
          const r = await fetch(CONFIG.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
          if (!r.ok) throw new Error('HTTP ' + r.status);
        } else {
          await new Promise((res) => setTimeout(res, 700));
        }
        form.hidden = true; done.hidden = false; form.reset();
        done.querySelector('.btn').focus();
      } catch (err) {
        btn.textContent = 'Не отправилось — попробуйте ещё раз';
        setTimeout(() => { btn.textContent = 'Отправить'; btn.disabled = false; }, 2600);
        return;
      }
      btn.disabled = false; btn.textContent = 'Отправить';
    });
  }
})();
