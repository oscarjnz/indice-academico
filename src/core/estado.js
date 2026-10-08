// Forma del estado de la aplicación (v2: un cuatrimestre es un período del pensum)
// y su persistencia. Sin DOM: el almacenamiento se inyecta para poder probarlo en
// Node y para tolerar navegadores que lo bloquean.
import { NOTAS } from './calc.js';
import { PENSUM } from '../data/pensum-derecho.js';

export const CLAVE = 'indice-academico:v2';
const MAX_MATERIAS = 60;

export function nuevoId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function estadoInicial() {
  return { version: 2, cuatrimestres: [] };
}

export function materiaDePensum(materia) {
  return { id: nuevoId(), pensumId: materia.id, nombre: materia.nombre, creditos: materia.creditos, nota: '' };
}

export function materiaManual(nombre, creditos) {
  return { id: nuevoId(), pensumId: null, nombre: String(nombre).trim(), creditos, nota: '' };
}

// Cuatrimestre nuevo con las materias del período indicado, sin notas.
export function periodoNuevo(numero, pensum = PENSUM) {
  const periodo = pensum.periodos.find((p) => p.numero === numero);
  if (!Number.isInteger(numero) || periodo === undefined) {
    throw new RangeError(`El período ${numero} no existe en el pensum`);
  }
  return { id: nuevoId(), periodo: numero, materias: periodo.materias.map(materiaDePensum) };
}

// Período que sigue al mayor ya agregado; null si ya se agregó el último.
export function siguientePeriodo(estado, pensum = PENSUM) {
  const mayor = estado.cuatrimestres.reduce((m, c) => Math.max(m, c.periodo), 0);
  return mayor + 1 <= pensum.periodos.length ? mayor + 1 : null;
}

// Los cuatrimestres siempre van en orden de período (el orden del pensum).
export function ordenar(estado) {
  estado.cuatrimestres.sort((a, b) => a.periodo - b.periodo);
  return estado;
}

const esObjeto = (valor) => typeof valor === 'object' && valor !== null && !Array.isArray(valor);
const idValido = (id) => (typeof id === 'string' && id !== '' ? id : nuevoId());

function validarMateria(materia) {
  if (!esObjeto(materia)) return null;
  if (typeof materia.nombre !== 'string') return null;
  if (materia.pensumId !== null && typeof materia.pensumId !== 'string') return null;
  const creditosOk =
    materia.creditos === null ||
    (typeof materia.creditos === 'number' && Number.isFinite(materia.creditos));
  if (!creditosOk) return null;
  if (materia.nota !== '' && !NOTAS.includes(materia.nota)) return null;
  return {
    id: idValido(materia.id),
    pensumId: materia.pensumId,
    nombre: materia.nombre,
    creditos: materia.creditos,
    nota: materia.nota,
  };
}

// Devuelve una copia limpia del estado (ordenada por período), o null si la forma
// no es la esperada. Un estado de otra versión, incluida la v1 libre, se rechaza.
export function validarEstado(valor, pensum = PENSUM) {
  if (!esObjeto(valor) || valor.version !== 2) return null;
  if (!Array.isArray(valor.cuatrimestres) || valor.cuatrimestres.length > pensum.periodos.length) return null;
  const vistos = new Set();
  const cuatrimestres = [];
  for (const cuatrimestre of valor.cuatrimestres) {
    if (!esObjeto(cuatrimestre)) return null;
    const { periodo } = cuatrimestre;
    if (!Number.isInteger(periodo) || periodo < 1 || periodo > pensum.periodos.length || vistos.has(periodo)) return null;
    vistos.add(periodo);
    if (!Array.isArray(cuatrimestre.materias) || cuatrimestre.materias.length > MAX_MATERIAS) return null;
    const materias = [];
    for (const materia of cuatrimestre.materias) {
      const limpia = validarMateria(materia);
      if (limpia === null) return null;
      materias.push(limpia);
    }
    cuatrimestres.push({ id: idValido(cuatrimestre.id), periodo, materias });
  }
  return ordenar({ version: 2, cuatrimestres });
}

export function cargar(storage) {
  try {
    const crudo = storage.getItem(CLAVE);
    if (crudo === null) return estadoInicial();
    return validarEstado(JSON.parse(crudo)) ?? estadoInicial();
  } catch {
    return estadoInicial();
  }
}

export function guardar(storage, estado) {
  try {
    storage.setItem(CLAVE, JSON.stringify(estado));
    return true;
  } catch {
    return false;
  }
}

export function borrar(storage) {
  try {
    storage.removeItem(CLAVE);
    return true;
  } catch {
    return false;
  }
}
