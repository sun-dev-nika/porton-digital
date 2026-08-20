# Portón Digital

Sistema de control de acceso para condominios: invitaciones con QR para
residentes y validación/registro de ingresos para guardias.

## Demo en vivo

| Qué | Link |
|-----|------|
| Backend (API REST) | https://backend-production-c8515.up.railway.app |
| App mobile (build web) | https://porton-digital-mobile.vercel.app |

> El build web permite recorrer todo el flujo de **residente** (login, crear
> invitación, ver QR, historial de ingresos, push). El flujo de **guardia**
> que depende de la cámara nativa (`expo-camera` para escanear el QR) no es
> utilizable en el build web — para eso ver el video/GIF de abajo, o correr
> la app en un dispositivo real/emulador con `expo start`.

**Credenciales de prueba** (sembradas en el backend desplegado):

| Rol | Email | Password |
|-----|-------|----------|
| Resident | `resident@dev.local` | `dev-password-123` |
| Guard | `guard@dev.local` | `dev-password-123` |

### Video — flujo de escaneo del guardia

_Pendiente: grabación del escaneo de QR con cámara nativa (no disponible en
el build web). Se agrega aquí en cuanto esté lista._

> Este repo usa el arnés de **Harness Engineering** (adaptado de
> `harness-sdd-main`) para que un agente de IA trabaje de forma autónoma y
> verificable. El arnés vive en disco pero **no se sube a git** — ver
> `.gitignore` — con la excepción de este mismo `README.md`, que se publica
> a propósito para mostrar el link en vivo y el video de portafolio. Solo
> `backend/`, `mobile/` y `README.md` quedan versionados en
> `https://github.com/sun-dev-nika/porton-digital`.

## Cómo está organizado el arnés

| Pilar                                  | Manifestación en este repo                                                       |
|----------------------------------------|----------------------------------------------------------------------------------|
| **1. El repositorio ES el sistema**    | `AGENTS.md`, `init.sh`, `feature_list.json`, `specs/`, `progress/`, `docs/`      |
| **2. Orquestación multi-agente**       | `.claude/agents/leader.md`, `spec_author.md`, `implementer.md`, `reviewer.md`    |
| **3. Spec Driven Development**         | `docs/specs.md`, EARS notation, puerta de aprobación humana en `spec_ready`      |
| **4. Supervisión y mejora**            | `CHECKPOINTS.md`, hooks en `.claude/settings.json`, `backend/tests/`, `mobile/tests/` |

## Para empezar

```bash
./init.sh
```

Si todo está verde, abre `AGENTS.md` y sigue desde ahí.

## Stack

- **Backend:** Node.js (>=22.5) + Express + TypeScript estricto, SQLite (`node:sqlite`
  built-in, sin ORM, SQL parametrizado directo). Roles `resident` / `guard` vía JWT.
  Desplegado en **Railway** (volumen persistente para el `.sqlite`).
- **Mobile:** Expo + React Native + TypeScript estricto, `expo-router`, `expo-camera` para
  escaneo QR, `expo-secure-store` para el JWT, `expo-notifications` + Expo Push API para
  push real. Build web (`expo export --platform web`) desplegado en **Vercel**.
- **Fase 2 (no empezada):** `admin-web/` en Next.js, rol `admin`.

## Flujo de trabajo (SDD)

```
pending → [spec_author] → spec_ready → ⏸ HUMANO → in_progress → [implementer → reviewer] → done
```

1. El `leader` lanza `spec_author` para la primera feature `pending` con `"sdd": true`, que
   escribe `specs/<feature>/{requirements.md, design.md, tasks.md}` y deja la feature en
   `spec_ready`.
2. **Pausa.** El humano lee el spec y aprueba (o pide cambios).
3. El `leader` transiciona a `in_progress` y lanza `implementer` (ejecuta `tasks.md`) y luego
   `reviewer` (verifica trazabilidad `R<n>` ↔ test).

Dónde queda la traza de cada subagente:

| Archivo                                  | Quién lo escribe   | Qué contiene                                                  |
|------------------------------------------|--------------------|---------------------------------------------------------------|
| `specs/<feature>/requirements.md`        | spec_author        | EARS requirements numeradas `R1`, `R2`, ...                  |
| `specs/<feature>/design.md`              | spec_author        | Decisiones técnicas + alternativa descartada                  |
| `specs/<feature>/tasks.md`               | spec_author        | Checklist; el implementer la va marcando `[x]`                |
| `progress/current.md`                    | leader             | Plan vivo de la sesión                                        |
| `progress/impl_<feature>.md`             | implementer        | Archivos tocados + mapa `R<n> → test` + output de los tests   |
| `progress/review_<feature>.md`           | reviewer           | Checklist contra `docs/`, `specs/<feature>/` y `CHECKPOINTS.md` |
| `feature_list.json`                      | leader/implementer | `pending` → `spec_ready` → `in_progress` → `done`             |
| `progress/history.md`                    | leader             | Resumen append-only al cerrar la sesión                       |

## Estructura

```
.
├── AGENTS.md              # Mapa para agentes (divulgación progresiva)      — NO va a git
├── CHECKPOINTS.md         # Criterios de "estado final correcto"            — NO va a git
├── feature_list.json      # Alcance: una feature a la vez                  — NO va a git
├── init.sh                # Verificación e inicialización                  — NO va a git
├── scripts/validate-features.mjs  # Validador de feature_list.json          — NO va a git
├── specs/<feature>/       # Spec por feature (Kiro-style)                  — NO va a git
├── progress/               # current.md + history.md                       — NO va a git
├── docs/                   # architecture, conventions, specs, verification — NO va a git
├── .claude/                # agents/ + settings.json                       — NO va a git
├── backend/                # Express + TS + SQLite                         — SÍ va a git
│   ├── src/{routes,services,db}/
│   └── tests/
├── mobile/                 # Expo + RN + TS                                — SÍ va a git
│   ├── src/{screens,api,hooks}/
│   └── tests/
└── README.md               # Este archivo — portafolio, SÍ va a git (única excepción del arnés)
```

## Aprendizajes que ilustra este proyecto

- **Divulgación progresiva** en `AGENTS.md`.
- **Una feature a la vez**, validado por `init.sh` / `scripts/validate-features.mjs`.
- **Spec Driven Development** estilo Kiro con puerta de aprobación humana.
- **Estado en disco**, no en chat.
- **Verificación ejecutable** contra bases de datos reales (SQLite temporal), sin mocks.
- **Trazabilidad obligatoria** `R<n>` ↔ test.
- **Patrón Leader-Spec-Implementer-Reviewer**.
- **Arnés separado del producto**: el proceso de desarrollo no contamina el repo que se
  distribuye.
