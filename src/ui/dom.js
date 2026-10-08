// Helpers de DOM y de formato. Todo texto entra por textContent o value.

export function el(etiqueta, props = {}, ...hijos) {
  const nodo = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(props)) {
    if (valor === false || valor == null) continue;
    if (clave === 'class') nodo.className = valor;
    else if (clave === 'text') nodo.textContent = valor;
    else if (clave === 'value') nodo.value = valor;
    else if (clave.startsWith('on')) nodo.addEventListener(clave.slice(2), valor);
    else nodo.setAttribute(clave, valor === true ? '' : valor);
  }
  nodo.append(...hijos.filter((hijo) => hijo !== false && hijo != null));
  return nodo;
}

export const $ = (id) => document.getElementById(id);

// Décimas enteras a texto: 18 -> "1.8".
export const fmt = (decimas) => (decimas == null ? 'sin datos' : (decimas / 10).toFixed(1));
export const fmtExacto = (centesimas) => (centesimas == null ? '' : `exacto ${(centesimas / 100).toFixed(2)}`);

export const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// Para buscar ignorando tildes y mayúsculas.
export function normalizarBusqueda(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export const NOTAS_BOTONES = [
  { valor: 'A', titulo: 'A: Excelente (90 a 100)' },
  { valor: 'B', titulo: 'B: Muy bueno (80 a 89)' },
  { valor: 'C', titulo: 'C: Bueno (70 a 79)' },
  { valor: 'D', titulo: 'D: Suficiente (60 a 69)' },
  { valor: 'F', titulo: 'F: Reprobado (59 o menos)' },
  { valor: 'FN', titulo: 'FN: Reprobada por inasistencia excesiva (vale 0 y cuenta)' },
  { valor: 'R', titulo: 'R: Retirada (no cuenta)' },
];

export const ETIQUETA_CONDICION = { normal: 'Condición normal', prueba: 'A prueba académica' };
