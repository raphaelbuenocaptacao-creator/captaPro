// ===== CaptaPro v3.0 - Mapa Module =====
// Leaflet, GPS, Mapa ao vivo do CEO

import { db, role } from './supabase.js';

let mapInstance = null;
let markersLayer = null;
let watchId = null;

// ===== PONTOS FIXOS DE CAPTAÇÃO =====
const PONTOS_FIXOS = [
  { nome: 'Porta dentro do Park', lat: -22.739, lng: -45.591 },
  { nome: 'Park Dream House', lat: -22.738, lng: -45.590 },
  { nome: 'Fábrica Spinassi', lat: -22.737, lng: -45.589 },
  { nome: 'Corredor', lat: -22.736, lng: -45.588 },
  { nome: 'Baden Baden', lat: -22.735, lng: -45.587 },
  { nome: 'Djalma', lat: -22.734, lng: -45.586 },
  { nome: 'Igreja', lat: -22.733, lng: -45.585 },
  { nome: 'Renner', lat: -22.732, lng: -45.584 },
  { nome: 'Guarda-chuvas', lat: -22.731, lng: -45.583 },
  { nome: 'Posto Shell', lat: -22.730, lng: -45.582 }
];

// ===== INICIALIZAR MAPA =====
export function initMapa() {
  const container = document.getElementById('mapaRealCEO37');
  if (!container) return;

  // Se já existe, apenas redimensiona
  if (mapInstance) {
    mapInstance.invalidateSize();
    return;
  }

  // Verifica se Leaflet está carregado
  if (typeof L === 'undefined') {
    console.warn('Leaflet não carregado. Mapa indisponível.');
    container.innerHTML = '<p class="warn" style="padding:20px;text-align:center;">Mapa indisponível — Leaflet não carregou.</p>';
    return;
  }

  // Centro aproximado de Campos do Jordão
  mapInstance = L.map('mapaRealCEO37', {
    center: [-22.739, -45.591],
    zoom: 15,
    zoomControl: true
  });

  // Tile layer (OpenStreetMap)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(mapInstance);

  markersLayer = L.layerGroup().addTo(mapInstance);

  // Adiciona pontos fixos
  adicionarPontosFixos();

  // Se for CEO, inicia rastreamento
  if (role === 'ceo') {
    iniciarGPS();
  }
}

// ===== ADICIONAR PONTOS FIXOS =====
function adicionarPontosFixos() {
  if (!mapInstance || !markersLayer) return;

  PONTOS_FIXOS.forEach(ponto => {
    const marker = L.circleMarker([ponto.lat, ponto.lng], {
      radius: 8,
      color: '#0a6cff',
      fillColor: '#0a6cff',
      fillOpacity: 0.8
    });
    marker.bindPopup(`<b>${ponto.nome}</b><br><small>Ponto fixo de captação</small>`);
    markersLayer.addLayer(marker);
  });
}

// ===== INICIAR GPS =====
function iniciarGPS() {
  if (!navigator.geolocation) {
    console.warn('Geolocalização não suportada.');
    return;
  }

  // Atualiza posição a cada 30 segundos
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      atualizarMarcadorProfissional(latitude, longitude);
    },
    (err) => {
      console.warn('Erro GPS:', err.message);
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
  );
}

// ===== ATUALIZAR MARCADOR DO PROFISSIONAL =====
function atualizarMarcadorProfissional(lat, lng) {
  if (!mapInstance || !markersLayer) return;

  // Remove marcador anterior do profissional
  markersLayer.eachLayer(layer => {
    if (layer.options && layer.options.profissional) {
      markersLayer.removeLayer(layer);
    }
  });

  // Adiciona novo marcador
  const marker = L.circleMarker([lat, lng], {
    radius: 10,
    color: '#00e676',
    fillColor: '#00e676',
    fillOpacity: 0.9,
    profissional: true
  });
  marker.bindPopup(`<b>${usuarioNome || 'Profissional'}</b><br><small>GPS ativo</small>`);
  markersLayer.addLayer(marker);

  // Centraliza no profissional
  mapInstance.setView([lat, lng], mapInstance.getZoom());
}

// ===== LIMPAR GPS AO SAIR =====
export function pararGPS() {
  if (watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

// ===== ATUALIZAR MAPA (chamado periodicamente) =====
export function atualizarMapa() {
  if (mapInstance) {
    mapInstance.invalidateSize();
  }
}