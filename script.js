/* =====================================================
   SCROLL-DRIVEN ANIMATION ENGINE
   Controls laptop transforms & section reveals
   ===================================================== */

(function () {
  'use strict';

  // ── DOM refs ──────────────────────────────────────
  const wrapper        = document.getElementById('laptopWrapper');
  const lid            = document.getElementById('laptopLid');
  const screenScroll   = document.getElementById('screenScrollContent');
  const progressBar    = document.getElementById('scrollProgress');
  const heroContent    = document.getElementById('heroContent');
  const journeyLeft    = document.getElementById('journeyLeft');
  const contactLeft    = document.getElementById('contactLeft');
  const floatSymbols   = document.querySelectorAll('.float-sym');

  // Desk Environment refs
  const deskSurface    = document.querySelector('.desk-surface');

  // ── Helpers ───────────────────────────────────────
  function lerp(a, b, t) {
    return a + (b - a) * clamp01(t);
  }

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function mapRange(value, inMin, inMax, outMin, outMax) {
    const t = clamp01((value - inMin) / (inMax - inMin));
    return lerp(outMin, outMax, t);
  }

  function easeOut(t) {
    return 1 - Math.pow(1 - clamp01(t), 3);
  }

  function easeInOut(t) {
    t = clamp01(t);
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // ── Scroll phases ─────────────────────────────────
  const P = {
    // Hero
    heroEnd:          0.07,

    // Laptop opens & scales up
    laptopOpen:       0.12,    // lid fully open
    scaleUpEnd:       0.14,    // laptop at max size (1.3)

    // Code scrolls inside screen (const developer → competenze)
    codeScrollStart:  0.14,
    codeScrollEnd:    0.36,

    // Laptop shrinks back & moves right
    shrinkStart:      0.34,
    shrinkEnd:        0.40,
    laptopRight:      0.38,

    // Journey
    journeyStart:     0.38,
    journeyEnd:       0.74,

    // Contact (Final section)
    contactStart:     0.70,
    contactEnd:       1.00,    // remains visible until the bottom of the page
  };

  // Total pixels to scroll the code content inside the screen (calculated dynamically)
  let screenScrollMax = 850;
  let initialCalculated = false;

  function calculateScrollMax() {
    if (!screenScroll) return;
    const panel = screenScroll.parentElement;
    if (!panel) return;
    
    // Total height of the scroll content
    const contentHeight = screenScroll.offsetHeight || screenScroll.scrollHeight;
    // Visible height of the panel container
    const panelHeight = panel.clientHeight;
    
    // contentHeight - panelHeight + padding (32px) + extra margin (24px)
    screenScrollMax = Math.max(0, contentHeight - panelHeight + 56);
  }

  // ── Scroll handler ────────────────────────────────
  let ticking = false;

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }

  function update() {
    ticking = false;

    if (!initialCalculated) {
      calculateScrollMax();
      initialCalculated = true;
    }

    const scrollY  = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return;

    const progress = scrollY / maxScroll;

    // ── Progress bar ──
    progressBar.style.width = (progress * 100) + '%';

    // ── Floating symbols parallax ──
    floatSymbols.forEach((sym, i) => {
      const speed = 0.15 + i * 0.06;
      sym.style.transform = `translateY(${-scrollY * speed}px)`;
    });

    // ══════════════════════════════════════════════════
    // DESK ENVIRONMENT TRANSFORMS (CSS Drawn)
    // ══════════════════════════════════════════════════
    const zoomT = mapRange(progress, 0, P.scaleUpEnd, 0, 1);
    const zoomEase = easeOut(zoomT);

    // Parallax zooms and offsets for the desk surface
    const dsTy = lerp(0, 60, zoomEase);
    const dsS  = lerp(1, 1.25, zoomEase);
    let dsTx = 0;

    // Slide/pan background elements when laptop moves to the right
    if (progress >= P.laptopRight) {
      const shiftT = mapRange(progress, P.laptopRight, P.laptopRight + 0.08, 0, 1);
      const shiftEase = easeOut(shiftT);
      const panTx = lerp(0, window.innerWidth * 0.08, shiftEase);
      
      dsTx     += panTx * 0.4;
    }

    if (deskSurface) {
      deskSurface.style.setProperty('transform', `translateY(${dsTy}px) scale(${dsS}) translateX(${dsTx}px)`);
    }

    // ══════════════════════════════════════════════════
    // LAPTOP TRANSFORMS
    // ══════════════════════════════════════════════════

    // Lid angle: -90 (closed) → -8 (open)
    const lidProgress = mapRange(progress, 0.02, P.laptopOpen, 0, 1);
    const lidAngle = lerp(-90, -8, easeOut(lidProgress));

    // Glow opacity based on lid open
    const glowOpacity = easeOut(lidProgress) * 0.8;
    wrapper.style.setProperty('--screen-glow', glowOpacity);

    // Scale phases:
    let laptopScale;
    if (progress < P.scaleUpEnd) {
      const t = mapRange(progress, 0, P.scaleUpEnd, 0, 1);
      laptopScale = lerp(0.75, 1.3, easeOut(t));
    } else if (progress < P.shrinkStart) {
      laptopScale = 1.3;
    } else {
      const t = mapRange(progress, P.shrinkStart, P.shrinkEnd, 0, 1);
      laptopScale = lerp(1.3, 1.0, easeInOut(t));
    }

    // Smooth laptop vertical translate lerp
    const yProgress = mapRange(progress, 0, P.scaleUpEnd, 0, 1);
    const laptopY = lerp(40, -10, easeOut(yProgress));

    // X position: center → right (after code scroll)
    const xProgress = mapRange(progress, P.laptopRight, P.laptopRight + 0.08, 0, 1);
    const vw = window.innerWidth;
    const laptopX = lerp(0, vw * 0.22, easeOut(xProgress));

    // Opacity: keep laptop always visible on desk
    const laptopOpacity = 1;

    // Apply
    wrapper.style.setProperty('--lx', laptopX + 'px');
    wrapper.style.setProperty('--ly', laptopY + 'px');
    wrapper.style.setProperty('--ls', laptopScale);
    wrapper.style.setProperty('--lo', laptopOpacity);
    lid.style.setProperty('--lid-angle', lidAngle);

    // ══════════════════════════════════════════════════
    // SCREEN CODE SCROLLING (continuous, no panel switch)
    // ══════════════════════════════════════════════════
    const codeT = mapRange(progress, P.codeScrollStart, P.codeScrollEnd, 0, 1);
    const scrollPx = -lerp(0, screenScrollMax, easeInOut(codeT));
    if (screenScroll) {
      screenScroll.style.setProperty('--screen-scroll', scrollPx);
    }

    // ══════════════════════════════════════════════════
    // SCREEN PANEL TOGGLE & POINTER EVENTS
    // ══════════════════════════════════════════════════
    const screenPanel = document.getElementById('screenPanel');
    const screenMail = document.getElementById('screenMail');
    
    // Switch to email composer when the contact section reaches the center of the viewport (progress >= 0.74)
    // and stays until the bottom of the page
    if (progress >= 0.74 && progress < P.contactEnd) {
      if (screenMail && !screenMail.classList.contains('active')) {
        screenMail.classList.add('active');
        if (screenPanel) screenPanel.classList.remove('active');
        if (wrapper) wrapper.style.pointerEvents = 'auto'; // allow interaction!
      }
    } else {
      if (screenPanel && !screenPanel.classList.contains('active')) {
        screenPanel.classList.add('active');
        if (screenMail) screenMail.classList.remove('active');
        if (wrapper) wrapper.style.pointerEvents = 'none'; // click-through
      }
    }

    // ══════════════════════════════════════════════════
    // SECTION VISIBILITY
    // ══════════════════════════════════════════════════

    // Hero
    const heroFade = mapRange(progress, 0.03, P.heroEnd, 0, 1);
    heroContent.style.setProperty('--hero-opacity', lerp(1, 0, easeOut(heroFade)));
    heroContent.style.setProperty('--hero-ty', lerp(0, -40, easeOut(heroFade)) + 'px');

    // Journey
    const journeyIn  = mapRange(progress, P.journeyStart, P.journeyStart + 0.08, 0, 1);
    const journeyOut = mapRange(progress, P.journeyEnd - 0.04, P.journeyEnd, 0, 1);
    const journeyOp  = Math.min(easeOut(journeyIn), 1 - easeOut(journeyOut));
    if (journeyLeft) {
      journeyLeft.style.setProperty('--journey-opacity', Math.max(0, journeyOp));
      journeyLeft.style.setProperty('--journey-ty', lerp(40, 0, easeOut(journeyIn)) + 'px');
    }

    // Contact (Final Section: does not fade out)
    const contactIn  = mapRange(progress, P.contactStart, P.contactStart + 0.08, 0, 1);
    const contactOp  = easeOut(contactIn);
    if (contactLeft) {
      contactLeft.style.setProperty('--contact-opacity', Math.max(0, contactOp));
      contactLeft.style.setProperty('--contact-ty', lerp(40, 0, easeOut(contactIn)) + 'px');
    }
  }

  // ── Init ──────────────────────────────────────────
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { 
    calculateScrollMax();
    onScroll(); 
  }, { passive: true });
  window.addEventListener('load', () => {
    calculateScrollMax();
    update();
  });
  update();

  // ── Staggered card reveal ─────────────────────────
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('[data-delay]').forEach((card, i) => {
            setTimeout(() => {
              card.style.opacity = '1';
              card.style.transform = 'translateY(0)';
            }, i * 100);
          });
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll('[data-delay]').forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  });

  [document.getElementById('sectionJourney'),
   document.getElementById('sectionContact')
  ].forEach((s) => { if (s) observer.observe(s); });

  // ── Email Composer Submission ──────────────────────
  const mailForm = document.getElementById('mailForm');
  if (mailForm) {
    mailForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const subject = document.getElementById('mailSubject').value;
      const body = document.getElementById('mailBody').value;
      
      const mailtoUrl = `mailto:federicoturrini.tn@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      const composer = document.querySelector('.mail-composer');
      if (composer) {
        composer.innerHTML = `
          <div class="mail-success" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:12px; color:#fff; text-align:center; padding: 20px; animation: fadeIn 0.4s ease;">
            <div class="success-icon" style="width:36px; height:36px; border-radius:50%; background:rgba(39,201,63,0.15); display:flex; align-items:center; justify-content:center; color:#27c93f; font-size:16px; font-weight:bold; margin-bottom:4px;">✓</div>
            <div style="font-weight:600; font-size:12px; font-family:var(--font-heading);">Messaggio Pronto!</div>
            <div style="font-size:10px; color:#8b949e; line-height:1.4; font-family:var(--font-body);">Ho aperto il tuo client email predefinito per completare l'invio.</div>
          </div>
        `;
      }
      
      setTimeout(() => {
        window.location.href = mailtoUrl;
      }, 800);
    });
  }
})();
