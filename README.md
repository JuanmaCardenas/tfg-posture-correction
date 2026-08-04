# PoseCoach

Aplicación web de fitness con **corrección postural asistida**. Incluye un catálogo de
ejercicios con valoraciones, comentarios y favoritos, y un módulo que analiza la técnica
de ejecución a partir de un vídeo, procesado **íntegramente en el navegador** mediante
MediaPipe Pose (los vídeos nunca salen del dispositivo del usuario).

Proyecto de Fin de Grado (TFG) — Grado en Ingeniería Informática, ETSI Informática,
Universidad de Málaga.

---

## Características

- **Autenticación** de usuarios con JWT (registro, inicio y cierre de sesión).
- **Catálogo de ejercicios** con filtrado por grupo muscular y nivel de dificultad.
- **Detalle de ejercicio** con descripción, consejos de ejecución y vídeo de YouTube embebido.
- **Valoraciones** (estrellas) y **comentarios**, con media agregada por ejercicio.
- **Favoritos** por usuario.
- **Corrección postural** de cuatro ejercicios (sentadilla, plancha, flexión y zancada):
  el análisis se ejecuta en el navegador con MediaPipe PoseLandmarker y devuelve una
  puntuación junto con mensajes de corrección.
- **Perfil de usuario** (editar correo, cambiar contraseña) e historial con los últimos
  análisis realizados.

## Stack tecnológico

| Capa          | Tecnología                                                           |
|---------------|----------------------------------------------------------------------|
| Frontend      | Angular 22 (componentes standalone, signals), TypeScript             |
| Visión        | MediaPipe Pose (PoseLandmarker) en WebAssembly, lado cliente         |
| Backend       | Spring Boot 4.1, Java 21, Maven, Spring Security + JWT (jjwt)        |
| Base de datos | MySQL 8.4                                                            |
| Despliegue    | Docker, Docker Compose, Caddy (servidor web + proxy inverso + HTTPS) |

## Estructura del repositorio

```
tfg-posture-correction/
├── backend/            # API REST con Spring Boot (paquete es.uma.fitness)
│   └── Dockerfile
├── frontend/           # Aplicación Angular
│   ├── Dockerfile
│   └── Caddyfile       # Sirve la SPA y hace de proxy inverso de /api
├── docs/               # Memoria del TFG (LaTeX)
├── docker-compose.yml  # Orquesta base de datos + backend + frontend
└── .env.example        # Plantilla de variables de entorno (copiar a .env)
```

---

## Puesta en marcha con Docker (recomendado)

Levanta el sistema completo (base de datos, backend y frontend) con un solo comando.

### Requisitos previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye Docker Compose).

### Pasos

1. Clona el repositorio y sitúate en su raíz:

   ```bash
   git clone https://github.com/<usuario>/tfg-posture-correction.git
   cd tfg-posture-correction
   ```

2. Crea el fichero de variables de entorno a partir de la plantilla:

   ```bash
   cp .env.example .env
   ```

   Edita el `.env` y, sobre todo, pon una clave `JWT_SECRET` **aleatoria de al menos 32
   caracteres** (ver la sección de variables de entorno más abajo).

3. Construye y arranca los contenedores:

   ```bash
   docker compose up -d --build
   ```

4. Abre la aplicación en el navegador:

   ```
   http://localhost
   ```

   La primera vez, la base de datos se inicializa vacía y el catálogo de ejercicios se
   carga automáticamente. Regístrate con un usuario nuevo y empieza a usar la aplicación.

### Comandos útiles

```bash
docker compose ps            # estado de los servicios
docker compose logs -f       # logs en vivo
docker compose down          # parar (conserva los datos)
docker compose down -v       # parar y BORRAR los datos (base de datos limpia)
```

---

## Modo desarrollo

Para trabajar en el código con recarga en caliente, se ejecutan el backend y el frontend
por separado y solo la base de datos en contenedor.

1. **Base de datos** — levanta únicamente MySQL:

   ```bash
   docker compose up -d mysql
   ```

2. **Backend** — desde `backend/`, con Java 21 y Maven (o desde el IDE):

   ```bash
   ./mvnw spring-boot:run
   ```

   Queda accesible en `http://localhost:8080`.

3. **Frontend** — desde `frontend/`, con Node 22:

   ```bash
   npm install
   npm start          # ng serve
   ```

   Queda accesible en `http://localhost:4200` y apunta al backend en el 8080.

> En desarrollo, el frontend (4200) y el backend (8080) están en orígenes distintos y la
> comunicación se apoya en la configuración de CORS del backend. En el despliegue con
> Docker, en cambio, Caddy sirve ambos bajo un mismo origen y esa configuración deja de
> ser necesaria.

---

## Variables de entorno

Se definen en el fichero `.env` de la raíz (no versionado). La plantilla `.env.example`
documenta las claves:

| Variable              | Descripción                                                                                    | Ejemplo                         |
|-----------------------|------------------------------------------------------------------------------------------------|---------------------------------|
| `MYSQL_ROOT_PASSWORD` | Contraseña del usuario root de MySQL.                                                          | `fitness_root`                  |
| `JWT_SECRET`          | Clave de firma de los tokens JWT (**mínimo 32 caracteres**).                                   | cadena aleatoria larga          |
| `SITE_ADDRESS`        | Dirección que sirve Caddy. `:80` en local; un dominio en producción (activa HTTPS automático). | `:80` / `posecoach.ejemplo.com` |

Para generar una clave aleatoria en PowerShell:

```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | % {[char]$_})
```

---

## Base de datos

- El esquema lo genera Hibernate automáticamente al arrancar el backend
  (`spring.jpa.hibernate.ddl-auto=update`).
- El catálogo inicial de ejercicios se carga mediante un componente idempotente: solo se
  inserta si la base de datos está vacía, de modo que reiniciar la aplicación no duplica
  ni altera los datos.
- Para partir de una base de datos limpia (sin usuarios ni valoraciones), usa
  `docker compose down -v` y vuelve a levantar.

## Módulo de corrección postural

El análisis de pose se ejecuta en el navegador con MediaPipe PoseLandmarker sobre
WebAssembly. Los vídeos **no se suben al servidor**: se procesan localmente y solo se
persiste la puntuación resultante. La herramienta asume grabaciones de perfil, con el
cuerpo completo visible y buena iluminación; fuera de esas condiciones el sistema no emite
una puntuación arbitraria, sino que rechaza la grabación.

## Documentación

La memoria del TFG se encuentra en `docs/`, escrita en LaTeX con la plantilla de la ETSI
Informática de la UMA.

---

## Autoría

Trabajo de Fin de Grado de **Juan Manuel Cárdenas Recio**.
Tutor: **Eduardo Guzmán de los Riscos**.
ETSI Informática — Universidad de Málaga.