import type { BallotColumn, BallotRow, VoteZone, Candidate, ZoneId } from '$lib/types';

// ─── Vote zones by column type ────────────────────────────────────────────────

const PRESIDENTIAL_ZONES: VoteZone[] = [
  { id: 'symbol', type: 'symbol', label: 'Símbolo del partido', description: 'Marca el símbolo o logo del partido' },
  { id: 'photo', type: 'photo', label: 'Fotografía del candidato/a', description: 'Marca la foto del candidato/a presidencial' },
];

const LEGISLATIVE_ZONES: VoteZone[] = [
  { id: 'symbol', type: 'symbol', label: 'Símbolo del partido', description: 'Marca el símbolo o logo del partido' },
  { id: 'number', type: 'number', label: 'Número del candidato', description: 'Escribe el número del candidato de tu preferencia (diferente al número del partido)' },
];

// ─── Parties (Perú 2026 - placeholder) ─────────────────────────────────────────

interface Party { 
  number: number; 
  name: string; 
  abbr: string; 
  color: string;
  symbolUrl: string;
  candidatePhotoUrl: string;
}

interface Party { 
  number: number; 
  name: string; 
  abbr: string; 
  color: string;
  symbolUrl: string;
  candidatePhotoUrl: string;
}

// 36 parties participating in presidential election
const PARTIES: Party[] = [
  { number: 1,  name: 'Alianza Venceremos',                     abbr: 'AV',   color: '#D32F2F',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Alianza_Venceremos/logo_alianza_venceremos.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Alianza_Venceremos/Ronald_Atencio.webp' },
  { number: 2,  name: 'Partido Patriótico del Perú',            abbr: 'PPP',  color: '#1976D2',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_Patriotico_del_Peru/logo_ppp.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_Patriotico_del_Peru/Hebert_Caller.webp' },
  { number: 3,  name: 'Partido Cívico Obras',                   abbr: 'PCO',  color: '#388E3C',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_Civico_Obras/logo_partido_civico_obras.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_Civico_Obras/Ricardo_Belmont.webp' },
  { number: 4,  name: 'Partido Demócrata Verde',                abbr: 'PDV',  color: '#689F38',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_Democrata_Verde/logo_partido_democrata_verde.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_Democrata_Verde/Alex_Gonzales.webp' },
  { number: 5,  name: 'Partido del Buen Gobierno',              abbr: 'PBG',  color: '#FBC02D',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_del_Buen_Gobierno/logo_partido_del_buen_gobierno.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_del_Buen_Gobierno/Jorge_Nieto.webp' },
  { number: 6,  name: 'Perú Acción',                            abbr: 'PA',   color: '#E64A19',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Peru_Accion/logo_peru_accion.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Peru_Accion/Francisco_Diez_Canseco.webp' },
  { number: 7,  name: 'PRIN',                                   abbr: 'PRIN', color: '#5E35B1',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/PRIN/logo_prin.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/PRIN/Walter_Chirinos.webp' },
  { number: 8,  name: 'Progresemos',                            abbr: 'PROG', color: '#00796B',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Progresemos/logo_progresemos.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Progresemos/Paul_Jaimes.webp' },
  { number: 9,  name: 'Sí Creo',                                abbr: 'SC',   color: '#F57C00',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Si_Creo/logo_si_creo.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Si_Creo/Carlos_Espa.webp' },
  { number: 10, name: 'País para Todos',                        abbr: 'PPT',  color: '#C2185B',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Pais_para_Todos/logo_pais_para_todos.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Pais_para_Todos/Carlos_Alvarez.webp' },
  { number: 11, name: 'Frente de la Esperanza',                 abbr: 'FE',   color: '#303F9F',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Frente_de_la_Esperanza/logo_Frente_de_la_Esperanza.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Frente_de_la_Esperanza/Fernando_Olivera.webp' },
  { number: 12, name: 'Perú Libre',                             abbr: 'PL',   color: '#D32F2F',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Peru_Libre/logo_peru_libre.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Peru_Libre/Vladimir_Cerron.webp' },
  { number: 13, name: 'Primero la Gente',                       abbr: 'PG',   color: '#0288D1',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Primero_la_Gente/logo_primero_la_gente.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Primero_la_Gente/Marisol_Perez_Tello.webp' },
  { number: 14, name: 'Juntos por el Perú',                     abbr: 'JP',   color: '#7B1FA2',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Juntos_por_el_Peru/logo_juntos_por_el_peru.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Juntos_por_el_Peru/Roberto_Sanchez.webp' },
  { number: 15, name: 'Podemos Perú',                           abbr: 'PP',   color: '#303F9F',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Podemos_Peru/logo_podemos_peru.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Podemos_Peru/Jose_Luna_Galvez.webp' },
  { number: 16, name: 'Partido Democrático Federal',            abbr: 'PDF',  color: '#455A64',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_Democratico_Federal/logo_partido_democratico_federal.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_Democratico_Federal/Armando_Masse.webp' },
  { number: 17, name: 'Fe en el Perú',                          abbr: 'FEP',  color: '#795548',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Fe_en_el_Peru/logo_Fe_en_el_Peru.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Fe_en_el_Peru/Alvaro_Paz_de_la_Barra.webp' },
  { number: 18, name: 'Integridad Democrática',                 abbr: 'ID',   color: '#E91E63',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Integridad_Democratica/logo_integridad_democratica.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Integridad_Democratica/Wolfgang_Grozo.webp' },
  { number: 19, name: 'Fuerza Popular',                         abbr: 'FP',   color: '#FF6F00',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Fuerza_Popular/logo_fuerza_popular.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Fuerza_Popular/Keiko_Fujimori.webp' },
  { number: 20, name: 'Alianza para el Progreso',               abbr: 'APP',  color: '#F57F17',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Alianza_para_el_Progreso/logo_alianza_para_el_progreso.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Alianza_para_el_Progreso/Cesar_Acuna.webp' },
  { number: 21, name: 'Cooperación Popular',                    abbr: 'CP',   color: '#558B2F',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Cooperacion_Popular/logo_cooperacion_popular.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Cooperacion_Popular/Yonhy_Lescano.webp' },
  { number: 22, name: 'Ahora Nación',                           abbr: 'AN',   color: '#1565C0',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Ahora_Nacion/logo_ahora_nacion.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Ahora_Nacion/Alfonso_Lopez_Chau.webp' },
  { number: 23, name: 'Libertad Popular',                       abbr: 'LP',   color: '#00695C',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Libertad_Popular/logo_libertad_popular.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Libertad_Popular/Rafael_Belaunde.webp' },
  { number: 24, name: 'Un Camino Diferente',                    abbr: 'UCD',  color: '#AD1457',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Un_Camino_Diferente/logo_un_camino_diferente.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Un_Camino_Diferente/Rosario_Fernandez_Bazan.webp' },
  { number: 25, name: 'Avanza País',                            abbr: 'AVP',  color: '#0277BD',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Avanza_Pais/logo_avanza_pais.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Avanza_Pais/Jose_Williams.webp' },
  { number: 26, name: 'Perú Moderno',                           abbr: 'PMOD', color: '#6A1B9A',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Peru_Moderno/logo_peru_moderno.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Peru_Moderno/Carlos_Jaico.webp' },
  { number: 27, name: 'Perú Primero',                           abbr: 'PPRI', color: '#283593',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Peru_Primero/logo_peru_primero.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Peru_Primero/Martin_Vizcarra.webp' },
  { number: 28, name: 'Salvemos al Perú',                       abbr: 'SPP',  color: '#C62828',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Salvemos_al_Peru/logo_salvemos_al_peru.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Salvemos_al_Peru/Antonio_Ortiz.webp' },
  { number: 29, name: 'Somos Perú',                             abbr: 'SP',   color: '#00695C',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Somos_Peru/logo_somos_peru.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Somos_Peru/George_Forsyth.webp' },
  { number: 30, name: 'Partido Aprista Peruano',                abbr: 'APRA', color: '#B71C1C',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_Aprista_Peruano/logo_partido_aprista_peruano.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_Aprista_Peruano/Enrique_Valderrama.webp' },
  { number: 31, name: 'Renovación Popular',                     abbr: 'RP',   color: '#2E7D32',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Renovacion_Popular/logo_renovacion_popular.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Renovacion_Popular/Rafael_Lopez_Aliaga.webp' },
  { number: 32, name: 'Partido Demócrata Unido Perú',           abbr: 'PDUP', color: '#00838F',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_Democrata_Unido_Peru/logo_partido_democrata_unido_peru.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_Democrata_Unido_Peru/Charlie_Carrasco.webp' },
  { number: 33, name: 'Alianza Fuerza y Libertad',              abbr: 'AFYL', color: '#4527A0',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Alianza_Fuerza_y_Libertad/logo_fuerza_y_libertad.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Alianza_Fuerza_y_Libertad/Fiorella_Molinelli.webp' },
  { number: 34, name: 'Partido de los Trabajadores y Emprendedores', abbr: 'PTYE', color: '#BF360C',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_de_los_Trabajadores_y_Emprendedores/logo_partido_de_los_trabajadores_y_emprendedores.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_de_los_Trabajadores_y_Emprendedores/Napoleon_Becerra.webp' },
  { number: 35, name: 'Alianza Unidad Nacional',                abbr: 'AUN',  color: '#4A148C',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Alianza_Unidad_Nacional/logo_alianza_unidad_nacional.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Alianza_Unidad_Nacional/Roberto_Chiabra.webp' },
  { number: 36, name: 'Partido Morado',                         abbr: 'PM',   color: '#6A1B9A',   symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_Morado/logo_partido_morado.webp', candidatePhotoUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/Partido_Morado/Mesias_Guevara.webp' },
];

// Legislative elections include Frepap at position #4 (after Partido Cívico Obras)
const LEGISLATIVE_PARTIES: Party[] = [
  PARTIES[0],  // 1. Alianza Venceremos
  PARTIES[1],  // 2. Partido Patriótico del Perú
  PARTIES[2],  // 3. Partido Cívico Obras
  { number: 4, name: 'Frepap', abbr: 'FREPAP', color: '#3E2723', symbolUrl: 'https://s2.rpp-noticias.io/static/especial/simulador-voto/dist/images/partidos/frepap/frepap.webp', candidatePhotoUrl: '' },  // 4. Frepap (legislative only, no presidential candidate)
  PARTIES[3],  // 5. Partido Demócrata Verde
  PARTIES[4],  // 6. Partido del Buen Gobierno
  PARTIES[5],  // 7. Perú Acción
  PARTIES[6],  // 8. PRIN
  PARTIES[7],  // 9. Progresemos
  PARTIES[8],  // 10. Sí Creo
  PARTIES[9],  // 11. País para Todos
  PARTIES[10], // 12. Frente de la Esperanza
  PARTIES[11], // 13. Perú Libre
  PARTIES[12], // 14. Primero la Gente
  PARTIES[13], // 15. Juntos por el Perú
  PARTIES[14], // 16. Podemos Perú
  PARTIES[15], // 17. Partido Democrático Federal
  PARTIES[16], // 18. Fe en el Perú
  PARTIES[17], // 19. Integridad Democrática
  PARTIES[18], // 20. Fuerza Popular
  PARTIES[19], // 21. Alianza para el Progreso
  PARTIES[20], // 22. Cooperación Popular
  PARTIES[21], // 23. Ahora Nación
  PARTIES[22], // 24. Libertad Popular
  PARTIES[23], // 25. Un Camino Diferente
  PARTIES[24], // 26. Avanza País
  PARTIES[25], // 27. Perú Moderno
  PARTIES[26], // 28. Perú Primero
  PARTIES[27], // 29. Salvemos al Perú
  PARTIES[28], // 30. Somos Perú
  PARTIES[29], // 31. Partido Aprista Peruano
  PARTIES[30], // 32. Renovación Popular
  PARTIES[31], // 33. Partido Demócrata Unido Perú
  PARTIES[32], // 34. Alianza Fuerza y Libertad
  PARTIES[33], // 35. Partido de los Trabajadores y Emprendedores
  PARTIES[34], // 36. Alianza Unidad Nacional
  PARTIES[35], // 37. Partido Morado
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#5C6BC0', '#26A69A', '#8D6E63', '#EC407A', '#78909C',
  '#EF5350', '#7E57C2', '#66BB6A', '#42A5F5', '#FFA726',
  '#AB47BC', '#26C6DA', '#D4E157', '#FF7043', '#8BC34A',
];

function initials(name: string): string {
  return name.split(' ').filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('');
}

function avatarColor(seed: number): string {
  return AVATAR_COLORS[seed % AVATAR_COLORS.length];
}

function zoneFor(index: number, total: number): ZoneId {
  const third = Math.ceil(total / 3);
  if (index < third) return 'top';
  if (index < third * 2) return 'middle';
  return 'bottom';
}

// ─── Presidential candidates ───────────────────────────────────────────────────

const PRES_NAMES: Array<[string, string, string]> = [
  ['Ronald Atencio',        'Vicepresidente 1A',    'Vicepresidente 1B'],
  ['Hebert Caller',         'Vicepresidente 2A',    'Vicepresidente 2B'],
  ['Ricardo Belmont',       'Vicepresidente 3A',    'Vicepresidente 3B'],
  ['Alex Gonzales',         'Vicepresidente 4A',    'Vicepresidente 4B'],
  ['Jorge Nieto',           'Vicepresidente 5A',    'Vicepresidente 5B'],
  ['Francisco Diez Canseco','Vicepresidente 6A',    'Vicepresidente 6B'],
  ['Walter Chirinos',       'Vicepresidente 7A',    'Vicepresidente 7B'],
  ['Paul Jaimes',           'Vicepresidente 8A',    'Vicepresidente 8B'],
  ['Carlos Espa',           'Vicepresidente 9A',    'Vicepresidente 9B'],
  ['Carlos Alvarez',        'Vicepresidente 10A',   'Vicepresidente 10B'],
  ['Fernando Olivera',      'Vicepresidente 11A',   'Vicepresidente 11B'],
  ['Vladimir Cerron',       'Vicepresidente 12A',   'Vicepresidente 12B'],
  ['Marisol Perez Tello',   'Vicepresidente 13A',   'Vicepresidente 13B'],
  ['Roberto Sanchez',       'Vicepresidente 14A',   'Vicepresidente 14B'],
  ['Jose Luna Galvez',      'Vicepresidente 15A',   'Vicepresidente 15B'],
  ['Armando Masse',         'Vicepresidente 16A',   'Vicepresidente 16B'],
  ['Alvaro Paz de la Barra','Vicepresidente 17A',   'Vicepresidente 17B'],
  ['Wolfgang Grozo',        'Vicepresidente 18A',   'Vicepresidente 18B'],
  ['Keiko Fujimori',        'Vicepresidente 19A',   'Vicepresidente 19B'],
  ['Cesar Acuna',           'Vicepresidente 20A',   'Vicepresidente 20B'],
  ['Yonhy Lescano',         'Vicepresidente 21A',   'Vicepresidente 21B'],
  ['Alfonso Lopez Chau',    'Vicepresidente 22A',   'Vicepresidente 22B'],
  ['Rafael Belaunde',       'Vicepresidente 23A',   'Vicepresidente 23B'],
  ['Rosario Fernandez Bazan','Vicepresidente 24A',  'Vicepresidente 24B'],
  ['Jose Williams',         'Vicepresidente 25A',   'Vicepresidente 25B'],
  ['Carlos Jaico',          'Vicepresidente 26A',   'Vicepresidente 26B'],
  ['Martin Vizcarra',       'Vicepresidente 27A',   'Vicepresidente 27B'],
  ['Antonio Ortiz',         'Vicepresidente 28A',   'Vicepresidente 28B'],
  ['George Forsyth',        'Vicepresidente 29A',   'Vicepresidente 29B'],
  ['Enrique Valderrama',    'Vicepresidente 30A',   'Vicepresidente 30B'],
  ['Rafael Lopez Aliaga',   'Vicepresidente 31A',   'Vicepresidente 31B'],
  ['Charlie Carrasco',      'Vicepresidente 32A',   'Vicepresidente 32B'],
  ['Fiorella Molinelli',    'Vicepresidente 33A',   'Vicepresidente 33B'],
  ['Napoleon Becerra',      'Vicepresidente 34A',   'Vicepresidente 34B'],
  ['Roberto Chiabra',       'Vicepresidente 35A',   'Vicepresidente 35B'],
  ['Mesias Guevara',        'Vicepresidente 36A',   'Vicepresidente 36B'],
];

function makePresidentialRow(partyIdx: number): BallotRow {
  const p = PARTIES[partyIdx];
  const [pres, v1, v2] = PRES_NAMES[partyIdx];
  const candidates: Candidate[] = [
    { id: `c0-${partyIdx}-0`, name: pres, position: 'Presidente/a', initials: initials(pres), avatarColor: avatarColor(partyIdx * 3) },
    { id: `c0-${partyIdx}-1`, name: v1,   position: '1.° Vicepresidente/a', initials: initials(v1), avatarColor: avatarColor(partyIdx * 3 + 1) },
    { id: `c0-${partyIdx}-2`, name: v2,   position: '2.° Vicepresidente/a', initials: initials(v2), avatarColor: avatarColor(partyIdx * 3 + 2) },
  ];
  return {
    id: `col0-row${partyIdx}`,
    partyNumber: p.number,
    partyName: p.name,
    partyAbbr: p.abbr,
    partyColor: p.color,
    partySymbolUrl: p.symbolUrl,
    candidates,
    voteZones: PRESIDENTIAL_ZONES,
    zone: zoneFor(partyIdx, PARTIES.length),
    isPresidential: true,
    presidentialPhoto: p.candidatePhotoUrl,
    rowIndex: partyIdx,
  };
}

// ─── Legislative rows ─────────────────────────────────────────────────────────

function makeLegislativeRow(colId: string, partyIdx: number, parties: Party[] = LEGISLATIVE_PARTIES): BallotRow {
  const p = parties[partyIdx];
  return {
    id: `${colId}-row${partyIdx}`,
    partyNumber: p.number,
    partyName: p.name,
    partyAbbr: p.abbr,
    partyColor: p.color,
    partySymbolUrl: p.symbolUrl,
    candidates: [],
    voteZones: LEGISLATIVE_ZONES,
    zone: zoneFor(partyIdx, parties.length),
    isPresidential: false,
    rowIndex: partyIdx,
  };
}

  // ─── Ballot columns (estructura real de cédula) ─────────────────────────────────

// Create presidential rows with a spacer at index 3 for Frepap alignment
function createPresidentialRows(): BallotRow[] {
  const rows: BallotRow[] = [];
  
  // First 3 parties (indices 0-2)
  for (let i = 0; i < 3; i++) {
    rows.push(makePresidentialRow(i));
  }
  
  // Spacer row for Frepap (index 3) - empty row to align with legislative columns
  rows.push({
    id: 'col0-row-frepap-spacer',
    partyNumber: 4,
    partyName: '',
    partyAbbr: '',
    partyColor: '#3E2723',
    partySymbolUrl: '',
    candidates: [],
    voteZones: [],
    zone: 'top' as ZoneId,
    isPresidential: true,
    presidentialPhoto: '',
    rowIndex: 3,
  });
  
  // Remaining parties (indices 3-35 from PARTIES, placed at indices 4-36)
  for (let i = 3; i < PARTIES.length; i++) {
    const row = makePresidentialRow(i);
    row.rowIndex = i + 1; // Shift row index to account for spacer
    rows.push(row);
  }
  
  return rows;
}

export const BALLOT_COLUMNS: BallotColumn[] = [
  {
    id: 'col0', index: 0, section: 'presidente',
    title: 'Presidente y Vicepresidentes',
    rows: createPresidentialRows(),
  },
  {
    id: 'col1', index: 1, section: 'senadores-nacional',
    title: 'Senadores a Nivel Nacional',
    subtitle: 'Lista Nacional',
    rows: LEGISLATIVE_PARTIES.map((_, i) => makeLegislativeRow('col1', i)),
  },
  {
    id: 'col2', index: 2, section: 'senadores-regional',
    title: 'Senadores a Nivel Regional',
    subtitle: 'Lima Metropolitana',
    rows: LEGISLATIVE_PARTIES.map((_, i) => makeLegislativeRow('col2', i)),
  },
  {
    id: 'col3', index: 3, section: 'diputados',
    title: 'Diputados',
    subtitle: 'Distrito Electoral Lima',
    rows: LEGISLATIVE_PARTIES.map((_, i) => makeLegislativeRow('col3', i)),
  },
  {
    id: 'col4', index: 4, section: 'parlamento-andino',
    title: 'Parlamento Andino',
    rows: LEGISLATIVE_PARTIES.map((_, i) => makeLegislativeRow('col4', i)),
  },
];
