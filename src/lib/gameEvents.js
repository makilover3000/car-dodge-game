// Tiny pub/sub bridge between React and Phaser.
// React and Phaser both import this module; neither imports the other.
const listeners = new Map();

export const gameEvents = {
  on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
  },
  off(event, fn) {
    listeners.get(event)?.delete(fn);
  },
  emit(event, payload) {
    listeners.get(event)?.forEach(fn => fn(payload));
  },
};

// Make accessible to Phaser scenes that run outside module scope
if (typeof window !== 'undefined') window.gameEvents = gameEvents;
