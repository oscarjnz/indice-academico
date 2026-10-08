// Forma del estado de la aplicación y su persistencia. Sin DOM: el almacenamiento
// se inyecta para poder probarlo en Node y para tolerar navegadores que lo bloquean.
import { NOTAS } from './calc.js';

export const CLAVE = 'indice-academico:v1';
const MAX_CUATRIMESTRES = 100;
const MAX_MATERIAS = 60;

export function nuevoId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function materiaVacia() {
  return { id: nuevoId(), nombre: '', creditos: null, nota: '' };
}

export function cuatrimestreNuevo(numero, filas = 3) {
  return {
    id: nuevoId(),
    nombre: `Cuatrimestre ${numero}`,
    materias: Array.from({ length: filas }, materiaVacia),
  };
}

export function estadoInicial() {
  return { version: 1, cuatrimestres: [cuatrimestreNuevo(1)] };
}

const esObjeto = (valor) => typeof valor === 'object' && valor !== null && !Array.isArray(valor);
const idValido = (id) => (typeof id === 'string' && id !== '' ? id : nuevoId());

function validarMateria(materia) {
  if (!esObjeto(materia)) return null;
  if (typeof materia.nombre !== 'string') return null;
  const creditosOk =
    materia.creditos === null ||
    (typeof materia.creditos === 'number' && Number.isFinite(materia.creditos));
  if (!creditosOk) return null;
  if (materia.nota !== '' && !NOTAS.includes(materia.nota)) return null;
  return {
    id: idValido(materia.id),
    nombre: materia.nombre,
    creditos: materia.creditos,
    nota: materia.nota,
  };
}

// Devuelve una copia limpia del estado, o null si la forma no es la esperada.
export function validarEstado(valor) {
  if (!esObjeto(valor) || valor.version !== 1) return null;
  if (!Array.isArray(valor.cuatrimestres) || valor.cuatrimestres.length > MAX_CUATRIMESTRES) return null;
  const cuatrimestres = [];
  for (const cuatrimestre of valor.cuatrimestres) {
    if (!esObjeto(cuatrimestre) || typeof cuatrimestre.nombre !== 'string') return null;
    if (!Array.isArray(cuatrimestre.materias) || cuatrimestre.materias.length > MAX_MATERIAS) return null;
    const materias = [];
    for (const materia of cuatrimestre.materias) {
      const limpia = validarMateria(materia);
      if (limpia === null) return null;
      materias.push(limpia);
    }
    cuatrimestres.push({ id: idValido(cuatrimestre.id), nombre: cuatrimestre.nombre, materias });
  }
  return { version: 1, cuatrimestres };
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
