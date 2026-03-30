/**
 * Ballot Demo Tour - Automated interactive demonstration
 * For recording tutorial videos from mobile
 * Activate with ?demo=1 query parameter
 */

// Configuration
const demoConfig = {
  autoStart: true,
  autoStartDelay: 1200,
  restart: true,
  restartDelay: 2500,
  tapScale: 0.88,
  shortPause: 500,
  mediumPause: 900,
  longPause: 1400,
  scrollShort: 700,
  scrollMedium: 1100,
  scrollLong: 1600,
  preferencialValue1: '12',
  preferencialValue2: '24'
};

// State
let isDemoRunning = false;
let currentScene = 0;
let tapIndicator = null;
let abortController = null;

// Utility functions
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function smoothScrollX(container, targetX, duration) {
  return new Promise(resolve => {
    const startX = container.scrollLeft;
    const distance = targetX - startX;
    const startTime = performance.now();
    
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      
      container.scrollLeft = startX + (distance * eased);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }
    
    requestAnimationFrame(animate);
  });
}

function smoothScrollY(container, targetY, duration) {
  return new Promise(resolve => {
    const startY = container.scrollTop;
    const distance = targetY - startY;
    const startTime = performance.now();
    
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      
      container.scrollTop = startY + (distance * eased);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }
    
    requestAnimationFrame(animate);
  });
}

function createTapIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'demo-tap-indicator';
  indicator.style.cssText = `
    position: fixed;
    width: 42px;
    height: 42px;
    border-radius: 999px;
    background: rgba(255,255,255,0.55);
    border: 2px solid rgba(0,0,0,0.18);
    backdrop-filter: blur(2px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.18);
    transform: translate(-50%, -50%) scale(1);
    opacity: 0;
    pointer-events: none;
    z-index: 9999;
    transition: transform 220ms ease, opacity 220ms ease;
  `;
  document.body.appendChild(indicator);
  return indicator;
}

function getTapIndicator() {
  if (!tapIndicator) {
    tapIndicator = createTapIndicator();
  }
  return tapIndicator;
}

function moveTapIndicatorTo(element) {
  const indicator = getTapIndicator();
  const rect = element.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  
  indicator.style.left = x + 'px';
  indicator.style.top = y + 'px';
  indicator.style.opacity = '1';
  indicator.style.transform = 'translate(-50%, -50%) scale(1)';
}

async function animateTap() {
  const indicator = getTapIndicator();
  
  // Scale down
  indicator.style.transform = 'translate(-50%, -50%) scale(0.88)';
  await wait(220);
  
  // Scale back
  indicator.style.transform = 'translate(-50%, -50%) scale(1)';
  await wait(220);
  
  // Fade out
  indicator.style.opacity = '0';
  await wait(220);
}

function highlightElement(element) {
  element.classList.add('demo-highlight');
}

function clearHighlight(element) {
  if (element) {
    element.classList.remove('demo-highlight');
  }
}

function clearAllHighlights() {
  document.querySelectorAll('.demo-highlight').forEach(el => {
    el.classList.remove('demo-highlight');
  });
}

function getElementByDemoId(demoId) {
  return document.querySelector(`[data-demo="${demoId}"]`);
}

async function typeInInput(input, text, stepDelay = 150) {
  input.focus();
  for (let i = 0; i < text.length; i++) {
    input.value += text[i];
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(stepDelay);
  }
  input.blur();
}

function getScrollContainer() {
  return getElementByDemoId('scroll-container') || document.querySelector('.stage-viewport');
}

// Demo Scenes
async function scene1_Entrada() {
  console.log('🎬 Scene 1: Entrada');
  const container = getScrollContainer();
  
  // Wait initial delay
  await wait(demoConfig.autoStartDelay);
  
  // Small horizontal pan to show cédula is scrollable
  await smoothScrollX(container, 150, demoConfig.scrollShort);
  await wait(demoConfig.shortPause);
  
  // Return slightly
  await smoothScrollX(container, 50, demoConfig.scrollShort);
  await wait(500);
}

async function scene2_RecorridoHorizontal() {
  console.log('🎬 Scene 2: Recorrido Horizontal');
  const container = getScrollContainer();
  
  const columns = [
    'col-presidente',
    'col-senadores-nacional',
    'col-senadores-regional',
    'col-diputados',
    'col-parlamento'
  ];
  
  let currentX = 0;
  const colWidth = 336; // 320px + 16px gap
  
  for (let i = 0; i < columns.length; i++) {
    currentX = i * colWidth;
    await smoothScrollX(container, currentX, demoConfig.scrollMedium);
    await wait(demoConfig.shortPause);
  }
  
  // Return to start
  await smoothScrollX(container, 0, demoConfig.scrollLong);
  await wait(demoConfig.shortPause);
}

async function scene3_ScrollVertical() {
  console.log('🎬 Scene 3: Scroll Vertical');
  const container = getScrollContainer();
  
  // Scroll down to show more parties (2-3 rows)
  await smoothScrollY(container, 180, demoConfig.scrollMedium);
  await wait(demoConfig.mediumPause);
  
  // Scroll back up for interaction zone
  await smoothScrollY(container, 60, demoConfig.scrollMedium);
  await wait(demoConfig.shortPause);
}

async function scene4_TapFotografia() {
  console.log('🎬 Scene 4: Tap sobre Fotografía');
  const container = getScrollContainer();
  
  // Ensure we're at Presidente column
  await smoothScrollX(container, 0, demoConfig.scrollShort);
  
  // Get first presidential row with photo
  const fotoElement = getElementByDemoId('foto-presidente-0') || 
                      document.querySelector('[data-demo^="foto-"]');
  
  if (fotoElement) {
    highlightElement(fotoElement);
    await wait(400);
    
    moveTapIndicatorTo(fotoElement);
    await wait(300);
    await animateTap();
    
    // Trigger actual click
    fotoElement.click();
    await wait(1000);
    
    clearHighlight(fotoElement);
  }
}

async function scene5_TapSimbolo() {
  console.log('🎬 Scene 5: Tap sobre Símbolo');
  
  // Get first symbol (could be same party or another)
  const simboloElement = getElementByDemoId('simbolo-presidente-0') || 
                         document.querySelector('[data-demo^="simbolo-"]');
  
  if (simboloElement) {
    highlightElement(simboloElement);
    await wait(400);
    
    moveTapIndicatorTo(simboloElement);
    await wait(300);
    await animateTap();
    
    // Trigger actual click
    simboloElement.click();
    await wait(1000);
    
    clearHighlight(simboloElement);
  }
}

async function scene6_IrAColumnaPreferencial() {
  console.log('🎬 Scene 6: Ir a Columna con Voto Preferencial');
  const container = getScrollContainer();
  
  // Scroll to Senadores Nacional (2nd column)
  await smoothScrollX(container, 336, demoConfig.scrollMedium);
  await wait(400);
  
  // Highlight preferential area
  const preferentialBlock = getElementByDemoId('voto-preferencial-senadores-nacional') ||
                            document.querySelector('.preferential-block');
  if (preferentialBlock) {
    highlightElement(preferentialBlock);
    await wait(600);
    clearHighlight(preferentialBlock);
  }
}

async function scene7_PrimeraCasillaPreferencial() {
  console.log('🎬 Scene 7: Primera Casilla Preferencial');
  
  // Get first preferential slot
  const slot1 = getElementByDemoId('preferencial-senadores-nacional-0-0') ||
                document.querySelector('.ballot-slot');
  
  if (slot1) {
    highlightElement(slot1);
    await wait(400);
    
    moveTapIndicatorTo(slot1);
    await wait(300);
    await animateTap();
    
    // Click to open picker
    slot1.click();
    await wait(400);
    
    // Simulate typing
    const input = document.querySelector('.preference-input') || slot1.querySelector('input');
    if (input) {
      await typeInInput(input, demoConfig.preferencialValue1);
    }
    
    await wait(900);
    clearHighlight(slot1);
  }
}

async function scene8_SegundaCasillaPreferencial() {
  console.log('🎬 Scene 8: Segunda Casilla Preferencial');
  
  // Get second preferential slot
  const slot2 = getElementByDemoId('preferencial-senadores-nacional-0-1') ||
                document.querySelectorAll('.ballot-slot')[1];
  
  if (slot2) {
    highlightElement(slot2);
    await wait(400);
    
    moveTapIndicatorTo(slot2);
    await wait(300);
    await animateTap();
    
    // Click to open picker
    slot2.click();
    await wait(400);
    
    // Simulate typing
    const input = document.querySelector('.preference-input') || slot2.querySelector('input');
    if (input) {
      await typeInInput(input, demoConfig.preferencialValue2);
    }
    
    await wait(800);
    clearHighlight(slot2);
  }
}

async function scene9_RecorridoFinal() {
  console.log('🎬 Scene 9: Recorrido Final Resumen');
  const container = getScrollContainer();
  
  // Horizontal pan showing multiple columns
  await smoothScrollX(container, 168, demoConfig.scrollShort);
  await wait(600);
  
  await smoothScrollX(container, 672, demoConfig.scrollMedium);
  await wait(600);
  
  // Small vertical scroll
  await smoothScrollY(container, 120, demoConfig.scrollShort);
  await wait(500);
  
  // Return to nice closing position
  await smoothScrollX(container, 336, demoConfig.scrollMedium);
  await smoothScrollY(container, 60, demoConfig.scrollShort);
  await wait(500);
}

async function scene10_Cierre() {
  console.log('🎬 Scene 10: Cierre');
  
  // Stay quiet or restart
  await wait(demoConfig.restartDelay);
}

// Main demo controller
const scenes = [
  scene1_Entrada,
  scene2_RecorridoHorizontal,
  scene3_ScrollVertical,
  scene4_TapFotografia,
  scene5_TapSimbolo,
  scene6_IrAColumnaPreferencial,
  scene7_PrimeraCasillaPreferencial,
  scene8_SegundaCasillaPreferencial,
  scene9_RecorridoFinal,
  scene10_Cierre
];

async function runScene(sceneIndex) {
  if (!isDemoRunning || sceneIndex >= scenes.length) return;
  
  currentScene = sceneIndex;
  
  try {
    await scenes[sceneIndex]();
    
    if (isDemoRunning && sceneIndex < scenes.length - 1) {
      await runScene(sceneIndex + 1);
    } else if (isDemoRunning && demoConfig.restart) {
      // Restart from beginning
      await wait(demoConfig.restartDelay);
      await resetDemo();
      await runScene(0);
    }
  } catch (error) {
    console.error('Demo scene error:', error);
    stopDemo();
  }
}

export function startBallotDemoTour() {
  if (isDemoRunning) return;
  
  console.log('🎬 Starting Ballot Demo Tour');
  isDemoRunning = true;
  currentScene = 0;
  
  // Add styles if not present
  if (!document.getElementById('demo-styles')) {
    const styles = document.createElement('style');
    styles.id = 'demo-styles';
    styles.textContent = `
      .demo-highlight {
        position: relative;
        z-index: 3;
        box-shadow: 0 0 0 3px rgba(59,130,246,0.28);
        transition: box-shadow 260ms ease;
      }
    `;
    document.head.appendChild(styles);
  }
  
  // Start demo sequence
  runScene(0);
}

export function stopBallotDemoTour() {
  console.log('🛑 Stopping Ballot Demo Tour');
  isDemoRunning = false;
  currentScene = 0;
  
  // Cleanup
  clearAllHighlights();
  if (tapIndicator) {
    tapIndicator.style.opacity = '0';
  }
  
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
}

export async function resetDemo() {
  console.log('🔄 Resetting Demo');
  
  // Clear selections
  clearAllHighlights();
  
  // Reset scroll
  const container = getScrollContainer();
  if (container) {
    container.scrollTo({ left: 0, top: 0, behavior: 'auto' });
  }
  
  // Clear votes (if needed, trigger reset)
  const resetButton = document.querySelector('[data-demo="reset"]');
  if (resetButton) {
    resetButton.click();
  }
  
  await wait(300);
}

// Auto-start detection
export function initDemoMode() {
  if (typeof window !== 'undefined' && window.location.search.includes('demo=1')) {
    console.log('🎬 Demo mode detected, starting in', demoConfig.autoStartDelay, 'ms');
    setTimeout(() => {
      startBallotDemoTour();
    }, demoConfig.autoStartDelay);
  }
}

// Expose globally for debugging
if (typeof window !== 'undefined') {
  window.ballotDemo = {
    start: startBallotDemoTour,
    stop: stopBallotDemoTour,
    reset: resetDemo,
    config: demoConfig
  };
}
