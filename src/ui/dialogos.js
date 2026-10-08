// Diálogos modales sobre <dialog> nativo (viven en la capa superior del navegador,
// así que no se ven afectados por contextos de apilado). Cada función devuelve una
// promesa: la elección del usuario, o null/false si cerró sin elegir.
import { el, normalizarBusqueda, plural } from './dom.js';
import { PENSUM } from '../data/pensum-derecho.js';

let contador = 0;

function crearDialogo({ titulo, subtitulo, cuerpo, clase = '' }) {
  contador += 1;
  const idTitulo = `dialogo-titulo-${contador}`;
  let resolver;
  const promesa = new Promise((r) => { resolver = r; });

  const cerrar = el('button', { type: 'button', class: 'dialogo-cerrar', 'aria-label': 'Cerrar', text: '×' });
  const encabezado = el(
    'header', { class: 'dialogo-encabezado' },
    el('div', {}, el('h2', { id: idTitulo, text: titulo }), subtitulo && el('p', { class: 'dialogo-sub', text: subtitulo })),
    cerrar,
  );
  const dialogo = el('dialog', { class: `dialogo ${clase}`.trim(), 'aria-labelledby': idTitulo }, encabezado, cuerpo);
  document.body.append(dialogo);

  // Todas las vías de cierre resuelven la promesa directamente, una sola vez, sin
  // depender de que el navegador despache el evento "close" a tiempo.
  let terminado = false;
  const terminar = (resultado) => {
    if (terminado) return;
    terminado = true;
    if (dialogo.open) dialogo.close();
    dialogo.remove();
    resolver(resultado);
  };
  dialogo.addEventListener('close', () => terminar(null)); // Escape
  // Un clic sobre el propio <dialog> (sin relleno propio) es un clic en el fondo.
  dialogo.addEventListener('click', (evento) => { if (evento.target === dialogo) terminar(null); });
  cerrar.addEventListener('click', () => terminar(null));
  dialogo.showModal();

  return { promesa, dialogo, finalizar: terminar };
}

const ANIOS = [1, 2, 3, 4];

// ---------- Selector de período ----------
// agregados: períodos ya presentes; siguiente: el que sigue al mayor agregado (o null).
export function elegirPeriodo({ agregados, siguiente, pensum = PENSUM }) {
  const hechos = new Set(agregados);
  const hayAgregados = agregados.length > 0;
  const cuerpo = el('div', { class: 'dialogo-cuerpo' });
  const { promesa, finalizar } = crearDialogo({
    titulo: hayAgregados ? 'Agregar cuatrimestre' : '¿Qué cuatrimestre cerraste?',
    subtitulo: 'Elige el período del pensum: se cargan sus materias con sus créditos.',
    cuerpo,
    clase: 'dialogo-periodos',
  });

  const boton = (p, destacado) => {
    const yaEsta = hechos.has(p.numero);
    return el(
      'button',
      {
        type: 'button',
        class: `periodo${destacado ? ' destacado' : ''}`,
        disabled: yaEsta,
        onclick: () => finalizar(p.numero),
      },
      el('span', { class: 'periodo-nombre', text: `Año ${p.anio} · Período ${p.periodo}` }),
      el('span', { class: 'periodo-meta', text: `${p.creditos} créditos · ${plural(p.materias.length, 'materia', 'materias')}` }),
      yaEsta && el('span', { class: 'chip', text: 'ya agregado' }),
      !yaEsta && destacado && el('span', { class: 'chip chip-acento', text: hayAgregados ? 'Siguiente' : 'Empieza aquí' }),
    );
  };

  const porAnio = (periodos) => {
    const contenedor = el('div', { class: 'periodos-anios' });
    for (const anio of ANIOS) {
      const delAnio = periodos.filter((p) => p.anio === anio);
      if (delAnio.length === 0) continue;
      contenedor.append(el('div', { class: 'periodos-anio' },
        el('h3', { text: `Año ${anio}` }),
        el('div', { class: 'periodos-rejilla' }, ...delAnio.map((p) => boton(p, false)))));
    }
    return contenedor;
  };

  const base = siguiente ?? 0;
  const elSiguiente = pensum.periodos.find((p) => p.numero === siguiente);
  const posteriores = pensum.periodos.filter((p) => p.numero > base);
  const anteriores = pensum.periodos.filter((p) => p.numero < (siguiente ?? pensum.periodos.length + 1) && p.numero !== siguiente);

  if (elSiguiente) cuerpo.append(el('div', { class: 'periodo-principal' }, boton(elSiguiente, true)));
  if (posteriores.length > 0) {
    cuerpo.append(el('h3', { class: 'dialogo-seccion', text: hayAgregados ? 'Más adelante' : 'Otros períodos' }), porAnio(posteriores));
  }
  if (anteriores.length > 0) {
    cuerpo.append(el('details', { class: 'periodos-anteriores', open: siguiente === null },
      el('summary', { text: 'Períodos anteriores' }), porAnio(anteriores)));
  }
  return promesa;
}

// ---------- Selector de materia ----------
// cuatrimestre: el que recibe la materia; otros: pensumIds cursados en otros cuatrimestres.
export function elegirMateria({ cuatrimestre, otros = new Set(), pensum = PENSUM }) {
  const presentes = new Set(cuatrimestre.materias.map((m) => m.pensumId).filter((id) => typeof id === 'string'));
  const periodoPropio = pensum.periodos.find((p) => p.numero === cuatrimestre.periodo);
  const cuerpo = el('div', { class: 'dialogo-cuerpo' });
  const { promesa, finalizar } = crearDialogo({
    titulo: 'Agregar materia',
    subtitulo: periodoPropio ? `Para Año ${periodoPropio.anio} · Período ${periodoPropio.periodo}` : undefined,
    cuerpo,
    clase: 'dialogo-materias',
  });

  const buscador = el('input', {
    type: 'search', class: 'buscador', placeholder: 'Buscar materia (sin importar tildes)',
    'aria-label': 'Buscar materia', autocomplete: 'off', maxlength: '60',
  });
  const secciones = el('div', { class: 'materias-secciones' });
  const vacio = el('p', { class: 'sin-resultados', hidden: true, text: 'No hay materias con ese nombre. Puedes escribirla abajo como otra materia.' });

  const filas = []; // { nodo, texto, seccion }
  const crearSeccion = (titulo, periodo, destacar) => {
    const lista = el('ul', { class: 'materias-lista' });
    const nodo = el('section', { class: `materias-seccion${destacar ? ' destacada' : ''}` }, el('h3', { text: titulo }), lista);
    for (const m of periodo.materias) {
      const yaEsta = presentes.has(m.id);
      const repetida = !yaEsta && otros.has(m.id);
      const item = el('li', {}, el(
        'button',
        { type: 'button', class: 'materia-opcion', disabled: yaEsta, onclick: () => finalizar({ tipo: 'pensum', materia: m }) },
        el('span', { class: 'materia-opcion-nombre', text: m.nombre }),
        el('span', { class: 'materia-opcion-meta', text: `${m.creditos} ${m.creditos === 1 ? 'crédito' : 'créditos'}` }),
        yaEsta && el('span', { class: 'chip', text: 'ya está aquí' }),
        repetida && el('span', { class: 'chip chip-aviso', text: 'repetición' }),
      ));
      lista.append(item);
      filas.push({ nodo: item, texto: normalizarBusqueda(m.nombre), seccion: nodo });
    }
    return nodo;
  };

  if (periodoPropio) {
    secciones.append(crearSeccion(`De este período: Año ${periodoPropio.anio} · Período ${periodoPropio.periodo}`, periodoPropio, true));
  }
  for (const p of pensum.periodos) {
    if (p === periodoPropio) continue;
    secciones.append(crearSeccion(`Año ${p.anio} · Período ${p.periodo}`, p, false));
  }

  const filtrar = () => {
    const consulta = normalizarBusqueda(buscador.value);
    let visibles = 0;
    for (const fila of filas) {
      const coincide = consulta === '' || fila.texto.includes(consulta);
      fila.nodo.hidden = !coincide;
      if (coincide) visibles += 1;
    }
    for (const seccion of new Set(filas.map((f) => f.seccion))) {
      seccion.hidden = !filas.some((f) => f.seccion === seccion && !f.nodo.hidden);
    }
    vacio.hidden = visibles > 0;
  };
  buscador.addEventListener('input', filtrar);

  // Otra materia, escrita a mano.
  const nombre = el('input', { type: 'text', class: 'campo', maxlength: '80', autocomplete: 'off', id: 'manual-nombre' });
  const creditos = el('input', { type: 'number', class: 'campo', min: '1', max: '99', step: '1', inputmode: 'numeric', id: 'manual-creditos' });
  const error = el('p', { class: 'campo-error', role: 'alert' });
  const agregar = el('button', { type: 'button', class: 'boton primario', text: 'Agregar esta materia' });
  agregar.addEventListener('click', () => {
    const texto = nombre.value.trim();
    const cr = creditos.value === '' ? NaN : Number(creditos.value);
    if (texto === '') { error.textContent = 'Escribe el nombre de la materia.'; nombre.focus(); return; }
    if (!Number.isInteger(cr) || cr < 1 || cr > 99) { error.textContent = 'Los créditos deben ser un entero entre 1 y 99.'; creditos.focus(); return; }
    finalizar({ tipo: 'manual', nombre: texto, creditos: cr });
  });
  const manual = el('details', { class: 'materia-manual' },
    el('summary', { text: 'Otra materia (escribirla)' }),
    el('div', { class: 'manual-campos' },
      el('label', { for: 'manual-nombre', text: 'Nombre de la materia' }), nombre,
      el('label', { for: 'manual-creditos', text: 'Créditos' }), creditos,
      error, agregar));

  cuerpo.append(el('div', { class: 'buscador-caja' }, buscador), secciones, vacio, manual);
  if (window.matchMedia('(hover: hover)').matches) buscador.focus();
  return promesa;
}

// ---------- Confirmación ----------
export function confirmar({ titulo, texto, aceptar = 'Aceptar', peligro = true }) {
  const cancelar = el('button', { type: 'button', class: 'boton', text: 'Cancelar' });
  const ok = el('button', { type: 'button', class: `boton ${peligro ? 'peligro-solido' : 'primario'}`, text: aceptar });
  const cuerpo = el('div', { class: 'dialogo-cuerpo' }, el('p', { class: 'confirmar-texto', text: texto }), el('div', { class: 'confirmar-acciones' }, cancelar, ok));
  const { promesa, finalizar } = crearDialogo({ titulo, cuerpo, clase: 'dialogo-confirmar' });
  cancelar.addEventListener('click', () => finalizar(null));
  ok.addEventListener('click', () => finalizar(true));
  cancelar.focus();
  return promesa.then((valor) => valor === true);
}
