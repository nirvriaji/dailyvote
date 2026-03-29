import type { Action } from 'svelte/action';

interface ClickOutsideOptions {
  enabled?: boolean;
}

export const clickOutside: Action<HTMLElement, (() => void) | ClickOutsideOptions> = (
  node,
  callback
) => {
  let handleClick: (event: MouseEvent) => void;
  
  if (typeof callback === 'function') {
    handleClick = (event: MouseEvent) => {
      if (node && !node.contains(event.target as Node)) {
        callback();
      }
    };
  } else {
    // If options object was passed, extract the actual callback
    return {
      destroy() {}
    };
  }
  
  // Small delay to prevent immediate trigger
  setTimeout(() => {
    document.addEventListener('click', handleClick, true);
  }, 0);
  
  return {
    destroy() {
      document.removeEventListener('click', handleClick, true);
    }
  };
};