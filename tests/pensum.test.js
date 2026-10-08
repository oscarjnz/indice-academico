import test from 'node:test';
import assert from 'node:assert/strict';
import { PENSUM } from '../src/data/pensum-derecho.js';

test('el pensum de Derecho tiene 12 períodos numerados del 1 al 12', () => {
  assert.equal(PENSUM.periodos.length, 12);
  assert.deepEqual(PENSUM.periodos.map((p) => p.numero), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.deepEqual(
    PENSUM.periodos.map((p) => [p.anio, p.periodo]),
    [[1, 1], [1, 2], [1, 3], [2, 1], [2, 2], [2, 3], [3, 1], [3, 2], [3, 3], [4, 1], [4, 2], [4, 3]],
  );
});

test('los créditos por período y el total coinciden con el PDF (232)', () => {
  const esperados = [22, 21, 16, 20, 18, 17, 21, 21, 18, 19, 22, 17];
  assert.deepEqual(PENSUM.periodos.map((p) => p.creditos), esperados);
  for (const p of PENSUM.periodos) {
    assert.equal(p.materias.reduce((s, m) => s + m.creditos, 0), p.creditos, `período ${p.numero}`);
  }
  assert.equal(PENSUM.totalCreditos, 232);
  assert.equal(PENSUM.periodos.reduce((s, p) => s + p.creditos, 0), 232);
});

test('cantidad de materias por período', () => {
  assert.deepEqual(PENSUM.periodos.map((p) => p.materias.length), [7, 6, 5, 6, 6, 7, 6, 7, 7, 7, 7, 6]);
});

test('ids únicos, créditos enteros positivos y nombres no vacíos', () => {
  const ids = PENSUM.periodos.flatMap((p) => p.materias.map((m) => m.id));
  assert.equal(new Set(ids).size, ids.length);
  for (const p of PENSUM.periodos) {
    for (const m of p.materias) {
      assert.match(m.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, m.nombre);
      assert.ok(Number.isInteger(m.creditos) && m.creditos > 0, m.nombre);
      assert.ok(m.nombre.trim().length > 0);
    }
  }
});

test('los nombres conservan tildes y la forma literal del PDF', () => {
  const nombres = PENSUM.periodos.flatMap((p) => p.materias.map((m) => m.nombre));
  for (const esperado of [
    'Matemática Universitaria II-A',
    'Introducción Historia Dominicana',
    'Derecho Obligaciones II',
    'Derecho de Obligaciones I',
    'Práctica Forense Inmobiliaria',
    'Ética de la Profesión de Derecho',
    'Resolución Alternativa de Conflictos',
  ]) {
    assert.ok(nombres.includes(esperado), esperado);
  }
});

test('las electivas están marcadas', () => {
  const electivas = PENSUM.periodos.flatMap((p) => p.materias.filter((m) => m.electiva).map((m) => m.nombre));
  assert.deepEqual(electivas, [
    'Electiva Cocurricular',
    'Electiva de Ciencias Básicas',
    'Laboratorio de Electiva de Ciencias Básicas',
    'Electiva I Estudios Teológicos',
    'Electiva II Estudios Teológicos',
    'Electiva I para Derecho',
    'Electiva II para Derecho',
    'Electiva III para Derecho',
    'Electiva IV para Derecho',
  ]);
});
