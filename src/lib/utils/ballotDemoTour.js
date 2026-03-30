/**
 * Ballot Demo Tour V3 - Interactive Demo for Video Recording
 * Optimized for mobile viewport with clear narrative
 * Duration: ~15 seconds
 * 
 * Usage: Add ?demo=1 to URL
 * Example: https://exitpollsimulator.web.app/simular?demo=1
 */

// ============================================
// CONFIGURATION
// ============================================
const demoConfig = {
  autoStart: true,
  autoStartDelay: 1200,
  restart: true,
  restartDelay: 3000, // 3s pause before restart
  
  // Timing
  shortPause: 800,      // 0.8s - for processing
  mediumPause: 1200,    // 1.2s - for success moments
  longPause: 1500,      // 1.5s - dramatic pauses
  
  // Movement speeds
  fingerMoveSpeed: 500,     // 0.5s to move between elements
  scrollDuration: 900,      // 0.9s for smooth scrolls
  panDuration: 1200,        // 1.2s for discovery pans
  
  // Visual
  preferentialValue1: '12',
  preferentialValue2: '24',
  demoFingerColor: '#0066FF',
};

// ============================================
// STATE
// ============================================
let isDemoRunning = false;
let demoFinger = null;
let currentAbortController = null;

// ============================================
// UTILITY FUNCTIONS
// ============================================
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// ============================================
// DEMO FINGER (Visual Tap Indicator)
// ============================================
function createDemoFinger() {
  const finger = document.createElement('div');
  finger.id = 'demo-finger';
  finger.style.cssText = `
    position: fixed;
    left: -100px;
    top: -100px;
    width: 60px;
    height: 60px;
    background: rgba(0, 102, 255, 0.95);
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 
      0 4px 20px rgba(0, 102, 255, 0.4),
      0 8px 30px rgba(0, 0, 0, 0.2),
      inset 0 -2px 4px rgba(0, 0, 0, 0.1);
    pointer-events: none;
    z-index: 99999;
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.5);
    transition: 
      left 400ms ease-out,
      top 400ms ease-out,
      opacity 300ms ease,
      transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
  `;
  
  // Ripple effect
  const ripple = document.createElement('div');
  ripple.style.cssText = `
    position: absolute;
    top: -10px;
    left: -10px;
    right: -10px;
    bottom: -10px;
    border: 2px solid rgba(0, 102, 255, 0.3);
    border-radius: 50%;
    opacity: 0;
  `;
  finger.appendChild(ripple);
  
  document.body.appendChild(finger);
  return { finger, ripple };
}

function getDemoFinger() {
  if (!demoFinger) {
    const { finger, ripple } = createDemoFinger();
    demoFinger = { element: finger, ripple };
  }
  return demoFinger;
}

async function showFinger() {
  const { element } = getDemoFinger();
  element.style.opacity = '1';
  element.style.transform = 'translate(-50%, -50%) scale(1)';
  await wait(300);
}

async function hideFinger() {
  const { element } = getDemoFinger();
  element.style.opacity = '0';
  element.style.transform = 'translate(-50%, -50%) scale(0.5)';
  await wait(300);
}

async function moveFingerTo(targetElement, duration = demoConfig.fingerMoveSpeed) {
  const { element } = getDemoFinger();
  const rect = targetElement.getBoundingClientRect();
  const targetX = rect.left + rect.width / 2;
  const targetY = rect.top + rect.height / 2;
  
  // Get current position
  const currentTransform = element.style.transform;
  const currentX = element.offsetLeft || window.innerWidth / 2;
  const currentY = element.offsetTop || window.innerHeight / 2;
  
  // Animate movement
  const startX = currentX;
  const startY = currentY;
  const startTime = performance.now();
  
  return new Promise(resolve => {
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      
      const x = startX + (targetX - startX) * eased;
      const y = startY + (targetY - startY) * eased;
      
      element.style.left = x + 'px';
      element.style.top = y + 'px';
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }
    
    requestAnimationFrame(animate);
  });
}

async function performTap(targetElement) {
  const { element, ripple } = getDemoFinger();
  
  // Press down
  element.style.transform = 'translate(-50%, -50%) scale(0.85)';
  element.style.background = 'rgba(0, 82, 204, 0.95)';
  await wait(150);
  
  // Trigger actual click
  targetElement.click();
  
  // Ripple animation
  ripple.style.transition = 'none';
  ripple.style.transform = 'scale(0.8)';
  ripple.style.opacity = '1';
  
  setTimeout(() => {
    ripple.style.transition = 'transform 600ms ease-out, opacity 600ms ease-out';
    ripple.style.transform = 'scale(1.5)';
    ripple.style.opacity = '0';
  }, 50);
  
  // Release
  await wait(150);
  element.style.transform = 'translate(-50%, -50%) scale(1.1)';
  element.style.background = 'rgba(0, 102, 255, 0.95)';
  await wait(100);
  element.style.transform = 'translate(-50%, -50%) scale(1)';
  await wait(100);
}

async function revealResult(targetElement, direction = 'right', distance = 70) {
  // Move finger aside to reveal the result
  const { element } = getDemoFinger();
  const rect = targetElement.getBoundingClientRect();
  
  let offsetX = 0;
  let offsetY = 0;
  
  switch(direction) {
    case 'right':
      offsetX = distance;
      break;
    case 'left':
      offsetX = -distance;
      break;
    case 'down':
      offsetY = distance;
      break;
    case 'up':
      offsetY = -distance;
      break;
  }
  
  const targetX = rect.left + rect.width / 2 + offsetX;
  const targetY = rect.top + rect.height / 2 + offsetY;
  
  // Animate to side position
  element.style.transition = 'left 400ms ease-out, top 400ms ease-out';
  element.style.left = targetX + 'px';
  element.style.top = targetY + 'px';
  
  await wait(400);
  
  // Reset transition for next movement
  element.style.transition = 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms ease';
}

// ============================================
// PICKER INTERACTION FUNCTIONS
// ============================================
async function waitForPicker(timeout = 2000) {
  console.log('⏳ Waiting for picker to appear...');
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const picker = document.querySelector('.picker-backdrop');
    if (picker) {
      console.log('✅ Picker appeared');
      await wait(200); // Small delay for render
      return picker;
    }
    await wait(100);
  }
  
  console.warn('⚠️  Picker timeout - continuing without picker');
  return null;
}

async function waitForPickerToClose(timeout = 2000) {
  console.log('⏳ Waiting for picker to close...');
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const picker = document.querySelector('.picker-backdrop');
    if (!picker) {
      console.log('✅ Picker closed');
      await wait(200);
      return;
    }
    await wait(100);
  }
  
  console.warn('⚠️  Picker close timeout');
}

function findPickerButton(number) {
  const button = document.querySelector(`.picker-button[data-value="${number}"]`);
  if (!button) {
    console.warn(`⚠️  Could not find picker button for number ${number}`);
  }
  return button;
}

async function selectNumberInPicker(number, fingerOffset = 60) {
  const button = findPickerButton(number);
  if (!button) return;
  
  const { element } = getDemoFinger();
  const rect = button.getBoundingClientRect();
  
  // 1. Approach from left
  console.log(`🎯 Approaching number ${number} from left`);
  const approachX = rect.left + rect.width / 2 - fingerOffset;
  const approachY = rect.top + rect.height / 2;
  
  element.style.transition = 'left 500ms ease-out, top 500ms ease-out';
  element.style.left = approachX + 'px';
  element.style.top = approachY + 'px';
  await wait(500);
  
  // 2. Move onto the number
  console.log(`👉 Moving onto number ${number}`);
  element.style.transition = 'left 300ms ease-out, top 300ms ease-out';
  element.style.left = (rect.left + rect.width / 2) + 'px';
  element.style.top = approachY + 'px';
  await wait(300);
  
  // 3. Perform tap
  await wait(200);
  await performTap(button);
  
  // 4. Reveal: move aside to show selected number
  console.log(`👀 Revealing selected number ${number}`);
  const revealX = rect.left + rect.width / 2 + 50;
  element.style.transition = 'left 400ms ease-out';
  element.style.left = revealX + 'px';
  await wait(400);
  
  // Reset transition
  element.style.transition = 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms ease';
  
  // 5. Wait for picker to close
  await wait(1500); // Show the selection
  await waitForPickerToClose();
}

// ============================================
// SCROLL FUNCTIONS
// ============================================
function getScrollContainer() {
  return document.querySelector('[data-demo="scroll-container"]') || 
         document.querySelector('.stage-viewport');
}

async function smoothScrollTo(x, y, duration = demoConfig.scrollDuration) {
  const container = getScrollContainer();
  if (!container) return;
  
  const startX = container.scrollLeft;
  const startY = container.scrollTop;
  const startTime = performance.now();
  
  return new Promise(resolve => {
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      
      container.scrollLeft = startX + (x - startX) * eased;
      container.scrollTop = startY + (y - startY) * eased;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }
    
    requestAnimationFrame(animate);
  });
}

async function smoothScrollX(targetX, duration = demoConfig.scrollDuration) {
  const container = getScrollContainer();
  if (!container) return;
  
  const maxScroll = container.scrollWidth - container.clientWidth;
  if (maxScroll <= 0) return; // No horizontal scroll available
  
  const clampedTarget = Math.max(0, Math.min(targetX, maxScroll));
  await smoothScrollTo(clampedTarget, container.scrollTop, duration);
}

async function smoothScrollY(targetY, duration = demoConfig.scrollDuration) {
  const container = getScrollContainer();
  if (!container) return;
  
  const maxScroll = container.scrollHeight - container.clientHeight;
  if (maxScroll <= 0) return; // No vertical scroll available
  
  const clampedTarget = Math.max(0, Math.min(targetY, maxScroll));
  await smoothScrollTo(container.scrollLeft, clampedTarget, duration);
}

// ============================================
// ELEMENT HELPERS
// ============================================
function getElement(demoId) {
  return document.querySelector(`[data-demo="${demoId}"]`);
}

async function ensureVisible(element, padding = 20) {
  const container = getScrollContainer();
  if (!container || !element) return;
  
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  
  // Calculate relative position within scroll container
  const relativeLeft = elementRect.left - containerRect.left + container.scrollLeft;
  const relativeTop = elementRect.top - containerRect.top + container.scrollTop;
  
  // Check if element is outside visible area
  const isOutsideX = relativeLeft < container.scrollLeft + padding || 
                     relativeLeft > container.scrollLeft + container.clientWidth - padding;
  const isOutsideY = relativeTop < container.scrollTop + padding || 
                     relativeTop > container.scrollTop + container.clientHeight - padding;
  
  if (isOutsideX || isOutsideY) {
    const targetX = isOutsideX ? relativeLeft - padding : container.scrollLeft;
    const targetY = isOutsideY ? relativeTop - padding : container.scrollTop;
    await smoothScrollTo(targetX, targetY, demoConfig.scrollDuration);
  }
}

// ============================================
// DEMO PHASES
// ============================================

// Phase 1: Discovery (0-4s)
// Starts from top-right, moves left continuously to show Presidente column
async function phase1_Discovery() {
  console.log('🎬 Phase 1: Discovery - From right to Presidente');
  const container = getScrollContainer();
  if (!container) return;
  
  // Calculate positions
  const maxScrollX = container.scrollWidth - container.clientWidth;
  
  // Start at top-right (last column - Parlamento Andino)
  await smoothScrollTo(maxScrollX, 0, 0);
  await wait(300);
  
  // Single continuous scroll from right to left (Presidente)
  // Shows all columns along the way with constant speed
  await smoothScrollX(0, 2400);
  
  // Small vertical pan to show scrolling is possible
  await smoothScrollY(100, 600);
  await wait(150);
  await smoothScrollY(0, 600);
  await wait(400);
}

// Phase 2: Core Interaction (4-10s)
// Demonstrates: symbol selection, photo selection, and automatic unmarking when changing parties
// Uses Demócrata Verde (5th row, index 4) as primary demonstration row
async function phase2_CoreInteraction() {
  console.log('🎬 Phase 2: Core Interaction - Presidente (Demócrata Verde)');
  
  // Ensure we're at Presidente column
  await smoothScrollX(0, demoConfig.scrollDuration);
  
  // Find Demócrata Verde row (5th row, index 4) and third row for comparison
  const rowDV = getElement('row-presidente-4') || 
                document.querySelectorAll('[data-demo="col-presidente"] .ballot-row')[4];
  
  const row3 = getElement('row-presidente-2') || 
               document.querySelectorAll('[data-demo="col-presidente"] .ballot-row')[2];
  
  if (!rowDV) {
    console.warn('⚠️  Demócrata Verde row not found');
    return;
  }
  
  // Get elements from Demócrata Verde row
  const simboloDV = rowDV.querySelector('[data-demo^="simbolo-"]') || 
                    rowDV.querySelector('.image-frame');
  const fotoDV = rowDV.querySelector('[data-demo^="foto-"]') || 
                 rowDV.querySelector('.is-photo');
  
  await showFinger();
  
  // ===== STEP 1: Tap on symbol (Demócrata Verde) =====
  console.log('👉 Step 1: Tap symbol - Demócrata Verde');
  if (simboloDV) {
    await moveFingerTo(simboloDV, demoConfig.fingerMoveSpeed);
    await wait(300);
    await performTap(simboloDV);
    await wait(200);
    
    // Go directly to photo (symbol with X remains visible to the left)
    await moveFingerTo(fotoDV, demoConfig.fingerMoveSpeed);
    await wait(300);
    await performTap(fotoDV);
    await wait(200);
    
    // Done - no reveal, proceed directly to another row
  }
  
  // ===== STEP 2: Just mark photo in another row, then proceed to column 2 =====
  console.log('👉 Step 2: Mark photo in another party, then proceed');
  if (row3) {
    const foto3 = row3.querySelector('[data-demo^="foto-"]') || 
                  row3.querySelector('.is-photo');
    
    if (foto3) {
      await ensureVisible(foto3);
      
      // Direct to photo - tap only
      await moveFingerTo(foto3, demoConfig.fingerMoveSpeed);
      await wait(200);
      await performTap(foto3);
      await wait(200);
      
      // That's it - no reveal, no symbol tap
      // DV row auto-unmarked, this row has photo marked
      // Proceed directly to column 2
    }
  }
  
  // Hide finger before transitioning to column 2
  await hideFinger();
}

// Phase 3: Progressive Discovery (9-13s)
// Shows Senadores Nacional with preferential voting
async function phase3_Progressive() {
  console.log('🎬 Phase 3: Progressive Discovery');
  
  // Scroll to Senadores Nacional (column 1)
  await smoothScrollX(336, demoConfig.scrollDuration);
  await wait(demoConfig.shortPause);
  
  // Show finger again (it was hidden at end of Phase 2)
  await showFinger();
  
  // Find a row with preferential voting (third row is usually good)
  const simbolo = getElement('simbolo-senadores-nacional-2') ||
                  document.querySelector('[data-demo="col-senadores-nacional"] .image-frame');
  
  const slot1 = getElement('preferencial-senadores-nacional-2-0') ||
                document.querySelectorAll('.ballot-slot')[0];
  
  const slot2 = getElement('preferencial-senadores-nacional-2-1') ||
                document.querySelectorAll('.ballot-slot')[1];
  
  if (simbolo && slot1 && slot2) {
    // Tap symbol to select row
    await ensureVisible(simbolo);
    await moveFingerTo(simbolo, demoConfig.fingerMoveSpeed);
    await wait(200);
    await performTap(simbolo);
    await wait(300);
    
    // Direct to slot 1 - no reveal
    // Find the actual button inside the slot container
    const slot1Button = slot1.querySelector('.ballot-slot') || slot1;
    
    // Move to first slot and tap the button
    await moveFingerTo(slot1Button, demoConfig.fingerMoveSpeed);
    await wait(200);
    await performTap(slot1Button);
    await wait(500); // Wait longer for picker to open
    
    // Wait for picker to appear
    const picker1 = await waitForPicker();
    
    if (picker1) {
      // Select number 12 in picker
      await selectNumberInPicker(12);
    } else {
      console.warn('⚠️  Picker did not appear for slot 1');
      // Fallback: try clicking again or use direct input
      await wait(400);
    }
    
    // Reveal: show "12" in slot 1
    await revealResult(slot1Button, 'down', 40);
    await wait(800);
    
    // ===== SLOT 2: Select "24" =====
    // Find the actual button inside the slot container
    const slot2Button = slot2.querySelector('.ballot-slot') || slot2;
    
    // Move to second slot and tap the button
    await moveFingerTo(slot2Button, demoConfig.fingerMoveSpeed);
    await wait(200);
    await performTap(slot2Button);
    await wait(500); // Wait longer for picker to open
    
    // Wait for picker to appear
    const picker2 = await waitForPicker();
    
    if (picker2) {
      // Select number 24 in picker
      await selectNumberInPicker(24);
    } else {
      console.warn('⚠️  Picker did not appear for slot 2');
      await wait(400);
    }
    
    // Reveal: show "24" in slot 2
    await revealResult(slot2Button, 'down', 40);
    await wait(1000);
  }
}

// Phase 4: Closing (13-15s)
// Shows final success state
async function phase4_Closing() {
  console.log('🎬 Phase 4: Closing');
  
  // Scroll to show the complete selection
  await smoothScrollX(336, demoConfig.scrollDuration);
  await wait(200);
  
  // Hide finger with fade
  await hideFinger();
  
  // Dramatic pause showing the result
  await wait(demoConfig.longPause);
}

// ============================================
// MAIN CONTROLLER
// ============================================
const demoPhases = [
  phase1_Discovery,
  phase2_CoreInteraction,
  phase3_Progressive,
  phase4_Closing
];

async function runDemo() {
  if (!isDemoRunning) return;
  
  console.log('🎬 Starting Demo Sequence');
  
  try {
    // Run all phases
    for (const phase of demoPhases) {
      if (!isDemoRunning) break;
      await phase();
    }
    
    // Closing
    if (isDemoRunning) {
      console.log('✅ Demo completed');
      
      if (demoConfig.restart) {
        await wait(demoConfig.restartDelay);
        await resetDemo();
        await runDemo();
      }
    }
  } catch (error) {
    console.error('❌ Demo error:', error);
    stopBallotDemoTour();
  }
}

async function resetDemo() {
  console.log('🔄 Resetting Demo');
  
  // Hide finger
  await hideFinger();
  
  // Clear votes (trigger reset)
  const resetBtn = document.querySelector('[data-demo="reset"]') || 
                   document.querySelector('.reset-button');
  if (resetBtn) resetBtn.click();
  
  // Reset scroll position
  const container = getScrollContainer();
  if (container) {
    container.scrollTo({ left: 0, top: 0, behavior: 'auto' });
  }
  
  // Clear any selections
  document.querySelectorAll('.is-voted, .demo-highlight').forEach(el => {
    el.classList.remove('is-voted', 'demo-highlight');
  });
  
  await wait(500);
}

// ============================================
// PUBLIC API
// ============================================
export function startBallotDemoTour() {
  if (isDemoRunning) return;
  
  console.log('🎬 Starting Ballot Demo Tour V3');
  isDemoRunning = true;
  
  // Add global styles
  if (!document.getElementById('demo-styles-v3')) {
    const styles = document.createElement('style');
    styles.id = 'demo-styles-v3';
    styles.textContent = `
      .demo-highlight {
        position: relative;
        z-index: 3;
        box-shadow: 0 0 0 4px rgba(0, 102, 255, 0.3) !important;
        transition: box-shadow 300ms ease;
      }
      
      .demo-highlight::after {
        content: '';
        position: absolute;
        inset: -4px;
        border-radius: inherit;
        background: rgba(0, 102, 255, 0.1);
        z-index: -1;
        pointer-events: none;
      }
    `;
    document.head.appendChild(styles);
  }
  
  // Start sequence
  setTimeout(() => {
    runDemo();
  }, demoConfig.autoStartDelay);
}

export function stopBallotDemoTour() {
  console.log('🛑 Stopping Demo');
  isDemoRunning = false;
  
  // Hide finger
  hideFinger();
  
  // Remove highlights
  document.querySelectorAll('.demo-highlight').forEach(el => {
    el.classList.remove('demo-highlight');
  });
}

export function initDemoMode() {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('demo')) {
      console.log('🎬 Demo mode detected');
      startBallotDemoTour();
    }
  }
}

// Expose for debugging
if (typeof window !== 'undefined') {
  window.ballotDemo = {
    start: startBallotDemoTour,
    stop: stopBallotDemoTour,
    reset: resetDemo,
    config: demoConfig
  };
}
