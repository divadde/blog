/**
 * ParticleNetwork — Neural network / constellation animation
 * Canvas 2D-based particle system for the hero section.
 *
 * Features:
 *   - Organic floating particles with slight random velocity
 *   - Distance-based connections with opacity falloff
 *   - Mouse attraction interaction
 *   - Subtle pulsing glow on select particles
 *   - Responsive: adjusts particle count & canvas size on resize
 *   - Performance: uses requestAnimationFrame, limits draw calls
 */
;(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  Configuration                                                      */
  /* ------------------------------------------------------------------ */
  const CONFIG = {
    // Particle counts
    desktopCount: 80,
    mobileCount: 40,
    mobileBreakpoint: 768,

    // Particle appearance
    nodeColor: { r: 0, g: 212, b: 255 },        // #00d4ff
    nodeMinRadius: 1.5,
    nodeMaxRadius: 3,
    nodeMinOpacity: 0.3,
    nodeMaxOpacity: 0.8,

    // Connection lines
    connectionMaxDist: 150,
    connectionColor: { r: 100, g: 80, b: 220 },  // blue-violet
    connectionMaxOpacity: 0.15,

    // Movement
    baseSpeed: 0.3,
    driftVariance: 0.15,

    // Mouse
    mouseRadius: 180,
    mouseAttraction: 0.025,
    mouseBrighten: 2.5,

    // Glow pulse
    glowChance: 0.3,            // % of particles that pulse
    glowSpeed: 0.015,           // radians per frame
    glowAmplitude: 0.35,        // how much opacity varies
  };

  /* ------------------------------------------------------------------ */
  /*  Particle class                                                     */
  /* ------------------------------------------------------------------ */
  class Particle {
    constructor(canvasW, canvasH) {
      this.reset(canvasW, canvasH, true);
    }

    reset(w, h, randomPosition = false) {
      if (randomPosition) {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
      }
      this.radius =
        CONFIG.nodeMinRadius +
        Math.random() * (CONFIG.nodeMaxRadius - CONFIG.nodeMinRadius);
      this.baseOpacity =
        CONFIG.nodeMinOpacity +
        Math.random() * (CONFIG.nodeMaxOpacity - CONFIG.nodeMinOpacity);
      this.opacity = this.baseOpacity;

      const angle = Math.random() * Math.PI * 2;
      const speed = CONFIG.baseSpeed * (0.5 + Math.random() * 0.5);
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;

      // Glow
      this.hasGlow = Math.random() < CONFIG.glowChance;
      this.glowPhase = Math.random() * Math.PI * 2;
    }

    update(w, h, mouse) {
      /* --- drift variation --- */
      this.vx += (Math.random() - 0.5) * CONFIG.driftVariance;
      this.vy += (Math.random() - 0.5) * CONFIG.driftVariance;

      // Clamp speed
      const maxV = CONFIG.baseSpeed * 1.8;
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (speed > maxV) {
        this.vx = (this.vx / speed) * maxV;
        this.vy = (this.vy / speed) * maxV;
      }

      this.x += this.vx;
      this.y += this.vy;

      /* --- mouse attraction --- */
      if (mouse.active) {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONFIG.mouseRadius && dist > 0) {
          const force = (1 - dist / CONFIG.mouseRadius) * CONFIG.mouseAttraction;
          this.vx += dx / dist * force;
          this.vy += dy / dist * force;
        }
      }

      /* --- wrap around edges with padding --- */
      const pad = 10;
      if (this.x < -pad) this.x = w + pad;
      else if (this.x > w + pad) this.x = -pad;
      if (this.y < -pad) this.y = h + pad;
      else if (this.y > h + pad) this.y = -pad;

      /* --- glow pulse --- */
      if (this.hasGlow) {
        this.glowPhase += CONFIG.glowSpeed;
        this.opacity =
          this.baseOpacity +
          Math.sin(this.glowPhase) * CONFIG.glowAmplitude * this.baseOpacity;
        this.opacity = Math.max(0.1, Math.min(1, this.opacity));
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /*  ParticleNetwork                                                    */
  /* ------------------------------------------------------------------ */
  class ParticleNetwork {
    constructor(canvasEl) {
      if (!canvasEl) return;
      this.canvas = canvasEl;
      this.ctx = canvasEl.getContext('2d');
      this.particles = [];
      this.mouse = { x: 0, y: 0, active: false };
      this.animId = null;
      this.destroyed = false;

      this._resize = this._handleResize.bind(this);
      this._mouseMove = this._handleMouseMove.bind(this);
      this._mouseLeave = this._handleMouseLeave.bind(this);

      this._init();
    }

    /* ---------- lifecycle ---------- */
    _init() {
      this._setCanvasSize();
      this._populate();
      this._bindEvents();
      this._loop();
    }

    destroy() {
      this.destroyed = true;
      cancelAnimationFrame(this.animId);
      window.removeEventListener('resize', this._resize);
      this.canvas.removeEventListener('mousemove', this._mouseMove);
      this.canvas.removeEventListener('mouseleave', this._mouseLeave);
    }

    /* ---------- canvas sizing ---------- */
    _setCanvasSize() {
      const parent = this.canvas.parentElement;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = parent.getBoundingClientRect();
      this.width = rect.width;
      this.height = rect.height;
      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;
      this.canvas.style.width = this.width + 'px';
      this.canvas.style.height = this.height + 'px';
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /* ---------- particle management ---------- */
    _targetCount() {
      return this.width < CONFIG.mobileBreakpoint
        ? CONFIG.mobileCount
        : CONFIG.desktopCount;
    }

    _populate() {
      const target = this._targetCount();
      this.particles = [];
      for (let i = 0; i < target; i++) {
        this.particles.push(new Particle(this.width, this.height));
      }
    }

    _reconcileCount() {
      const target = this._targetCount();
      while (this.particles.length < target) {
        this.particles.push(new Particle(this.width, this.height));
      }
      while (this.particles.length > target) {
        this.particles.pop();
      }
    }

    /* ---------- events ---------- */
    _bindEvents() {
      // Debounced resize
      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(this._resize, 200);
      });

      this.canvas.addEventListener('mousemove', this._mouseMove, { passive: true });
      this.canvas.addEventListener('mouseleave', this._mouseLeave, { passive: true });
    }

    _handleResize() {
      this._setCanvasSize();
      this._reconcileCount();
      // re-clamp particles that fell outside
      for (const p of this.particles) {
        if (p.x > this.width) p.x = Math.random() * this.width;
        if (p.y > this.height) p.y = Math.random() * this.height;
      }
    }

    _handleMouseMove(e) {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this.mouse.active = true;
    }

    _handleMouseLeave() {
      this.mouse.active = false;
    }

    /* ---------- render loop ---------- */
    _loop() {
      if (this.destroyed) return;
      this._update();
      this._draw();
      this.animId = requestAnimationFrame(() => this._loop());
    }

    _update() {
      for (const p of this.particles) {
        p.update(this.width, this.height, this.mouse);
      }
    }

    _draw() {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;
      ctx.clearRect(0, 0, w, h);

      const particles = this.particles;
      const len = particles.length;
      const maxDist = CONFIG.connectionMaxDist;
      const maxDistSq = maxDist * maxDist;
      const { r: lr, g: lg, b: lb } = CONFIG.connectionColor;
      const { r: nr, g: ng, b: nb } = CONFIG.nodeColor;
      const mouseActive = this.mouse.active;
      const mx = this.mouse.x;
      const my = this.mouse.y;
      const mouseRadiusSq = CONFIG.mouseRadius * CONFIG.mouseRadius;

      /* --- draw connections --- */
      ctx.lineWidth = 0.6;
      for (let i = 0; i < len; i++) {
        const a = particles[i];
        for (let j = i + 1; j < len; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq > maxDistSq) continue;

          const dist = Math.sqrt(distSq);
          let alpha = (1 - dist / maxDist) * CONFIG.connectionMaxOpacity;

          // Brighten connections near mouse
          if (mouseActive) {
            const midX = (a.x + b.x) * 0.5;
            const midY = (a.y + b.y) * 0.5;
            const mdx = midX - mx;
            const mdy = midY - my;
            const mDistSq = mdx * mdx + mdy * mdy;
            if (mDistSq < mouseRadiusSq) {
              const proximity = 1 - Math.sqrt(mDistSq) / CONFIG.mouseRadius;
              alpha = Math.min(0.5, alpha * (1 + proximity * CONFIG.mouseBrighten));
            }
          }

          ctx.strokeStyle = `rgba(${lr},${lg},${lb},${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      /* --- draw nodes --- */
      for (let i = 0; i < len; i++) {
        const p = particles[i];
        let opacity = p.opacity;

        // Brighten nodes near mouse
        if (mouseActive) {
          const dx = p.x - mx;
          const dy = p.y - my;
          const distSq = dx * dx + dy * dy;
          if (distSq < mouseRadiusSq) {
            const proximity = 1 - Math.sqrt(distSq) / CONFIG.mouseRadius;
            opacity = Math.min(1, opacity + proximity * 0.4);
          }
        }

        // Glow shadow for pulsing particles
        if (p.hasGlow) {
          ctx.shadowColor = `rgba(${nr},${ng},${nb},${opacity * 0.6})`;
          ctx.shadowBlur = 8 + p.radius * 2;
        }

        ctx.fillStyle = `rgba(${nr},${ng},${nb},${opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        if (p.hasGlow) {
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Expose globally                                                    */
  /* ------------------------------------------------------------------ */
  window.ParticleNetwork = ParticleNetwork;
})();
