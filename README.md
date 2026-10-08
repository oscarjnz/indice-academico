# Índice académico de Derecho (PUCMM)

Web para calcular el **índice cuatrimestral** y el **índice acumulado** de la Licenciatura en Derecho de la PUCMM, con la escala de letras A, B, C, D y F del Reglamento Académico de Grado.

**Pruébala:** https://indice-academico.vercel.app (también en https://oscarjnz.github.io/indice-academico/)

## Cómo se usa

1. Elige el **cuatrimestre del pensum** que cerraste (Año 1 Período 1 a Año 4 Período 3). Se cargan sus materias con sus créditos.
2. Toca la **nota** de cada materia (A, B, C, D, F; FN para reprobada por inasistencia, R para retirada). Si retiraste una materia o no la tomaste, quítala con la ×.
3. **Agregar cuatrimestre** te ofrece primero el período que sigue al último que agregaste; los anteriores quedan a un toque.
4. **Agregar materia** dentro de un cuatrimestre busca en todo el pensum (sin importar tildes) para recuperar una que quitaste, repetir una de otro período o adelantar una; también puedes escribir una materia que no esté.

Los cálculos se actualizan al instante y tus datos se guardan solo en tu navegador ("Borrar todo" los elimina). Se ve bien en celular y en escritorio, en modo claro y oscuro.

La página te muestra:

- el índice de cada cuatrimestre y el **acumulado**,
- tu **condición académica** (normal o a prueba) tras cada cuatrimestre,
- el avance en **créditos aprobados** (de 232) con barra de progreso,
- avisos de **separación** (tres cuatrimestres consecutivos a prueba, o reprobar tres veces la misma materia), con el tiempo exacto según tu avance,
- el **honor** al que apuntas si te graduaras hoy y si cumples el mínimo de 2.0 para graduarte.

## Reglas implementadas

| Nota | Puntos | Porcentaje |
|---|---|---|
| A | 4 | 90 a 100 |
| B | 3 | 80 a 89 |
| C | 2 | 70 a 79 |
| D | 1 | 60 a 69 |
| F | 0 | 59 o menos |

- Puntos de una materia = créditos x valor de la nota. **Índice = total de puntos / total de créditos.**
- El índice se redondea a un decimal: si la segunda cifra decimal es 5 o más, sube una décima (35 / 19 = 1.84 pasa a 1.8; 179 / 78 = 2.29 pasa a 2.3). El cálculo usa solo aritmética entera, así que no hay errores de coma flotante.
- **FN** vale 0 y cuenta. **R** (retirada) y las materias sin nota no cuentan.
- **Materias repetidas:** en el índice acumulado una misma materia cuenta una sola vez, con la última calificación y los créditos de ese momento (art. 26.3 del reglamento). En el índice de su propio cuatrimestre sigue contando.
- **Condición normal:** al menos uno de los dos últimos índices cuatrimestrales es 2.0 o más, y el acumulado es 2.0 o más. **Prueba académica:** dos cuatrimestres consecutivos con índice menor que 2.0, o acumulado menor que 2.0. No afectan la condición el primer cuatrimestre con materias y los cuatrimestres con una sola asignatura.
- **Separación:** dura dos cuatrimestres consecutivos si ya aprobaste el 50 % o más de los créditos de la carrera (116 de 232) y tres si aprobaste menos.
- **Créditos aprobados:** cuentan las materias del pensum con D o mejor en su última calificación.

### Interpretaciones

El reglamento no precisa algunos casos, y esta herramienta toma estas decisiones (también se explican en la página):

- Los cuatrimestres se ordenan según el pensum. "Dos cuatrimestres consecutivos" son cuatrimestres adyacentes en esa lista; uno sin efecto en medio rompe la cadena.
- Un cuatrimestre sin efecto hereda la condición anterior al contar los tres seguidos a prueba.
- Una materia con nota R no cuenta como cursada para decidir si tuviste una sola asignatura.

Es una herramienta informativa. La condición académica oficial la confirma Registro.

## Fuentes

- Pensum de la Licenciatura en Derecho de la PUCMM (Facultad de Ciencias Sociales, Humanidades y Artes): 12 períodos y 232 créditos.
- Reglamento Académico de Grado de la PUCMM (vigente desde el cuatrimestre 1-2018-2019), artículos 20, 25, 26, 31, 32, 33, 37 y 38: https://pucmm.edu.do/wp-content/uploads/2026/07/reglamento-academico-grado.pdf

## Desarrollo

Sin dependencias ni paso de build: HTML, CSS y JavaScript con módulos ES.

```text
index.html
styles/main.css
src/
  app.js                      entrada: estado, eventos y render
  core/calc.js                reglas del reglamento (puro, sin DOM)
  core/progreso.js            créditos aprobados y tiempo de separación
  core/estado.js              modelo de datos, validación y persistencia
  data/pensum-derecho.js      el pensum (generado)
  ui/                         tarjetas, diálogos, panel de resumen y helpers
scripts/extraer_pensum.py     genera src/data/pensum-derecho.js desde el PDF oficial
tests/                        pruebas automáticas
```

```bash
npm test        # node --test (Node 20 o superior)
npm start       # servidor estático en http://localhost:8080
```

Los módulos ES no cargan desde `file://`, por eso se usa un servidor estático para abrirla en local.

`src/data/pensum-derecho.js` se generó con `scripts/extraer_pensum.py` (requiere `pymupdf`) a partir del PDF oficial del pensum, que no se incluye en el repositorio. Para regenerarlo, coloca el PDF en `docs/fuentes/pensum-derecho.pdf` y ejecuta `python scripts/extraer_pensum.py`; el script verifica que las sumas por período coincidan con las del PDF y que el total sea 232 créditos.
