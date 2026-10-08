// Entrada de la aplicación: estado, eventos y render. La lógica vive en core/,
// los datos del pensum en data/ y el dibujo en ui/.
import { analizar } from './core/calc.js';
import { progreso } from './core/progreso.js';
import {
  cargar, guardar, borrar, estadoInicial, periodoNuevo, materiaDePensum, materiaManual,
  siguientePeriodo, ordenar,
} from './core/estado.js';
import { PENSUM } from './data/pensum-derecho.js';
import { $, el } from './ui/dom.js';
import { crearTarjeta } from './ui/tarjeta.js';
import { pintarResumen, pintarAvisos } from './ui/resumen.js';
import { elegirPeriodo, elegirMateria, confirmar } from './ui/dialogos.js';

let storage = null;
try {
  storage = window.localStorage;
} catch {
  storage = null;
}

let estado = cargar(storage);
let guardadoOk = true;
let tarjetas = [];

const reducirMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function nombreDelPeriodo(numero) {
  const p = PENSUM.periodos.find((x) => x.numero === numero);
  return `Año ${p.anio} · Período ${p.periodo}`;
}

function cambio(estructural) {
  guardadoOk = guardar(storage, estado);
  if (estructural) renderLista();
  else actualizar();
}

function pensumIdsFuera(cuatrimestre) {
  const ids = new Set();
  for (const otro of estado.cuatrimestres) {
    if (otro === cuatrimestre) continue;
    for (const m of otro.materias) if (typeof m.pensumId === 'string') ids.add(m.pensumId);
  }
  return ids;
}

function accionesDe(cuatrimestre) {
  return {
    alCambiarNota(materia, nota) {
      materia.nota = materia.nota === nota ? '' : nota;
      cambio(false);
    },
    alQuitarMateria(materia) {
      cuatrimestre.materias.splice(cuatrimestre.materias.indexOf(materia), 1);
      cambio(true);
    },
    async alAgregarMateria() {
      const eleccion = await elegirMateria({ cuatrimestre, otros: pensumIdsFuera(cuatrimestre) });
      if (eleccion === null) return;
      cuatrimestre.materias.push(
        eleccion.tipo === 'pensum' ? materiaDePensum(eleccion.materia) : materiaManual(eleccion.nombre, eleccion.creditos),
      );
      cambio(true);
    },
    async alQuitarCuatrimestre() {
      const ok = await confirmar({
        titulo: 'Quitar cuatrimestre',
        texto: `¿Quitar ${nombreDelPeriodo(cuatrimestre.periodo)} con todas sus notas? Podrás volver a agregarlo después.`,
        aceptar: 'Quitar',
      });
      if (!ok) return;
      estado.cuatrimestres.splice(estado.cuatrimestres.indexOf(cuatrimestre), 1);
      cambio(true);
    },
  };
}

async function agregarCuatrimestre() {
  const eleccion = await elegirPeriodo({
    agregados: estado.cuatrimestres.map((c) => c.periodo),
    siguiente: siguientePeriodo(estado),
  });
  if (eleccion === null) return;
  estado.cuatrimestres.push(periodoNuevo(eleccion));
  ordenar(estado);
  cambio(true);
  const tarjeta = tarjetas.find((t) => t.raiz.dataset.periodo === String(eleccion));
  if (tarjeta) {
    tarjeta.raiz.scrollIntoView({ behavior: reducirMovimiento() ? 'auto' : 'smooth', block: 'start' });
    tarjeta.titulo.focus({ preventScroll: true });
  }
}

function bienvenida() {
  return el(
    'div', { class: 'bienvenida' },
    el('h2', { text: 'Empieza por tu primer cuatrimestre' }),
    el('p', { text: 'Elige el período del pensum de Derecho que cerraste. Se cargan sus materias con sus créditos y solo pones la nota de cada una.' }),
    el('button', { type: 'button', class: 'boton primario grande', text: 'Elegir cuatrimestre', onclick: agregarCuatrimestre }),
  );
}

function renderLista() {
  const lista = $('lista');
  lista.replaceChildren();
  tarjetas = estado.cuatrimestres.map((cuatrimestre) => {
    const tarjeta = crearTarjeta({ cuatrimestre, acciones: accionesDe(cuatrimestre) });
    lista.append(tarjeta.raiz);
    return tarjeta;
  });
  if (estado.cuatrimestres.length === 0) lista.append(bienvenida());
  actualizar();
}

function actualizar() {
  const resultado = analizar(estado);
  const avance = progreso(estado);
  pintarResumen(resultado, avance);
  pintarAvisos(resultado, avance);

  const nombreDe = (ci) => nombreDelPeriodo(estado.cuatrimestres[ci].periodo);
  resultado.cuatrimestres.forEach((analisis, ci) => {
    tarjetas[ci].actualizar({ analisis, sustituidas: resultado.sustituidas, ci, nombreDe });
  });

  const hayDatos = estado.cuatrimestres.length > 0;
  $('agregar').hidden = !hayDatos;
  $('agregar').disabled = estado.cuatrimestres.length >= PENSUM.periodos.length;
  $('borrar').hidden = !hayDatos;
  $('leyenda').hidden = !hayDatos;
  $('guardado').textContent = guardadoOk
    ? 'Tus datos se guardan solo en este navegador.'
    : 'Tu navegador no permite guardar: los datos se perderán al cerrar la pestaña.';
}

$('agregar').addEventListener('click', agregarCuatrimestre);
$('borrar').addEventListener('click', async () => {
  const ok = await confirmar({
    titulo: 'Borrar todo',
    texto: '¿Borrar todos los cuatrimestres y notas de este navegador? No se puede deshacer.',
    aceptar: 'Borrar todo',
  });
  if (!ok) return;
  borrar(storage);
  estado = estadoInicial();
  cambio(true);
});

renderLista();
