// ===== CaptaPro v2.0 - Cb300 Game Module =====
// Competição interna: regras, resultados e ranking

const E = (id) => document.getElementById(id);
const V = (id) => (E(id)?.value || '').trim();
const H = (id, v) => { const el = E(id); if (el) el.innerHTML = v; };

// ===== DADOS =====
function getRegrasPersonalizadas() {
  try { return JSON.parse(localStorage.getItem('cbRegras') || '[]'); } catch { return []; }
}
function setRegrasPersonalizadas(arr) {
  localStorage.setItem('cbRegras', JSON.stringify(arr));
}
function getResultados() {
  try { return JSON.parse(localStorage.getItem('cbResultados') || '[]'); } catch { return []; }
}
function setResultados(arr) {
  localStorage.setItem('cbResultados', JSON.stringify(arr));
}

// ===== REGRAS FIXAS =====
const REGRAS_FIXAS = [
  { id: 'trabalhou', nome: 'Veio trabalhar', pontos: 1 },
  { id: 'casal_q', nome: 'Colocou casal Q', pontos: 3 },
  { id: 'vendeu', nome: 'Vendeu', pontos: 10 },
  { id: 'atingiu_1M', nome: 'Atingiu 1.000.000', pontos: 50 },
  { id: 'cortou', nome: 'Cortou', pontos: -50 }
];

// ===== CALCULAR PONTOS =====
function calcularPontos(acaoId) {
  const fixa = REGRAS_FIXAS.find(r => r.id === acaoId);
  if (fixa) return fixa.pontos;
  const personalizada = getRegrasPersonalizadas().find(r => r.id === acaoId);
  return personalizada ? personalizada.pontos : 0;
}

function getNomeAcao(acaoId) {
  const fixa = REGRAS_FIXAS.find(r => r.id === acaoId);
  if (fixa) return fixa.nome;
  const personalizada = getRegrasPersonalizadas().find(r => r.id === acaoId);
  return personalizada ? personalizada.nome : acaoId;
}

// ===== RENDERIZAR REGRAS PERSONALIZADAS =====
function renderRegrasPersonalizadas() {
  const regras = getRegrasPersonalizadas();
  const box = E('cbRegrasLista');
  if (!box) return;
  if (!regras.length) {
    box.innerHTML = '<p class="mini">Nenhuma regra personalizada ainda.</p>';
    return;
  }
  box.innerHTML = '<table style="width:100%;"><tr><th>Regra</th><th>Pontos</th><th>Ação</th></tr>' +
    regras.map(r => `<tr><td>${r.nome}</td><td>${r.pontos > 0 ? '+' : ''}${r.pontos}</td><td><button class="secondary" style="padding:4px 8px;font-size:12px;" data-remover-regra="${r.id}">Remover</button></td></tr>`).join('') +
    '</table>';
  box.querySelectorAll('[data-remover-regra]').forEach(btn => {
    btn.addEventListener('click', () => {
      const regras = getRegrasPersonalizadas().filter(r => r.id !== btn.dataset.removerRegra);
      setRegrasPersonalizadas(regras);
      renderRegrasPersonalizadas();
      popularAcoes();
    });
  });
}

// ===== POPULAR SELECT DE AÇÕES =====
function popularAcoes() {
  const sel = E('cbAcao');
  if (!sel) return;
  let opts = '<option value="">Selecione a ação</option>';
  REGRAS_FIXAS.forEach(r => {
    opts += `<option value="${r.id}">${r.nome} (${r.pontos > 0 ? '+' : ''}${r.pontos})</option>`;
  });
  getRegrasPersonalizadas().forEach(r => {
    opts += `<option value="${r.id}">${r.nome} (${r.pontos > 0 ? '+' : ''}${r.pontos})</option>`;
  });
  sel.innerHTML = opts;
}

// ===== ADICIONAR REGRA =====
export function adicionarRegra() {
  const nome = V('cbRegraNome');
  const pontos = Number(V('cbRegraPontos')) || 0;
  if (!nome || !pontos) {
    H('cbMsg', '<span class="erro">Informe nome e pontos da regra.</span>');
    return;
  }
  const regras = getRegrasPersonalizadas();
  const id = nome.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
  regras.push({ id, nome, pontos });
  setRegrasPersonalizadas(regras);
  E('cbRegraNome').value = '';
  E('cbRegraPontos').value = '';
  renderRegrasPersonalizadas();
  popularAcoes();
  H('cbMsg', '<span class="ok">Regra adicionada!</span>');
}

// ===== LANÇAR RESULTADO =====
export function lancarResultado() {
  const nome = V('cbProfNome');
  const acao = V('cbAcao');
  if (!nome || !acao) {
    H('cbMsg', '<span class="erro">Informe o profissional e a ação.</span>');
    return;
  }
  const pontos = calcularPontos(acao);
  const nomeAcao = getNomeAcao(acao);
  const resultado = {
    id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    profissional: nome,
    acao: acao,
    nomeAcao: nomeAcao,
    pontos: pontos,
    data: new Date().toISOString()
  };
  const resultados = getResultados();
  resultados.push(resultado);
  setResultados(resultados);
  E('cbProfNome').value = '';
  E('cbAcao').value = '';
  H('cbMsg', '<span class="ok">Resultado lançado! ' + nomeAcao + ': ' + (pontos > 0 ? '+' : '') + pontos + ' pts</span>');
  renderRanking();
  renderHistorico();
}

// ===== RENDERIZAR RANKING =====
function renderRanking() {
  const resultados = getResultados();
  const box = E('cbRanking');
  if (!box) return;
  if (!resultados.length) {
    box.innerHTML = '<p class="mini">Nenhum resultado lançado ainda.</p>';
    return;
  }
  const map = {};
  resultados.forEach(r => {
    if (!map[r.profissional]) map[r.profissional] = { nome: r.profissional, pontos: 0 };
    map[r.profissional].pontos += r.pontos;
  });
  const ranking = Object.values(map).sort((a, b) => b.pontos - a.pontos);
  box.innerHTML = '<table style="width:100%;"><tr><th>#</th><th>Profissional</th><th>Pontos</th></tr>' +
    ranking.map((r, i) => {
      const cor = r.pontos >= 0 ? 'ok' : 'erro';
      return `<tr><td>${i + 1}º</td><td>${r.nome}</td><td><b class="${cor}">${r.pontos}</b></td></tr>`;
    }).join('') +
    '</table>';
}

// ===== RENDERIZAR HISTÓRICO =====
function renderHistorico() {
  const resultados = getResultados();
  const box = E('cbHistorico');
  if (!box) return;
  if (!resultados.length) {
    box.innerHTML = '<p class="mini">Nenhum resultado lançado ainda.</p>';
    return;
  }
  const reversed = [...resultados].reverse();
  box.innerHTML = reversed.map(r => {
    const data = new Date(r.data).toLocaleString('pt-BR');
    const cor = r.pontos >= 0 ? 'ok' : 'erro';
    return `<div style="border-bottom:1px solid #2b2b2b;padding:6px 0;font-size:13px;">
      <b>${r.profissional}</b> — ${r.nomeAcao}: <b class="${cor}">${r.pontos > 0 ? '+' : ''}${r.pontos}</b>
      <br><small class="mini">${data}</small>
    </div>`;
  }).join('');
}

// ===== INICIALIZAR =====
export function initCb300() {
  renderRegrasPersonalizadas();
  popularAcoes();
  renderRanking();
  renderHistorico();
}