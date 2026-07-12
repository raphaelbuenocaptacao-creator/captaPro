// ===== CaptaPro v3.0 - App Module (Entry Point) =====
// Orquestrador: importa todos os módulos, configura listeners, inicializa

import { db, usuarioEmail, usuarioNome, role, entrar, sairCaptaProFinal, loadCfg, salvarConfig, aplicarRendaDigitavel, salvarMetaIndividual20, renderMetasIndividuais20 } from './supabase.js';
import { popularIdades, registrarAbordagem, salvarPesquisa, confirmarSala21, compartilharFicha, novaPesquisa, carregarAbordagensHoje } from './pesquisa.js';
import { carregarRelatorio, mostrarIndividual } from './relatorio.js';
import { initMapa } from './mapa.js';

// ===== HELPERS GLOBAIS (expostos no window para compatibilidade) =====
window.E = (id) => document.getElementById(id);
window.V = (id) => (window.E(id)?.value || '').trim();
window.H = (id, v) => { const el = window.E(id); if (el) el.innerHTML = v; };
window.S = (id, v) => { const el = window.E(id); if (el) el.innerText = v; };

// ===== NAVEGAÇÃO POR ABAS =====
window.aba = function(id, btn) {
  ['pesquisa', 'relatorio', 'qualificacao', 'cb300'].forEach(x => {
    const el = document.getElementById(x);
    if (el) el.classList.add('hidden');
  });
  const target = document.getElementById(id);
  if (target) target.classList.remove('hidden');
  document.querySelectorAll('.tabs button').forEach(x => x.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (id === 'relatorio') {
    setTimeout(carregarRelatorio, 100);
  }
  if (id === 'cb300') {
    setTimeout(() => {
      initCb300();
    }, 100);
  }
};

// ===== CONFIGURAR EVENT LISTENERS =====
function configurarListeners() {
  // Login
  const btnEntrar = document.querySelector('#loginBox .main');
  if (btnEntrar) btnEntrar.addEventListener('click', entrar);

  // Enter no campo de email/nome também loga
  const emailEl = document.getElementById('email');
  const nomeEl = document.getElementById('nome');
  if (emailEl) emailEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') entrar(); });
  if (nomeEl) nomeEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') entrar(); });

  // Sair
  const btnSair = document.getElementById('btnSairFinal');
  if (btnSair) btnSair.addEventListener('click', sairCaptaProFinal);

  // Abas
  document.querySelectorAll('.tabs button').forEach(btn => {
    btn.addEventListener('click', function() {
      const txt = this.textContent.trim().toLowerCase();
      const abaId = txt.includes('pesquisa') ? 'pesquisa'
        : txt.includes('relatório') || txt.includes('relatorio') ? 'relatorio'
        : txt.includes('cb300') || txt.includes('game') ? 'cb300'
        : 'qualificacao';
      window.aba(abaId, this);
    });
  });

  // Pesquisa - Registrar Abordagem
  const btnAbordagem = document.getElementById('btnRegistrarAbordagem');
  if (btnAbordagem) btnAbordagem.addEventListener('click', registrarAbordagem);

  // Pesquisa - Salvar Ficha
  const btnSalvarFicha = document.getElementById('btnSalvarFicha');
  if (btnSalvarFicha) btnSalvarFicha.addEventListener('click', salvarPesquisa);

  // Pesquisa - Casal em Sala
  const btnCasalSala = document.getElementById('btnCasalSala');
  if (btnCasalSala) btnCasalSala.addEventListener('click', confirmarSala21);

  // Pesquisa - Compartilhar
  const btnCompartilhar = document.getElementById('btnCompartilhar');
  if (btnCompartilhar) btnCompartilhar.addEventListener('click', compartilharFicha);

  // Pesquisa - Nova Pesquisa
  const btnNovaPesquisa = document.getElementById('btnNovaPesquisa');
  if (btnNovaPesquisa) btnNovaPesquisa.addEventListener('click', novaPesquisa);

  // Relatório - Atualizar
  const btnAtualizar = document.getElementById('btnAtualizarRelatorio');
  if (btnAtualizar) btnAtualizar.addEventListener('click', carregarRelatorio);

  // Relatório - Filtro individual
  const profFiltro = document.getElementById('profFiltro');
  if (profFiltro) profFiltro.addEventListener('change', mostrarIndividual);

  // CEO - Salvar Meta Individual
  const btnSalvarMeta = document.getElementById('btnSalvarMeta');
  if (btnSalvarMeta) btnSalvarMeta.addEventListener('click', salvarMetaIndividual20);
  const btnAddRegra = document.getElementById('btnAddRegra');
  if (btnAddRegra) btnAddRegra.addEventListener('click', adicionarRegra);

  // Cb300 Game - Lançar Resultado
  const btnLancar = document.getElementById('btnLancarResultado');
  if (btnLancar) btnLancar.addEventListener('click', lancarResultado);
}

// ===== AUTO-LOGIN =====
function tentarAutoLogin() {
  try {
    const l = JSON.parse(localStorage.getItem('loginSimples') || 'null');
    if (l) {
      const emailEl = document.getElementById('email');
      const nomeEl = document.getElementById('nome');
      if (emailEl) emailEl.value = l.email;
      if (nomeEl) nomeEl.value = l.nome;
      setTimeout(entrar, 300);
    }
  } catch (e) { /* ignore */ }
}

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
  // Popula idades
  popularIdades();

  // Configura listeners
  configurarListeners();

  // Inicializa componentes
  setTimeout(() => {
    aplicarRendaDigitavel();
    loadCfg();
    renderMetasIndividuais20();
    carregarAbordagensHoje();
  }, 500);

  // Tenta auto-login
  tentarAutoLogin();
});

// ===== EXPOR FUNÇÕES NO WINDOW (para onclick residual no HTML) =====
window.entrar = entrar;
window.sairCaptaProFinal = sairCaptaProFinal;
window.registrarAbordagem = registrarAbordagem;
window.salvarPesquisa = salvarPesquisa;
window.confirmarSala21 = confirmarSala21;
window.compartilharFicha = compartilharFicha;
window.novaPesquisa = novaPesquisa;
window.carregarRelatorio = carregarRelatorio;
window.mostrarIndividual = mostrarIndividual;
window.salvarConfig = salvarConfig;
window.salvarMetaIndividual20 = salvarMetaIndividual20;
window.initMapa = initMapa;