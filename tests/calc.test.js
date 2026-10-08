import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PUNTOS, NOTAS, MINIMO, normalizarNombre, esComputable, redondearDecimas, indice,
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
