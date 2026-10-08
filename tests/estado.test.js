import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLAVE, estadoInicial, periodoNuevo, materiaManual, siguientePeriodo, ordenar,
  validarEstado, cargar, guardar, borrar,
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

test('la clave de almacenamiento es la v2', () => {
  assert.equal(CLAVE, 'indice-academico:v2');
});

test('estado inicial vacío', () => {
  assert.deepEqual(estadoInicial(), { version: 2, cuatrimestres: [] });
});

test('periodoNuevo carga las materias del período con sus créditos y sin nota', () => {
  const p = periodoNuevo(1);
  assert.equal(p.periodo, 1);
  assert.equal(p.materias.length, 7);
  assert.equal(p.materias.reduce((s, m) => s + m.creditos, 0), 22);
  assert.ok(p.materias.every((m) => m.nota === '' && typeof m.pensumId === 'string'));
  assert.equal(p.materias[1].nombre, 'Introducción a la Filosofía');
  assert.equal(p.materias[1].pensumId, 'introduccion-a-la-filosofia');
  assert.equal(new Set(p.materias.map((m) => m.id)).size, 7);
  assert.equal(typeof p.id, 'string');
});

test('periodoNuevo rechaza períodos fuera del pensum', () => {
  for (const n of [0, 13, 2.5, -1, '3', null]) assert.throws(() => periodoNuevo(n), RangeError, String(n));
});

test('materiaManual limpia el nombre y no tiene pensumId', () => {
  const m = materiaManual('  Derecho Informático ', 3);
  assert.equal(m.nombre, 'Derecho Informático');
  assert.equal(m.creditos, 3);
  assert.equal(m.pensumId, null);
  assert.equal(m.nota, '');
});

test('siguientePeriodo es el que sigue al mayor agregado', () => {
  const con = (...periodos) => ({ version: 2, cuatrimestres: periodos.map((p) => ({ id: `c${p}`, periodo: p, materias: [] })) });
  assert.equal(siguientePeriodo(con()), 1);
  assert.equal(siguientePeriodo(con(1, 2)), 3);
  assert.equal(siguientePeriodo(con(3)), 4);
  assert.equal(siguientePeriodo(con(1, 5)), 6);
  assert.equal(siguientePeriodo(con(12)), null);
});

test('ordenar deja los cuatrimestres por período ascendente', () => {
  const e = { version: 2, cuatrimestres: [{ periodo: 5 }, { periodo: 1 }, { periodo: 3 }] };
  assert.deepEqual(ordenar(e).cuatrimestres.map((c) => c.periodo), [1, 3, 5]);
});

const valido = () => ({
  version: 2,
  cuatrimestres: [
    { id: 'c1', periodo: 1, materias: [
      { id: 'm1', pensumId: 'espanol-i', nombre: 'Español I', creditos: 4, nota: 'B' },
      { id: 'm2', pensumId: null, nombre: 'Otra', creditos: 2, nota: '' },
    ] },
    { id: 'c2', periodo: 2, materias: [] },
  ],
});

test('validarEstado acepta un estado válido y lo devuelve igual', () => {
  assert.deepEqual(validarEstado(valido()), valido());
});

test('validarEstado reordena por período y asigna ids faltantes', () => {
  const e = valido();
  e.cuatrimestres.reverse();
  delete e.cuatrimestres[0].id;
  delete e.cuatrimestres[1].materias[0].id;
  const r = validarEstado(e);
  assert.deepEqual(r.cuatrimestres.map((c) => c.periodo), [1, 2]);
  assert.equal(typeof r.cuatrimestres[0].materias[0].id, 'string');
  assert.equal(typeof r.cuatrimestres[1].id, 'string');
});

const con = (cambio) => { const e = valido(); cambio(e); return e; };

test('validarEstado rechaza formas inválidas', () => {
  const casos = {
    nulo: null,
    texto: 'hola',
    arreglo: [],
    'versión 1 (la libre anterior)': { version: 1, cuatrimestres: [{ id: 'a', nombre: 'Cuatrimestre 1', materias: [] }] },
    'sin cuatrimestres': { version: 2 },
    'cuatrimestres no arreglo': { version: 2, cuatrimestres: {} },
    'período 0': con((e) => { e.cuatrimestres[0].periodo = 0; }),
    'período 13': con((e) => { e.cuatrimestres[0].periodo = 13; }),
    'período decimal': con((e) => { e.cuatrimestres[0].periodo = 1.5; }),
    'período texto': con((e) => { e.cuatrimestres[0].periodo = '1'; }),
    'período repetido': con((e) => { e.cuatrimestres[1].periodo = 1; }),
    'materias no arreglo': con((e) => { e.cuatrimestres[0].materias = null; }),
    'nota inválida': con((e) => { e.cuatrimestres[0].materias[0].nota = 'Z'; }),
    'nota no texto': con((e) => { e.cuatrimestres[0].materias[0].nota = 3; }),
    'créditos texto': con((e) => { e.cuatrimestres[0].materias[0].creditos = '4'; }),
    'créditos infinito': con((e) => { e.cuatrimestres[0].materias[0].creditos = Infinity; }),
    'nombre no texto': con((e) => { e.cuatrimestres[0].materias[0].nombre = 5; }),
    'pensumId numérico': con((e) => { e.cuatrimestres[0].materias[0].pensumId = 7; }),
    'pensumId ausente': con((e) => { delete e.cuatrimestres[0].materias[0].pensumId; }),
    'materia no objeto': con((e) => { e.cuatrimestres[0].materias[0] = 'x'; }),
    'más de 12 cuatrimestres': { version: 2, cuatrimestres: Array(13).fill(valido().cuatrimestres[0]) },
  };
  for (const [nombre, caso] of Object.entries(casos)) {
    assert.equal(validarEstado(caso), null, nombre);
  }
});

test('cargar devuelve el estado vacío si no hay datos, están corruptos, son de otra versión o el almacén falla', () => {
  for (const almacen of [
    almacenFalso(),
    almacenFalso({ [CLAVE]: '{no es json' }),
    almacenFalso({ [CLAVE]: JSON.stringify({ version: 9 }) }),
    almacenFalso({ 'indice-academico:v1': JSON.stringify({ version: 1, cuatrimestres: [] }) }),
    almacenRoto(),
    null,
  ]) {
    assert.deepEqual(cargar(almacen), estadoInicial());
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
