// Interfaz: arma el DOM, conecta eventos y pinta los resultados de calc.js.
// Todo texto del usuario entra por textContent o value, nunca por innerHTML.
import { analizar, NOTAS } from './calc.js';
import { cargar, guardar, borrar, estadoInicial, cuatrimestreNuevo, materiaVacia } from './estado.js';

let storage = null;
try {
  storage = window.localStorage;
} catch {
  storage = null;
}

let estado = cargar(storage);
let guardadoOk = true;
let refs = [];

const $ = (id) => document.getElementById(id);

function el(etiqueta, props = {}, ...hijos) {
  const nodo = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(props)) {
    if (valor === false || valor == null) continue;
    if (clave === 'class') nodo.className = valor;
    else if (clave === 'text') nodo.textContent = valor;
    else if (clave === 'value') nodo.value = valor;
    else if (clave.startsWith('on')) nodo.addEventListener(clave.slice(2), valor);
    else nodo.setAttribute(clave, valor === true ? '' : valor);
  }
  nodo.append(...hijos);
  return nodo;
}

// Décimas enteras a texto: 18 -> "1.8".
const fmt = (decimas) => (decimas == null ? 'sin datos' : (decimas / 10).toFixed(1));
const fmtExacto = (centesimas) => (centesimas == null ? '' : `exacto ${(centesimas / 100).toFixed(2)}`);

const ETIQUETA_CONDICION = { normal: 'Condición normal', prueba: 'A prueba académica' };
const NOTA_NEUTRAL = {
  primero: 'Primer cuatrimestre: no afecta tu condición académica.',
  'una-sola-materia': 'Una sola asignatura: no afecta tu condición académica.',
  'sin-datos': 'Escribe créditos y notas para ver los índices.',
};
const ETIQUETA_OPCION = { FN: 'FN (inasistencia)', R: 'R (retirada)' };

function cambio(estructural) {
  guardadoOk = guardar(storage, estado);
  if (estructural) renderLista();
  else actualizar();
}

function enfocar(ci, mi) {
  const fila = refs[ci]?.filas[mi];
  if (fila) fila.nombre.focus();
}

function construirFila(cuatrimestre, materia, ci, mi) {
  const sufijo = `materia ${mi + 1}, cuatrimestre ${ci + 1}`;
  const nombre = el('input', {
    type: 'text', class: 'campo-nombre', placeholder: 'Materia', autocomplete: 'off',
    maxlength: '80', 'aria-label': `Nombre de la ${sufijo}`, value: materia.nombre,
  });
  const creditos = el('input', {
    type: 'number', class: 'campo-creditos', placeholder: 'Créd.', min: '1', step: '1',
    inputmode: 'numeric', 'aria-label': `Créditos de la ${sufijo}`,
  });
  creditos.value = materia.creditos == null ? '' : String(materia.creditos);
  const nota = el(
    'select',
    { class: 'campo-nota', 'aria-label': `Nota de la ${sufijo}` },
    el('option', { value: '', text: 'Sin nota' }),
    ...NOTAS.map((n) => el('option', { value: n, text: ETIQUETA_OPCION[n] ?? n })),
  );
  nota.value = materia.nota;
  const quitar = el('button', {
    type: 'button', class: 'icono', title: 'Quitar materia', text: '×',
    'aria-label': `Quitar la ${sufijo}`,
    onclick: () => { cuatrimestre.materias.splice(mi, 1); cambio(true); },
  });
  const mensaje = el('p', { class: 'mensaje' });
  const raiz = el('div', { class: 'fila' }, nombre, creditos, nota, quitar, mensaje);

  nombre.addEventListener('input', () => { materia.nombre = nombre.value; cambio(false); });
  creditos.addEventListener('input', () => {
    if (creditos.value === '') materia.creditos = creditos.validity.badInput ? NaN : null;
    else materia.creditos = Number(creditos.value);
    cambio(false);
  });
  nota.addEventListener('change', () => { materia.nota = nota.value; cambio(false); });
  return { raiz, nombre, mensaje };
}

function dato(titulo, clase = '') {
  const texto = document.createTextNode('');
  const sub = el('span', { class: 'sub' });
  const valor = el('dd', {}, texto, sub);
  return { raiz: el('div', { class: `dato ${clase}`.trim() }, el('dt', { text: titulo }), valor), texto, sub };
}

function construirCuatrimestre(cuatrimestre, ci) {
  const nombre = el('input', {
    type: 'text', class: 'cuatri-nombre', maxlength: '60', autocomplete: 'off',
    'aria-label': `Nombre del cuatrimestre ${ci + 1}`, value: cuatrimestre.nombre,
  });
  nombre.addEventListener('input', () => { cuatrimestre.nombre = nombre.value; cambio(false); });
  const quitar = el('button', {
    type: 'button', class: 'secundario', text: 'Quitar cuatrimestre',
    'aria-label': `Quitar el cuatrimestre ${ci + 1}`,
    onclick: () => {
      const etiqueta = cuatrimestre.nombre.trim() || `el cuatrimestre ${ci + 1}`;
      if (!window.confirm(`¿Quitar "${etiqueta}" y todas sus materias?`)) return;
      estado.cuatrimestres.splice(ci, 1);
      cambio(true);
    },
  });
  quitar.style.marginTop = '0';

  const cuerpo = el(
    'div', { class: 'materias' },
    el('div', { class: 'fila fila-cabecera', 'aria-hidden': 'true' },
      el('span', { text: 'Materia' }), el('span', { text: 'Créditos' }), el('span', { text: 'Nota' }), el('span')),
  );
  const filas = cuatrimestre.materias.map((materia, mi) => {
    const fila = construirFila(cuatrimestre, materia, ci, mi);
    cuerpo.append(fila.raiz);
    return fila;
  });
  const agregarMateria = el('button', {
    type: 'button', class: 'secundario', text: 'Agregar materia',
    onclick: () => {
      cuatrimestre.materias.push(materiaVacia());
      cambio(true);
      enfocar(ci, cuatrimestre.materias.length - 1);
    },
  });

  const puntos = dato('Puntos');
  const creditos = dato('Créditos');
  const indice = dato('Índice cuatrimestral', 'principal');
  const acum = dato('Acumulado hasta aquí');
  const condicion = el('p', { class: 'cuatri-condicion' });
  const notaNeutral = el('p', { class: 'cuatri-nota' });
  const pie = el(
    'div', { class: 'totales' },
    el('dl', { class: 'datos' }, indice.raiz, puntos.raiz, creditos.raiz, acum.raiz),
    condicion, notaNeutral,
  );

  const raiz = el(
    'article', { class: 'cuatri' },
    el('div', { class: 'cuatri-cabecera' }, nombre, quitar),
    cuerpo, agregarMateria, pie,
  );
  return { raiz, filas, puntos, creditos, indice, acum, condicion, notaNeutral };
}

function renderLista() {
  const lista = $('lista');
  lista.replaceChildren();
  refs = estado.cuatrimestres.map((cuatrimestre, ci) => {
    const construido = construirCuatrimestre(cuatrimestre, ci);
    lista.append(construido.raiz);
    return construido;
  });
  actualizar();
}

function mensajeDeFila(materia, ci, sustituidaPor) {
  const creditosPresentes = materia.creditos != null;
  const creditosValidos = Number.isInteger(materia.creditos) && materia.creditos > 0;
  if (creditosPresentes && !creditosValidos) {
    return { texto: 'Los créditos deben ser un entero positivo.', clase: 'error' };
  }
  if (materia.nota !== '' && materia.nota !== 'R' && !creditosPresentes) {
    return { texto: 'Escribe los créditos para que esta materia cuente.', clase: 'error' };
  }
  if (sustituidaPor !== undefined) {
    const donde = sustituidaPor === ci ? 'por una fila posterior de este cuatrimestre' : `por el cuatrimestre ${sustituidaPor + 1}`;
    return { texto: `Sustituida en el acumulado ${donde}.`, clase: 'info' };
  }
  if (materia.nota === 'R') return { texto: 'Retirada: no cuenta para el índice.', clase: 'info' };
  return { texto: '', clase: '' };
}

function textoHonor(resultado) {
  if (resultado.acumuladoFinal.decimas == null) return 'El honor se calcula cuando haya notas.';
  return resultado.honor
    ? `Si te graduaras hoy: ${resultado.honor}.`
    : 'Si te graduaras hoy: sin honor (Cum laude desde 3.2).';
}

function renderAvisos(resultado) {
  const mensajes = [];
  if (resultado.alertas.pa3) {
    mensajes.push(
      'Llevas 3 cuatrimestres consecutivos a prueba académica: el reglamento prevé la separación de la carrera (art. 33). ' +
      'Dura 2 cuatrimestres consecutivos si aprobaste el 50 % o más de los créditos de la carrera, y 3 si aprobaste menos.',
    );
  } else if (resultado.rachaPrueba > 0) {
    mensajes.push(`Llevas ${resultado.rachaPrueba} de 3 cuatrimestres consecutivos a prueba académica.`);
  }
  for (const { nombre, veces } of resultado.alertas.reprobaciones) {
    mensajes.push(
      `Reprobaste "${nombre}" ${veces} veces: el reglamento prevé la separación de la carrera (art. 33). ` +
      'Podrías solicitar readmisión a otra carrera que no tenga esa asignatura como obligatoria.',
    );
  }
  if (resultado.alertas.bajoMinimo) {
    mensajes.push('Tu acumulado está por debajo de 2.0, el mínimo que exige el art. 38 para graduarte.');
  }
  const contenedor = $('avisos');
  contenedor.replaceChildren(...mensajes.map((texto) => el('p', { class: 'aviso', text: texto })));
  contenedor.hidden = mensajes.length === 0;
}

function actualizar() {
  const resultado = analizar(estado);
  const final = resultado.acumuladoFinal;

  $('acum-valor').textContent = fmt(final.decimas);
  $('acum-exacto').textContent = fmtExacto(final.centesimas);
  $('acum-detalle').textContent = final.creditos > 0
    ? `${final.puntos} puntos / ${final.creditos} créditos`
    : 'Aún no hay materias con nota';
  const condicion = $('condicion');
  condicion.textContent = ETIQUETA_CONDICION[resultado.condicionActual];
  condicion.dataset.estado = resultado.condicionActual;
  $('honor').textContent = textoHonor(resultado);
  renderAvisos(resultado);

  resultado.cuatrimestres.forEach((analisis, ci) => {
    const ref = refs[ci];
    if (!ref) return;
    ref.puntos.texto.data = String(analisis.indice.puntos);
    ref.creditos.texto.data = String(analisis.indice.creditos);
    ref.indice.texto.data = fmt(analisis.indice.decimas);
    ref.indice.sub.textContent = analisis.indice.centesimas == null ? '' : ` (${fmtExacto(analisis.indice.centesimas)})`;
    ref.acum.texto.data = fmt(analisis.acumulado.decimas);
    ref.condicion.dataset.estado = analisis.condicion;
    ref.condicion.replaceChildren(
      document.createTextNode('Condición: '),
      el('strong', { text: ETIQUETA_CONDICION[analisis.condicion] }),
    );
    ref.condicion.hidden = analisis.neutral === 'sin-datos';
    ref.notaNeutral.textContent = analisis.neutral ? NOTA_NEUTRAL[analisis.neutral] : '';

    estado.cuatrimestres[ci].materias.forEach((materia, mi) => {
      const fila = ref.filas[mi];
      if (!fila) return;
      const clave = `${ci}:${mi}`;
      const por = Object.hasOwn(resultado.sustituidas, clave) ? resultado.sustituidas[clave] : undefined;
      const { texto, clase } = mensajeDeFila(materia, ci, por);
      fila.mensaje.textContent = texto;
      fila.mensaje.className = `mensaje ${clase}`.trim();
      fila.raiz.classList.toggle('sustituida', por !== undefined);
    });
  });

  $('guardado').textContent = guardadoOk
    ? 'Tus datos se guardan solo en este navegador.'
    : 'Tu navegador no permite guardar: los datos se perderán al cerrar la pestaña.';
}

$('agregar').addEventListener('click', () => {
  estado.cuatrimestres.push(cuatrimestreNuevo(estado.cuatrimestres.length + 1));
  cambio(true);
  enfocar(estado.cuatrimestres.length - 1, 0);
});

$('borrar').addEventListener('click', () => {
  if (!window.confirm('¿Borrar todos los cuatrimestres y materias de este navegador?')) return;
  borrar(storage);
  estado = estadoInicial();
  cambio(true);
});

renderLista();
