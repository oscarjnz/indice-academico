// Panel superior fijo y avisos. Solo pintan lo que calculan core/calc.js y core/progreso.js.
import { $, el, fmt, fmtExacto, ETIQUETA_CONDICION } from './dom.js';

export function pintarResumen(resultado, avance) {
  const final = resultado.acumuladoFinal;
  $('acum-valor').textContent = fmt(final.decimas);
  $('acum-exacto').textContent = fmtExacto(final.centesimas);
  const condicion = $('condicion');
  condicion.textContent = ETIQUETA_CONDICION[resultado.condicionActual];
  condicion.dataset.estado = resultado.condicionActual;

  const texto = `${avance.aprobados} de ${avance.total} créditos aprobados`;
  $('avance-texto').textContent = texto;
  $('avance-pct').textContent = `${avance.porcentaje} %`;
  const barra = document.querySelector('.barra');
  barra.setAttribute('aria-valuemax', String(avance.total));
  barra.setAttribute('aria-valuenow', String(avance.aprobados));
  barra.setAttribute('aria-valuetext', `${texto} (${avance.porcentaje} %)`);
  $('barra-relleno').style.width = `${Math.min(100, (avance.aprobados / avance.total) * 100)}%`;
}

function textoSeparacion(avance) {
  const mitad = avance.tiempoSeparacion === 2 ? '50 % o más' : 'menos del 50 %';
  return `Dura ${avance.tiempoSeparacion} cuatrimestres consecutivos: llevas ${avance.aprobados} de ${avance.total} créditos aprobados (${mitad}).`;
}

export function pintarAvisos(resultado, avance) {
  const mensajes = [];
  const decimas = resultado.acumuladoFinal.decimas;
  if (decimas != null) {
    mensajes.push({
      tipo: 'info',
      texto: resultado.honor
        ? `Si te graduaras hoy: ${resultado.honor}.`
        : 'Si te graduaras hoy: sin honor (Cum laude desde 3.2).',
    });
  }
  if (resultado.alertas.pa3) {
    mensajes.push({
      tipo: 'aviso',
      texto: `Llevas 3 cuatrimestres consecutivos a prueba académica: el reglamento prevé la separación de la carrera (art. 33). ${textoSeparacion(avance)}`,
    });
  } else if (resultado.rachaPrueba > 0) {
    mensajes.push({ tipo: 'aviso', texto: `Llevas ${resultado.rachaPrueba} de 3 cuatrimestres consecutivos a prueba académica.` });
  }
  for (const { nombre, veces } of resultado.alertas.reprobaciones) {
    mensajes.push({
      tipo: 'aviso',
      texto: `Reprobaste "${nombre}" ${veces} veces: el reglamento prevé la separación de la carrera (art. 33). ${textoSeparacion(avance)} Podrías pedir readmisión a otra carrera que no tenga esa asignatura como obligatoria.`,
    });
  }
  if (resultado.alertas.bajoMinimo) {
    mensajes.push({ tipo: 'aviso', texto: 'Tu acumulado está por debajo de 2.0, el mínimo que exige el art. 38 para graduarte.' });
  }
  const contenedor = $('avisos');
  contenedor.replaceChildren(...mensajes.map(({ tipo, texto }) => el('p', { class: `aviso ${tipo}`, text: texto })));
  contenedor.hidden = mensajes.length === 0;
}
