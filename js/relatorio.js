// ===== CaptaPro v3.0 - Relatório Module =====
// Dashboard, ranking, indicadores, filtros de data

import { db, usuarioEmail, role, normal } from './supabase.js';

// ===== HELPERS LOCAIS =====
const E = (id) => document.getElementById(id);
const V = (id) => (E(id)?.value || '').trim();
const H = (id, v) => { const el = E(id); if (el) el.innerHTML = v; };
const S = (id, v) => { const el = E(id); if (el) el.innerText = v; };

// ===== BUSCAR DADOS (Supabase + localStorage merge) =====
export async function dados(t) {
  let arr = [];
  try {
    if (db) {
      const r = await db.from(t).select('*').order('created_at', { ascending: false }).limit(3000);
      arr = r.data || [];
    }
  } catch (e) {
    arr = JSON.parse(localStorage.getItem(t === 'pesquisas' ? 'pesquisasLocal' : 'abordagensLocal') || '[]');
  }
  if (t === 'pesquisas') {
    const locais = JSON.parse(localStorage.getItem('pesquisasLocal') || '[]');
    const key = x => String(x.id || '') + '|' + String(x.user_email || '') + '|' + String(x.created_at || '');
    const map = {};
    [...arr, ...locais].forEach(x => {
      map[key(x)] = { ...(map[key(x)] || {}), ...x };
    });
    arr = Object.values(map);
  }
  return arr;
}

// ===== FILTRO POR PERÍODO =====
function per(x, de, ate) {
  const d = String(x.created_at || '').slice(0, 10);
  return (!de || d >= de) && (!ate || d <= ate);
}

// ===== VERIFICAR SE FOI PARA SALA =====
function isSala(x) {
  return normal(x.levou_sala || x.sala || x.sala_status || x.status_sala).includes('sim') || x.sala === true;
}

// ===== CARREGAR RELATÓRIO COMPLETO =====
export async function carregarRelatorio() {
  if (!usuarioEmail) return;
  const de = V('relDe'), ate = V('relAte');
  let p = await dados('pesquisas');
  let a = await dados('abordagens');

  if (role !== 'ceo') {
    p = p.filter(x => x.user_email === usuarioEmail);
    a = a.filter(x => x.user_email === usuarioEmail);
  }
  p = p.filter(x => per(x, de, ate));
  a = a.filter(x => per(x, de, ate));

  const q = p.filter(x => x.qualificacao_automatica === 'Q').length;
  const nq1 = p.filter(x => String(x.qualificacao_automatica || '').includes('1')).length;
  const nq = p.length - q - nq1;
  const sala = p.filter(isSala).length;

  // Relatório do profissional
  S('rAbord', a.length);
  S('rPesq', p.length);
  S('rQ', q);
  S('rNQ', nq);
  S('rNQ1', nq1);
  S('rSala', sala);
  S('rConv', p.length ? Math.round(sala / p.length * 100) + '%' : '0%');

  // Painel do dia
  S('dAbord', a.length);
  S('dPesq', p.length);
  S('dQ', q);
  S('dNQ', nq);
  S('dNQ1', nq1);
  S('dSala', sala);
  S('dEfic', p.length ? Math.round(q / p.length * 100) + '%' : '0%');
  S('dConv', p.length ? Math.round(sala / p.length * 100) + '%' : '0%');

  // Painel inicial do profissional
  S('homeAbord', a.length);
  S('homePesq', p.length);
  S('homeQ', q);
  S('homeNQ', nq);
  S('homeSala', sala);

  // CEO Dashboard
  const todasAsAbord = (await dados('abordagens')).filter(x => per(x, de, ate));
  const todasAsPesq = (await dados('pesquisas')).filter(x => per(x, de, ate));
  const qTodas = todasAsPesq.filter(x => x.qualificacao_automatica === 'Q').length;
  const nqTodas = todasAsPesq.filter(x => x.qualificacao_automatica === 'NQ').length;
  const salaTodas = todasAsPesq.filter(isSala).length;

  S('ceoAbordHoje', todasAsAbord.length);
  S('ceoPesqHoje', todasAsPesq.length);
  S('ceoQHoje', qTodas);
  S('ceoNQHoje', nqTodas);
  S('ceoSalaHoje', salaTodas);
  S('ceoSalaPendente', todasAsPesq.length - salaTodas);
  S('ceoEficHoje', todasAsPesq.length ? Math.round(qTodas / todasAsPesq.length * 100) + '%' : '0%');
  S('ceoConvHoje', todasAsPesq.length ? Math.round(salaTodas / todasAsPesq.length * 100) + '%' : '0%');

  // Meta mensal
  const { getCfg, getMetasIndividuais20 } = await import('./supabase.js');
  const cfg = getCfg();
  const metaMensal = cfg.metaMensalCasais || 35;
  const metaValorEl = E('metaValor35');
  const barraEl = E('barraMetaFill35');
  const metaInfoEl = E('metaInfo35');
  if (metaValorEl) metaValorEl.innerText = `${sala} casais em sala`;
  if (barraEl) {
    const pct = Math.min(100, Math.round((sala / metaMensal) * 100));
    barraEl.style.width = pct + '%';
  }
  if (metaInfoEl) {
    const faltam = Math.max(0, metaMensal - sala);
    metaInfoEl.innerText = `Faltam ${faltam} casais`;
  }

  // Ranking
  const map = {};
  p.forEach(x => {
    const n = x.captador_nome || x.user_email || 'Sem nome';
    if (!map[n]) map[n] = { nome: n, p: 0, s: 0, q: 0, nq: 0, nq1: 0, a: 0 };
    map[n].p++;
    if (x.qualificacao_automatica === 'Q') map[n].q++;
    else if (String(x.qualificacao_automatica || '').includes('1')) map[n].nq1++;
    else map[n].nq++;
    if (isSala(x)) map[n].s++;
  });
  a.forEach(x => {
    const n = x.captador_nome || x.user_email || 'Sem nome';
    if (!map[n]) map[n] = { nome: n, p: 0, s: 0, q: 0, nq: 0, nq1: 0, a: 0 };
    map[n].a++;
  });

  const rows = Object.values(map).sort((x, y) => y.p - x.p || y.s - x.s);
  const rankingBox = E('rankingEquipeBox13');
  if (rankingBox && rows.length) {
    rankingBox.innerHTML = '<table><tr><th>Nome</th><th>Abord.</th><th>Pesq.</th><th>Q</th><th>NQ</th><th>1 Item</th><th>Sala</th></tr>' +
      rows.map(r => `<tr><td>${r.nome}</td><td>${r.a}</td><td>${r.p}</td><td>${r.q}</td><td>${r.nq}</td><td>${r.nq1}</td><td>${r.s}</td></tr>`).join('') +
      '</table>';
  }

  // Filtro individual
  const profFiltro = E('profFiltro');
  if (profFiltro) {
    profFiltro.innerHTML = '<option value="">Escolha o profissional</option>' + rows.map(r => `<option>${r.nome}</option>`).join('');
  }
  window.rowsRel = rows;
  mostrarIndividual();
}

// ===== MOSTRAR INDIVIDUAL =====
export function mostrarIndividual() {
  const r = (window.rowsRel || []).find(x => x.nome === V('profFiltro'));
  const box = E('individualBox');
  if (!box) return;
  box.innerHTML = r
    ? `<div class="kpis"><div class="kpi">Abord.<b>${r.a}</b></div><div class="kpi">Pesq.<b>${r.p}</b></div><div class="kpi">Q<b>${r.q}</b></div><div class="kpi">NQ<b>${r.nq}</b></div><div class="kpi">1 Item<b>${r.nq1}</b></div><div class="kpi">Sala<b>${r.s}</b></div></div>`
    : '<p class="mini">Escolha um profissional.</p>';
}