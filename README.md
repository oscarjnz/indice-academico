# Calculadora de índice académico

Web de una sola página para calcular el **índice cuatrimestral** y el **índice acumulado** con la escala de letras A, B, C, D y F del Reglamento Académico de Grado de la PUCMM.

**Pruébala:** https://oscarjnz.github.io/indice-academico/

## Cómo se usa

1. Al cerrar un cuatrimestre, escribe cada materia con sus **créditos** y la **nota** en letra.
2. El índice cuatrimestral y el acumulado se actualizan mientras escribes.
3. Con "Agregar cuatrimestre" sigues sumando períodos. Tus datos quedan guardados en tu navegador (nunca salen de tu equipo) y "Borrar todo" los elimina.

Además del índice, la página te muestra:

- tu **condición académica** (normal o a prueba) tras cada cuatrimestre,
- avisos de **separación** (tres cuatrimestres consecutivos a prueba, o reprobar tres veces la misma materia),
- el **honor** al que apuntas si te graduaras hoy (Cum laude, Magna cum laude, Summa cum laude) y si cumples el mínimo de 2.0 para graduarte.

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
- **FN** (reprobada por inasistencia excesiva) vale 0 y cuenta. **R** (retirada), las materias sin nota y las de créditos inválidos no cuentan.
- **Materias repetidas:** en el índice acumulado una misma materia cuenta una sola vez, con la última calificación y los créditos de ese momento (art. 26.3 del reglamento). En el índice de su propio cuatrimestre sigue contando. Se detecta por el nombre, sin distinguir mayúsculas ni acentos.
- **Condición normal:** al menos uno de los dos últimos índices cuatrimestrales es 2.0 o más, y el acumulado es 2.0 o más. **Prueba académica:** dos cuatrimestres consecutivos con índice menor que 2.0, o acumulado menor que 2.0. No afectan la condición el primer cuatrimestre y los cuatrimestres con una sola asignatura.
- **Separación:** dura dos cuatrimestres consecutivos si aprobaste el 50 % o más de los créditos de la carrera, y tres si aprobaste menos.

### Interpretaciones

El reglamento no precisa algunos casos, y esta herramienta toma estas decisiones (también se explican en la página):

- "Dos cuatrimestres consecutivos" son cuatrimestres adyacentes en tu lista; uno sin efecto en medio rompe la cadena.
- Un cuatrimestre sin efecto hereda la condición anterior al contar los tres seguidos a prueba.
- Una materia con nota R no cuenta como cursada para decidir si tuviste una sola asignatura.

Es una herramienta informativa. La condición académica oficial la confirma Registro.

## Fuentes

- Reglamento Académico de Grado de la PUCMM (vigente desde el cuatrimestre 1-2018-2019), artículos 20, 25, 26, 31, 32, 33, 37 y 38: https://pucmm.edu.do/wp-content/uploads/2026/07/reglamento-academico-grado.pdf
- Presentación "Reglamento académico" de la clase, cuyos dos ejemplos resueltos son casos de prueba del proyecto.

## Desarrollo

Sin dependencias ni paso de build: HTML, CSS y JavaScript con módulos ES.

```text
calc.js     lógica pura del cálculo (sin DOM)
estado.js   forma del estado, validación y persistencia (almacenamiento inyectado)
app.js      interfaz
tests/      pruebas automáticas
```

```bash
npm test        # node --test (Node 20 o superior)
npm start       # servidor estático en http://localhost:8080
```

Los módulos ES no cargan desde `file://`, por eso se usa un servidor estático para abrirla en local.
