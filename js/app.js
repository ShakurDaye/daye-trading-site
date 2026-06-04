/* ============================================
   DAYE TRADING — SHARED APP LOGIC
   ============================================ */

// ── THEME ──────────────────────────────────
const Theme = {
  init() {
    const saved = localStorage.getItem('dt_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    this.updateIcon();
  },
  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('dt_theme', next);
    this.updateIcon();
  },
  updateIcon() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.textContent = isDark ? '☀️' : '🌙';
    btn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  }
};

// ── AUTH ───────────────────────────────────
const Auth = {
  // Mock users — replace with real backend later
  USERS_KEY: 'dt_users',
  SESSION_KEY: 'dt_session',
  REMEMBER_KEY: 'dt_remember',

  getUsers() {
    const raw = localStorage.getItem(this.USERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  },

  saveUsers(users) {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  },

  getCurrentUser() {
    const session = sessionStorage.getItem(this.SESSION_KEY) || localStorage.getItem(this.SESSION_KEY);
    if (!session) return null;
    try { return JSON.parse(session); } catch { return null; }
  },

  login(emailOrUsername, password, remember) {
    const users = this.getUsers();
    const user = users.find(u =>
      (u.email === emailOrUsername || u.username === emailOrUsername) &&
      u.password === this.hashPassword(password)
    );
    if (!user) return { success: false, message: 'Invalid email/username or password.' };
    const session = { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, username: user.username, role: user.role };
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(this.SESSION_KEY, JSON.stringify(session));
    if (remember) localStorage.setItem(this.REMEMBER_KEY, 'true');
    return { success: true, user: session };
  },

  signup(data) {
    const users = this.getUsers();
    if (users.find(u => u.email === data.email)) return { success: false, message: 'Email already registered.' };
    if (users.find(u => u.username === data.username)) return { success: false, message: 'Username already taken.' };
    const user = {
      id: 'u_' + Date.now(),
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      username: data.username,
      password: this.hashPassword(data.password),
      role: 'student', // roles: student | admin
      createdAt: new Date().toISOString(),
      // subscription: 'free' | 'premium' — placeholder for future use
      subscription: 'free'
    };
    users.push(user);
    this.saveUsers(users);
    return { success: true, user };
  },

  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.REMEMBER_KEY);
    window.location.href = 'login.html';
  },

  // Simple hash — replace with bcrypt on real backend
  hashPassword(pw) {
    let hash = 0;
    for (let i = 0; i < pw.length; i++) {
      hash = ((hash << 5) - hash) + pw.charCodeAt(i);
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(36) + '_' + pw.length;
  },

  requireAuth() {
    if (!this.getCurrentUser()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },

  requireAdmin() {
    const user = this.getCurrentUser();
    if (!user || user.role !== 'admin') {
      window.location.href = 'dashboard.html';
      return false;
    }
    return true;
  },

  // Seed a demo account if no users exist
  seedDemo() {
    const users = this.getUsers();
    if (users.length === 0) {
      this.signup({
        firstName: 'Demo', lastName: 'Student',
        email: 'demo@dayetrading.com', username: 'demostudent',
        password: 'Demo@1234'
      });
      // Admin account
      const admins = this.getUsers();
      admins.push({
        id: 'u_admin', firstName: 'Shakur', lastName: 'Daye',
        email: 'admin@dayetrading.com', username: 'shakurdaye',
        password: this.hashPassword('Admin@1234'),
        role: 'admin', createdAt: new Date().toISOString(), subscription: 'premium'
      });
      this.saveUsers(admins);
    }
  }
};

// ── PROGRESS ───────────────────────────────
const Progress = {
  KEY: 'dt_progress',

  get(userId) {
    const raw = localStorage.getItem(this.KEY + '_' + userId);
    return raw ? JSON.parse(raw) : {};
  },

  save(userId, data) {
    localStorage.setItem(this.KEY + '_' + userId, JSON.stringify(data));
  },

  markComplete(userId, lessonId) {
    const p = this.get(userId);
    p[lessonId] = { completed: true, completedAt: new Date().toISOString() };
    this.save(userId, p);
  },

  isComplete(userId, lessonId) {
    const p = this.get(userId);
    return !!(p[lessonId] && p[lessonId].completed);
  },

  getCount(userId) {
    const p = this.get(userId);
    return Object.values(p).filter(v => v.completed).length;
  },

  getPercent(userId, total) {
    return Math.round((this.getCount(userId) / total) * 100);
  }
};

// ── TOAST ──────────────────────────────────
const Toast = {
  show(message, type = 'info', duration = 3500) {
    let wrap = document.getElementById('toastWrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'toastWrap';
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    wrap.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, duration);
  }
};

// ── VALIDATION ─────────────────────────────
const Validate = {
  email(v)    { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); },
  minLen(v,n) { return v.length >= n; },
  notEmpty(v) { return v.trim().length > 0; },
  numeric(v)  { return !isNaN(parseFloat(v)) && isFinite(v); },
  name(v)     { return /^[a-zA-Z\s'-]+$/.test(v.trim()); },

  password(pw) {
    return {
      length:    pw.length >= 8,
      upper:     /[A-Z]/.test(pw),
      lower:     /[a-z]/.test(pw),
      number:    /[0-9]/.test(pw),
      special:   /[!@#$%^&*(),.?":{}|<>]/.test(pw),
      get valid() { return this.length && this.upper && this.lower && this.number && this.special; }
    };
  },

  strength(pw) {
    const r = this.password(pw);
    const score = [r.length, r.upper, r.lower, r.number, r.special].filter(Boolean).length;
    if (score <= 2) return { label: 'Weak',   color: '#ef4444', width: '25%' };
    if (score === 3) return { label: 'Fair',   color: '#f59e0b', width: '50%' };
    if (score === 4) return { label: 'Good',   color: '#3b82f6', width: '75%' };
    return                  { label: 'Strong', color: '#10b981', width: '100%' };
  },

  showError(inputId, msg) {
    const input = document.getElementById(inputId);
    const err   = document.getElementById(inputId + 'Error');
    if (input) input.classList.add('error');
    if (err)   { err.textContent = msg; err.classList.add('show'); }
  },

  clearError(inputId) {
    const input = document.getElementById(inputId);
    const err   = document.getElementById(inputId + 'Error');
    if (input) input.classList.remove('error');
    if (err)   err.classList.remove('show');
  }
};

// ── NAV HELPERS ────────────────────────────
function initNav() {
  // Mobile toggle
  const toggle = document.getElementById('navToggle');
  const links  = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
  }

  // Theme toggle
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.addEventListener('click', () => Theme.toggle());

  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to log out?')) Auth.logout();
    });
  }

  // Populate user name in nav if present
  const user = Auth.getCurrentUser();
  const navUser = document.getElementById('navUserName');
  if (navUser && user) navUser.textContent = user.firstName;
}

// ── CURRICULUM DATA ────────────────────────
const CURRICULUM = [
  {
    id: 1, title: 'The Stock Market Foundation', weeks: 'Weeks 1–2', color: 'var(--phase1)',
    lessons: [
      { id: 1,  title: 'What are stocks & where do they come from?',      time: '15 min' },
      { id: 2,  title: 'How does the stock market work?',                  time: '18 min' },
      { id: 3,  title: 'Stock exchanges — NYSE, NASDAQ & how trades happen', time: '20 min' },
      { id: 4,  title: 'Bulls, bears & market cycles',                     time: '16 min' },
    ]
  },
  {
    id: 2, title: 'Trading Mechanics', weeks: 'Weeks 3–4', color: 'var(--phase2)',
    lessons: [
      { id: 5,  title: 'Brokers & how to open a trading account',          time: '20 min' },
      { id: 6,  title: 'Order types — market, limit & stop loss',          time: '22 min' },
      { id: 7,  title: 'Bid, ask, spread & how brokers make money',        time: '18 min' },
      { id: 8,  title: 'Margin & leverage — the double-edged sword',       time: '25 min' },
      { id: 9,  title: 'The PDT rule — the $25k requirement explained',    time: '15 min' },
    ]
  },
  {
    id: 3, title: 'Reading Charts', weeks: 'Weeks 5–7', color: 'var(--phase3)',
    lessons: [
      { id: 10, title: 'How to read a stock chart — the basics',           time: '20 min' },
      { id: 11, title: 'Candlestick charts — what each candle tells you',  time: '25 min' },
      { id: 12, title: 'Support & resistance levels',                      time: '22 min' },
      { id: 13, title: 'Trend lines & how to draw them correctly',         time: '20 min' },
      { id: 14, title: 'Volume — why it matters in day trading',           time: '18 min' },
      { id: 15, title: 'Chart patterns — flags, triangles & breakouts',    time: '28 min' },
    ]
  },
  {
    id: 4, title: 'Indicators & Analysis', weeks: 'Weeks 8–10', color: 'var(--phase4)',
    lessons: [
      { id: 16, title: 'Moving averages — SMA vs EMA explained simply',   time: '22 min' },
      { id: 17, title: 'RSI — the Relative Strength Index',               time: '20 min' },
      { id: 18, title: 'MACD — momentum made simple',                     time: '22 min' },
      { id: 19, title: 'VWAP & why day traders love it',                  time: '18 min' },
      { id: 20, title: 'News & catalysts that move stocks',               time: '20 min' },
    ]
  },
  {
    id: 5, title: 'Risk Management & Psychology', weeks: 'Weeks 11–13', color: 'var(--phase5)',
    lessons: [
      { id: 21, title: 'Risk management basics — the 1% rule',            time: '20 min' },
      { id: 22, title: 'Stop losses & take profit targets',               time: '18 min' },
      { id: 23, title: 'Risk/reward ratio — your most important number',  time: '20 min' },
      { id: 24, title: 'Trading psychology — fear, greed & discipline',   time: '25 min' },
      { id: 25, title: 'Revenge trading & emotional mistakes',            time: '18 min' },
      { id: 26, title: 'How to keep a trading journal',                   time: '15 min' },
    ]
  },
  {
    id: 6, title: 'Strategies & Paper Trading', weeks: 'Weeks 14–24', color: 'var(--phase6)',
    lessons: [
      { id: 27, title: 'Paper trading — practice without losing money',   time: '20 min' },
      { id: 28, title: 'Momentum trading strategy for beginners',         time: '25 min' },
      { id: 29, title: 'Opening range breakout strategy',                 time: '22 min' },
      { id: 30, title: 'Gap and go strategy explained',                   time: '20 min' },
      { id: 31, title: 'Build & backtest your own strategy',              time: '28 min' },
      { id: 32, title: 'Am I ready to trade live? Final checklist',       time: '15 min' },
    ]
  }
];

const TOTAL_LESSONS = CURRICULUM.reduce((sum, p) => sum + p.lessons.length, 0);

// ── GLOSSARY DATA ──────────────────────────
const GLOSSARY = [
  { term: 'Stock',        def: 'A share of ownership in a company. When you buy a stock, you own a small piece of that company.' },
  { term: 'Share',        def: 'One unit of stock. If a company has 1,000 shares and you own 10, you own 1% of the company.' },
  { term: 'Broker',       def: 'A company or platform that executes trades on your behalf. Examples: TD Ameritrade, Robinhood, Webull.' },
  { term: 'Exchange',     def: 'A marketplace where stocks are bought and sold. The two main US exchanges are NYSE and NASDAQ.' },
  { term: 'Bid',          def: 'The highest price a buyer is willing to pay for a stock.' },
  { term: 'Ask',          def: 'The lowest price a seller is willing to accept for a stock.' },
  { term: 'Spread',       def: 'The difference between the bid and ask price. This is how market makers profit.' },
  { term: 'Volume',       def: 'The number of shares traded during a given period. High volume confirms strong price movement.' },
  { term: 'Candlestick',  def: 'A chart element showing a stock\'s open, high, low, and close price for a given time period.' },
  { term: 'Support',      def: 'A price level where a stock tends to stop falling and bounce back up.' },
  { term: 'Resistance',   def: 'A price level where a stock tends to stop rising and pull back down.' },
  { term: 'Trend Line',   def: 'A line drawn on a chart connecting price highs or lows to show the direction of price movement.' },
  { term: 'Stop Loss',    def: 'An order that automatically sells your position when price drops to a set level, limiting your loss.' },
  { term: 'Take Profit',  def: 'An order that automatically sells your position when price reaches your target profit level.' },
  { term: 'Margin',       def: 'Borrowing money from your broker to buy more stock than your cash balance allows.' },
  { term: 'Leverage',     def: 'Using borrowed capital to increase potential returns. Leverage magnifies both gains AND losses.' },
  { term: 'PDT Rule',     def: 'Pattern Day Trader rule. If you make 4+ day trades in 5 business days with under $25,000, your account is restricted.' },
  { term: 'RSI',          def: 'Relative Strength Index. A momentum indicator that measures if a stock is overbought (above 70) or oversold (below 30).' },
  { term: 'MACD',         def: 'Moving Average Convergence Divergence. A trend-following momentum indicator showing the relationship between two moving averages.' },
  { term: 'VWAP',         def: 'Volume Weighted Average Price. The average price a stock has traded at throughout the day, weighted by volume.' },
  { term: 'Risk/Reward',  def: 'The ratio between the amount you risk on a trade vs. the potential profit. A 1:3 ratio means risking $1 to make $3.' },
  { term: 'Paper Trading',def: 'Simulated trading with fake money. Used to practice strategies without risking real capital.' },
  { term: 'Backtesting',  def: 'Testing a trading strategy on historical data to see how it would have performed in the past.' },
];

// ── INIT ───────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Theme.init();
  Auth.seedDemo();
  initNav();
});
