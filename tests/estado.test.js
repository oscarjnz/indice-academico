import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLAVE, estadoInicial, cuatrimestreNuevo, validarEstado, cargar, guardar, borrar,
} from '../src/core/estado.js';

const almacenFalso = (inicial = {}) => {
  const datos = { ...inicial };
  return {
    datos,
    getItem: (k) => (k in datos ? datos[k] : null),
    setItem: (k, v) => { datos[k] = String(v); },
    removeItem: (k) => { delete datos[k]; },
  };
};
const almacenRoto = () => ({
  getItem() { throw new Error('bloqueado'); },
  setItem() { throw new Error('bloqueado'); },
  removeItem() { throw new Error('bloqueado'); },
});

test('estado inicial: un cuatrimestre con tres filas vacías', () => {
  const e = estadoInicial();
  assert.equal(e.version, 1);
  assert.equal(e.cuatrimestres.length, 1);
  assert.equal(e.cuatrimestres[0].nombre, 'Cuatrimestre 1');
  assert.equal(e.cuatrimestres[0].materias.length, 3);
  assert.deepEqual(
    e.cuatrimestres[0].materias.map(({ nombre, creditos, nota }) => ({ nombre, creditos, nota })),
    Array(3).fill({ nombre: '', creditos: null, nota: '' }),
  );
  const ids = new Set(e.cuatrimestres[0].materias.map((m) => m.id));
  assert.equal(ids.size, 3);
});

test('cuatrimestreNuevo numera el nombre', () => {
  assert.equal(cuatrimestreNuevo(4).nombre, 'Cuatrimestre 4');
  assert.equal(cuatrimestreNuevo(2, 1).materias.length, 1);
});

const valido = () => ({
  version: 1,
  cuatrimestres: [{
    id: 'c1',
    nombre: 'Primero',
    materias: [
      { id: 'm1', nombre: 'Cálculo', creditos: 4, nota: 'B' },
      { id: 'm2', nombre: '', creditos: null, nota: '' },
    ],
  }],
});

test('validarEstado acepta un estado válido y lo devuelve igual', () => {
  assert.deepEqual(validarEstado(valido()), valido());
});

test('validarEstado asigna ids a lo que no los trae', () => {
  const e = valido();
  delete e.cuatrimestres[0].id;
  delete e.cuatrimestres[0].materias[0].id;
  const r = validarEstado(e);
  assert.equal(typeof r.cuatrimestres[0].id, 'string');
  assert.equal(typeof r.cuatrimestres[0].materias[0].id, 'string');
});

const con = (cambio) => { const e = valido(); cambio(e); return e; };

test('validarEstado rechaza formas inválidas', () => {
  const casos = {
    nulo: null,
    texto: 'hola',
    arreglo: [],
    'otra versión': { ...valido(), version: 2 },
    'sin cuatrimestres': { version: 1 },
    'cuatrimestres no arreglo': { version: 1, cuatrimestres: {} },
    'nombre no texto': con((e) => { e.cuatrimestres[0].nombre = 5; }),
    'materias no arreglo': con((e) => { e.cuatrimestres[0].materias = null; }),
    'nota inválida': con((e) => { e.cuatrimestres[0].materias[0].nota = 'Z'; }),
    'nota no texto': con((e) => { e.cuatrimestres[0].materias[0].nota = 3; }),
    'créditos texto': con((e) => { e.cuatrimestres[0].materias[0].creditos = '4'; }),
    'créditos infinito': con((e) => { e.cuatrimestres[0].materias[0].creditos = Infinity; }),
    'materia no objeto': con((e) => { e.cuatrimestres[0].materias[0] = 'x'; }),
    'demasiados cuatrimestres': { version: 1, cuatrimestres: Array(101).fill(valido().cuatrimestres[0]) },
  };
  for (const [nombre, caso] of Object.entries(casos)) {
    assert.equal(validarEstado(caso), null, nombre);
  }
});

test('cargar: sin datos, JSON corrupto, estado inválido o almacén roto devuelven el estado inicial', () => {
  for (const almacen of [
    almacenFalso(),
    almacenFalso({ [CLAVE]: '{no es json' }),
    almacenFalso({ [CLAVE]: JSON.stringify({ version: 9 }) }),
    almacenRoto(),
    null,
  ]) {
    const e = cargar(almacen);
    assert.equal(e.version, 1);
    assert.equal(e.cuatrimestres.length, 1);
  }
});

test('guardar y cargar hacen ida y vuelta', () => {
  const almacen = almacenFalso();
  assert.equal(guardar(almacen, valido()), true);
  assert.deepEqual(cargar(almacen), valido());
});

test('guardar y borrar devuelven false si el almacén falla', () => {
  assert.equal(guardar(almacenRoto(), valido()), false);
  assert.equal(guardar(null, valido()), false);
  assert.equal(borrar(almacenRoto()), false);
});

test('borrar quita la clave', () => {
  const almacen = almacenFalso({ [CLAVE]: '{}' });
  assert.equal(borrar(almacen), true);
  assert.equal(CLAVE in almacen.datos, false);
});
