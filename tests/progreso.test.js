import test from 'node:test';
import assert from 'node:assert/strict';
import { progreso } from '../src/core/progreso.js';
import { PENSUM } from '../src/data/pensum-derecho.js';

const pensumChico = {
  totalCreditos: 10,
  periodos: [{ numero: 1, materias: [
    { id: 'a', nombre: 'A', creditos: 5 },
    { id: 'b', nombre: 'B', creditos: 4 },
    { id: 'c', nombre: 'C', creditos: 1 },
  ] }],
};
const m = (pensumId, creditos, nota) => ({ id: `${pensumId}${nota}`, pensumId, nombre: pensumId, creditos, nota });
const est = (...cuatrimestres) => ({ version: 2, cuatrimestres: cuatrimestres.map((materias, i) => ({ id: `c${i}`, periodo: i + 1, materias })) });

test('sin datos: 0 créditos aprobados y separación de 3 cuatrimestres', () => {
  assert.deepEqual(progreso(est()), { aprobados: 0, total: 232, porcentaje: 0, tiempoSeparacion: 3 });
});

test('D o mejor aprueba; F, FN, R y sin nota no', () => {
  const r = progreso(est([m('a', 5, 'D'), m('b', 4, 'F'), m('c', 1, 'FN')]), pensumChico);
  assert.equal(r.aprobados, 5);
  assert.equal(progreso(est([m('a', 5, 'R'), m('b', 4, '')]), pensumChico).aprobados, 0);
  assert.equal(progreso(est([m('a', 5, 'A'), m('b', 4, 'B'), m('c', 1, 'C')]), pensumChico).aprobados, 10);
});

test('una materia repetida cuenta una vez y con la última calificación', () => {
  assert.equal(progreso(est([m('a', 5, 'F')], [m('a', 5, 'C')]), pensumChico).aprobados, 5);
  assert.equal(progreso(est([m('a', 5, 'C')], [m('a', 5, 'F')]), pensumChico).aprobados, 0);
  assert.equal(progreso(est([m('a', 5, 'C')], [m('a', 5, 'R')]), pensumChico).aprobados, 5);
});

test('las materias escritas a mano o fuera del pensum no suman', () => {
  const manual = { id: 'x', pensumId: null, nombre: 'Otra', creditos: 3, nota: 'A' };
  const ajena = m('no-existe', 3, 'A');
  assert.equal(progreso(est([manual, ajena, m('a', 5, 'B')]), pensumChico).aprobados, 5);
});

test('créditos inválidos no aprueban', () => {
  assert.equal(progreso(est([m('a', 0, 'A'), m('b', null, 'A')]), pensumChico).aprobados, 0);
});

test('el límite exacto del 50 % da 2 cuatrimestres; por debajo, 3', () => {
  assert.equal(progreso(est([m('a', 5, 'C')]), pensumChico).tiempoSeparacion, 2); // 5 de 10
  assert.equal(progreso(est([m('b', 4, 'C')]), pensumChico).tiempoSeparacion, 3); // 4 de 10
  assert.equal(progreso(est([m('a', 5, 'C'), m('c', 1, 'D')]), pensumChico).tiempoSeparacion, 2);
});

test('porcentaje con un decimal', () => {
  assert.equal(progreso(est([m('a', 5, 'C'), m('c', 1, 'D')]), pensumChico).porcentaje, 60);
  const real = progreso(est([m('espanol-i', 4, 'B')]));
  assert.equal(real.total, 232);
  assert.equal(real.porcentaje, 1.7); // 4 / 232 = 1.72 %
});

test('con el pensum real, el 50 % son 116 créditos', () => {
  const todas = PENSUM.periodos.flatMap((p) => p.materias).map((mat) => m(mat.id, mat.creditos, 'C'));
  let suma = 0;
  const hasta115 = [];
  for (const mat of todas) {
    if (suma + mat.creditos <= 115) { hasta115.push(mat); suma += mat.creditos; }
  }
  assert.ok(suma > 110 && suma <= 115, `suma ${suma}`);
  assert.equal(progreso(est(hasta115)).aprobados, suma);
  assert.equal(progreso(est(hasta115)).tiempoSeparacion, 3);
  assert.equal(progreso(est(todas)).aprobados, 232);
  assert.equal(progreso(est(todas)).tiempoSeparacion, 2);
});
