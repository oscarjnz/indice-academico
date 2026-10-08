// Avance de la carrera: créditos aprobados del pensum y tiempo de separación
// (art. 33.2). Solo cuentan las materias del pensum; una repetida cuenta una vez,
// con su última calificación computable.
import { esComputable, PUNTOS } from './calc.js';
import { PENSUM } from '../data/pensum-derecho.js';

export function progreso(estado, pensum = PENSUM) {
  const creditosDelPensum = new Map(
    pensum.periodos.flatMap((p) => p.materias.map((m) => [m.id, m.creditos])),
  );
  const ultima = new Map();
  for (const cuatrimestre of estado.cuatrimestres) {
    for (const materia of cuatrimestre.materias) {
      if (typeof materia.pensumId !== 'string' || !creditosDelPensum.has(materia.pensumId)) continue;
      if (!esComputable(materia)) continue;
      ultima.set(materia.pensumId, materia);
    }
  }
  let aprobados = 0;
  for (const [id, materia] of ultima) {
    if (PUNTOS[materia.nota] >= 1) aprobados += creditosDelPensum.get(id);
  }
  const total = pensum.totalCreditos;
  return {
    aprobados,
    total,
    porcentaje: Math.round((aprobados * 1000) / total) / 10,
    // Art. 33.2: 50 % o más de los créditos aprobados = 2 cuatrimestres; si no, 3.
    tiempoSeparacion: 2 * aprobados >= total ? 2 : 3,
  };
}
