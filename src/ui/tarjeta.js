// Tarjeta de un cuatrimestre: se construye una vez por cambio estructural y luego
// solo se repinta (actualizar), para no perder el foco al tocar notas.
import { el, fmt, fmtExacto, NOTAS_BOTONES } from './dom.js';
import { PENSUM } from '../data/pensum-derecho.js';

const ETIQUETA_EN_TARJETA = { normal: 'normal', prueba: 'a prueba académica' };

const NOTA_NEUTRAL = {
  primero: 'Primer cuatrimestre con materias: no afecta tu condición académica.',
  'una-sola-materia': 'Una sola asignatura: no afecta tu condición académica.',
  'sin-datos': 'Pon la nota de cada materia para ver los índices.',
};

function dato(titulo, clase = '') {
  const texto = document.createTextNode('');
  const sub = el('span', { class: 'sub' });
  const nodo = el('div', { class: `dato ${clase}`.trim() }, el('dt', { text: titulo }), el('dd', {}, texto, sub));
  return { nodo, texto, sub };
}

function crearFila(materia, acciones) {
  const botones = NOTAS_BOTONES.map(({ valor, titulo }) => el('button', {
    type: 'button', class: `nota nota-${valor.toLowerCase()}`, 'aria-pressed': 'false', title: titulo, text: valor,
    'aria-label': `Nota ${valor} para ${materia.nombre}`,
    onclick: () => acciones.alCambiarNota(materia, valor),
  }));
  const mensaje = el('p', { class: 'mensaje' });
  const quitar = el('button', {
    type: 'button', class: 'quitar', title: 'Quitar esta materia', text: '×',
    'aria-label': `Quitar ${materia.nombre}`,
    onclick: () => acciones.alQuitarMateria(materia),
  });
  const etiquetas = [
    `${materia.creditos} ${materia.creditos === 1 ? 'crédito' : 'créditos'}`,
  ];
  const meta = el('span', { class: 'materia-meta' }, ...etiquetas.map((t) => el('span', { text: t })));
  if (materia.pensumId === null) meta.append(el('span', { class: 'chip', text: 'escrita a mano' }));
  else if (/electiva/i.test(materia.nombre)) meta.append(el('span', { class: 'chip', text: 'electiva' }));
  const raiz = el(
    'li', { class: 'materia' },
    el('div', { class: 'materia-info' }, el('span', { class: 'materia-nombre', text: materia.nombre }), meta),
    el('div', { class: 'notas', role: 'group', 'aria-label': `Nota de ${materia.nombre}` }, ...botones),
    quitar,
    mensaje,
  );
  return { raiz, botones, mensaje, materia };
}

export function crearTarjeta({ cuatrimestre, acciones, pensum = PENSUM }) {
  const periodo = pensum.periodos.find((p) => p.numero === cuatrimestre.periodo);
  const titulo = el('h2', { class: 'cuatri-titulo', tabindex: '-1', text: `Año ${periodo.anio} · Período ${periodo.periodo}` });
  const sub = el('p', { class: 'cuatri-sub', text: `Cuatrimestre ${periodo.numero} del pensum · ${periodo.creditos} créditos` });
  const quitarCuatri = el('button', {
    type: 'button', class: 'boton texto', text: 'Quitar cuatrimestre',
    'aria-label': `Quitar el cuatrimestre Año ${periodo.anio} Período ${periodo.periodo}`,
    onclick: () => acciones.alQuitarCuatrimestre(),
  });

  const filas = cuatrimestre.materias.map((materia) => crearFila(materia, acciones));
  const lista = el('ul', { class: 'materias' }, ...filas.map((f) => f.raiz));
  const vacio = el('p', { class: 'cuatri-vacio', text: 'No hay materias en este cuatrimestre. Agrega una con el botón de abajo.' });
  const agregar = el('button', {
    type: 'button', class: 'boton secundario', text: 'Agregar materia',
    onclick: () => acciones.alAgregarMateria(),
  });

  const indice = dato('Índice cuatrimestral', 'principal');
  const puntos = dato('Puntos');
  const creditos = dato('Créditos');
  const acumulado = dato('Acumulado hasta aquí');
  const condicion = el('p', { class: 'cuatri-condicion' });
  const neutral = el('p', { class: 'cuatri-nota' });
  const pie = el(
    'footer', { class: 'cuatri-pie' },
    el('dl', { class: 'datos' }, indice.nodo, puntos.nodo, creditos.nodo, acumulado.nodo),
    condicion, neutral,
  );

  const raiz = el(
    'article', { class: 'cuatri', 'data-periodo': String(periodo.numero) },
    el('header', { class: 'cuatri-cabecera' }, el('div', {}, titulo, sub), quitarCuatri),
    filas.length > 0 ? lista : vacio,
    agregar,
    pie,
  );

  // analisis: fila de analizar().cuatrimestres; nombreDe(ci): "Año N · Período M" de otro cuatrimestre.
  function actualizar({ analisis, sustituidas, ci, nombreDe }) {
    puntos.texto.data = String(analisis.indice.puntos);
    creditos.texto.data = String(analisis.indice.creditos);
    indice.texto.data = fmt(analisis.indice.decimas);
    indice.sub.textContent = analisis.indice.centesimas == null ? '' : ` (${fmtExacto(analisis.indice.centesimas)})`;
    acumulado.texto.data = fmt(analisis.acumulado.decimas);
    condicion.dataset.estado = analisis.condicion;
    condicion.replaceChildren(document.createTextNode('Condición: '), el('strong', { text: ETIQUETA_EN_TARJETA[analisis.condicion] }));
    condicion.hidden = analisis.neutral === 'sin-datos';
    neutral.textContent = analisis.neutral ? NOTA_NEUTRAL[analisis.neutral] : '';

    cuatrimestre.materias.forEach((materia, mi) => {
      const fila = filas[mi];
      if (!fila) return;
      for (const boton of fila.botones) {
        boton.setAttribute('aria-pressed', boton.textContent === materia.nota ? 'true' : 'false');
      }
      const por = Object.hasOwn(sustituidas, `${ci}:${mi}`) ? sustituidas[`${ci}:${mi}`] : undefined;
      let texto = '';
      let clase = '';
      if (por !== undefined) {
        texto = por === ci
          ? 'Sustituida en el acumulado por otra fila de este cuatrimestre.'
          : `Sustituida en el acumulado por la de ${nombreDe(por)}.`;
        clase = 'info';
      } else if (materia.nota === 'R') {
        texto = 'Retirada: no cuenta para el índice.';
        clase = 'info';
      } else if (materia.nota === 'FN') {
        texto = 'Reprobada por inasistencia: vale 0 y cuenta.';
        clase = 'info';
      }
      fila.mensaje.textContent = texto;
      fila.mensaje.className = `mensaje ${clase}`.trim();
      fila.mensaje.hidden = texto === '';
      fila.raiz.classList.toggle('sustituida', por !== undefined);
    });
  }

  return { raiz, titulo, actualizar };
}
