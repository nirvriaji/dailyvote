import type { Action } from 'svelte/action';

export const portal: Action<HTMLElement, string> = (node, target = 'body') => {
  let targetEl: HTMLElement;
  
  if (typeof target === 'string') {
    targetEl = document.querySelector(target) as HTMLElement;
    if (!targetEl) {
      console.warn(`Portal target "${target}" not found, appending to body`);
      targetEl = document.body;
    }
  } else {
    targetEl = document.body;
  }
  
  // Move node to target
  targetEl.appendChild(node);
  
  return {
    destroy() {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
  };
};