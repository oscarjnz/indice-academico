import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PUNTOS, NOTAS, MINIMO, normalizarNombre, esComputable, redondearDecimas, indice, acumulado,
  honorPara, analizar,
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

const est = (...cuatrimestres) => ({ version: 1, cuatrimestres });
// n materias de 3 créditos con la misma nota; el prefijo evita repetidas accidentales
const bloque = (prefijo, nota, n = 2) =>
  Array.from({ length: n }, (_, i) => mat(`${prefijo}${i}`, 3, nota));

test('analizar con los ejemplos de la clase', () => {
  const r = analizar(est(...CLASE_ACUM));
  assert.equal(r.cuatrimestres[0].indice.decimas, 18);
  assert.equal(r.acumuladoFinal.decimas, 23);
  assert.equal(r.honor, null);
});

test('analizar sin datos no produce NaN ni condiciones falsas', () => {
  for (const e of [est(), est(cuat('c0')), est(cuat('c0', mat('a', 3, ''), mat('b', null, 'A')))]) {
    const r = analizar(e);
    assert.equal(r.acumuladoFinal.decimas, null);
    assert.equal(r.condicionActual, 'normal');
    assert.equal(r.honor, null);
    assert.equal(r.rachaPrueba, 0);
    assert.deepEqual(r.alertas, { pa3: false, reprobaciones: [], bajoMinimo: false });
    assert.ok(!JSON.stringify(r).includes('NaN'));
  }
  assert.equal(analizar(est(cuat('c0'))).cuatrimestres[0].neutral, 'sin-datos');
});

test('el primer cuatrimestre con datos nunca afecta la condición aunque saque 0.0', () => {
  const r = analizar(est(cuat('c0', ...bloque('a', 'F'))));
  assert.equal(r.cuatrimestres[0].neutral, 'primero');
  assert.equal(r.cuatrimestres[0].condicion, 'normal');
  assert.equal(r.condicionActual, 'normal');
  assert.equal(r.alertas.bajoMinimo, true);
});

test('un cuatrimestre vacío antes no le quita al primero con datos su carácter de primero', () => {
  const r = analizar(est(cuat('vacio'), cuat('c1', ...bloque('a', 'F'))));
  assert.equal(r.cuatrimestres[0].neutral, 'sin-datos');
  assert.equal(r.cuatrimestres[1].neutral, 'primero');
  assert.equal(r.condicionActual, 'normal');
});

test('dos cuatrimestres consecutivos bajo 2.0 ponen a prueba desde el tercero', () => {
  const r = analizar(est(
    cuat('c0', ...bloque('a', 'A')), // 4.0
    cuat('c1', ...bloque('b', 'D')), // 1.0, acumulado 2.5
    cuat('c2', ...bloque('c', 'D')), // 1.0, acumulado 2.0
  ));
  assert.equal(r.cuatrimestres[1].condicion, 'normal');
  assert.equal(r.cuatrimestres[2].acumulado.decimas, 20);
  assert.equal(r.cuatrimestres[2].condicion, 'prueba');
  assert.equal(r.condicionActual, 'prueba');
  assert.equal(r.rachaPrueba, 1);
});

test('acumulado bajo 2.0 pone a prueba desde el segundo cuatrimestre aunque el índice cuatrimestral sea 4.0', () => {
  const r = analizar(est(
    cuat('c0', ...bloque('a', 'F', 3)),
    cuat('c1', ...bloque('b', 'A')),
  ));
  assert.equal(r.cuatrimestres[1].indice.decimas, 40);
  assert.equal(r.cuatrimestres[1].acumulado.decimas, 16);
  assert.equal(r.cuatrimestres[1].condicion, 'prueba');
});

test('un cuatrimestre con una sola materia es neutral y hereda la condición', () => {
  const r = analizar(est(
    cuat('c0', ...bloque('a', 'A')),
    cuat('c1', mat('sola', 3, 'F')),
    cuat('c2', ...bloque('c', 'D')),
  ));
  assert.equal(r.cuatrimestres[1].neutral, 'una-sola-materia');
  assert.equal(r.cuatrimestres[1].condicion, 'normal');
  // c2: el anterior es neutral, así que no hay "dos consecutivos"; acumulado 30/15 = 2.0
  assert.equal(r.cuatrimestres[2].acumulado.decimas, 20);
  assert.equal(r.cuatrimestres[2].condicion, 'normal');
});

test('un cuatrimestre con una sola materia no pasa a prueba aunque el acumulado sea menor que 2.0', () => {
  const r = analizar(est(
    cuat('c0', ...bloque('a', 'F')),
    cuat('c1', mat('sola', 3, 'F')),
  ));
  assert.equal(r.cuatrimestres[1].condicion, 'normal');
});

test('recuperación: uno de los dos últimos con 2.0 o más y acumulado de 2.0 o más vuelve a normal', () => {
  const r = analizar(est(
    cuat('c0', ...bloque('a', 'A')),
    cuat('c1', ...bloque('b', 'D')),
    cuat('c2', ...bloque('c', 'D')), // prueba
    cuat('c3', ...bloque('d', 'A')), // 4.0, acumulado 60/24 = 2.5
  ));
  assert.equal(r.cuatrimestres[2].condicion, 'prueba');
  assert.equal(r.cuatrimestres[3].condicion, 'normal');
  assert.equal(r.rachaPrueba, 0);
});

test('PA-3: tres cuatrimestres consecutivos a prueba disparan el aviso de separación', () => {
  const dos = analizar(est(
    cuat('c0', ...bloque('a', 'F')),
    cuat('c1', ...bloque('b', 'F')),
    cuat('c2', ...bloque('c', 'F')),
  ));
  assert.equal(dos.rachaPrueba, 2);
  assert.equal(dos.alertas.pa3, false);
  const tres = analizar(est(
    cuat('c0', ...bloque('a', 'F')),
    cuat('c1', ...bloque('b', 'F')),
    cuat('c2', ...bloque('c', 'F')),
    cuat('c3', ...bloque('d', 'F')),
  ));
  assert.equal(tres.rachaPrueba, 3);
  assert.equal(tres.alertas.pa3, true);
});

test('PA-3: un cuatrimestre neutral en medio hereda la prueba y mantiene la cadena', () => {
  const r = analizar(est(
    cuat('c0', ...bloque('a', 'F')),
    cuat('c1', ...bloque('b', 'F')), // prueba
    cuat('c2', mat('sola', 3, 'F')), // neutral, hereda prueba
    cuat('c3', ...bloque('d', 'F')), // prueba
  ));
  assert.equal(r.cuatrimestres[2].condicion, 'prueba');
  assert.equal(r.rachaPrueba, 3);
  assert.equal(r.alertas.pa3, true);
});

test('reprobar tres veces la misma materia (F o FN) dispara el aviso; dos no', () => {
  const intento = (n, nota) =>
    cuat(`c${n}`, mat(n === 1 ? ' CÁLCULO i' : 'Cálculo I', 4, nota), mat(`x${n}`, 3, 'A'));
  const tres = analizar(est(intento(0, 'F'), intento(1, 'FN'), intento(2, 'F')));
  assert.deepEqual(tres.alertas.reprobaciones, [{ nombre: 'Cálculo I', veces: 3 }]);
  const dos = analizar(est(intento(0, 'F'), intento(1, 'FN')));
  assert.deepEqual(dos.alertas.reprobaciones, []);
  const sinNombre = analizar(est(cuat('c0', mat('', 3, 'F'), mat('', 3, 'F'), mat('', 3, 'F'))));
  assert.deepEqual(sinNombre.alertas.reprobaciones, []);
});

test('honores en los límites', () => {
  assert.equal(honorPara(40), 'Summa cum laude');
  assert.equal(honorPara(38), 'Summa cum laude');
  assert.equal(honorPara(37), 'Magna cum laude');
  assert.equal(honorPara(35), 'Magna cum laude');
  assert.equal(honorPara(34), 'Cum laude');
  assert.equal(honorPara(32), 'Cum laude');
  assert.equal(honorPara(31), null);
  assert.equal(honorPara(0), null);
  assert.equal(honorPara(null), null);
});

test('aviso de mínimo para graduarse según el acumulado', () => {
  assert.equal(analizar(est(cuat('c0', ...bloque('a', 'D')))).alertas.bajoMinimo, true);
  assert.equal(analizar(est(cuat('c0', ...bloque('a', 'C')))).alertas.bajoMinimo, false);
});

test('sustituidas del acumulado final se exponen en analizar', () => {
  const r = analizar(est(
    cuat('c0', mat('Física', 3, 'F'), mat('x', 3, 'A')),
    cuat('c1', mat('física', 3, 'B'), mat('y', 3, 'A')),
  ));
  assert.deepEqual(r.sustituidas, { '0:0': 1 });
});
