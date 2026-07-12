// ===== CaptaPro v3.0 - Pesquisa Module =====
// Ficha do casal, abordagem, qualificação Q/NQ, compartilhar

import { db, usuarioEmail, usuarioNome, role, getCfg, normal, parseMoeda, onlyDigits, rendaTela } from './supabase.js';

// ===== HELPERS LOCAIS =====
const E = (id) => document.getElementById(id);
const V = (id) => (E(id)?.value || '').trim();
const H = (id, v) => { const el = E(id); if (el) el.innerHTML = v; };
const S = (id, v) => { const el = E(id); if (el) el.innerText = v; };

export let ultimaFicha = null;

// ===== POPULAR IDADES =====
export function popularIdades() {
  const idade1 = E('idade1');
  const idade2 = E('idade2');
  if (!idade1 || !idade2) return;
  let opts = '<option value="">Idade</option>';
  for (let i = 18; i <= 90; i++) opts += `<option>${i}</option>`;
  idade1.innerHTML = opts;
  idade2.innerHTML = opts;
}

// ===== QUALIFICAÇÃO AUTOMÁTICA =====
export function qual() {
  const c = getCfg();
  const cfg = Object.assign({
    rendaMin: 15000,
    anoMin: 2011,
    idadeMin: 25,
    idadeMax: 64,
    profissoesBloqueadas: 'Operador de caixa, Zelador, Secretária, Auxiliar, Assistente, Estudante, Uber/App/Freelancer'
  }, c);
  const idade = Math.max(Number(V('idade1')) || 0, Number(V('idade2')) || 0);
  const renda = parseMoeda(V('renda'));
  const ano = Number(V('anoCarro')) || 0;
  let status = 'Q', m = [];
  function nq(txt) { status = 'NQ'; m.push(txt); }
  function item(txt) { if (status === 'Q') status = 'NQ 1 Item'; m.push(txt); }
  const lista = String(cfg.profissoesBloqueadas || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean);
  const p1 = String(V('profissao1') || '').toLowerCase();
  const p2 = String(V('profissao2') || '').toLowerCase();
  if (idade < cfg.idadeMin || idade > cfg.idadeMax) nq('idade');
  if (renda < cfg.rendaMin) item('renda');
  if (cfg.anoMin && ano && ano < cfg.anoMin) item('ano do carro');
  if (lista.some(x => p1.includes(x) || p2.includes(x))) nq('profissão fora do perfil');
  return { status, motivo: m.join(', ') || 'Perfil dentro da regra' };
}

// ===== ABORDAGEM =====
export async function registrarAbordagem() {
  if (!usuarioEmail) return;
  const p = {
    user_email: usuarioEmail,
    captador_nome: usuarioNome,
    equipe: V('equipe'),
    ponto_captacao: V('ponto'),
    observacao: 'Abordagem',
    created_at: new Date().toISOString()
  };
  try {
    if (db) await db.from('abordagens').insert(p);
  } catch (e) {
    const a = JSON.parse(localStorage.getItem('abordagensLocal') || '[]');
    a.push(p);
    localStorage.setItem('abordagensLocal', JSON.stringify(a));
  }
  carregarAbordagensHoje();
  H('formMsg', '<span class="ok">Abordagem registrada.</span>');
}

export async function carregarAbordagensHoje() {
  if (!usuarioEmail) return;
  let total = 0;
  const d = new Date().toISOString().slice(0, 10);
  try {
    if (db) {
      const r = await db.from('abordagens').select('*', { count: 'exact', head: true })
        .eq('user_email', usuarioEmail)
        .gte('created_at', d + 'T00:00:00')
        .lte('created_at', d + 'T23:59:59');
      total = r.count || 0;
    }
  } catch (e) {
    total = JSON.parse(localStorage.getItem('abordagensLocal') || '[]')
      .filter(x => x.user_email === usuarioEmail && String(x.created_at).slice(0, 10) === d).length;
  }
  S('abordagensHoje', total);
}

// ===== PAYLOAD DA FICHA =====
function payload() {
  const q = qual();
  return {
    user_email: usuarioEmail,
    captador_nome: usuarioNome,
    equipe: V('equipe'),
    ponto_captacao: V('ponto'),
    convidado_1: V('nome1'),
    convidado_2: V('nome2'),
    idade_1: Number(V('idade1')) || 0,
    idade_2: Number(V('idade2')) || 0,
    profissao_1: V('profissao1'),
    profissao_2: V('profissao2'),
    estado_origem: V('estado'),
    cidade_origem: V('cidade'),
    estado_civil: V('relacionamento'),
    tempo_juntos: V('tempo'),
    modelo_carro: V('nomeCarro'),
    ano_veiculo: V('anoCarro'),
    cartao_credito: V('cartao'),
    casa_propria: V('casa'),
    multipropriedade: V('multi'),
    renda_casal: V('renda'),
    brinde: V('brinde'),
    contato: V('contato'),
    observacoes: V('obs'),
    qualificacao_automatica: q.status,
    motivo_qualificacao: q.motivo,
    levou_sala: 'Não',
    created_at: new Date().toISOString()
  };
}

// ===== SALVAR PESQUISA =====
export async function salvarPesquisa() {
  const p = payload();
  if (!p.convidado_1) {
    H('formMsg', '<span class="erro">Informe o Nome 1.</span>');
    return;
  }
  try {
    if (db) {
      const r = await db.from('pesquisas').insert(p).select('*').single();
      ultimaFicha = r.data || p;
      H('formMsg', '<span class="ok">Ficha salva no Supabase.</span>');
    } else {
      ultimaFicha = p;
      const a = JSON.parse(localStorage.getItem('pesquisasLocal') || '[]');
      a.push(p);
      localStorage.setItem('pesquisasLocal', JSON.stringify(a));
      H('formMsg', '<span class="warn">Ficha salva localmente.</span>');
    }
  } catch (e) {
    ultimaFicha = p;
    const a = JSON.parse(localStorage.getItem('pesquisasLocal') || '[]');
    a.push(p);
    localStorage.setItem('pesquisasLocal', JSON.stringify(a));
    H('formMsg', '<span class="warn">Ficha salva localmente.</span>');
  }
  renderFicha(ultimaFicha);
  // Atualiza relatório
  const { carregarRelatorio } = await import('./relatorio.js');
  carregarRelatorio();
}

// ===== CONFIRMAR SALA =====
export async function confirmarSala21() {
  if (!ultimaFicha) {
    H('formMsg', '<span class="warn">Salve a ficha primeiro.</span>');
    return;
  }
  ultimaFicha.levou_sala = 'Sim';
  ultimaFicha.sala_status = 'Sim';
  const locais = JSON.parse(localStorage.getItem('pesquisasLocal') || '[]');
  const idx = locais.findIndex(x =>
    (ultimaFicha.id && String(x.id) === String(ultimaFicha.id)) ||
    (String(x.created_at) === String(ultimaFicha.created_at) && String(x.user_email) === String(ultimaFicha.user_email))
  );
  if (idx >= 0) {
    locais[idx] = { ...locais[idx], levou_sala: 'Sim', sala_status: 'Sim' };
  } else {
    locais.push({ ...ultimaFicha });
  }
  localStorage.setItem('pesquisasLocal', JSON.stringify(locais));
  try {
    if (db && ultimaFicha.id) {
      await db.from('pesquisas').update({ levou_sala: 'Sim', sala_status: 'Sim' }).eq('id', ultimaFicha.id);
    }
  } catch (e) {
    console.error('Erro ao sincronizar sala:', e);
  }
  H('formMsg', '<span class="ok">Casal confirmado em sala.</span>');
  renderFicha(ultimaFicha);
  const { carregarRelatorio } = await import('./relatorio.js');
  carregarRelatorio();
}

// ===== RENDERIZAR FICHA =====
function renderFicha(p) {
  const fichaBox = E('fichaBox');
  if (fichaBox) fichaBox.classList.remove('hidden');
  const carroTxt = `${p.modelo_carro || '-'} ${p.ano_veiculo || ''}`.trim();
  H('fichaConteudo', `
    <div style="background: linear-gradient(145deg, #090909, #180000); border: 1px solid #5a1717; border-radius: 18px; padding: 18px;">
      <h3 style="margin:0 0 12px; color:#ff8585;">Ficha Completa do Casal</h3>
      <div style="background: #101010; border: 1px solid #292929; border-radius: 12px; padding: 10px; margin: 6px 0;">
        <small style="color: #ff7777; text-transform: uppercase; font-weight: 900; font-size: 10px; display: block; margin-bottom: 4px;">Resultado</small>
        ${p.qualificacao_automatica || '-'} • ${p.motivo_qualificacao || 'Perfil dentro da regra'}
      </div>
      <div style="background: #101010; border: 1px solid #292929; border-radius: 12px; padding: 10px; margin: 6px 0;">
        <small style="color: #ff7777; text-transform: uppercase; font-weight: 900; font-size: 10px; display: block; margin-bottom: 4px;">Nome 1</small>
        ${p.convidado_1 || '-'}
      </div>
      <div style="background: #101010; border: 1px solid #292929; border-radius: 12px; padding: 10px; margin: 6px 0;">
        <small style="color: #ff7777; text-transform: uppercase; font-weight: 900; font-size: 10px; display: block; margin-bottom: 4px;">Nome 2</small>
        ${p.convidado_2 || '-'}
      </div>
      <div style="background: #101010; border: 1px solid #292929; border-radius: 12px; padding: 10px; margin: 6px 0;">
        <small style="color: #ff7777; text-transform: uppercase; font-weight: 900; font-size: 10px; display: block; margin-bottom: 4px;">Renda</small>
        ${p.renda_casal || '-'}
      </div>
      <div style="background: #101010; border: 1px solid #292929; border-radius: 12px; padding: 10px; margin: 6px 0;">
        <small style="color: #ff7777; text-transform: uppercase; font-weight: 900; font-size: 10px; display: block; margin-bottom: 4px;">Veículo</small>
        ${carroTxt || '-'}
      </div>
      <div style="background: #101010; border: 1px solid #292929; border-radius: 12px; padding: 10px; margin: 6px 0;">
        <small style="color: #ff7777; text-transform: uppercase; font-weight: 900; font-size: 10px; display: block; margin-bottom: 4px;">Contato</small>
        ${p.contato || '-'}
      </div>
      <div style="background: #101010; border: 1px solid #292929; border-radius: 12px; padding: 10px; margin: 6px 0;">
        <small style="color: #ff7777; text-transform: uppercase; font-weight: 900; font-size: 10px; display: block; margin-bottom: 4px;">Sala</small>
        ${p.levou_sala || 'Pendente'}
      </div>
    </div>
  `);
}

// ===== COMPARTILHAR FICHA =====
export async function compartilharFicha() {
  try {
    const node = E('fichaConteudo');
    if (!node) return;
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#090909' });
    const link = document.createElement('a');
    link.href = canvas.toDataURL();
    link.download = 'ficha-captapro.png';
    link.click();
  } catch (e) {
    alert('Erro ao gerar imagem: ' + e.message);
  }
}

// ===== NOVA PESQUISA =====
export function novaPesquisa() {
  ['nome1', 'nome2', 'idade1', 'idade2', 'profissao1', 'profissao2', 'estado', 'cidade', 'relacionamento', 'tempo', 'nomeCarro', 'anoCarro', 'cartao', 'casa', 'multi', 'renda', 'brinde', 'contato', 'obs']
    .forEach(id => {
      const el = E(id);
      if (el) el.value = '';
    });
  H('resultado', '');
  H('formMsg', '');
  const fichaBox = E('fichaBox');
  if (fichaBox) fichaBox.classList.add('hidden');
  ultimaFicha = null;
  const nome1 = E('nome1');
  if (nome1) nome1.focus();
}