/* =================================================================
   VoteChain — GH Raisoni University
   Admin Dashboard Logic (admin.js)
   ================================================================= */

// ── Section navigation ─────────────────────────────────────────
function showSection(name, el) {
  document.querySelectorAll('[id^="sec-"]').forEach(s => s.style.display = 'none');
  const sec = document.getElementById('sec-' + name);
  if (sec) sec.style.display = 'block';
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  if (el) el.classList.add('active');
  // Refresh content for live sections
  if (name === 'candidates')  renderCandidates();
  if (name === 'voters')      renderVoters();
  if (name === 'blockchain')  renderBlockchain();
  if (name === 'results')     renderAdminResults();
  if (name === 'audit')       renderAudit();
  if (name === 'elections')   renderElections();
  if (name === 'overview')    renderOverview();
}

function openModal(id)  { const m = document.getElementById(id); if (m) m.classList.add('show'); }
function closeModal(id) { const m = document.getElementById(id); if (m) m.classList.remove('show'); }
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('show');
});

// ── Seed data ──────────────────────────────────────────────────
const SEED = [
  { name:'Ahmed Khan',  studentId:'GHRCEM-CS-2022-031',  dept:'Computer Science',       year:'3rd Year', pos:'Student Council President', party:'🌟 Progress & Unity', election:'Student Council President', email:'ahmed@ghrstu.edu.in',  bio:'3 years of student leadership experience. Champion of digital campus transformation.', phone:'', votes:412, active:true },
  { name:'Sara Malik',  studentId:'GHRCEM-EE-2022-044',  dept:'Electrical Engineering', year:'3rd Year', pos:'Student Council President', party:'💡 Innovation First',  election:'Student Council President', email:'sara@ghrstu.edu.in',   bio:'Passionate about student welfare and improving campus facilities for everyone.',        phone:'', votes:287, active:true },
  { name:'Ayesha Noor', studentId:'GHRCEM-BBA-2022-012', dept:'Business Administration',year:'3rd Year', pos:'Student Council President', party:'🤝 Student Voice',     election:'Student Council President', email:'ayesha@ghrstu.edu.in', bio:'Advocate for inclusivity, mental health awareness, and vibrant campus activities.',    phone:'', votes:143, active:true },
  { name:'Omar Farooq', studentId:'GHRCEM-CS-2022-078',  dept:'Computer Science',       year:'3rd Year', pos:'CS Department Representative',party:'⚡ Tech Forward',    election:'CS Department Representative', email:'omar@ghrstu.edu.in', bio:'CS enthusiast focused on hackathons, coding clubs, and industry internship pipelines.', phone:'', votes:143, active:true },
  { name:'Bilal Raza',  studentId:'GHRCEM-CS-2023-055',  dept:'Computer Science',       year:'2nd Year', pos:'Sports Captain',            party:'🏅 Champions United', election:'Sports Captain Election',      email:'bilal@ghrstu.edu.in', bio:'Inter-university cricket champion. Plans to expand sports programs and tournaments.',    phone:'', votes:68,  active:true },
];

const ELECTIONS_STATIC = [
  { id:1, name:'Student Council President',    type:'Student Council', start:'2025-01-10', end:'2025-01-12', status:'active' },
  { id:2, name:'CS Department Representative', type:'Department Rep',  start:'2025-01-10', end:'2025-01-12', status:'active' },
  { id:3, name:'Sports Captain Election',       type:'Sports',          start:'2025-01-10', end:'2025-01-12', status:'active' },
  { id:4, name:'Cultural Committee Head',       type:'Committee',       start:'2024-12-01', end:'2024-12-03', status:'ended'  },
];

const VOTERS_STATIC = [
  { id:'GHRCEM-CS-2022-031',  name:'Ahmed Khan',   dept:'Computer Science',    year:'3rd', email:'ahmed@ghrstu.edu.in',  voted:true  },
  { id:'GHRCEM-EE-2022-044',  name:'Sara Malik',   dept:'Electrical Eng.',     year:'3rd', email:'sara@ghrstu.edu.in',   voted:true  },
  { id:'GHRCEM-CS-2021-007',  name:'Ali Hassan',   dept:'Computer Science',    year:'4th', email:'ali@ghrstu.edu.in',    voted:false },
  { id:'GHRCEM-ME-2023-088',  name:'Fatima Zahra', dept:'Mechanical Eng.',     year:'2nd', email:'fatima@ghrstu.edu.in', voted:false },
  { id:'GHRCEM-BBA-2022-012', name:'Ayesha Noor',  dept:'Business Admin',      year:'3rd', email:'ayesha@ghrstu.edu.in', voted:true  },
  { id:'GHRCEM-CS-2023-055',  name:'Bilal Raza',   dept:'Computer Science',    year:'2nd', email:'bilal@ghrstu.edu.in',  voted:false },
];

const TX_LOG = [
  { block:'19284751', tx:'0x4f7e...d9c1', from:'GHRCEM-CS-2022-031',  election:'Council President', gas:'21,000', time:'2 mins ago' },
  { block:'19284749', tx:'0x9b2a...f034', from:'GHRCEM-EE-2022-044',  election:'Council President', gas:'21,000', time:'5 mins ago' },
  { block:'19284746', tx:'0xa1c3...e812', from:'GHRCEM-CS-2021-007',  election:'CS Dept. Rep',      gas:'21,000', time:'9 mins ago' },
  { block:'19284740', tx:'0xd4f1...8b7a', from:'GHRCEM-ME-2023-088',  election:'Sports Captain',    gas:'21,000', time:'14 mins ago'},
  { block:'19284733', tx:'0x2e8c...3f90', from:'GHRCEM-BBA-2022-012', election:'Council President', gas:'21,000', time:'21 mins ago'},
];

// ── Candidate persistence — SERVER based ──────────────────────
async function loadCandidates() {
  try {
    const r = await fetch(window.API + '/candidates');
    const d = await r.json();
    return d.success ? d.candidates : JSON.parse(JSON.stringify(SEED));
  } catch(e) {
    console.warn('Server unavailable, using localStorage fallback');
    try { const s = localStorage.getItem('ghrcem_candidates'); return s ? JSON.parse(s) : JSON.parse(JSON.stringify(SEED)); }
    catch(e2) { return JSON.parse(JSON.stringify(SEED)); }
  }
}
async function saveCandidates(arr) {
  // kept for compatibility but server is source of truth now
  localStorage.setItem('ghrcem_candidates', JSON.stringify(arr));
}

let candidates = [];

// ── CANDIDATE CRUD ─────────────────────────────────────────────

// ── Audit log ──────────────────────────────────────────────────
let auditLog = JSON.parse(localStorage.getItem('ghrstu_audit') || '[]');
if (auditLog.length === 0) {
  auditLog = [
    { time:'10:42 AM', user:'GHRCEM-ADMIN', action:'System initialized. Smart contract deployed at 0x4f7e...d9c1', type:'success' },
    { time:'10:38 AM', user:'GHRCEM-ADMIN', action:'Seed candidates loaded for Student Council President election', type:'success' },
    { time:'09:55 AM', user:'GHRCEM-ADMIN', action:'Admin login from IP 192.168.1.42', type:'warning' },
  ];
}
function addAudit(action, type = 'success') {
  const t = new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
  auditLog.unshift({ time:t, user:'GHRCEM-ADMIN', action, type });
  if (auditLog.length > 50) auditLog.pop();
  localStorage.setItem('ghrstu_audit', JSON.stringify(auditLog));
}

// ── CANDIDATE CRUD ─────────────────────────────────────────────
const COLORS = ['#8B1A1A','#C9A227','#10b981','#3b82f6','#8b5cf6','#ec4899','#f59e0b'];
let deletingIdx = -1;

function openAddCandidate() {
  document.getElementById('candModalTitle').textContent = '👤 Add New Candidate';
  document.getElementById('editIdx').value = '-1';
  ['fName','fSid','fPos','fParty','fEmail','fPhone','fBio'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  ['fDept','fYear','fElec'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const fa = document.getElementById('fActive'); if (fa) fa.checked = true;
  clearCandErrors();
  openModal('candidateModal');
}

function editCandidate(idx) {
  const c = candidates[idx]; if (!c) return;
  document.getElementById('candModalTitle').textContent = '✏️ Edit Candidate';
  document.getElementById('editIdx').value   = idx;
  document.getElementById('fName').value     = c.name;
  document.getElementById('fSid').value      = c.studentId;
  document.getElementById('fDept').value     = c.dept;
  document.getElementById('fYear').value     = c.year   || '';
  document.getElementById('fPos').value      = c.pos;
  document.getElementById('fParty').value    = c.party;
  document.getElementById('fElec').value     = c.election;
  document.getElementById('fEmail').value    = c.email  || '';
  document.getElementById('fPhone').value    = c.phone  || '';
  document.getElementById('fBio').value      = c.bio    || '';
  document.getElementById('fActive').checked = c.active !== false;
  clearCandErrors();
  openModal('candidateModal');
}

async function saveCandidate() {
  clearCandErrors();
  const name   = v('fName'); const sid    = v('fSid');
  const dept   = v('fDept'); const year   = v('fYear');
  const pos    = v('fPos');  const party  = v('fParty');
  const elec   = v('fElec'); const email  = v('fEmail');
  const phone  = v('fPhone');const bio    = v('fBio');
  const active = document.getElementById('fActive').checked;

  let ok = true;
  if (!name)  { err('eN',  'Full name is required.');       ok = false; }
  if (!sid)   { err('eS',  'Student ID is required.');      ok = false; }
  if (!dept)  { err('eD',  'Select a department.');         ok = false; }
  if (!pos)   { err('eP',  'Position is required.');        ok = false; }
  if (!party) { err('ePa', 'Party/tagline is required.');   ok = false; }
  if (!elec)  { err('eE',  'Select an election.');          ok = false; }
  if (!ok) return;

  const idx = parseInt(document.getElementById('editIdx').value);

  try {
    if (idx === -1) {
      // ADD via API
      const r = await fetch(window.API + '/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, studentId:sid, dept, year, pos, party, election:elec, email, phone, bio, active })
      });
      const d = await r.json();
      if (!r.ok) { err('eN', d.message || 'Failed.'); return; }
      addAudit(`Added candidate: ${name} (${sid})`);
      showToast('success', 'Candidate Added!', `${name} registered successfully.`);
    } else {
      // EDIT via API
      const cid = candidates[idx].id;
      const r = await fetch(window.API + '/candidates/' + cid, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, studentId:sid, dept, year, pos, party, election:elec, email, phone, bio, active })
      });
      const d = await r.json();
      if (!r.ok) { err('eN', d.message || 'Failed.'); return; }
      addAudit(`Updated candidate: ${name} (${sid})`);
      showToast('success', 'Candidate Updated!', `${name}'s details saved.`);
    }
  } catch(ex) {
    showToast('error', 'Error', 'Cannot connect to server.');
    return;
  }

  closeModal('candidateModal');
  candidates = await loadCandidates();
  renderCandidates();
  renderOverview();
}

function promptDelete(idx) {
  deletingIdx = idx;
  const sp = document.getElementById('deleteNameSpan');
  if (sp) sp.textContent = candidates[idx].name;
  openModal('deleteModal');
}

async function confirmDelete() {
  if (deletingIdx < 0) return;
  const cand = candidates[deletingIdx];
  try {
    const r = await fetch(window.API + '/candidates/' + cand.id, { method: 'DELETE' });
    const d = await r.json();
    if (!r.ok) { showToast('error','Error', d.message); return; }
    addAudit(`Removed candidate: ${cand.name} (${cand.studentId})`, 'warning');
    showToast('warning', 'Candidate Removed', `${cand.name} removed.`);
  } catch(ex) {
    showToast('error','Error','Cannot connect to server.');
    return;
  }
  deletingIdx = -1;
  closeModal('deleteModal');
  candidates = await loadCandidates();
  renderCandidates();
  renderOverview();
}

function v(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
function err(id, msg) { const el = document.getElementById(id); if (el) el.textContent = '⚠ ' + msg; }
function clearCandErrors() { ['eN','eS','eD','eP','ePa','eE'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=''; }); }

// ── RENDER CANDIDATES ──────────────────────────────────────────
function renderCandidates() {
  const q  = (document.getElementById('candSearch')?.value    || '').toLowerCase();
  const ef = (document.getElementById('candElecFilter')?.value || '');
  const df = (document.getElementById('candDeptFilter')?.value || '');

  const filtered = candidates.filter(c =>
    (!q  || c.name.toLowerCase().includes(q) || c.studentId.toLowerCase().includes(q) || c.pos.toLowerCase().includes(q)) &&
    (!ef || c.election === ef) &&
    (!df || c.dept === df)
  );

  // Election filter options
  const elF = document.getElementById('candElecFilter');
  if (elF) {
    const cur = elF.value;
    const uniq = [...new Set(candidates.map(c => c.election))];
    elF.innerHTML = '<option value="">All Elections</option>' + uniq.map(e => `<option${e===cur?' selected':''}>${e}</option>`).join('');
  }

  const badge = document.getElementById('candCountBadge');
  if (badge) badge.textContent = filtered.length + ' candidate' + (filtered.length !== 1 ? 's' : '');

  const tbody = document.getElementById('candidatesTbl');
  const empty = document.getElementById('candEmpty');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = 'block';
  } else {
    if (empty) empty.style.display = 'none';
    tbody.innerHTML = filtered.map(c => {
      const idx   = candidates.indexOf(c);
      const color = COLORS[idx % COLORS.length];
      return `<tr>
        <td class="muted" style="font-weight:700;">#${idx + 1}</td>
        <td><div style="display:flex;align-items:center;gap:10px;">
          <div style="width:34px;height:34px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-weight:800;color:white;font-size:0.88rem;flex-shrink:0;">${c.name.charAt(0)}</div>
          <div><div style="font-weight:700;font-size:0.875rem;">${c.name}</div><div style="font-size:0.72rem;color:var(--text-muted);">${c.email || '—'}</div></div>
        </div></td>
        <td class="mono">${c.studentId}</td>
        <td>${c.dept}</td>
        <td style="font-weight:600;">${c.pos}</td>
        <td><span class="badge badge-gold">${c.party}</span></td>
        <td style="font-size:0.82rem;">${c.election}</td>
        <td style="font-weight:700;color:var(--ghr-gold);">${c.votes || 0}</td>
        <td><span class="badge ${c.active!==false ? 'badge-success':'badge-warning'}">${c.active!==false ? '✅ Active':'⏸ Inactive'}</span></td>
        <td><div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" onclick="editCandidate(${idx})">✏️</button>
          <button class="btn btn-danger-soft btn-sm" onclick="promptDelete(${idx})">🗑️</button>
        </div></td>
      </tr>`;
    }).join('');
  }
  renderCandStats();
}

function renderCandStats() {
  const box = document.getElementById('candStats');
  if (!box) return;
  const total   = candidates.length;
  const active  = candidates.filter(c => c.active !== false).length;
  const inactive= total - active;
  const elecs   = [...new Set(candidates.map(c => c.election))].length;
  box.innerHTML = `
    <div class="stat-card"><div class="stat-icon si-gold">👥</div><div><div class="stat-num">${total}</div><div class="stat-label">Total Candidates</div></div></div>
    <div class="stat-card"><div class="stat-icon si-green">✅</div><div><div class="stat-num">${active}</div><div class="stat-label">Active</div></div></div>
    <div class="stat-card"><div class="stat-icon si-maroon">⏸</div><div><div class="stat-num">${inactive}</div><div class="stat-label">Inactive</div></div></div>
    <div class="stat-card"><div class="stat-icon si-blue">🗳️</div><div><div class="stat-num">${elecs}</div><div class="stat-label">Elections</div></div></div>`;
}

// ── RENDER OVERVIEW ────────────────────────────────────────────
function renderOverview() {
  // Stats row
  const totalVotes = candidates.reduce((s, c) => s + (c.votes || 0), 0);
  const totalActive = ELECTIONS_STATIC.filter(e => e.status === 'active').length;
  const box = document.getElementById('overviewStats');
  if (box) box.innerHTML = `
    <div class="stat-card"><div class="stat-icon si-gold">🗳️</div><div><div class="stat-num">${totalVotes.toLocaleString()}</div><div class="stat-label">Total Votes Cast</div></div></div>
    <div class="stat-card"><div class="stat-icon si-blue">🎓</div><div><div class="stat-num">3,500</div><div class="stat-label">Registered Students</div></div></div>
    <div class="stat-card"><div class="stat-icon si-green">👥</div><div><div class="stat-num">${candidates.length}</div><div class="stat-label">Candidates</div></div></div>
    <div class="stat-card"><div class="stat-icon si-maroon">📋</div><div><div class="stat-num">${totalActive}</div><div class="stat-label">Active Elections</div></div></div>`;

  // Active elections list
  const ael = document.getElementById('activeElectionsList');
  if (ael) ael.innerHTML = ELECTIONS_STATIC.filter(e => e.status === 'active').map(e => {
    const cands = candidates.filter(c => c.election === e.name);
    const votes = cands.reduce((s,c) => s+(c.votes||0), 0);
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--bg-elevated);border-radius:var(--r-md);border:1px solid var(--border);margin-bottom:8px;">
      <div><div style="font-weight:600;font-size:0.875rem;">${e.name}</div><div style="font-size:0.72rem;color:var(--text-muted);">${votes} votes · ${cands.length} candidates · Ends ${e.end}</div></div>
      <span class="badge badge-success"><span class="live-dot"></span> Live</span>
    </div>`;
  }).join('');

  // Chain status
  const cs = document.getElementById('chainStatus');
  if (cs) cs.innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:0.85rem;"><span style="color:var(--text-muted);">Network</span><span style="font-weight:600;">Ethereum Sepolia</span></div>
    <div style="display:flex;justify-content:space-between;font-size:0.85rem;"><span style="color:var(--text-muted);">Block Height</span><span style="font-weight:600;" id="chainBlock">19,284,751</span></div>
    <div style="display:flex;justify-content:space-between;font-size:0.85rem;"><span style="color:var(--text-muted);">Gas Price</span><span style="font-weight:600;">12 Gwei</span></div>
    <div style="display:flex;justify-content:space-between;font-size:0.85rem;"><span style="color:var(--text-muted);">Contract</span><span class="mono" style="font-size:0.72rem;color:var(--ghr-gold);">0x4f7e...d9c1</span></div>
    <div style="height:1px;background:var(--border);"></div>
    <div style="display:flex;align-items:center;gap:6px;font-size:0.78rem;color:var(--success);"><span class="live-dot"></span> All systems operational</div>`;

  // Recent votes table
  const rt = document.getElementById('recentVotesTbl');
  if (rt) rt.innerHTML = TX_LOG.map(t => `<tr>
    <td class="mono">${t.tx}</td>
    <td style="font-weight:600;">${t.from}</td>
    <td>${t.election}</td>
    <td style="color:var(--text-muted);">${t.time}</td>
    <td><span class="badge badge-success">✓ Confirmed</span></td>
  </tr>`).join('');
}

// ── RENDER ELECTIONS ───────────────────────────────────────────
function renderElections() {
  const tb = document.getElementById('electionsTbl');
  if (!tb) return;
  tb.innerHTML = ELECTIONS_STATIC.map(e => {
    const cands = candidates.filter(c => c.election === e.name);
    const votes = cands.reduce((s,c)=>s+(c.votes||0),0);
    return `<tr>
      <td style="color:var(--text-muted);font-weight:700;">#${e.id}</td>
      <td style="font-weight:700;">${e.name}</td>
      <td><span class="badge badge-gold">${e.type}</span></td>
      <td>${e.start}</td><td>${e.end}</td>
      <td style="font-weight:700;color:var(--ghr-gold);">${cands.length}</td>
      <td style="font-weight:700;">${votes.toLocaleString()}</td>
      <td><span class="badge ${e.status==='active'?'badge-success':'badge-warning'}">${e.status==='active'?'🟢 Active':'⏹ Ended'}</span></td>
      <td><div style="display:flex;gap:6px;">
        <button class="btn btn-ghost btn-sm" onclick="showToast('info','Paused','Election paused.')">Pause</button>
        <button class="btn btn-danger-soft btn-sm" onclick="showToast('warning','Ended','Election ended.')">End</button>
      </div></td>
    </tr>`;
  }).join('');
}

// ── RENDER VOTERS ──────────────────────────────────────────────
function renderVoters(list) {
  const tb = document.getElementById('votersTbl');
  if (!tb) return;
  const data = list || VOTERS_STATIC;
  tb.innerHTML = data.map(v => `<tr>
    <td class="mono">${v.id}</td>
    <td style="font-weight:700;">${v.name}</td>
    <td>${v.dept}</td><td>${v.year}</td>
    <td style="color:var(--text-muted);">${v.email}</td>
    <td><span class="badge ${v.voted?'badge-success':'badge-warning'}">${v.voted?'✓ Voted':'⏳ Pending'}</span></td>
    <td><button class="btn btn-ghost btn-sm">Details</button></td>
  </tr>`).join('');
  const b = document.getElementById('voterBadge');
  if (b) b.textContent = data.length + ' Students';
}

function filterVoters(q) {
  renderVoters(VOTERS_STATIC.filter(v =>
    v.id.toLowerCase().includes(q.toLowerCase()) ||
    v.name.toLowerCase().includes(q.toLowerCase())
  ));
}

// ── RENDER BLOCKCHAIN LOG ──────────────────────────────────────
function renderBlockchain() {
  const tb = document.getElementById('blockchainTbl');
  if (!tb) return;
  tb.innerHTML = TX_LOG.map(t => `<tr>
    <td style="font-weight:700;">${t.block}</td>
    <td class="mono">${t.tx}</td>
    <td style="font-weight:600;">${t.from}</td>
    <td>${t.election}</td><td>${t.gas}</td>
    <td style="color:var(--text-muted);">${t.time}</td>
    <td><span class="badge badge-success">✓ Confirmed</span></td>
  </tr>`).join('');
}

// ── RENDER ADMIN RESULTS ───────────────────────────────────────
function renderAdminResults() {
  const box = document.getElementById('adminResultsContainer');
  if (!box) return;
  const groups = {};
  candidates.forEach(c => { if (!groups[c.election]) groups[c.election] = []; groups[c.election].push(c); });
  if (!Object.keys(groups).length) {
    box.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><h4>No Results Yet</h4><p>Add candidates to see live results here.</p></div>';
    return;
  }
  box.innerHTML = Object.entries(groups).map(([elec, cands]) => {
    const total  = cands.reduce((s,c) => s + (c.votes||0), 0);
    const winner = total > 0 ? cands.reduce((a,b) => (a.votes||0) > (b.votes||0) ? a : b) : null;
    return `<div class="table-wrap">
      <div class="table-top"><h3>${elec}</h3><span class="badge badge-success"><span class="live-dot"></span> ${total} votes</span></div>
      <div style="padding:1.25rem;display:flex;flex-direction:column;gap:1.1rem;">
        ${cands.map((c,i) => {
          const pct = total > 0 ? Math.round((c.votes||0)/total*100) : 0;
          const lead = winner && c.name === winner.name;
          return `<div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;">
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:34px;height:34px;border-radius:50%;background:${COLORS[i%COLORS.length]};display:flex;align-items:center;justify-content:center;font-weight:800;color:white;font-size:0.85rem;">${c.name.charAt(0)}</div>
                <div><div style="font-weight:700;font-size:0.875rem;">${c.name} ${lead?'🏆':''}</div><div style="font-size:0.72rem;color:var(--text-muted);">${c.party}</div></div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:1.1rem;font-weight:900;color:${lead?'var(--ghr-gold)':'var(--text-primary)'};">${pct}%</div>
                <div style="font-size:0.72rem;color:var(--text-muted);">${c.votes||0} votes</div>
              </div>
            </div>
            <div class="result-bar-track"><div class="result-bar-fill ${lead?'leading':''}" style="width:${pct}%"></div></div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}

// ── RENDER AUDIT ───────────────────────────────────────────────
function renderAudit() {
  const box = document.getElementById('auditList');
  if (!box) return;
  box.innerHTML = auditLog.map(a => `
    <div style="display:flex;align-items:flex-start;gap:12px;padding:11px 4px;border-bottom:1px solid var(--border);">
      <span style="font-size:1rem;flex-shrink:0;">${a.type==='success'?'✅':'⚠️'}</span>
      <div style="flex:1;">
        <div style="font-size:0.875rem;font-weight:500;color:var(--text-primary);">${a.action}</div>
        <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;">${a.user} · ${a.time}</div>
      </div>
    </div>`).join('');
}

// ── ELECTION & VOTER ACTIONS ───────────────────────────────────
function createElection() {
  const name = document.getElementById('elecName').value.trim();
  if (!name) { showToast('error','Error','Election name is required.'); return; }
  ELECTIONS_STATIC.push({ id: ELECTIONS_STATIC.length+1, name, type: document.getElementById('elecType').value, start: document.getElementById('elecStart').value||'TBD', end: document.getElementById('elecEnd').value||'TBD', status:'active' });
  addAudit(`Created election: "${name}"`);
  closeModal('electionModal');
  renderElections();
  showToast('success','Election Created!', `"${name}" is now live.`);
}

function addVoter() {
  const id = document.getElementById('vId').value.trim();
  const nm = document.getElementById('vName').value.trim();
  if (!id || !nm) { showToast('error','Error','Student ID and name are required.'); return; }
  VOTERS_STATIC.push({ id, name:nm, dept:document.getElementById('vDept').value, year:document.getElementById('vYear').value, email:document.getElementById('vEmail').value.trim(), voted:false });
  addAudit(`Added voter: ${nm} (${id})`);
  closeModal('voterModal');
  renderVoters();
  showToast('success','Voter Added!', `${nm} registered as eligible voter.`);
}

function exportData() {
  const data = { candidates, elections:ELECTIONS_STATIC, voters:VOTERS_STATIC, exported: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'ghrstu_voting_data.json'; a.click();
  showToast('success','Exported!','Data saved as JSON file.');
}

// ── BLOCK HEIGHT TICKER ────────────────────────────────────────
let bh = 19284751;
setInterval(() => {
  bh++;
  ['sideBlock','chainBlock'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=bh.toLocaleString(); });
}, 4000);

// ── SET NAV USER FROM SESSION ──────────────────────────────────
(function() {
  try {
    const u = JSON.parse(sessionStorage.getItem('ghrstu_user') || '{}');
    if (u.name) {
      const nn = document.getElementById('navName');    if(nn) nn.textContent = u.name;
      const na = document.getElementById('navAvatar');  if(na) na.textContent = u.name.charAt(0);
    }
  } catch(e){}
})();

// ── INIT ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  candidates = await loadCandidates();
  renderOverview();
  renderCandidates();
  renderVoters();
  renderElections();
  renderBlockchain();
  renderAdminResults();
  renderAudit();
});
