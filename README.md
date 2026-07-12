# TFG — Aplicación web fitness con corrección postural

Aplicación web full-stack para entrenamiento fitness con un módulo de
**corrección de postura** que analiza el ángulo de las articulaciones en
el navegador mediante MediaPipe Pose.

**Autor:** Juan Manuel Cárdenas Recio
**Tutor:** Eduardo Guzmán de los Riscos
**Universidad de Málaga** — E.T.S. de Ingeniería Informática

---

## Estructura del repositorio

```
tfg-fitness-postura/
├── docs/        Memoria y diario del TFG (LaTeX, plantilla oficial UMA-ETSI)
├── frontend/    Aplicación Angular            (se añadirá más adelante)
└── backend/     Aplicación Spring Boot + MySQL (se añadirá más adelante)
```

## Tecnologías

- **Frontend:** Angular
- **Backend:** Spring Boot
- **Base de datos:** MySQL
- **Corrección postural:** MediaPipe Pose (detección de landmarks en navegador)

## Compilar la memoria

La memoria usa la plantilla oficial de la ETSI, que emplea fuentes propias
de la UMA. Por ello **debe compilarse con XeLaTeX (o LuaLaTeX)**, no con
pdflatex, y usa **biber** para la bibliografía.

- En **Overleaf:** menú del proyecto → *Compiler* → **XeLaTeX**.
- En **local:** compilar `docs/main.tex` con `xelatex` + `biber`.
