// ===== CaptaPro v3.0 - Supabase Module =====
// Conexão, Login, Configurações CEO, Metas Individuais

// Credenciais injetadas via build (webpack/vite) ou fallback para variáveis de ambiente
// Para desenvolvimento local, crie um arquivo .env com:
// VITE_SUPABASE_URL=https://veznreiamwstlulkpocz.supabase.co
// VITE_SUPABASE_KEY=sua_chave_anon
const ENV_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || '';
const ENV_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_KEY) || '';

export const SUPABASE_URL = ENV_URL || "https://veznreiamwstlulkpocz.supabase.co";
export const SUPABASE_KEY = ENV_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlem5yZWlhbXdzdGx1bGtwb2N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2ODc1NDksImV4cCI6MjA5NzI2MzU0OX0.MeSqJZTZnk3zDKWgD920ccV2KUheH0W_BGD3TvhPXdM";
export const CEOS = ['raphaelbueno.captacao@gmail.com', 'marcel.dorado2@gmail.com'];

export let db = null;
export let usuarioEmail = '';
export let usuarioNome = '';
export let role = 'profissional';

// Inicializa Supabase
try {
  if (typeof window.supabase !== 'undefined') {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
} catch (e) {
  console.error('Supabase não carregou:', e);
  db = null;
}

// ===== HELPERS DE FORMATAÇÃO (compartilhados) =====
export const onlyDigits = (v) => String(v || '').replace(/\D/g, '');
export const parseMoeda = (v) => {
  let s = String(v || '').replace(/R\$|\s/g, '').trim();
  if (!s) return 0;
  s = s.replace(/[^0-9,.-]/g, '');
  if (s.includes(',')) return Number(s.replace(/\./g, '').replace(',', '.')) || 0;
  return Number(s.replace(/\./g, '')) || 0;
};
export const moeda = (n) => (Number(n || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const rendaTela = (n) => (Number(n || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const normal = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

// ===== LOGIN =====
export async function entrar() {
  const emailEl = document.getElementById('email');
  const nomeEl = document.getElementById('nome');
  const loginMsgEl = document.getElementById('loginMsg');
  const loginBoxEl = document.getElementById('loginBox');
  const appEl = document.getElementById('app');

  if (!emailEl || !nomeEl) return;

  usuarioEmail = (emailEl.value || '').trim().toLowerCase();
  usuarioNome = (nomeEl.value || '').trim() || usuarioEmail;

  if (!usuarioEmail) {
    if (loginMsgEl) loginMsgEl.innerHTML = '<span class="erro">Informe o e-mail.</span>';
    return;
  }

  try {
    if (db) {
      const r = await db.from('approved_users').select('*').eq('email', usuarioEmail).maybeSingle();
      let u = r.data;
      if (!u && CEOS.includes(usuarioEmail)) {
        u = { role: 'ceo', approved: true, name: usuarioNome };
      }
      if (!u || u.approved === false) {
        if (loginMsgEl) loginMsgEl.innerHTML = '<span class="erro">E-mail não aprovado.</span>';
        return;
      }
      role = u.role || 'profissional';
      usuarioNome = u.name || usuarioNome;
    } else {
      role = CEOS.includes(usuarioEmail) ? 'ceo' : 'profissional';
    }
  } catch (e) {
    role = CEOS.includes(usuarioEmail) ? 'ceo' : 'profissional';
  }

  document.body.classList.toggle('ceo', role === 'ceo' || CEOS.includes(usuarioEmail));
  if (loginBoxEl) loginBoxEl.classList.add('hidden');
  if (appEl) appEl.classList.remove('hidden');

  try {
    localStorage.setItem('loginSimples', JSON.stringify({ email: usuarioEmail, nome: usuarioNome }));
  } catch (e) { /* ignore */ }

  loadCfg();
  aplicarRendaDigitavel();

  // Import dinâmico para evitar circular dependency
  const { carregarAbordagensHoje } = await import('./pesquisa.js');
  const { carregarRelatorio } = await import('./relatorio.js');
  carregarAbordagensHoje();
  carregarRelatorio();
}

export function sairCaptaProFinal() {
  localStorage.removeItem('loginSimples');
  location.reload();
}

// ===== CONFIGURAÇÕES CEO =====
export function getCfg() {
  try {
    return JSON.parse(localStorage.getItem('cfg') || '{}');
  } catch (e) {
    return {};
  }
}

export function loadCfg() {
  const c = getCfg();
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };
  setVal('cfgIdadeMin', c.idadeMin || 25);
  setVal('cfgIdadeMax', c.idadeMax || 64);
  setVal('cfgRendaMin', rendaTela(c.rendaMin || 15000));
  setVal('cfgAnoMin', c.anoMin || 2011);
  setVal('cfgMetaMensalCasais', c.metaMensalCasais || 35);
  setVal('cfgProfissoesBloqueadas', c.profissoesBloqueadas || 'Operador de caixa, Zelador, Secretária, Auxiliar, Assistente, Estudante, Uber/App/Freelancer');
}

export function salvarConfig() {
  const c = {
    rendaMin: parseMoeda(document.getElementById('cfgRendaMin')?.value || '') || 15000,
    anoMin: Number(document.getElementById('cfgAnoMin')?.value) || 2011,
    idadeMin: Number(document.getElementById('cfgIdadeMin')?.value) || 25,
    idadeMax: Number(document.getElementById('cfgIdadeMax')?.value) || 64,
    metaMensalCasais: Number(document.getElementById('cfgMetaMensalCasais')?.value) || 35,
    profissoesBloqueadas: document.getElementById('cfgProfissoesBloqueadas')?.value || ''
  };
  localStorage.setItem('cfg', JSON.stringify(c));
  const cfgMsg = document.getElementById('cfgMsg');
  if (cfgMsg) cfgMsg.innerHTML = '<span class="ok">Configurações salvas.</span>';
}

// ===== RENDA DIGITÁVEL =====
export function aplicarRendaDigitavel() {
  const el = document.getElementById('renda');
  if (!el || el.__renda21) return;
  el.__renda21 = true;
  let digits = String(el.value || '').split(',')[0].replace(/\D/g, '');
  function render() {
    el.value = digits ? rendaTela(Number(digits)) : '';
  }
  el.addEventListener('input', () => {
    if (!el.value.includes(',')) {
      digits = onlyDigits(el.value);
      render();
    }
  });
}

// ===== METAS INDIVIDUAIS =====
export function getMetasIndividuais20() {
  try {
    return JSON.parse(localStorage.getItem('metas_individuais_20') || '{}');
  } catch (e) {
    return {};
  }
}

export function setMetasIndividuais20(obj) {
  localStorage.setItem('metas_individuais_20', JSON.stringify(obj || {}));
}

export function salvarMetaIndividual20() {
  const nome = document.getElementById('metaProfNome20')?.value?.trim();
  const meta = Number(document.getElementById('metaProfValor20')?.value) || 0;
  const box = document.getElementById('metasIndividuaisBox20');
  if (!nome || !meta) {
    if (box) box.innerHTML = '<p class="erro">Informe nome e meta.</p>';
    return;
  }
  const metas = getMetasIndividuais20();
  const chave = nome.toLowerCase().replace(/[^a-z0-9]/g, '_');
  metas[chave] = { nome, meta };
  setMetasIndividuais20(metas);
  const nomeEl = document.getElementById('metaProfNome20');
  const valorEl = document.getElementById('metaProfValor20');
  if (nomeEl) nomeEl.value = '';
  if (valorEl) valorEl.value = '';
  renderMetasIndividuais20();
}

export function removerMetaIndividual20(k) {
  const metas = getMetasIndividuais20();
  delete metas[k];
  setMetasIndividuais20(metas);
  renderMetasIndividuais20();
}

export function renderMetasIndividuais20() {
  const box = document.getElementById('metasIndividuaisBox20');
  if (!box) return;
  const metas = getMetasIndividuais20();
  const rows = Object.entries(metas);
  if (!rows.length) {
    box.innerHTML = '<p class="mini">Nenhuma meta cadastrada. Padrão: 35.</p>';
    return;
  }
  box.innerHTML = '<table style="width:100%;"><tr><th>Profissional</th><th>Meta</th><th>Ação</th></tr>' +
    rows.map(([k, v]) => `<tr><td>${v.nome}</td><td>${v.meta}</td><td><button class="secondary" style="width:100%;padding:6px;font-size:12px;" data-remover-meta="${k}">Remover</button></td></tr>`).join('') +
    '</table>';
  // Attach events
  box.querySelectorAll('[data-remover-meta]').forEach(btn => {
    btn.addEventListener('click', () => removerMetaIndividual20(btn.dataset.removerMeta));
  });
}
