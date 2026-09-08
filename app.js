/* =================================================================
   VoteChain — GH Raisoni University
   Shared Utilities (app.js) — No Firebase
   ================================================================= */

'use strict';

// ── API Base URL ──────────────────────────────────────────────
// Automatically uses Railway URL in production, localhost in dev
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000/api'
  : '/api';  // On Railway, same server serves both HTML and API

window.API = API_BASE;

// ── Toast Notifications ───────────────────────────────────────
function showToast(type, title, message, duration = 3500) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast t-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || 'ℹ️'}</div>
    <div>
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-msg">${message}</div>` : ''}
    </div>`;
  container.appendChild(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// ── Active Nav Link ───────────────────────────────────────────
(function () {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', (a.getAttribute('href') || '').split('?')[0] === page);
  });
})();

// ── Scroll Animations ─────────────────────────────────────────
(function () {
  if (!window.IntersectionObserver) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.feature-card,.step-card,.card,.anim-up').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.55s ease, transform 0.55s ease';
    obs.observe(el);
  });
})();

// ── Logout ────────────────────────────────────────────────────
function logout() {
  sessionStorage.clear();
  window.location.href = 'login.html';
}
