const root = document.body;
const BRIDE = root.dataset.bride || '';
const GROOM = root.dataset.groom || '';

/* ── Nav monogram, derived from BRIDE/GROOM so the generator doesn't need a separate field ── */
const navMonogram = document.getElementById('navMonogram');
if (navMonogram) {
  const b = BRIDE.trim().charAt(0).toUpperCase();
  const g = GROOM.trim().charAt(0).toUpperCase();
  navMonogram.textContent = (b || g) ? `${b} ❤ ${g}` : '❤';
}

/* ── Cursor glow ── */
const cursorGlow = document.getElementById('cursor-glow');
document.addEventListener('mousemove', e => {
  cursorGlow.style.left = e.clientX + 'px';
  cursorGlow.style.top = e.clientY + 'px';
});
document.addEventListener('mouseleave', () => { cursorGlow.style.opacity = '0'; });
document.addEventListener('mouseenter', () => { cursorGlow.style.opacity = '1'; });

/* ── Scroll progress ── */
const scrollProgress = document.getElementById('scroll-progress');
window.addEventListener('scroll', () => {
  const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
  scrollProgress.style.width = pct + '%';
});

/* ── Nav scrolled state ── */
const nav = document.getElementById('mainNav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 80);
});

/* ── Loader intro (particle canvas) ── */
const loader = document.getElementById('loader');
const loaderCanvas = document.getElementById('loaderCanvas');
const lCtx = loaderCanvas.getContext('2d');
function resizeLoaderCanvas() {
  loaderCanvas.width = window.innerWidth;
  loaderCanvas.height = window.innerHeight;
}
resizeLoaderCanvas();

const loaderParticles = [];
for (let i = 0; i < 80; i++) {
  loaderParticles.push({
    x: Math.random() * loaderCanvas.width,
    y: Math.random() * loaderCanvas.height,
    size: Math.random() * 2 + 0.5,
    speedX: (Math.random() - 0.5) * 0.5,
    speedY: -Math.random() * 0.8 - 0.2,
    opacity: Math.random(),
    life: Math.random()
  });
}

let loaderDone = false;
function animateLoader() {
  lCtx.clearRect(0, 0, loaderCanvas.width, loaderCanvas.height);
  loaderParticles.forEach(p => {
    p.x += p.speedX;
    p.y += p.speedY;
    p.life -= 0.003;
    if (p.life <= 0 || p.y < 0) {
      p.x = Math.random() * loaderCanvas.width;
      p.y = loaderCanvas.height;
      p.life = Math.random();
      p.opacity = Math.random();
    }
    lCtx.beginPath();
    lCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    lCtx.fillStyle = `rgba(200, 150, 62, ${p.life * p.opacity})`;
    lCtx.fill();
  });
  if (!loaderDone) requestAnimationFrame(animateLoader);
}
animateLoader();

window.addEventListener('load', () => {
  setTimeout(() => {
    loaderDone = true;
    loader.classList.add('hidden');
    initMainParticles();
    initReveal();
  }, 2800);
});

/* ── Main ambient particle system (dust / petals / fireflies) ── */
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

document.addEventListener('mousemove', e => {
  if (Math.random() < 0.08) spawnMouseParticle(e.clientX, e.clientY);
});

class Particle {
  constructor(type = 'dust') {
    this.type = type;
    this.reset();
  }

  reset() {
    this.x = Math.random() * canvas.width;
    this.y = canvas.height + Math.random() * 100;
    this.size = this.type === 'petal' ? Math.random() * 6 + 3 :
                this.type === 'firefly' ? Math.random() * 2 + 1 :
                Math.random() * 1.5 + 0.3;
    this.speedX = (Math.random() - 0.5) * 0.8;
    this.speedY = -(Math.random() * 0.6 + 0.2);
    this.opacity = 0;
    this.maxOpacity = Math.random() * 0.6 + 0.2;
    this.life = 0;
    this.maxLife = Math.random() * 300 + 200;
    this.angle = Math.random() * Math.PI * 2;
    this.angleSpeed = (Math.random() - 0.5) * 0.02;
    this.waveAmp = Math.random() * 40;
    this.waveFreq = Math.random() * 0.01 + 0.005;
    this.originX = this.x;
    this.glow = this.type === 'firefly' && Math.random() > 0.5;
    this.color = this.type === 'petal' ?
      `hsl(${Math.random() * 30 + 350}, 70%, 65%)` :
      this.type === 'firefly' ?
      `hsl(${Math.random() * 30 + 50}, 90%, 70%)` :
      `hsl(${Math.random() * 20 + 38}, 80%, ${Math.random() * 20 + 55}%)`;
  }

  update() {
    this.life++;
    this.x = this.originX + Math.sin(this.life * this.waveFreq) * this.waveAmp;
    this.y += this.speedY;
    this.angle += this.angleSpeed;

    if (this.life < 60) this.opacity = (this.life / 60) * this.maxOpacity;
    else if (this.life > this.maxLife - 60) this.opacity = ((this.maxLife - this.life) / 60) * this.maxOpacity;
    else this.opacity = this.maxOpacity;

    if (this.type === 'firefly') {
      this.maxOpacity = 0.4 + 0.3 * Math.sin(this.life * 0.05);
    }

    return this.life < this.maxLife && this.y > -50;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.opacity;

    if (this.type === 'petal') {
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, this.size, this.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'firefly') {
      if (this.glow) {
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 4);
        grad.addColorStop(0, this.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(this.x - this.size * 4, this.y - this.size * 4, this.size * 8, this.size * 8);
      }
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    }
    ctx.restore();
  }
}

class MouseParticle {
  constructor(x, y) {
    this.x = x + (Math.random() - 0.5) * 20;
    this.y = y + (Math.random() - 0.5) * 20;
    this.size = Math.random() * 3 + 1;
    this.speedX = (Math.random() - 0.5) * 3;
    this.speedY = -(Math.random() * 2 + 1);
    this.opacity = 0.8;
    this.decay = Math.random() * 0.03 + 0.02;
    this.color = `hsl(${Math.random() * 20 + 38}, 90%, 70%)`;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.opacity -= this.decay;
    this.speedY -= 0.05;
    return this.opacity > 0;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.fill();
    ctx.restore();
  }
}

let mouseParticles = [];
function spawnMouseParticle(x, y) {
  for (let i = 0; i < 3; i++) mouseParticles.push(new MouseParticle(x, y));
}

function initMainParticles() {
  particles = [];
  const counts = { dust: 60, petal: 20, firefly: 25 };
  Object.entries(counts).forEach(([type, count]) => {
    for (let i = 0; i < count; i++) {
      const p = new Particle(type);
      p.y = Math.random() * canvas.height;
      p.life = Math.random() * p.maxLife;
      particles.push(p);
    }
  });
  animateParticles();
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles = particles.filter(p => {
    const alive = p.update();
    if (!alive) {
      particles.push(new Particle(p.type));
      return false;
    }
    p.draw();
    return true;
  });

  mouseParticles = mouseParticles.filter(p => {
    const alive = p.update();
    if (alive) p.draw();
    return alive;
  });

  requestAnimationFrame(animateParticles);
}

/* ── Reveal on scroll ── */
function initReveal() {
  const reveals = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  reveals.forEach(el => observer.observe(el));
}
// Run once immediately too, in case elements are already in view before the loader finishes.
document.addEventListener('DOMContentLoaded', () => { if (loaderDone) initReveal(); });

/* ── Date parsing + display formatting ──
   Reads the same data-date / data-time attributes the generator already sets. */
const target = new Date(`${root.dataset.date} ${root.dataset.time}`);

function formatDisplayDate(date) {
  if (isNaN(date.getTime())) return root.dataset.date || '';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

const heroDateEl = document.getElementById('heroDateDisplay');
const footerDateEl = document.getElementById('footerDate');
if (heroDateEl) heroDateEl.textContent = formatDisplayDate(target);
if (footerDateEl) footerDateEl.textContent = formatDisplayDate(target);

/* ── Countdown ── */
function animateNumber(el, value) {
  const formatted = String(value).padStart(2, '0');
  if (el.textContent !== formatted) {
    el.textContent = formatted;
    el.classList.remove('tick');
    void el.offsetWidth;
    el.classList.add('tick');
  }
}

function updateCountdown() {
  const daysEl = document.getElementById('cd-days');
  const hoursEl = document.getElementById('cd-hours');
  const minutesEl = document.getElementById('cd-minutes');
  const secondsEl = document.getElementById('cd-seconds');
  if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;
  if (isNaN(target.getTime())) return;

  const distance = target.getTime() - Date.now();
  if (distance <= 0) {
    [daysEl, hoursEl, minutesEl, secondsEl].forEach(el => { el.textContent = '00'; });
    return;
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  animateNumber(daysEl, days);
  animateNumber(hoursEl, hours);
  animateNumber(minutesEl, minutes);
  animateNumber(secondsEl, seconds);
}
setInterval(updateCountdown, 1000);
updateCountdown();

/* ── RSVP attendance buttons ── */
let selectedAttendance = '';
document.querySelectorAll('.attend-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.attend-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedAttendance = btn.dataset.value;
    document.getElementById('attendanceValue').value = selectedAttendance;
    spawnBurst(btn);
  });
});

function spawnBurst(el) {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for (let i = 0; i < 12; i++) mouseParticles.push(new MouseParticle(cx, cy));
}

/* ── RSVP form submit ──
   Posts to a relative /api/rsvp endpoint — assumed to be provided by the
   Express server hosting the generated site, same for every couple. */
const rsvpForm = document.getElementById('rsvpForm');
if (rsvpForm) {
  rsvpForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('rsvp-name').value;
    const email = document.getElementById('rsvp-email').value;
    const guests = document.getElementById('rsvp-guests').value;
    const message = document.getElementById('rsvp-message').value;
    const attendance = document.getElementById('attendanceValue').value;

    if (!attendance) {
      showToast('Please confirm your attendance');
      return;
    }

    const submitBtn = document.getElementById('rsvpSubmit');
    submitBtn.disabled = true;
    submitBtn.querySelector('.submit-text').textContent = 'Sending Blessings…';

    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, guests, message, attendance })
      });
      const data = await res.json();

      if (data.success) {
        document.getElementById('rsvpModal').classList.add('active');
        document.getElementById('modalMessage').textContent = data.message;
        launchModalCelebration();
        rsvpForm.reset();
        document.querySelectorAll('.attend-btn').forEach(b => b.classList.remove('active'));
        selectedAttendance = '';
        document.getElementById('attendanceValue').value = '';
      } else {
        showToast(data.message || 'An error occurred. Please try again.');
      }
    } catch (err) {
      showToast('Network error. Please check your connection and try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector('.submit-text').textContent = 'Send Your Blessings';
    }
  });
}

const modalCloseBtn = document.getElementById('modalCloseBtn');
if (modalCloseBtn) {
  modalCloseBtn.addEventListener('click', () => {
    document.getElementById('rsvpModal').classList.remove('active');
  });
}

function launchModalCelebration() {
  const container = document.getElementById('modalParticles');
  container.innerHTML = '';
  const symbols = ['🌺', '✨', '🌸', '💛', '🪔', '⭐'];
  for (let i = 0; i < 20; i++) {
    const span = document.createElement('span');
    span.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    const floatDist = Math.random() * 200 + 200;
    const rot = Math.random() * 360;
    span.style.cssText = `
      position: absolute;
      font-size: ${Math.random() * 20 + 10}px;
      left: ${Math.random() * 100}%;
      top: 100%;
      animation: modalFloat${i} ${Math.random() * 2 + 1.5}s ease-out forwards;
      animation-delay: ${Math.random() * 0.8}s;
      opacity: 0;
    `;
    container.appendChild(span);

    const style = document.createElement('style');
    style.textContent = `
      @keyframes modalFloat${i} {
        0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(-${floatDist}px) rotate(${rot}deg); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
    background: rgba(26,10,10,0.95); border: 1px solid rgba(200,150,62,0.4);
    color: #F5EDD8; padding: 14px 28px; font-family: 'Cormorant Garamond', serif;
    font-size: 0.95rem; letter-spacing: 0.05em; z-index: 9999;
    animation: fadeUp 0.4s ease; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    backdrop-filter: blur(10px); max-width: 400px; text-align: center;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

/* ── Ambient music toggle ──
   data-music drives which note palette plays; 'None' hides the control entirely. */
const musicBtn = document.getElementById('musicToggle');
let audioContext = null;
let musicPlaying = false;
let oscillators = [];

const MUSIC_PRESETS = {
  Romantic: [130.81, 164.81, 196.00, 246.94, 293.66, 392.00],
  Instrumental: [110.00, 146.83, 174.61, 220.00, 261.63, 329.63]
};
const DEFAULT_PRESET = [98.00, 130.81, 164.81, 195.00, 261.63, 329.63];

function getMusicFreqs() {
  return MUSIC_PRESETS[root.dataset.music] || DEFAULT_PRESET;
}

function startAmbientTones() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();

  const masterGain = audioContext.createGain();
  masterGain.gain.setValueAtTime(0, audioContext.currentTime);
  masterGain.gain.linearRampToValueAtTime(0.06, audioContext.currentTime + 3);
  masterGain.connect(audioContext.destination);

  getMusicFreqs().forEach((freq, i) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioContext.currentTime);

    gain.gain.setValueAtTime(0, audioContext.currentTime);
    const vol = 0.3 / (i + 1);
    gain.gain.linearRampToValueAtTime(vol, audioContext.currentTime + 2 + i * 0.5);

    filter.type = 'lowpass';
    filter.frequency.value = 800;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    osc.start();
    oscillators.push({ osc, gain, masterGain });
  });

  musicPlaying = true;
  musicBtn.classList.add('active');
  musicBtn.textContent = '♫';
}

function stopAmbientTones() {
  oscillators.forEach(({ gain, masterGain }) => {
    gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1.5);
    masterGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1.5);
  });
  setTimeout(() => {
    oscillators.forEach(({ osc }) => { try { osc.stop(); } catch (e) {} });
    oscillators = [];
    if (audioContext) { audioContext.close(); audioContext = null; }
  }, 1600);
  musicPlaying = false;
  musicBtn.classList.remove('active');
  musicBtn.textContent = '♪';
}

if (musicBtn) {
  if (root.dataset.music === 'None') {
    musicBtn.classList.add('hidden');
  } else {
    musicBtn.addEventListener('click', () => {
      if (musicPlaying) stopAmbientTones();
      else startAmbientTones();
    });
  }
}

/* ── Hero parallax ── */
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  const heroCenter = document.querySelector('.hero-center');
  if (heroCenter) {
    heroCenter.style.transform = `translateY(${scrollY * 0.3}px)`;
    heroCenter.style.opacity = 1 - scrollY / window.innerHeight;
  }
  document.querySelectorAll('.layer').forEach((layer, i) => {
    layer.style.transform = `translateY(${scrollY * (0.1 + i * 0.05)}px)`;
  });
});

/* ── Gallery hover sparkle ── */
document.querySelectorAll('.gallery-item').forEach(item => {
  item.addEventListener('mouseenter', () => {
    const rect = item.getBoundingClientRect();
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        mouseParticles.push(new MouseParticle(
          rect.left + Math.random() * rect.width,
          rect.top + Math.random() * rect.height
        ));
      }, i * 50);
    }
  });
});

/* ── Smooth anchor scroll ── */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(link.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

/* ── Diya embers ── */
function spawnDiyaEmbers() {
  document.querySelectorAll('.diya').forEach(diya => {
    const rect = diya.getBoundingClientRect();
    if (rect.top > -100 && rect.top < window.innerHeight + 100) {
      const p = new MouseParticle(
        rect.left + rect.width / 2 + (Math.random() - 0.5) * 10,
        rect.top
      );
      p.speedY = -(Math.random() * 1.5 + 0.5);
      p.color = `hsl(${Math.random() * 30 + 20}, 90%, 65%)`;
      mouseParticles.push(p);
    }
  });
}
setInterval(spawnDiyaEmbers, 300);

/* ── Name sparkle ── */
function addNameSparkle() {
  ['heroNameBride', 'heroNameGroom', 'heroHeart'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      const p = new MouseParticle(
        rect.left + Math.random() * rect.width,
        rect.top + Math.random() * rect.height
      );
      p.opacity = 0.6;
      p.size = Math.random() * 2 + 1;
      mouseParticles.push(p);
    }
  });
}
setInterval(addNameSparkle, 400);