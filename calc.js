// Lógica pura del índice académico. Reglamento Académico de Grado de la PUCMM,
// artículos 20, 25, 26, 31, 32, 33, 37 y 38. Sin DOM ni almacenamiento.

export const PUNTOS = Object.freeze({ A: 4, B: 3, C: 2, D: 1, F: 0, FN: 0 });
export const NOTAS = Object.freeze(['A', 'B', 'C', 'D', 'F', 'FN', 'R']);
// 2.0 expresado en décimas: los índices se comparan siempre como enteros.
export const MINIMO = 20;

export function normalizarNombre(nombre) {
  return String(nombre ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function esComputable(materia) {
  return (
    Object.hasOwn(PUNTOS, materia.nota) &&
    Number.isInteger(materia.creditos) &&
    materia.creditos > 0
  );
}

// Décimas enteras del índice puntos / creditos, con el redondeo del art. 26.2:
// si la segunda cifra decimal es 5 o más, sube una décima. Solo aritmética entera.
export function redondearDecimas(puntos, creditos) {
  if (!(creditos > 0)) return null;
  return Math.floor((20 * puntos + creditos) / (2 * creditos));
}

function resumir(puntos, creditos) {
  if (creditos === 0) return { puntos, creditos, centesimas: null, decimas: null };
  return {
    puntos,
    creditos,
    centesimas: Math.floor((100 * puntos) / creditos),
    decimas: redondearDecimas(puntos, creditos),
  };
}

export function indice(materias) {
  let puntos = 0;
  let creditos = 0;
  for (const materia of materias) {
    if (!esComputable(materia)) continue;
    puntos += materia.creditos * PUNTOS[materia.nota];
    creditos += materia.creditos;
  }
  return resumir(puntos, creditos);
}
