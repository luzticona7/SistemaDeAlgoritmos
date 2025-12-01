// js/utils/id.js

let counter = 0;

export function genId() {
  return 'node_' + Date.now() + '_' + (counter++) + '_' + Math.random().toString(36).substr(2, 9);
}