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

// Clave para detectar una materia repetida: el pensumId si la materia es del
// pensum; si no, el nombre normalizado. Un nombre vacío nunca coincide con otro,
// así que recibe una clave única por posición.
export function claveMateria(materia, ci = 0, mi = 0) {
  if (typeof materia.pensumId === 'string') return `p:${materia.pensumId}`;
  const normal = normalizarNombre(materia.nombre);
  return normal === '' ? `\u0000#${ci}:${mi}` : `n:${normal}`;
}

// Índice acumulado de los cuatrimestres 0..hasta (art. 26.3): una misma materia
// no se computa dos veces, solo cuenta la última calificación computable, con los
// créditos de ese momento. R no es computable, así que no sustituye a nadie.
export function acumulado(cuatrimestres, hasta = cuatrimestres.length - 1) {
  const entradas = [];
  const ultima = new Map();
  for (let ci = 0; ci <= hasta; ci++) {
    cuatrimestres[ci].materias.forEach((materia, mi) => {
      if (!esComputable(materia)) return;
      const entrada = { ci, mi, clave: claveMateria(materia, ci, mi), materia };
      entradas.push(entrada);
      ultima.set(entrada.clave, entrada);
    });
  }
  const vigentes = [];
  const sustituidas = {};
  for (const entrada of entradas) {
    const final = ultima.get(entrada.clave);
    if (final === entrada) vigentes.push(entrada.materia);
    else sustituidas[`${entrada.ci}:${entrada.mi}`] = final.ci;
  }
  return { ...indice(vigentes), sustituidas };
}

const HONORES = Object.freeze([
  { nombre: 'Summa cum laude', desde: 38 },
  { nombre: 'Magna cum laude', desde: 35 },
  { nombre: 'Cum laude', desde: 32 },
]);

// Art. 37: honor según el índice acumulado redondeado (en décimas).
export function honorPara(decimas) {
  if (decimas == null) return null;
  return HONORES.find((honor) => decimas >= honor.desde)?.nombre ?? null;
}

// Art. 33.1.b: tres reprobaciones (F o FN) de una misma asignatura.
function reprobaciones(cuatrimestres) {
  const cuenta = new Map();
  for (const cuatrimestre of cuatrimestres) {
    for (const materia of cuatrimestre.materias) {
      if (materia.nota !== 'F' && materia.nota !== 'FN') continue;
      if (typeof materia.pensumId !== 'string' && normalizarNombre(materia.nombre) === '') continue;
      const clave = claveMateria(materia);
      const registro = cuenta.get(clave) ?? { nombre: String(materia.nombre).trim(), veces: 0 };
      registro.veces += 1;
      cuenta.set(clave, registro);
    }
  }
  return [...cuenta.values()].filter((registro) => registro.veces >= 3);
}

// Art. 31 y 32. Un cuatrimestre es neutral (no afecta la condición) si es el primero
// con materias computables, si tiene una sola o si no tiene datos. Un neutral hereda
// la condición del anterior. "Dos consecutivos" se toma como cuatrimestres adyacentes
// y ninguno de los dos puede ser neutral.
export function analizar(estado) {
  const cuatrimestres = estado.cuatrimestres;
  const filas = [];
  let vistoPrimero = false;
  let condicionPrevia = 'normal';

  cuatrimestres.forEach((cuatrimestre, i) => {
    const propio = indice(cuatrimestre.materias);
    const { sustituidas: _omitida, ...acumuladoHasta } = acumulado(cuatrimestres, i);
    const computables = cuatrimestre.materias.filter(esComputable).length;

    let neutral = null;
    if (computables === 0) neutral = 'sin-datos';
    else if (!vistoPrimero) neutral = 'primero';
    else if (computables === 1) neutral = 'una-sola-materia';
    if (computables > 0) vistoPrimero = true;

    let condicion = condicionPrevia;
    if (neutral === null) {
      // Con dos o más materias computables, ambos índices existen (no son null).
      const anterior = filas[i - 1];
      const regla1 =
        anterior !== undefined &&
        anterior.neutral === null &&
        propio.decimas < MINIMO &&
        anterior.indice.decimas < MINIMO;
      const regla2 = acumuladoHasta.decimas < MINIMO;
      condicion = regla1 || regla2 ? 'prueba' : 'normal';
    }
    condicionPrevia = condicion;
    filas.push({ indice: propio, acumulado: acumuladoHasta, neutral, condicion });
  });

  let rachaPrueba = 0;
  for (let i = filas.length - 1; i >= 0 && filas[i].condicion === 'prueba'; i--) rachaPrueba += 1;

  const acumuladoFinal = acumulado(cuatrimestres);
  return {
    cuatrimestres: filas,
    acumuladoFinal,
    sustituidas: acumuladoFinal.sustituidas,
    condicionActual: filas.length > 0 ? filas[filas.length - 1].condicion : 'normal',
    rachaPrueba,
    alertas: {
      pa3: rachaPrueba >= 3,
      reprobaciones: reprobaciones(cuatrimestres),
      bajoMinimo: acumuladoFinal.decimas !== null && acumuladoFinal.decimas < MINIMO,
    },
    honor: honorPara(acumuladoFinal.decimas),
  };
}
