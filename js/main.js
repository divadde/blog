/**
 * main.js — Primary interaction layer
 *
 * Handles: particle init, navbar, smooth scroll, mobile menu, scroll reveal,
 * typing animation, filters, cursor glow, theme toggle, contact form, BibTeX copy.
 *
 * Zero external dependencies · ES6+ · Passive listeners where safe
 */
;(function () {
  'use strict';

  /* ================================================================== */
  /*  UTILITIES                                                          */
  /* ================================================================== */

  /** Debounce helper */
  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  /** Simple $ / $$ helpers scoped to a root */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ================================================================== */
  /*  DOM READY                                                          */
  /* ================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initNavbarScroll();
    initActiveNavHighlight();
    initSmoothScroll();
    initMobileMenu();
    initScrollReveal();
    initTypingAnimation();
    initPublicationFilters();
    initBlogFilters();
    initCursorGlow();
    initThemeToggle();
    initContactForm();
    initBibtexCopy();
    initTimelineToggle();
  });

  /* ================================================================== */
  /*  1. PARTICLE NETWORK                                                */
  /* ================================================================== */
  function initParticles() {
    const canvas = $('#particles-canvas');
    if (!canvas || typeof window.ParticleNetwork !== 'function') return;
    window._particleNetwork = new window.ParticleNetwork(canvas);
  }

  /* ================================================================== */
  /*  2. NAVBAR SCROLL BEHAVIOUR                                         */
  /* ================================================================== */
  function initNavbarScroll() {
    const navbar = $('#navbar');
    if (!navbar) return;

    const hero = $('#hero');
    const threshold = 50;

    const onScroll = () => {
      if (window.scrollY > threshold) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }

      // Parallax-lite on hero
      if (hero) {
        const scroll = window.scrollY;
        const heroH = hero.offsetHeight;
        if (scroll < heroH) {
          hero.style.setProperty(
            '--parallax-offset',
            `${scroll * 0.35}px`
          );
        }
      }
    };

    window.addEventListener('scroll', debounce(onScroll, 10), { passive: true });
    onScroll(); // initial check
  }

  /* ================================================================== */
  /*  3. ACTIVE NAV LINK — IntersectionObserver                          */
  /* ================================================================== */
  function initActiveNavHighlight() {
    const sections = $$('.section, .hero');
    const navLinks = $$('.nav-link');
    if (!sections.length || !navLinks.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            navLinks.forEach((link) => {
              if (link.getAttribute('href') === `#${id}`) {
                link.classList.add('active');
              } else {
                link.classList.remove('active');
              }
            });
          }
        });
      },
      {
        rootMargin: '-10% 0px -50% 0px', // trigger when ~40% visible
        threshold: 0,
      }
    );

    sections.forEach((sec) => observer.observe(sec));
  }

  /* ================================================================== */
  /*  4. SMOOTH SCROLL                                                   */
  /* ================================================================== */
  function initSmoothScroll() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"], button[href^="#"]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href || href === '#') return;

      const target = $(href);
      if (!target) return;

      e.preventDefault();

      const navbar = $('#navbar');
      const offset = navbar ? navbar.offsetHeight : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;

      window.scrollTo({ top, behavior: 'smooth' });

      // Close mobile menu if open
      closeMobileMenu();
    });
  }

  /* ================================================================== */
  /*  5. MOBILE MENU                                                     */
  /* ================================================================== */
  let mobileMenuOpen = false;

  function closeMobileMenu() {
    const menu = $('#nav-menu');
    const toggle = $('#nav-toggle');
    if (!menu) return;
    menu.classList.remove('active');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    mobileMenuOpen = false;
  }

  function initMobileMenu() {
    const toggle = $('#nav-toggle');
    const menu = $('#nav-menu');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => {
      mobileMenuOpen = !mobileMenuOpen;
      menu.classList.toggle('active', mobileMenuOpen);
      toggle.setAttribute('aria-expanded', String(mobileMenuOpen));
    });

    // Click outside closes menu
    document.addEventListener('click', (e) => {
      if (
        mobileMenuOpen &&
        !menu.contains(e.target) &&
        !toggle.contains(e.target)
      ) {
        closeMobileMenu();
      }
    });

    // Escape key closes menu
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenuOpen) closeMobileMenu();
    });
  }

  /* ================================================================== */
  /*  6. SCROLL REVEAL — IntersectionObserver                            */
  /* ================================================================== */
  function initScrollReveal() {
    const revealEls = $$('.reveal');
    if (!revealEls.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const el = entry.target;

          // Stagger children inside grids
          const parent = el.parentElement;
          if (
            parent &&
            (parent.classList.contains('research-grid') ||
              parent.classList.contains('projects-grid') ||
              parent.classList.contains('blog-grid') ||
              parent.classList.contains('about-stats'))
          ) {
            const siblings = $$('.reveal', parent);
            const idx = siblings.indexOf(el);
            el.style.transitionDelay = `${idx * 120}ms`;
          }

          el.classList.add('revealed');
          observer.unobserve(el);
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    revealEls.forEach((el) => observer.observe(el));
  }

  /* ================================================================== */
  /*  7. TYPING ANIMATION                                                */
  /* ================================================================== */
  function initTypingAnimation() {
    const el = $('#typed-text');
    if (!el) return;

    const strings = [
      'Large Language Models',
      'Agentic AI Systems',
      'AI × Database Integration',
      'Industrial AI Research',
    ];

    const TYPE_SPEED = 80;
    const DELETE_SPEED = 40;
    const PAUSE_AFTER_TYPE = 2000;
    const PAUSE_AFTER_DELETE = 500;

    let stringIdx = 0;
    let charIdx = 0;
    let isDeleting = false;

    function tick() {
      const current = strings[stringIdx];

      if (!isDeleting) {
        // Typing
        charIdx++;
        el.textContent = current.substring(0, charIdx);

        if (charIdx === current.length) {
          // Finished typing — pause then delete
          isDeleting = true;
          setTimeout(tick, PAUSE_AFTER_TYPE);
          return;
        }
        setTimeout(tick, TYPE_SPEED);
      } else {
        // Deleting
        charIdx--;
        el.textContent = current.substring(0, charIdx);

        if (charIdx === 0) {
          isDeleting = false;
          stringIdx = (stringIdx + 1) % strings.length;
          setTimeout(tick, PAUSE_AFTER_DELETE);
          return;
        }
        setTimeout(tick, DELETE_SPEED);
      }
    }

    // Slight initial delay so the hero renders first
    setTimeout(tick, 800);
  }

  /* ================================================================== */
  /*  8. PUBLICATION FILTERS                                             */
  /* ================================================================== */
  function initPublicationFilters() {
    const container = $('.pub-filters');
    if (!container) return;

    const buttons = $$('.filter-btn', container);
    const items = $$('.pub-item');

    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;

      const filter = btn.dataset.filter;

      // Toggle active button
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      // Filter items
      items.forEach((item) => {
        if (filter === 'all' || item.dataset.category === filter) {
          item.classList.remove('hidden');
          item.removeAttribute('aria-hidden');
        } else {
          item.classList.add('hidden');
          item.setAttribute('aria-hidden', 'true');
        }
      });
    });
  }

  /* ================================================================== */
  /*  9. BLOG FILTERS                                                    */
  /* ================================================================== */
  function initBlogFilters() {
    const container = $('.blog-filters');
    if (!container) return;

    const buttons = $$('.filter-btn', container);
    const cards = $$('.blog-card');

    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;

      const filter = btn.dataset.filter;

      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      cards.forEach((card) => {
        if (filter === 'all' || card.dataset.category === filter) {
          card.classList.remove('hidden');
          card.removeAttribute('aria-hidden');
        } else {
          card.classList.add('hidden');
          card.setAttribute('aria-hidden', 'true');
        }
      });
    });
  }

  /* ================================================================== */
  /*  10. CURSOR GLOW                                                    */
  /* ================================================================== */
  function initCursorGlow() {
    const glow = $('#cursor-glow');
    if (!glow) return;

    // Desktop only
    if (window.innerWidth < 1024) {
      glow.style.display = 'none';
      return;
    }

    let rafId = null;
    let mouseX = -500;
    let mouseY = -500;

    document.addEventListener(
      'mousemove',
      (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        if (!rafId) {
          rafId = requestAnimationFrame(() => {
            glow.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
            rafId = null;
          });
        }
      },
      { passive: true }
    );

    // Hide when mouse leaves window
    document.addEventListener('mouseleave', () => {
      glow.style.opacity = '0';
    }, { passive: true });

    document.addEventListener('mouseenter', () => {
      glow.style.opacity = '';
    }, { passive: true });

    // Re-check on resize
    window.addEventListener(
      'resize',
      debounce(() => {
        glow.style.display = window.innerWidth < 1024 ? 'none' : '';
      }, 250)
    );
  }

  /* ================================================================== */
  /*  11. THEME TOGGLE                                                   */
  /* ================================================================== */
  function initThemeToggle() {
    const btn = $('#theme-toggle');
    if (!btn) return;

    const html = document.documentElement;
    const STORAGE_KEY = 'theme-preference';

    // Load saved preference (default: dark)
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      html.setAttribute('data-theme', saved);
    }

    function applyIconVisibility() {
      const theme = html.getAttribute('data-theme') || 'dark';
      const sun = $('.sun', btn);
      const moon = $('.moon', btn);
      if (sun) sun.style.display = theme === 'dark' ? 'block' : 'none';
      if (moon) moon.style.display = theme === 'dark' ? 'none' : 'block';
    }

    applyIconVisibility();

    btn.addEventListener('click', () => {
      const current = html.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem(STORAGE_KEY, next);
      applyIconVisibility();
    });
  }

  /* ================================================================== */
  /*  12. CONTACT FORM VALIDATION                                        */
  /* ================================================================== */
  function initContactForm() {
    const form = $('#contact-form');
    if (!form) return;

    const fields = {
      name: {
        input: $('#contact-name'),
        error: $('#name-error'),
        validate: (v) => (v.trim() ? '' : 'Please enter your name.'),
      },
      email: {
        input: $('#contact-email'),
        error: $('#email-error'),
        validate: (v) => {
          if (!v.trim()) return 'Please enter your email.';
          // Simple email regex
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()))
            return 'Please enter a valid email address.';
          return '';
        },
      },
      subject: {
        input: $('#contact-subject'),
        error: $('#subject-error'),
        validate: (v) => (v ? '' : 'Please select a subject.'),
      },
      message: {
        input: $('#contact-message'),
        error: $('#message-error'),
        validate: (v) => (v.trim() ? '' : 'Please enter a message.'),
      },
    };

    // Live clearing of errors on input
    Object.values(fields).forEach(({ input, error }) => {
      if (!input || !error) return;
      input.addEventListener('input', () => {
        error.textContent = '';
        input.classList.remove('input-error');
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      let firstInvalid = null;
      let isValid = true;

      for (const [, field] of Object.entries(fields)) {
        const { input, error, validate } = field;
        if (!input || !error) continue;

        const msg = validate(input.value);
        if (msg) {
          error.textContent = msg;
          input.classList.add('input-error');
          if (!firstInvalid) firstInvalid = input;
          isValid = false;
        } else {
          error.textContent = '';
          input.classList.remove('input-error');
        }
      }

      if (!isValid) {
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // Success — show feedback and reset
      const submitBtn = $('#submit-btn');
      if (submitBtn) {
        const origHTML = submitBtn.innerHTML;
        submitBtn.innerHTML =
          '<span>Message Sent!</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        submitBtn.disabled = true;
        submitBtn.classList.add('btn-success');

        setTimeout(() => {
          submitBtn.innerHTML = origHTML;
          submitBtn.disabled = false;
          submitBtn.classList.remove('btn-success');
        }, 3000);
      }

      form.reset();
    });
  }

  /* ================================================================== */
  /*  13. BIBTEX COPY                                                    */
  /* ================================================================== */
  function initBibtexCopy() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.pub-bibtex-btn');
      if (!btn) return;

      // Find the parent pub-item and build a placeholder BibTeX
      const pubItem = btn.closest('.pub-item');
      const title = pubItem
        ? (pubItem.querySelector('.pub-title')?.textContent || 'Untitled')
        : 'Untitled';
      const authors = pubItem
        ? (pubItem.querySelector('.pub-authors')?.textContent || 'Author')
        : 'Author';
      const venue = pubItem
        ? (pubItem.querySelector('.pub-venue')?.textContent || 'Venue')
        : 'Venue';
      const year = pubItem
        ? (pubItem.querySelector('.pub-year')?.textContent || '2026')
        : '2026';

      // Create a simple key from the first author surname + year
      const key = authors.split(',')[0].trim().split(' ').pop().toLowerCase() + year;

      const bibtex = `@article{${key},
  title     = {${title}},
  author    = {${authors}},
  journal   = {${venue}},
  year      = {${year}}
}`;

      navigator.clipboard.writeText(bibtex).then(() => {
        showCopiedTooltip(btn);
      }).catch(() => {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = bibtex;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showCopiedTooltip(btn);
      });
    });
  }

  function showCopiedTooltip(btn) {
    // Avoid duplicates
    const existing = btn.querySelector('.bibtex-tooltip');
    if (existing) existing.remove();

    const tooltip = document.createElement('span');
    tooltip.className = 'bibtex-tooltip';
    tooltip.textContent = 'Copied!';
    tooltip.setAttribute('role', 'status');

    // Inline styles for the tooltip (so it works without specific CSS)
    Object.assign(tooltip.style, {
      position: 'absolute',
      bottom: '110%',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--color-primary, #00d4ff)',
      color: '#0a0f1c',
      padding: '4px 12px',
      borderRadius: '6px',
      fontSize: '0.75rem',
      fontWeight: '600',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity 0.2s ease',
      zIndex: '10',
    });

    // Ensure parent is positioned
    btn.style.position = 'relative';
    btn.appendChild(tooltip);

    // Animate in
    requestAnimationFrame(() => {
      tooltip.style.opacity = '1';
    });

    setTimeout(() => {
      tooltip.style.opacity = '0';
      setTimeout(() => tooltip.remove(), 200);
    }, 1500);
  }

  /* ================================================================== */
  /*  14. TIMELINE TOGGLE                                                */
  /* ================================================================== */
  function initTimelineToggle() {
    const btn = $('#timeline-toggle-btn');
    const group = $('#timeline-older-group');
    if (!btn || !group) return;

    let isOpen = false;

    btn.addEventListener('click', () => {
      isOpen = !isOpen;
      
      if (isOpen) {
        group.style.display = 'block';
        btn.querySelector('span').textContent = 'Hide older activities';
        btn.querySelector('svg').style.transform = 'rotate(180deg)';
        
        // Trigger reveal animation for newly shown items
        const newItems = $$('.timeline-item', group);
        newItems.forEach((item, idx) => {
          item.style.transitionDelay = `${idx * 100}ms`;
          // Small timeout to allow display:block to apply before adding class
          setTimeout(() => item.classList.add('revealed'), 50);
        });
      } else {
        group.style.display = 'none';
        btn.querySelector('span').textContent = 'Show older activities';
        btn.querySelector('svg').style.transform = 'rotate(0)';
        
        // Reset reveal state for next time
        const newItems = $$('.timeline-item', group);
        newItems.forEach(item => item.classList.remove('revealed'));
      }
    });
  }
})();
