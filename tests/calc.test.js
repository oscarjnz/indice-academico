import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PUNTOS, NOTAS, MINIMO, normalizarNombre, esComputable, redondearDecimas, indice, acumulado,
} from '../calc.js';

const mat = (nombre, creditos, nota) => ({ id: nombre, nombre, creditos, nota });

const CLASE_1 = [
  mat('Español I', 4, 'B'),
  mat('Curso Intr. Inglés I', 5, 'C'),
  mat('Historia de la Cult.', 3, 'F'),
  mat('Matemáticas Univ. I', 5, 'D'),
  mat('Orientación Académica', 1, 'A'),
  mat('Danza', 1, 'A'),
];

test('constantes del reglamento', () => {
  assert.deepEqual({ ...PUNTOS }, { A: 4, B: 3, C: 2, D: 1, F: 0, FN: 0 });
  assert.deepEqual([...NOTAS], ['A', 'B', 'C', 'D', 'F', 'FN', 'R']);
  assert.equal(MINIMO, 20);
});

test('ejemplo cuatrimestral de la clase: 35 puntos / 19 créditos = 1.84, redondea a 1.8', () => {
  assert.deepEqual(indice(CLASE_1), { puntos: 35, creditos: 19, centesimas: 184, decimas: 18 });
});

test('redondeo: la segunda cifra decimal igual o mayor que 5 sube una décima', () => {
  assert.equal(redondearDecimas(35, 19), 18); // 1.842
  assert.equal(redondearDecimas(179, 78), 23); // 2.294
  assert.equal(redondearDecimas(9, 4), 23); // 2.25 exacto sube a 2.3
  assert.equal(redondearDecimas(449, 200), 22); // 2.245 queda en 2.2
  assert.equal(redondearDecimas(107, 40), 27); // 2.675 sube a 2.7
  assert.equal(redondearDecimas(23, 20), 12); // 1.15 exacto sube a 1.2
  assert.equal(redondearDecimas(30, 10), 30); // 3.0
  assert.equal(redondearDecimas(0, 5), 0);
  assert.equal(redondearDecimas(5, 0), null);
});

test('el redondeo entero coincide con "truncar a centésimas y mirar la segunda cifra"', () => {
  for (let creditos = 1; creditos <= 100; creditos++) {
    for (let puntos = 0; puntos <= 4 * creditos; puntos++) {
      const centesimas = Math.floor((100 * puntos) / creditos);
      const esperado = Math.floor((centesimas + 5) / 10);
      assert.equal(redondearDecimas(puntos, creditos), esperado, `${puntos}/${creditos}`);
    }
  }
});

test('sin créditos computables no hay índice (null, nunca NaN)', () => {
  const vacio = { puntos: 0, creditos: 0, centesimas: null, decimas: null };
  assert.deepEqual(indice([]), vacio);
  assert.deepEqual(indice([mat('a', 3, ''), mat('b', 3, 'R'), mat('c', null, 'A')]), vacio);
});

test('FN cuenta con 0 puntos; R, nota vacía y créditos inválidos no cuentan', () => {
  const r = indice([
    mat('a', 3, 'A'), // 12 puntos
    mat('b', 3, 'FN'), // 0 puntos, 3 créditos
    mat('c', 3, 'R'), // no cuenta
    mat('d', 3, ''), // no cuenta
    mat('e', 0, 'A'), // inválida
    mat('f', -2, 'A'), // inválida
    mat('g', 2.5, 'A'), // inválida
    mat('h', NaN, 'A'), // inválida
    mat('i', '3', 'A'), // texto, inválida
    mat('j', null, 'A'), // inválida
  ]);
  assert.deepEqual(r, { puntos: 12, creditos: 6, centesimas: 200, decimas: 20 });
});

test('esComputable', () => {
  assert.equal(esComputable(mat('a', 3, 'C')), true);
  assert.equal(esComputable(mat('a', 3, 'FN')), true);
  assert.equal(esComputable(mat('a', 3, 'R')), false);
  assert.equal(esComputable(mat('a', 3, '')), false);
  assert.equal(esComputable(mat('a', 3, 'Z')), false);
  assert.equal(esComputable(mat('a', 3, undefined)), false);
});

test('normalizarNombre ignora acentos, mayúsculas y espacios', () => {
  assert.equal(normalizarNombre('  Cálculo   DIFERENCIAL I '), 'calculo diferencial i');
  assert.equal(normalizarNombre('Español'), 'espanol');
  assert.equal(normalizarNombre(null), '');
  assert.equal(normalizarNombre(undefined), '');
});

const cuat = (nombre, ...materias) => ({ id: nombre, nombre, materias });

const CLASE_ACUM = [
  cuat('p1', ...CLASE_1), // 19 créditos, 35 puntos
  cuat('p2', mat('p2a', 10, 'B'), mat('p2b', 8, 'C'), mat('p2c', 3, 'F')), // 21, 46
  cuat('p3', mat('p3a', 9, 'A'), mat('p3b', 3, 'B'), mat('p3c', 6, 'F')), // 18, 45
  cuat('p4', mat('p4a', 8, 'A'), mat('p4b', 7, 'B'), mat('p4c', 5, 'F')), // 20, 53
];

test('ejemplo acumulado de la clase: 179 puntos / 78 créditos = 2.29, redondea a 2.3', () => {
  const r = acumulado(CLASE_ACUM);
  assert.equal(r.puntos, 179);
  assert.equal(r.creditos, 78);
  assert.equal(r.centesimas, 229);
  assert.equal(r.decimas, 23);
  assert.deepEqual(r.sustituidas, {});
});

test('acumulado hasta un cuatrimestre intermedio', () => {
  const r = acumulado(CLASE_ACUM, 1);
  assert.equal(r.puntos, 81);
  assert.equal(r.creditos, 40);
});

test('materia repetida: en el acumulado solo cuenta la última, el cuatrimestre propio no cambia', () => {
  const cs = [
    cuat('c0', mat('Cálculo I', 4, 'F'), mat('x', 2, 'A')),
    cuat('c1', mat('  calculo   i ', 4, 'B')),
  ];
  const r = acumulado(cs);
  assert.equal(r.puntos, 8 + 12); // x (2 cr, A) + Cálculo I (4 cr, B)
  assert.equal(r.creditos, 6);
  assert.deepEqual(r.sustituidas, { '0:0': 1 });
  // la F sigue contando en el índice de su propio cuatrimestre
  assert.equal(indice(cs[0].materias).puntos, 8);
  assert.equal(indice(cs[0].materias).creditos, 6);
});

test('materia repetida usa los créditos de la última vez', () => {
  const cs = [cuat('c0', mat('Física', 3, 'F')), cuat('c1', mat('Física', 4, 'A'))];
  const r = acumulado(cs);
  assert.equal(r.creditos, 4);
  assert.equal(r.puntos, 16);
});

test('tres intentos: solo cuenta el último y los dos anteriores quedan sustituidos por él', () => {
  const cs = [
    cuat('c0', mat('Química', 3, 'F')),
    cuat('c1', mat('Química', 3, 'D')),
    cuat('c2', mat('Química', 3, 'C')),
  ];
  const r = acumulado(cs);
  assert.equal(r.creditos, 3);
  assert.equal(r.puntos, 6);
  assert.deepEqual(r.sustituidas, { '0:0': 2, '1:0': 2 });
});

test('repetida dentro del mismo cuatrimestre: gana la fila posterior', () => {
  const r = acumulado([cuat('c0', mat('Arte', 2, 'F'), mat('arte', 2, 'A'))]);
  assert.equal(r.puntos, 8);
  assert.equal(r.creditos, 2);
  assert.deepEqual(r.sustituidas, { '0:0': 0 });
});

test('R no sustituye una calificación anterior', () => {
  const cs = [cuat('c0', mat('Mat', 3, 'C')), cuat('c1', mat('Mat', 3, 'R'))];
  const r = acumulado(cs);
  assert.equal(r.puntos, 6);
  assert.equal(r.creditos, 3);
  assert.deepEqual(r.sustituidas, {});
});

test('materias sin nombre nunca se fusionan entre sí', () => {
  const cs = [cuat('c0', mat('', 3, 'A'), mat('  ', 3, 'B')), cuat('c1', mat('', 3, 'C'))];
  const r = acumulado(cs);
  assert.equal(r.creditos, 9);
  assert.equal(r.puntos, 12 + 9 + 6);
  assert.deepEqual(r.sustituidas, {});
});

test('acumulado sin cuatrimestres o sin datos', () => {
  const vacio = { puntos: 0, creditos: 0, centesimas: null, decimas: null, sustituidas: {} };
  assert.deepEqual(acumulado([]), vacio);
  assert.deepEqual(acumulado([cuat('c0')], 0), vacio);
  assert.deepEqual(acumulado(CLASE_ACUM, -1), vacio);
});
