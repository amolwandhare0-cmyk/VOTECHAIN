/* =================================================================
   VoteChain — GH Raisoni University
   Node.js + Nodemailer OTP Server
   Works locally AND on Railway/Render
   ================================================================= */

require('dotenv').config();

const express    = require('express');
const nodemailer = require('nodemailer');
const cors       = require('cors');
const bcrypt     = require('bcryptjs');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const otpStore     = new Map();
const studentStore = new Map();

// ── Transporter — works with ANY email (Gmail, Outlook, Yahoo)
// OR with Brevo/SendGrid free SMTP (no App Password needed)
function createTransporter() {
  // If using Brevo (recommended — free, no setup hassle)
  if (process.env.BREVO_USER && process.env.BREVO_PASS) {
    return nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      auth: {
        user: process.env.BREVO_USER,  // your Brevo account email
        pass: process.env.BREVO_PASS   // Brevo SMTP key
      }
    });
  }
  // If using Gmail with App Password
  if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    });
  }
  // If using Outlook / Hotmail
  if (process.env.OUTLOOK_USER && process.env.OUTLOOK_PASS) {
    return nodemailer.createTransport({
      service: 'hotmail',
      auth: {
        user: process.env.OUTLOOK_USER,
        pass: process.env.OUTLOOK_PASS
      }
    });
  }
  return null;
}

const transporter = createTransporter();

if (transporter) {
  transporter.verify((err) => {
    if (err) console.error('❌ Email connection failed:', err.message);
    else     console.log('✅ Email service ready');
  });
} else {
  console.log('⚠️  No email configured — OTP will be printed to console (dev mode)');
}

function getSenderEmail() {
  return process.env.BREVO_USER || process.env.GMAIL_USER || process.env.OUTLOOK_USER || 'noreply@ghrstu.edu.in';
}

// ── OTP email template ────────────────────────────────────────
function otpEmail(otp, name, type) {
  const isReg = type === 'register';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0A0A0F;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
<tr><td align="center">
<table width="540" cellpadding="0" cellspacing="0"
  style="background:#16161F;border:1px solid rgba(201,162,39,0.25);border-radius:16px;overflow:hidden;max-width:540px;width:100%;">
  <tr><td style="background:linear-gradient(135deg,#8B1A1A,#C9A227);padding:28px 32px;text-align:center;">
    <div style="font-size:2rem;margin-bottom:6px;">🗳️</div>
    <div style="color:white;font-size:1.2rem;font-weight:800;">VoteChain</div>
    <div style="color:rgba(255,255,255,0.7);font-size:0.78rem;">G H Raisoni University</div>
  </td></tr>
  <tr><td style="padding:32px;">
    <p style="color:#A8A3A0;margin:0 0 6px;">Hello, <strong style="color:#F0EDE8;">${name || 'Student'}</strong></p>
    <h2 style="color:#F0EDE8;font-size:1.2rem;margin:0 0 18px;">
      ${isReg ? '🔐 Verify Your Registration' : '🔑 Reset Your Password'}
    </h2>
    <p style="color:#A8A3A0;font-size:0.88rem;line-height:1.6;margin:0 0 24px;">
      ${isReg
        ? 'Use the OTP below to complete your GH Raisoni VoteChain registration.'
        : 'Use the OTP below to reset your VoteChain password.'}
    </p>
    <div style="background:#1F1F2E;border:2px dashed rgba(201,162,39,0.4);border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
      <div style="color:#A8A3A0;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">Your OTP Code</div>
      <div style="font-size:2.8rem;font-weight:900;letter-spacing:14px;color:#C9A227;font-family:'Courier New',monospace;">${otp}</div>
      <div style="color:#6B6560;font-size:0.75rem;margin-top:10px;">⏳ Valid for <strong style="color:#F59E0B;">10 minutes</strong></div>
    </div>
    <div style="background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:12px 16px;margin:0 0 20px;">
      <p style="color:#EF4444;font-size:0.8rem;margin:0;">⚠️ Never share this OTP. GH Raisoni University will never ask for it.</p>
    </div>
    <p style="color:#6B6560;font-size:0.78rem;margin:0;">
      If you did not request this, ignore this email.
    </p>
  </td></tr>
  <tr><td style="background:#111118;padding:14px 32px;border-top:1px solid rgba(201,162,39,0.1);">
    <p style="color:#6B6560;font-size:0.72rem;margin:0;text-align:center;">
      © 2025 VoteChain — G H Raisoni University · Do not reply to this email.
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

// =================================================================
// ROUTES
// =================================================================

// Health check
app.get('/api/status', (req, res) => {
  res.json({
    status:     'online',
    server:     'VoteChain OTP Server — GH Raisoni University',
    students:   studentStore.size,
    gmailReady: !!(process.env.GMAIL_USER && process.env.GMAIL_PASS !== 'your_16_char_app_password_here'),
    uptime:     Math.floor(process.uptime()) + 's'
  });
});

// ── POST /api/send-otp ────────────────────────────────────────
app.post('/api/send-otp', async (req, res) => {
  const { email, name, type } = req.body;

  if (!email || !type)
    return res.status(400).json({ success:false, message:'Email and type required.' });

  if (!email.endsWith('@gmail.com'))
    return res.status(400).json({ success:false, message:'Only Gmail addresses are allowed.' });

  if (type === 'register' && studentStore.has(email.toLowerCase()))
    return res.status(409).json({ success:false, message:'This Gmail is already registered. Please login.' });

  if (type === 'reset' && !studentStore.has(email.toLowerCase()))
    return res.status(404).json({ success:false, message:'No account found with this Gmail.' });

  // Rate limit — max 3 requests per 10 min
  const existing = otpStore.get(email.toLowerCase());
  if (existing && existing.attempts >= 3 && existing.expiry > Date.now())
    return res.status(429).json({ success:false, message:'Too many OTP requests. Wait 10 minutes.' });

  const otp      = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry   = Date.now() + 10 * 60 * 1000;
  const attempts = existing ? existing.attempts + 1 : 1;
  otpStore.set(email.toLowerCase(), { otp, expiry, attempts, name, type });

  try {
    if (transporter) {
      await transporter.sendMail({
        from:    `"VoteChain — GH Raisoni University" <${getSenderEmail()}>`,
        to:      email,
        subject: type === 'register'
          ? '🔐 Your VoteChain Registration OTP — GH Raisoni University'
          : '🔑 Your VoteChain Password Reset OTP',
        html: otpEmail(otp, name, type)
      });
      console.log(`✅ OTP sent → ${email} [${type}]`);
    } else {
      // DEV MODE — no email configured, print OTP to console
      console.log('');
      console.log('╔══════════════════════════════════════╗');
      console.log(`║  DEV MODE OTP for ${email}`);
      console.log(`║  OTP CODE: ${otp}`);
      console.log('╚══════════════════════════════════════╝');
      console.log('');
    }
    res.json({ success:true, message: transporter ? `OTP sent to ${email}` : `DEV MODE: OTP is ${otp} (check server console)` });
  } catch (err) {
    console.error('❌ Email error:', err.message);
    res.status(500).json({ success:false, message:'Failed to send email: ' + err.message });
  }
});

// ── POST /api/verify-otp ──────────────────────────────────────
app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp)
    return res.status(400).json({ success:false, message:'Email and OTP required.' });

  const record = otpStore.get(email.toLowerCase());
  if (!record)
    return res.status(404).json({ success:false, message:'No OTP found. Request a new one.' });
  if (Date.now() > record.expiry) {
    otpStore.delete(email.toLowerCase());
    return res.status(410).json({ success:false, message:'OTP expired. Request a new one.' });
  }
  if (record.otp !== otp.toString().trim())
    return res.status(401).json({ success:false, message:'Incorrect OTP. Try again.' });

  otpStore.delete(email.toLowerCase());
  res.json({ success:true, message:'OTP verified!' });
});

// ── POST /api/register ────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  const { studentId, name, dept, year, email, password } = req.body;
  if (!studentId || !name || !dept || !year || !email || !password)
    return res.status(400).json({ success:false, message:'All fields are required.' });

  if (studentStore.has(email.toLowerCase()))
    return res.status(409).json({ success:false, message:'This Gmail is already registered.' });

  for (const [, s] of studentStore) {
    if (s.studentId === studentId.toUpperCase())
      return res.status(409).json({ success:false, message:'This Student ID is already registered.' });
  }

  const hashed = await bcrypt.hash(password, 10);
  studentStore.set(email.toLowerCase(), {
    studentId: studentId.toUpperCase(),
    name: name.trim(), dept, year,
    email: email.toLowerCase(),
    password: hashed,
    role: 'student',
    hasVoted: {},
    createdAt: new Date().toISOString()
  });

  console.log(`✅ Registered: ${name} (${studentId})`);
  res.json({ success:true, message:'Registration complete! You can now login.' });
});

// ── POST /api/login ───────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success:false, message:'Email and password required.' });

  const student = studentStore.get(email.toLowerCase());
  if (!student)
    return res.status(404).json({ success:false, message:'No account found. Please register first.' });

  const match = await bcrypt.compare(password, student.password);
  if (!match)
    return res.status(401).json({ success:false, message:'Incorrect password.' });

  const { password:_, ...profile } = student;
  res.json({ success:true, profile });
});

// ── POST /api/reset-password ──────────────────────────────────
app.post('/api/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword)
    return res.status(400).json({ success:false, message:'Email and new password required.' });

  const student = studentStore.get(email.toLowerCase());
  if (!student)
    return res.status(404).json({ success:false, message:'No account found with this Gmail.' });

  if (newPassword.length < 8)
    return res.status(400).json({ success:false, message:'Password must be at least 8 characters.' });

  student.password = await bcrypt.hash(newPassword, 10);
  studentStore.set(email.toLowerCase(), student);
  console.log(`✅ Password reset: ${email}`);
  res.json({ success:true, message:'Password reset! You can now login.' });
});

// ── CANDIDATES STORE (server-side, all devices see same data) ─
const SEED_CANDIDATES = [
  { id:'c1', name:'Ahmed Khan',  studentId:'GHRCEM-CS-2022-031',  dept:'Computer Science',       year:'3rd Year', pos:'Student Council President',     party:'🌟 Progress & Unity', election:'Student Council President',    email:'ahmed@ghrcem.edu.in',  bio:'3 years of leadership.',   votes:412, active:true },
  { id:'c2', name:'Sara Malik',  studentId:'GHRCEM-EE-2022-044',  dept:'Electrical Engineering', year:'3rd Year', pos:'Student Council President',     party:'💡 Innovation First',  election:'Student Council President',    email:'sara@ghrcem.edu.in',   bio:'Student welfare champion.',votes:287, active:true },
  { id:'c3', name:'Ayesha Noor', studentId:'GHRCEM-BBA-2022-012', dept:'Business Administration',year:'3rd Year', pos:'Student Council President',     party:'🤝 Student Voice',     election:'Student Council President',    email:'ayesha@ghrcem.edu.in', bio:'Inclusivity advocate.',    votes:143, active:true },
  { id:'c4', name:'Omar Farooq', studentId:'GHRCEM-CS-2022-078',  dept:'Computer Science',       year:'3rd Year', pos:'CS Department Representative', party:'⚡ Tech Forward',      election:'CS Department Representative', email:'omar@ghrcem.edu.in',   bio:'Hackathon organizer.',     votes:143, active:true },
  { id:'c5', name:'Bilal Raza',  studentId:'GHRCEM-CS-2023-055',  dept:'Computer Science',       year:'2nd Year', pos:'Sports Captain',                party:'🏅 Champions United',  election:'Sports Captain Election',      email:'bilal@ghrcem.edu.in',  bio:'Cricket champion.',        votes:68,  active:true },
];
let candidateStore = JSON.parse(JSON.stringify(SEED_CANDIDATES));
let nextId = 100;

// GET all candidates
app.get('/api/candidates', (req, res) => {
  res.json({ success:true, candidates: candidateStore });
});

// POST add candidate
app.post('/api/candidates', (req, res) => {
  const { name, studentId, dept, year, pos, party, election, email, phone, bio, active } = req.body;
  if (!name || !studentId || !dept || !pos || !party || !election)
    return res.status(400).json({ success:false, message:'Required fields missing.' });
  const c = { id:'c'+(++nextId), name, studentId:studentId.toUpperCase(), dept, year:year||'', pos, party, election, email:email||'', phone:phone||'', bio:bio||'', votes:0, active: active !== false };
  candidateStore.push(c);
  console.log(`✅ Candidate added: ${name}`);
  res.json({ success:true, candidate:c });
});

// PUT update candidate
app.put('/api/candidates/:id', (req, res) => {
  const idx = candidateStore.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success:false, message:'Candidate not found.' });
  candidateStore[idx] = { ...candidateStore[idx], ...req.body, id: req.params.id };
  res.json({ success:true, candidate: candidateStore[idx] });
});

// DELETE candidate
app.delete('/api/candidates/:id', (req, res) => {
  const idx = candidateStore.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success:false, message:'Candidate not found.' });
  const removed = candidateStore.splice(idx, 1)[0];
  console.log(`🗑️  Candidate removed: ${removed.name}`);
  res.json({ success:true, message:`${removed.name} removed.` });
});

// POST cast vote
app.post('/api/vote', (req, res) => {
  const { candidateId, election, voterId } = req.body;
  if (!candidateId || !election || !voterId)
    return res.status(400).json({ success:false, message:'candidateId, election and voterId required.' });
  const cand = candidateStore.find(c => c.id === candidateId);
  if (!cand) return res.status(404).json({ success:false, message:'Candidate not found.' });
  cand.votes = (cand.votes || 0) + 1;
  const tx = '0x' + [...Array(16)].map(()=>Math.floor(Math.random()*16).toString(16)).join('');
  console.log(`🗳️  Vote cast: ${voterId} → ${cand.name} [${election}]`);
  res.json({ success:true, tx, block:(19284751 + Math.floor(Math.random()*100)).toLocaleString() });
});

// ── Serve all HTML pages ──────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  const line = '═'.repeat(52);
  console.log('');
  console.log(`╔${line}╗`);
  console.log(`║   🗳️  VoteChain — G H Raisoni University          ║`);
  console.log(`╠${line}╣`);
  console.log(`║   🌐  http://localhost:${PORT}                         ║`);
  console.log(`║   📋  Login    → http://localhost:${PORT}/login.html   ║`);
  console.log(`║   🗳️  Vote     → http://localhost:${PORT}/vote.html    ║`);
  console.log(`║   📊  Results  → http://localhost:${PORT}/results.html ║`);
  console.log(`║   ⚙️  Admin    → http://localhost:${PORT}/admin.html   ║`);
  console.log(`╠${line}╣`);

  if (transporter) {
    console.log(`║   ✅  Email   → CONFIGURED & READY                  ║`);
  } else {
    console.log(`║   ⚠️  Email   → DEV MODE (OTP shown in console)     ║`);
    console.log(`║      → To enable email: fill .env with Gmail/Brevo  ║`);
  }

  console.log(`╠${line}╣`);
  console.log(`║   👤  Admin ID  : GHRCEM-ADMIN                       ║`);
  console.log(`║   🔑  Password  : ghrstu@2025                        ║`);
  console.log(`║   🗝️  Secret Key: GHRCEM#KEY                         ║`);
  console.log(`╚${line}╝`);
  console.log('');
  console.log('   Press Ctrl+C to stop the server');
  console.log('');
});
