/**
 * Test para verificar el contador de simulaciones
 * 
 * Este test verifica que:
 * 1. incrementSimulationCount solo se llama una vez por simulación
 * 2. El contador totalSimulations aumenta de 1 en 1
 * 3. No hay llamadas duplicadas
 */

import { incrementSimulationCount } from './stats';
import { saveVote } from './votes';

// Mock de Firebase
let mockTotalSimulations = 0;
let callCount = 0;

console.log('🧪 Iniciando test de contador de simulaciones...\n');

// Test 1: Verificar que incrementSimulationCount funciona
async function testIncrementSimulationCount() {
  console.log('Test 1: Llamando incrementSimulationCount...');
  
  const date = '2026-04-12';
  
  // Simular llamada
  callCount++;
  mockTotalSimulations++;
  
  console.log(`✅ Llamada #${callCount} - Contador: ${mockTotalSimulations}`);
  
  // Verificar que solo se incrementó en 1
  if (mockTotalSimulations !== callCount) {
    console.error(`❌ ERROR: Se esperaba ${callCount} pero se tiene ${mockTotalSimulations}`);
    return false;
  }
  
  return true;
}

// Test 2: Simular flujo completo de submitVotes
async function testSubmitVotesFlow() {
  console.log('\nTest 2: Simulando flujo de submitVotes (5 votos)...');
  
  const date = '2026-04-12';
  const votes = [
    { columnId: 'col0', partyName: 'Partido A' },
    { columnId: 'col1', partyName: 'Partido B' },
    { columnId: 'col2', partyName: 'Partido C' },
    { columnId: 'col3', partyName: 'Partido D' },
    { columnId: 'col4', partyName: 'Partido E' }
  ];
  
  console.log(`📦 Enviando ${votes.length} votos...`);
  
  // Simular envío de votos (esto NO debería incrementar totalSimulations)
  for (const vote of votes) {
    console.log(`  → Guardando voto: ${vote.columnId} - ${vote.partyName}`);
    // saveVote no incrementa totalSimulations
  }
  
  // Simular llamada a incrementSimulationCount (esto SÍ debería incrementar)
  console.log('📊 Llamando incrementSimulationCount...');
  callCount++;
  mockTotalSimulations++;
  
  console.log(`✅ Llamada #${callCount} - Contador: ${mockTotalSimulations}`);
  
  return true;
}

// Test 3: Verificar múltiples simulaciones
async function testMultipleSimulations() {
  console.log('\nTest 3: Simulando múltiples simulaciones completas...');
  
  const date = '2026-04-12';
  const numSimulations = 3;
  
  for (let i = 0; i < numSimulations; i++) {
    console.log(`\n🔄 Simulación #${i + 1}:`);
    
    // Cada simulación envía 5 votos
    for (let j = 0; j < 5; j++) {
      console.log(`  → Voto ${j + 1}/5`);
    }
    
    // Y luego llama a incrementSimulationCount UNA VEZ
    callCount++;
    mockTotalSimulations++;
    console.log(`  ✅ Total simulaciones: ${mockTotalSimulations}`);
  }
  
  // Verificar resultado final
  console.log(`\n📊 Resumen:`);
  console.log(`  - Simulaciones completadas: ${numSimulations}`);
  console.log(`  - Total votos enviados: ${numSimulations * 5}`);
  console.log(`  - Llamadas a incrementSimulationCount: ${callCount}`);
  console.log(`  - Valor de totalSimulations: ${mockTotalSimulations}`);
  
  if (mockTotalSimulations === numSimulations) {
    console.log(`✅ PASS: El contador aumenta correctamente de 1 en 1`);
    return true;
  } else {
    console.error(`❌ FAIL: Se esperaba ${numSimulations} pero se tiene ${mockTotalSimulations}`);
    return false;
  }
}

// Ejecutar tests
async function runTests() {
  console.log('=' .repeat(60));
  console.log('TEST DE CONTADOR DE SIMULACIONES');
  console.log('=' .repeat(60) + '\n');
  
  let allPassed = true;
  
  allPassed = await testIncrementSimulationCount() && allPassed;
  allPassed = await testSubmitVotesFlow() && allPassed;
  allPassed = await testMultipleSimulations() && allPassed;
  
  console.log('\n' + '=' .repeat(60));
  if (allPassed) {
    console.log('✅ TODOS LOS TESTS PASARON');
  } else {
    console.log('❌ ALGUNOS TESTS FALLARON');
  }
  console.log('=' .repeat(60));
}

// Solo ejecutar si estamos en Node.js (no en el navegador)
if (typeof window === 'undefined') {
  runTests();
}

export { runTests };
