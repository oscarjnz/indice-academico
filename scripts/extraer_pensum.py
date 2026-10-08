"""Genera src/data/pensum-derecho.js a partir del PDF oficial del pensum.

Uso (desde la raíz del proyecto):
    python scripts/extraer_pensum.py

Requiere pymupdf (pip install pymupdf). Lee docs/fuentes/pensum-derecho.pdf,
valida que la suma de créditos de cada período coincida con el total que trae
el PDF y que la carrera sume 232 créditos, y escribe el módulo de datos.
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

import pymupdf

RAIZ = Path(__file__).resolve().parent.parent
ENTRADA = RAIZ / "docs" / "fuentes" / "pensum-derecho.pdf"
SALIDA = RAIZ / "src" / "data" / "pensum-derecho.js"
TOTAL_ESPERADO = 232
RUIDO = {
    "Leyenda", "T", "Horas Teóricas", "P", "Horas Prácticas", "C", "Créditos",
    "Facultad de Ciencias Sociales,", "Humanidades y Artes",
    "Plan de estudios: Licenciatura en", "Derecho", "Pensum", "Pénsum",
}


def es_numero(texto):
    return re.fullmatch(r"\d+", texto) is not None


def slug(nombre):
    sin_tildes = unicodedata.normalize("NFD", nombre)
    sin_tildes = "".join(c for c in sin_tildes if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", sin_tildes.lower()).strip("-")


def leer_tokens():
    lineas = []
    for pagina in pymupdf.open(ENTRADA):
        lineas += [l.strip() for l in pagina.get_text().split("\n")]
    lineas = [l for l in lineas if l]
    return lineas[lineas.index("Año"):]


def parsear(tokens):
    periodos = []
    actual = None
    k = 0
    while k < len(tokens):
        t = tokens[k]
        if t in RUIDO:
            k += 1
            continue
        if t == "Año":
            anio, periodo = int(tokens[k + 1]), int(tokens[k + 3])
            assert tokens[k + 2] == "Período", f"formato inesperado en {k}"
            k += 4
            if tokens[k] == "Asignatura":  # cabecera repetida al cortar de página
                k += 4
            if actual is None or (actual["anio"], actual["periodo"]) != (anio, periodo):
                actual = {"anio": anio, "periodo": periodo, "materias": [], "total_pdf": None}
                periodos.append(actual)
            continue
        if t == "Total período":
            actual["total_pdf"] = int(tokens[k + 3])  # tokens: T, P, C
            k += 4
            continue
        if k + 3 < len(tokens) and all(es_numero(x) for x in tokens[k + 1:k + 4]) and not es_numero(t):
            actual["materias"].append({"nombre": t, "creditos": int(tokens[k + 3])})
            k += 4
            continue
        raise SystemExit(f"No se pudo interpretar el token {k}: {t!r}")
    return periodos


def construir(periodos):
    usados = set()
    salida = []
    for numero, p in enumerate(periodos, start=1):
        suma = sum(m["creditos"] for m in p["materias"])
        if suma != p["total_pdf"]:
            raise SystemExit(f"Período {numero}: suma {suma} distinta del total del PDF {p['total_pdf']}")
        materias = []
        for m in p["materias"]:
            identificador = slug(m["nombre"])
            if identificador in usados:
                identificador = f"{identificador}-p{numero}"
            usados.add(identificador)
            materias.append({
                "id": identificador,
                "nombre": m["nombre"],
                "creditos": m["creditos"],
                "electiva": "Electiva" in m["nombre"],
            })
        salida.append({
            "numero": numero, "anio": p["anio"], "periodo": p["periodo"],
            "creditos": suma, "materias": materias,
        })
    total = sum(p["creditos"] for p in salida)
    if total != TOTAL_ESPERADO:
        raise SystemExit(f"Total de créditos {total}, se esperaban {TOTAL_ESPERADO}")
    if len(salida) != 12:
        raise SystemExit(f"Se esperaban 12 períodos y hay {len(salida)}")
    return salida, total


def escribir(periodos, total):
    datos = {
        "carrera": "Licenciatura en Derecho",
        "universidad": "PUCMM",
        "totalCreditos": total,
        "periodos": periodos,
    }
    cuerpo = json.dumps(datos, ensure_ascii=False, indent=2)
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(
        "// Generado por scripts/extraer_pensum.py a partir del pensum oficial de la\n"
        "// Licenciatura en Derecho de la PUCMM. No editar a mano: volver a generar.\n"
        f"export const PENSUM = {cuerpo};\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    if not ENTRADA.exists():
        sys.exit(f"No existe {ENTRADA}")
    periodos, total = construir(parsear(leer_tokens()))
    escribir(periodos, total)
    print(f"Pensum escrito en {SALIDA.relative_to(RAIZ)}: {len(periodos)} períodos, {total} créditos")
