// js/utils/math.js

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function pointToSegmentDistance(point, segmentStart, segmentEnd) {
  const dx = segmentEnd.x - segmentStart.x;
  const dy = segmentEnd.y - segmentStart.y;
  
  if (dx === 0 && dy === 0) {
    // El segmento es un punto
    return Math.hypot(point.x - segmentStart.x, point.y - segmentStart.y);
  }
  
  // Calcular la proyección del punto sobre la línea del segmento
  let t = ((point.x - segmentStart.x) * dx + (point.y - segmentStart.y) * dy) / (dx * dx + dy * dy);
  
  // Limitar t al rango [0, 1] para mantenerlo dentro del segmento
  t = Math.max(0, Math.min(1, t));
  
  // Encontrar el punto más cercano en el segmento
  const closestX = segmentStart.x + t * dx;
  const closestY = segmentStart.y + t * dy;
  
  // Calcular la distancia
  return Math.hypot(point.x - closestX, point.y - closestY);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function distance(p1, p2) {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}