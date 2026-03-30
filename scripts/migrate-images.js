#!/usr/bin/env node
/**
 * Image Migration Script
 * Downloads images from RPP and prepares them for Firebase Storage upload
 * Run: node scripts/migrate-images.js
 * 
 * This script will:
 * 1. Download all images from RPP
 * 2. Save them locally in temp-images/
 * 3. Upload them to Firebase Storage using firebase CLI
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUCKET_NAME = 'exitpollsimulator.firebasestorage.app';
const STORAGE_BASE_URL = `https://storage.googleapis.com/${BUCKET_NAME}`;

// Party data
const PARTIES = [
  { number: 1, name: 'Alianza Venceremos', abbr: 'AV', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Alianza_Venceremos/logo_alianza_venceremos.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Alianza_Venceremos/Ronald_Atencio.webp' },
  { number: 2, name: 'Partido Patriótico del Perú', abbr: 'PPP', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_Patriotico_del_Peru/logo_ppp.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_Patriotico_del_Peru/Hebert_Caller.webp' },
  { number: 3, name: 'Partido Cívico Obras', abbr: 'PCO', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_Civico_Obras/logo_partido_civico_obras.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_Civico_Obras/Ricardo_Belmont.webp' },
  { number: 4, name: 'Partido Demócrata Verde', abbr: 'PDV', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_Democrata_Verde/logo_partido_democrata_verde.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_Democrata_Verde/Alex_Gonzales.webp' },
  { number: 5, name: 'Partido del Buen Gobierno', abbr: 'PBG', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_del_Buen_Gobierno/logo_partido_del_buen_gobierno.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_del_Buen_Gobierno/Jorge_Nieto.webp' },
  { number: 6, name: 'Perú Acción', abbr: 'PA', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Peru_Accion/logo_peru_accion.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Peru_Accion/Francisco_Diez_Canseco.webp' },
  { number: 7, name: 'PRIN', abbr: 'PRIN', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/PRIN/logo_prin.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/PRIN/Walter_Chirinos.webp' },
  { number: 8, name: 'Progresemos', abbr: 'PROG', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Progresemos/logo_progresemos.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Progresemos/Paul_Jaimes.webp' },
  { number: 9, name: 'Sí Creo', abbr: 'SC', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Si_Creo/logo_si_creo.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Si_Creo/Carlos_Espa.webp' },
  { number: 10, name: 'País para Todos', abbr: 'PPT', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Pais_para_Todos/logo_pais_para_todos.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Pais_para_Todos/Carlos_Alvarez.webp' },
  { number: 11, name: 'Frente de la Esperanza', abbr: 'FE', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Frente_de_la_Esperanza/logo_Frente_de_la_Esperanza.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Frente_de_la_Esperanza/Fernando_Olivera.webp' },
  { number: 12, name: 'Perú Libre', abbr: 'PL', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Peru_Libre/logo_peru_libre.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Peru_Libre/Vladimir_Cerron.webp' },
  { number: 13, name: 'Primero la Gente', abbr: 'PG', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Primero_la_Gente/logo_primero_la_gente.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Primero_la_Gente/Marisol_Perez_Tello.webp' },
  { number: 14, name: 'Juntos por el Perú', abbr: 'JP', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Juntos_por_el_Peru/logo_juntos_por_el_peru.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Juntos_por_el_Peru/Roberto_Sanchez.webp' },
  { number: 15, name: 'Podemos Perú', abbr: 'PP', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Podemos_Peru/logo_podemos_peru.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Podemos_Peru/Jose_Luna_Galvez.webp' },
  { number: 16, name: 'Partido Democrático Federal', abbr: 'PDF', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_Democratico_Federal/logo_partido_democratico_federal.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_Democratico_Federal/Armando_Masse.webp' },
  { number: 17, name: 'Fe en el Perú', abbr: 'FEP', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Fe_en_el_Peru/logo_Fe_en_el_Peru.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Fe_en_el_Peru/Alvaro_Paz_de_la_Barra.webp' },
  { number: 18, name: 'Integridad Democrática', abbr: 'ID', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Integridad_Democratica/logo_integridad_democratica.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Integridad_Democratica/Wolfgang_Grozo.webp' },
  { number: 19, name: 'Fuerza Popular', abbr: 'FP', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Fuerza_Popular/logo_fuerza_popular.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Fuerza_Popular/Keiko_Fujimori.webp' },
  { number: 20, name: 'Alianza para el Progreso', abbr: 'APP', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Alianza_para_el_Progreso/logo_alianza_para_el_progreso.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Alianza_para_el_Progreso/Cesar_Acuna.webp' },
  { number: 21, name: 'Cooperación Popular', abbr: 'CP', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Cooperacion_Popular/logo_cooperacion_popular.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Cooperacion_Popular/Yonhy_Lescano.webp' },
  { number: 22, name: 'Ahora Nación', abbr: 'AN', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Ahora_Nacion/logo_ahora_nacion.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Ahora_Nacion/Alfonso_Lopez_Chau.webp' },
  { number: 23, name: 'Libertad Popular', abbr: 'LP', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Libertad_Popular/logo_libertad_popular.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Libertad_Popular/Rafael_Belaunde.webp' },
  { number: 24, name: 'Un Camino Diferente', abbr: 'UCD', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Un_Camino_Diferente/logo_un_camino_diferente.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Un_Camino_Diferente/Rosario_Fernandez_Bazan.webp' },
  { number: 25, name: 'Avanza País', abbr: 'AVP', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Avanza_Pais/logo_avanza_pais.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Avanza_Pais/Jose_Williams.webp' },
  { number: 26, name: 'Perú Moderno', abbr: 'PMOD', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Peru_Moderno/logo_peru_moderno.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Peru_Moderno/Carlos_Jaico.webp' },
  { number: 27, name: 'Perú Primero', abbr: 'PPRI', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Peru_Primero/logo_peru_primero.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Peru_Primero/Martin_Vizcarra.webp' },
  { number: 28, name: 'Salvemos al Perú', abbr: 'SPP', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Salvemos_al_Peru/logo_salvemos_al_peru.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Salvemos_al_Peru/Antonio_Ortiz.webp' },
  { number: 29, name: 'Somos Perú', abbr: 'SP', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Somos_Peru/logo_somos_peru.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Somos_Peru/George_Forsyth.webp' },
  { number: 30, name: 'Partido Aprista Peruano', abbr: 'APRA', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_Aprista_Peruano/logo_partido_aprista_peruano.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_Aprista_Peruano/Enrique_Valderrama.webp' },
  { number: 31, name: 'Renovación Popular', abbr: 'RP', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Renovacion_Popular/logo_renovacion_popular.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Renovacion_Popular/Rafael_Lopez_Aliaga.webp' },
  { number: 32, name: 'Partido Demócrata Unido Perú', abbr: 'PDUP', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_Democrata_Unido_Peru/logo_partido_democrata_unido_peru.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_Democrata_Unido_Peru/Charlie_Carrasco.webp' },
  { number: 33, name: 'Alianza Fuerza y Libertad', abbr: 'AFYL', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Alianza_Fuerza_y_Libertad/logo_fuerza_y_libertad.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Alianza_Fuerza_y_Libertad/Fiorella_Molinelli.webp' },
  { number: 34, name: 'Partido de los Trabajadores y Emprendedores', abbr: 'PTYE', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_de_los_Trabajadores_y_Emprendedores/logo_partido_de_los_trabajadores_y_emprendedores.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_de_los_Trabajadores_y_Emprendedores/Napoleon_Becerra.webp' },
  { number: 35, name: 'Alianza Unidad Nacional', abbr: 'AUN', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Alianza_Unidad_Nacional/logo_alianza_unidad_nacional.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Alianza_Unidad_Nacional/Roberto_Chiabra.webp' },
  { number: 36, name: 'Partido Morado', abbr: 'PM', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_Morado/logo_partido_morado.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_Morado/Mesias_Guevara.webp' },
];

const FREPAP_LOGO = {
  number: 4,
  name: 'Frepap',
  abbr: 'FREPAP',
  symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/frepap/frepap.webp',
  candidatePhotoUrl: ''
};

const TEMP_DIR = path.join(__dirname, '..', 'temp-images');
const PUBLIC_DIR = path.join(__dirname, '..', 'static', 'images', 'parties');

// Ensure directories exist
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}
if (!fs.existsSync(path.join(PUBLIC_DIR, 'logos'))) {
  fs.mkdirSync(path.join(PUBLIC_DIR, 'logos'), { recursive: true });
}
if (!fs.existsSync(path.join(PUBLIC_DIR, 'candidates'))) {
  fs.mkdirSync(path.join(PUBLIC_DIR, 'candidates'), { recursive: true });
}

function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { timeout: 30000 }, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${url} (Status: ${response.statusCode})`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(dest);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function generateFilename(party, type) {
  const safeName = party.name.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 30);
  return `${party.number}-${safeName}-${type}.webp`;
}

async function migrateImages() {
  console.log('🚀 Starting image migration...\n');
  console.log('Step 1: Downloading images from RPP...\n');
  
  let downloadCount = 0;
  let failCount = 0;
  const downloadedFiles = [];
  
  // Download all images
  for (const party of [...PARTIES, FREPAP_LOGO]) {
    console.log(`📦 Processing ${party.name}...`);
    
    // Download logo
    if (party.symbolUrl) {
      try {
        const logoFile = generateFilename(party, 'logo');
        const localPath = path.join(TEMP_DIR, logoFile);
        const publicPath = path.join(PUBLIC_DIR, 'logos', logoFile);
        
        await downloadImage(party.symbolUrl, localPath);
        fs.copyFileSync(localPath, publicPath);
        downloadedFiles.push({ local: localPath, public: publicPath, type: 'logo', party: party.number });
        console.log(`  ✓ Downloaded and copied logo`);
        downloadCount++;
      } catch (error) {
        console.error(`  ✗ Failed to download logo:`, error.message);
        failCount++;
      }
    }
    
    // Download candidate photo
    if (party.candidatePhotoUrl) {
      try {
        const photoFile = generateFilename(party, 'candidate');
        const localPath = path.join(TEMP_DIR, photoFile);
        const publicPath = path.join(PUBLIC_DIR, 'candidates', photoFile);
        
        await downloadImage(party.candidatePhotoUrl, localPath);
        fs.copyFileSync(localPath, publicPath);
        downloadedFiles.push({ local: localPath, public: publicPath, type: 'candidate', party: party.number });
        console.log(`  ✓ Downloaded and copied candidate photo`);
        downloadCount++;
      } catch (error) {
        console.error(`  ✗ Failed to download photo:`, error.message);
        failCount++;
      }
    }
    
    console.log('');
  }
  
  console.log(`✅ Download complete!`);
  console.log(`   Success: ${downloadCount} images`);
  console.log(`   Failed: ${failCount} images`);
  console.log(`\n📝 Images saved to:`);
  console.log(`   - temp-images/ (temporary)`);
  console.log(`   - static/images/parties/ (for deployment)`);
  
  console.log('\n─────────────────────────────────────────');
  console.log('NEXT STEPS:');
  console.log('─────────────────────────────────────────');
  console.log('\nOption A: Deploy with Firebase Hosting (recommended)');
  console.log('   The images are now in static/images/parties/');
  console.log('   They will be deployed automatically with:');
  console.log('   npm run build && firebase deploy');
  console.log('\nOption B: Upload to Firebase Storage manually');
  console.log('   If you prefer Storage over static hosting, run:');
  console.log('   ./scripts/upload-to-storage.sh');
  console.log('   (Requires gsutil to be installed)');
  
  // Clean up temp directory
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  console.log('\n🧹 Cleaned up temp-images/ directory');
}

migrateImages().catch(console.error);
