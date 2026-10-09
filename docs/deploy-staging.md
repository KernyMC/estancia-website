# Deploy de staging en Dokploy

Staging es el mismo código y la misma imagen que producción — cambia solo la
env var `SITE_ENV`. Todo lo que no está aquí (Sanity, el proxy de
disponibilidad) no necesita configuración: `lib/sanity.ts` lee del dataset
`production` que es world-readable, y `lib/availability.ts` pega al WP vivo.

> **Ya está creado.** Los pasos 1–6 se ejecutaron el 2026-07-28 vía CLI. Esta
> guía queda como referencia para rehacerlo o para montar producción. Los
> identificadores reales están al final, en «Recursos creados».
>
> Para tareas de Dokploy en general, usa el subagente `dokploy`
> (`.claude/agents/dokploy.md`) — ya tiene este documento y los workarounds
> de abajo como contexto de partida.

## Ramas (2026-07-29)

Esquema de 3 ramas, cada una mapeada 1:1 a algo en Dokploy:

| Rama       | Qué es                          | Dokploy                                | Deploy       |
|------------|----------------------------------|-----------------------------------------|--------------|
| `main`     | Desarrollo — donde se trabaja día a día | nada la sigue directamente        | —            |
| `staging`  | Lo que se prueba                 | `gab-staging-web` → `dev.galapagosandbeyond.com` | auto (push)  |
| `production` | Lo que ya se promovió a vivo   | `gab-production-web` (sin dominio aún, ver abajo) | auto (push)  |

Flujo: se trabaja en `main` → cuando algo está listo para probarse, `git merge main` a `staging` y push (dispara el deploy de staging automático) → cuando ya se verificó ahí, `git merge staging` a `production` y push.

`gab-staging-web` apuntaba a `main` hasta el 2026-07-29; se repunteó a `staging` para que un push a `main` no dispare deploy sin pasar por el merge explícito.

## Notas sobre el CLI de Dokploy (v0.3.0)

Tres cosas que cuestan tiempo si no se saben:

- **Los GET con parámetros devuelven 400.** `apiPost` envuelve el body en
  `{json: ...}` (superjson) pero `apiGet` construye `?input={...}` sin el
  sobre. O sea `project one`, `application one`, `github get-github-repositories`,
  etc. están rotos. Las escrituras (`create`, `save-*`, `deploy`) funcionan.
  Para leer, usa `scripts/dokploy-api.sh` (ya resuelve el sobre `{json:...}`):

  ```bash
  source scripts/dokploy-api.sh
  dget project.one '{"projectId":"..."}'
  dpost application.saveEnvironment '{"applicationId":"...","env":"...","buildArgs":"","buildSecrets":"","createEnvFile":false}'
  ```

- **Git Bash destroza los argumentos que empiezan con `/`.** `--path "/"` llega
  al servidor como `C:/Program Files/Git/` (conversión de rutas MSYS). Exporta
  `MSYS_NO_PATHCONV=1` antes de cualquier comando del CLI.

- **Todos los flags de un `save-*` son obligatorios**, incluso los que no
  aplican: `save-build-type` exige `--herokuVersion` y `--railpackVersion`
  aunque el build sea Dockerfile. Pásalos como `""`.

- **El CLI lee el `.env` del directorio actual.** Ejecútalo desde fuera de
  `web/` para que no mezcle configuración.

- **`application reload` exige `--appName` aunque `--help` no lo marque como
  obligatorio** — mismo patrón que los `save-*`, pero en un comando que no
  empieza con `save-`. Sin él: `error: required option '--appName <value>'
  not specified`. Es el `appName` interno (con el sufijo random que Dokploy
  agrega, no el `name` visible) — está en la respuesta de `dget application.one`.
  **[2026-09-09]** Además, en la práctica el server también exigió
  `--applicationId` en el mismo comando (`--help` no lo marca tampoco) —
  pasar los dos juntos (`--appName "..." --applicationId "..."`) es lo que
  funcionó. No asumir que uno solo alcanza.

- **`reload` vs `redeploy`/`deploy` no son sinónimos** (confirmado leyendo el
  router del server de Dokploy, no solo el `--help`): `reload` reconstruye el
  container/service de Docker a partir de la fila actual de la app en la base
  de datos — incluye env vars recién guardadas con `save-environment` — pero
  **sin** rebuildear la imagen. `redeploy`/`deploy` encolan el pipeline
  completo (git clone + docker build). Para aplicar una env var nueva sin
  tocar código, usa `reload`: más rápido y sin riesgo de que falle un build
  en producción por algo no relacionado.

- **[2026-09-22] Logs del contenedor en runtime: no hay comando de CLI, pero
  sí un WebSocket con el mismo `x-api-key`.** Ni `dokploy docker --help` ni
  `dokploy application --help` exponen "logs" — el visor de logs del panel
  usa un WebSocket aparte (`apps/dokploy/server/wss/docker-container-logs.ts`
  en el repo de Dokploy, no la API tRPC) que sí acepta `x-api-key` vía
  `validateRequest` (mismo mecanismo que el resto del API). Funciona así:

  ```bash
  # 1. appName real (con el sufijo random), no el nombre visible:
  source scripts/dokploy-api.sh
  dget application.one '{"applicationId":"..."}'  # -> campo appName

  # 2. conectar con un cliente ws (el WebSocket estándar de fetch/navegador NO
  #    permite headers custom; usa el paquete npm `ws`, con
  #    new WebSocket(url, {headers:{'x-api-key':token}})):
  wss://panel.galapagosandbeyond.com/docker-container-logs?containerId=<appName>&tail=1000&since=all&runType=swarm
  ```

  Con `runType=swarm` el server corre `docker service logs`, así que
  `containerId` en el query string debe ser el **nombre del service**
  (`appName`, ej. `galapagos-and-beyond-web-app-front-bu7qna`), no el
  containerId corto de 12 hex chars que devuelve
  `docker.getContainersByAppNameMatch` (ese da `no such task or service`).
  Cierra la conexión a mano tras un timeout — es `--follow`, no un dump que
  termine solo.

## 0. Prerequisitos

- Dokploy instalado y accesible en `http://<IP-VPS>:3000`.
- Acceso al DNS de `galapagosandbeyond.com`.
- Claves Stripe **test** y credenciales PayPal **sandbox** a mano.

## 1. Subir el repo a GitHub

El repo local ya está consolidado (un solo `.git`, en la raíz, 2 commits).
Falta el remote. En GitHub: **New repository** → nombre `galapagos-and-beyond`
→ **Private** → sin README/`.gitignore`/licencia (el repo local ya tiene todo).

```bash
git remote add origin git@github.com:<tu-usuario>/galapagos-and-beyond.git
git branch -M main
git push -u origin main
```

Verifica en GitHub que **no** aparezcan `web/.env`, `node_modules/` ni
`migration/photos/`. Si alguno está, para y avisa antes de seguir.

## 2. DNS

Un registro A en el DNS de `galapagosandbeyond.com`:

| Tipo | Nombre    | Valor         | Proxy      |
|------|-----------|---------------|------------|
| A    | `staging` | `<IP-VPS>`    | **DNS only** |

Si el dominio ya está en Cloudflare, la nube **naranja apagada**: con el proxy
activo el challenge HTTP-01 de Let's Encrypt lo resuelve Cloudflare y Traefik
nunca recibe la validación. Se puede activar después de que el certificado
exista.

Esto no toca el dominio de producción — WordPress sigue sirviendo
`www.galapagosandbeyond.com` sin enterarse.

Comprueba antes de seguir (debe devolver la IP de la VPS):

```bash
nslookup dev.galapagosandbeyond.com
```

## 3. Proyecto y base de datos en Dokploy

1. **Projects → Create Project**: `galapagos-staging`.
2. Dentro del proyecto, **Create Service → Database → PostgreSQL**.
   - Nombre: `gab-staging-db`, imagen `postgres:17-alpine` (misma que
     `web/docker-compose.yml` en local).
   - Anota usuario, contraseña y nombre de base.
3. **Deploy** la base y espera a que quede en verde.
4. En la pestaña **External Credentials / Internal**, copia la
   **Internal Connection URL**. Tiene esta forma:

   ```
   postgresql://<user>:<password>@<nombre-del-servicio>:5432/<db>
   ```

   Esa es la que va en `DATABASE_URL`. **No** uses la externa ni la IP
   pública: app y base viven en la misma red Docker y el puerto 5432 no tiene
   por qué estar expuesto a internet.

## 4. La aplicación

**Create Service → Application**, nombre `gab-staging-web`.

**Provider** → GitHub. Si es la primera vez, Dokploy pide instalar su GitHub
App (Settings → Git Providers); dale acceso solo a este repo.

- Repository: `<tu-usuario>/galapagos-and-beyond`
- Branch: `staging` (ver «Ramas» más abajo — no es `main`)

**Build Type** → `Dockerfile`:

| Campo               | Valor            |
|---------------------|------------------|
| Dockerfile Path     | `web/Dockerfile` |
| Docker Context Path | `web`            |
| Docker Build Stage  | *(vacío)*        |

El contexto es `web` y no la raíz: así el `.dockerignore` de `web/` aplica y
el build no arrastra `migration/` ni el studio.

## 5. Variables de entorno

Pestaña **Environment**. Se inyectan en el proceso en runtime — `server/env.ts`
las valida al arrancar y el contenedor muere con un mensaje claro si falta
alguna.

```
SITE_ENV=staging
DATABASE_URL=postgresql://<user>:<pass>@gab-staging-db:5432/<db>
PUBLIC_SITE_URL=https://dev.galapagosandbeyond.com

STRIPE_SECRET_KEY=rk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...        # se rellena en el paso 7

CRON_SECRET=<32+ chars aleatorios>

PUBLIC_PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_ENV=sandbox
```

Genera el `CRON_SECRET` con:

```bash
openssl rand -hex 32
```

SMTP se puede omitir: sin esas variables los emails caen a `console.log` y se
leen en los logs del contenedor, que para staging es incluso más cómodo.

**Claves test/sandbox, nunca live.** Staging comparte código con producción y
un `sk_live_` aquí cobra de verdad.

## 6. Dominio

Pestaña **Domains → Add Domain**:

| Campo          | Valor                                |
|----------------|--------------------------------------|
| Host           | `dev.galapagosandbeyond.com`     |
| Path           | `/`                                  |
| Container Port | `4321`                               |
| HTTPS          | ✅                                    |
| Certificate    | Let's Encrypt                        |

`4321` es el puerto que expone el Dockerfile y al que se ata el adaptador node
vía `HOST`/`PORT`.

Ahora **Deploy**. El primer build tarda varios minutos (baja la imagen de Node
e instala dependencias); los siguientes reutilizan capas.

En los logs del deploy busca `prisma migrate deploy` aplicando las dos
migraciones (`20260716203211_init` y `20260722175204_paypal_and_refunds`).
Si falla ahí, el problema es `DATABASE_URL`, no el build.

## 7. Webhook de Stripe

El `whsec_` es **por endpoint**: el de `stripe listen` local no sirve aquí.

En el Dashboard de Stripe, **en modo test** → Developers → Webhooks → Add
endpoint:

- URL: `https://dev.galapagosandbeyond.com/api/webhooks/stripe`
- Eventos: `checkout.session.completed`, `charge.refunded`

Copia el signing secret, pégalo en `STRIPE_WEBHOOK_SECRET` en Dokploy y
**redeploy** (las env vars se leen al arrancar el proceso).

## 8. Cron de disponibilidad

Sin esto la caché nunca se calienta y las tablas de disponibilidad salen
vacías — por diseño: durante el render solo se lee caché, nunca se llama al
vendor (ver `docs/adr/`).

**Schedule Jobs → Create**, tipo **Application**, apuntando a
`gab-staging-web`:

- Cron: `*/10 * * * *` (la misma cadencia que el cron de WP que reemplaza)
- Comando:

```sh
node -e "fetch('http://localhost:4321/api/cron/warm-availability',{headers:{authorization:'Bearer '+process.env.CRON_SECRET}}).then(r=>r.text()).then(console.log)"
```

Se usa `node -e` y no `curl` porque `node:22-slim` no trae curl. El
`Authorization` es obligatorio: sin él la ruta responde 404 (ver
`src/pages/api/cron/warm-availability.ts`).

**[2026-09-14] Replicado en `gab-production-web` — nunca había existido ahí.**
Diagnóstico de una caída intermitente de disponibilidad en producción (mientras
staging servía bien): `schedule.list` contra `gab-production-web` devolvía
`[]` — cero Schedule Jobs, nunca se creó este cron para producción (solo
quedó documentado arriba para staging). Producción dependía únicamente del
boot warm-up de un solo intento en `lib/availability.ts` (3 reintentos, pero
sin red de seguridad si los 3 fallan) contra un vendor con handshake TLS
flaky — si ese arranque fallaba, la caché quedaba vacía hasta el próximo
redeploy. El merge `staging → production` de ese día "arregló" el síntoma
por casualidad (reinició el contenedor, el boot warm-up tuvo suerte), no la
causa.

Creado con el mismo comando de arriba, apuntando a `gab-production-web`
(`appName` real `galapagos-and-beyond-web-app-front-bu7qna`,
`applicationId y39C4ey9e6-jWiggBUvNz`), reutilizando el `CRON_SECRET` ya
cargado ahí (no se generó ni tocó uno nuevo):

```bash
export MSYS_NO_PATHCONV=1
dokploy schedule create \
  --name "warm-availability" \
  --description "Calienta la cache de disponibilidad cada 10 min (produccion)" \
  --cronExpression "*/10 * * * *" \
  --appName "galapagos-and-beyond-web-app-front-bu7qna" \
  --shellType "sh" \
  --scheduleType "application" \
  --applicationId "y39C4ey9e6-jWiggBUvNz" \
  --command "node -e \"fetch('http://localhost:4321/api/cron/warm-availability',{headers:{authorization:'Bearer '+process.env.CRON_SECRET}}).then(r=>r.text()).then(console.log).catch(e=>{console.error(e);process.exit(1)})\"" \
  --enabled \
  --timezone "America/Guayaquil" \
  --json
```

`scheduleId gePud0c3Nbk5A-tpGLVlP`. **Verificación real hecha, no asumida**
(mismo patrón que el `run-manually` de `expire-stale-orders`, que por sí solo
no distingue 200 de 404/502): se le pegó directo al endpoint público.

```bash
# Sin auth -> 404 (mismo diseño, no revela que la ruta existe)
curl -s -o /dev/null -w '%{http_code}\n' \
  https://galapagosandbeyond.com/api/cron/warm-availability
#    -> 404

# Con el CRON_SECRET real de gab-production-web (ya existente, no uno nuevo)
curl -s -H "authorization: Bearer $CRON_SECRET" \
  https://galapagosandbeyond.com/api/cron/warm-availability
#    -> {"ok":true,"shipCount":9}
```

Same-day: `expire-stale-orders` (sección 8b) sigue siendo **solo staging** a
propósito — no se replicó a producción en este cambio porque no es lo que
causaba la caída reportada. Si en algún momento se decide llevarlo también a
producción, el patrón es idéntico al de arriba.

## 8b. Cron de expiración de orders `pending` abandonados (2026-09-08)

Mismo patrón que el cron de disponibilidad (arriba), para el endpoint
`/api/cron/expire-stale-orders` (protegido con el mismo `CRON_SECRET`, ya
existente en `gab-staging-web` — no se creó ni tocó uno nuevo). Limpia
bookings/orders `pending` que quedaron abandonados (checkout iniciado, nunca
pagado) pasándolos a `expired` tras 24h — no es urgente como la
disponibilidad, una vez al día alcanza.

**Schedule Jobs → Create**, tipo **Application**, apuntando a
`gab-staging-web`:

- Cron: `0 3 * * *` (3am UTC, una vez al día)
- Comando:

```sh
node -e "fetch('http://localhost:4321/api/cron/expire-stale-orders',{headers:{authorization:'Bearer '+process.env.CRON_SECRET}}).then(r=>r.text()).then(console.log).catch(e=>{console.error(e);process.exit(1)})"
```

Creado vía CLI directo (`schedule.create` es un `apiPost`, no sufre el bug de
los GET) — no hace falta pasar por `scripts/dokploy-api.sh` para esta parte:

```bash
export MSYS_NO_PATHCONV=1
dokploy schedule create \
  --name "expire-stale-orders" \
  --description "Expira orders/bookings pending abandonados (checkout iniciado, nunca pagado) tras 24h" \
  --cronExpression "0 3 * * *" \
  --appName "gab-staging-web-yxvt1w" \
  --shellType "sh" \
  --scheduleType "application" \
  --applicationId "DRO-xIbew6vZujrh72Hi6" \
  --command "node -e \"fetch('http://localhost:4321/api/cron/expire-stale-orders',{headers:{authorization:'Bearer '+process.env.CRON_SECRET}}).then(r=>r.text()).then(console.log).catch(e=>{console.error(e);process.exit(1)})\"" \
  --enabled \
  --timezone "America/Guayaquil" \
  --json
```

`schedule create --help` lista casi todos los flags como opcionales, pero
`--name`, `--cronExpression` y `--command` son `requiredOption` de verdad
(mismo patrón que los `save-*`) — el resto sí es opcional aquí, a diferencia
de otros comandos de este CLI.

`schedule list`/`schedule one` son GET con parámetros — mismo bug de
siempre, pasan por `dget`: `dget schedule.list
'{"id":"<applicationId>","scheduleType":"application"}'` (nota: el param se
llama `id`, no `applicationId`, y `--id`/`--scheduleType` aparecen como
opcionales en `--help` pero el server los exige).

**Verificación real hecha (no asumida):** el deploy de `gab-staging-web` con
el commit del endpoint nuevo (`d5ac27b`) se esperó a que terminara
(`applicationStatus`/`deployments[].status: done`) antes de crear el job. Tras
crearlo, `dokploy schedule run-manually --scheduleId <id>` sí dispara una
corrida inmediata sin esperar al cron. La corrida quedó `done` sin
`errorMessage`, pero eso solo confirma que el script no tiró una excepción
(el `.then(r=>r.text())` no distingue 200 de 404/502 — ver nota abajo). La
confirmación real vino de pegarle directo al endpoint público:

```bash
# Sin auth -> 404 (mismo diseño que warm-availability, no expone nada)
curl -s -o /dev/null -w '%{http_code}\n' \
  https://dev.galapagosandbeyond.com/api/cron/expire-stale-orders
#    -> 404

# Con el CRON_SECRET real (compartido con warm-availability, sacado del
# env de gab-staging-web, no de un valor nuevo)
curl -s -H "authorization: Bearer $CRON_SECRET" \
  https://dev.galapagosandbeyond.com/api/cron/expire-stale-orders
#    -> {"ok":true,"expiredCount":0}
```

`expiredCount: 0` es el resultado esperado — staging no tenía bookings
`pending` de más de 24h en ese momento, no un fallo silencioso.

## 9. Verificación

```bash
# 1. Responde con certificado válido
curl -I https://dev.galapagosandbeyond.com

# 2. noindex presente — si falta esto, staging puede acabar en Google
curl -sI https://dev.galapagosandbeyond.com | grep -i x-robots-tag
#    -> x-robots-tag: noindex, nofollow

# 3. El cron está cerrado
curl -s -o /dev/null -w '%{http_code}\n' \
  https://dev.galapagosandbeyond.com/api/cron/warm-availability
#    -> 404
```

Y en el navegador:

- Una ficha de crucero muestra tabla de disponibilidad con fechas (tras el
  primer disparo del cron).
- El formulario de reserva muestra los botones de PayPal/Venmo **y** el botón
  de tarjeta. Si PayPal no aparece, las credenciales no llegaron al runtime.
- Compra de prueba con Stripe (`4242 4242 4242 4242`) → `/booking/success` y
  el booking en `paid`.
- Compra sandbox de PayPal end-to-end — esto sigue **sin probarse nunca**
  (ver `docs/status.md`), staging es el lugar para hacerlo.

## Quirks conocidos

- **Canonicals apuntan a producción.** `site` está fijo a
  `https://www.galapagosandbeyond.com` en `astro.config.mjs`, así que los
  canonical, el JSON-LD, `sitemap.xml` y `llms.txt` de staging emiten URLs de
  producción. Es inofensivo mientras el `noindex` esté puesto, pero los
  enlaces de esos archivos no son navegables desde staging.
- **Caché en memoria.** `lib/cache.ts` guarda en el proceso: cada redeploy
  empieza con la caché fría hasta el siguiente tick del cron. Es lo esperado
  con un solo contenedor.
- **[RESUELTO 2026-08-01] Webhook GitHub -> Dokploy roto desde 2026-07-29,
  causado por una URL de webhook que no se actualiza sola cuando el panel
  cambia de dominio.** Síntoma: push a `staging`/`production` no disparaba
  ningún build. El GitHub App (`galapagosandbeyond`, appId `4412615`, un
  solo App/installation compartido por `gab-staging-web` y
  `gab-production-web`, mismo `githubId` `d6tu5lLioCYWSqMZWKbp1`) tenía su
  **webhook único** (uno solo para todas las instalaciones del App, no por
  repo) apuntando a `http://31.97.148.143:3000/api/deploy/github` — la URL
  de cuando el panel vivía sin dominio. Desde que ese puerto dejó de
  aceptar conexiones externas (2026-07-29, al moverlo detrás de
  `https://panel.galapagosandbeyond.com`), cada delivery devolvía `502
  failed to connect to host`. No era un problema de Dokploy: `hasGitProviderAccess: true`
  y `dokploy github test-connection --githubId d6tu5lLioCYWSqMZWKbp1`
  confirmaban la instalación válida en todo momento — el problema vivía
  100% del lado de GitHub, en la config del App.

  **Fix aplicado:** `PATCH https://api.github.com/app/hook/config` (auth
  con un JWT firmado con la private key del App, `iss=4412615`) con
  `{"url":"https://panel.galapagosandbeyond.com/api/deploy/github","content_type":"json","insecure_ssl":"0"}`.
  Verificado con `GET /app/hook/config` (URL nueva confirmada) y con un
  redelivery real de prueba: `POST /app/hook/deliveries/{id}/attempts`
  contra la última entrega fallida (push a `staging`, commit `7fcc0a2`)
  devolvió `200 OK`, `{"message":"Deployed 1 apps"}`, y generó una entrada
  nueva en `deployment.all` de `gab-staging-web` con status `done` — prueba
  end-to-end de que el webhook llega y dispara deploys de nuevo.

  **Si vuelve a pasar** (ej. el panel cambia de dominio otra vez): repetir
  el mismo diagnóstico — `dget github.one '{"githubId":"..."}'` para sacar
  `githubPrivateKey`/`githubAppId`, firmar un JWT RS256 con Node
  (`crypto.createSign('RSA-SHA256')`, claims `iss`/`iat`/`exp`), y usarlo
  contra `GET/PATCH /app/hook/config` y `GET /app/hook/deliveries` de la
  API de GitHub. Esto no tiene equivalente en el CLI de Dokploy — el App
  vive del lado de GitHub, Dokploy solo consume el token de instalación.

## Recursos creados (2026-07-28)

Servidor Dokploy: `http://31.97.148.143:3000`.

| Recurso      | Nombre                | ID                      |
|--------------|-----------------------|-------------------------|
| Project      | Galapagos And Beyond Web App | `8Qr-Lx-GbjHrt3XzHd2mT` |
| Environment  | `staging`             | `8B_RCPH63OfT_bWQAZDfB` |
| Environment  | `production` (antes vacío, ver abajo) | `SJqIe8KqM5ckaemXFpANH` |
| Application  | `gab-staging-web`     | `DRO-xIbew6vZujrh72Hi6` |
| Postgres     | `gab-staging-db`      | `fMZyICR4hIUEgbn5jX3pG` |
| Domain       | `dev.galapagosandbeyond.com` | `-JjXuX4ixv_zoBQy-2Jn7` |
| Schedule Job | `warm-availability` (staging) | `tVd7jseMgJ1kcpoIREMgQ` |
| Schedule Job | `expire-stale-orders` (staging) | `aYJimTnFSfc8MmQHzobSi` |
| Schedule Job | `warm-availability` (**producción**, creado 2026-09-14) | `gePud0c3Nbk5A-tpGLVlP` |
| GitHub prov. | `GalapagosAndBeyond`  | `d6tu5lLioCYWSqMZWKbp1` |

El hostname interno de la base es `gab-staging-db-6ycllf` (Dokploy le añade un
sufijo al `appName`, no coincide con el nombre visible) y el `appName` de la
app es `gab-staging-web-yxvt1w`.

### Producción (2026-07-29, parcial)

El stub `front` que ya existía vacío en el environment `production` se
reconfiguró en vez de crear uno nuevo:

| Recurso     | Nombre               | ID                          |
|-------------|----------------------|------------------------------|
| Application | `gab-production-web` (era `front`) | `y39C4ey9e6-jWiggBUvNz` |
| Postgres    | `gab-production-db`  | `u87rQRJQ3w2fadltBVITO`      |

`appName` real de la app sigue siendo `galapagos-and-beyond-web-app-front-bu7qna`
(no cambia al renombrar el `name` visible). Hostname interno de la base:
`gab-production-db-1a1p2o`.

Conectada a la rama `production`, build Dockerfile igual que staging.

### Producción en vivo (2026-09-09)

Claves live + dominio cargados (env vars actualizadas con `application.saveEnvironment`
+ `application reload`, mismo patrón de siempre — ver quirk de `--appName`/
`--applicationId` arriba):

- `STRIPE_SECRET_KEY`: restricted key `rk_live_...` (permiso único: Checkout
  Sessions → Write; sin Connect — el proyecto no lo usa).
- `STRIPE_WEBHOOK_SECRET`: `whsec_...` real, del endpoint creado en el
  dashboard de Stripe (modo Live) apuntando a
  `https://www.galapagosandbeyond.com/api/webhooks/stripe`, eventos
  `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`,
  versión de API `2026-08-26.dahlia` (más cercana a la `2026-06-24.dahlia`
  pineada en `server/payments/stripe.ts`; esa fecha exacta no estaba
  disponible en el selector del dashboard).
- `PUBLIC_PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`: app en modo Live de
  developer.paypal.com (no la sandbox `galapagosandbeyond-astro` que se
  usaba antes). `PAYPAL_ENV=live`.
- Dominio `www.galapagosandbeyond.com` agregado a `gab-production-web`
  (`domainId thCdtNppoJHO5C6oGma3l`), replicando la config de
  `dev.galapagosandbeyond.com`: puerto `4321`, `https: true`,
  `certificateType: letsencrypt`. **DNS todavía no apunta acá** (sigue en
  Hostinger/WordPress) — el certificado Let's Encrypt no emite hasta que el
  usuario cambie el registro DNS él mismo. Cero riesgo para el WordPress
  actual mientras tanto, mismo patrón que cuando se armó staging.
- **[2026-09-10]** Dominio apex `galapagosandbeyond.com` (sin `www`) también
  agregado a `gab-production-web` (`domainId TBJrXzJuHZX_wjmdUVWfI`),
  replicando exactamente el `www` de arriba: puerto `4321`, `https: true`,
  `certificateType: letsencrypt`, `path: "/"`, `internalPath: "/"`,
  `domainType: application`. Confirmado en `application.one` → `domains[]`
  (ambos dominios presentes) tras crearlo.
  **Aprendizaje confirmado esta vez:** agregar un dominio a una app que ya
  tiene tráfico/router en Traefik **no dispara el intento de emisión ACME
  solo** — hace falta `dokploy settings reload-traefik` después de crear el
  dominio (con el `www` esto se descubrió recién al fallar; para el apex se
  corrió de entrada, sin esperar el fallo). DNS del registro `@` tampoco
  apunta al VPS todavía (mismo estado que `www`) — el certificado no emite
  hasta el cutover, esperado, cero riesgo para lo que sirve ese dominio hoy.
- **[2026-09-09] Cutover de DNS del apex hecho — certificado Let's Encrypt
  emitido con un solo `reload-traefik`, sin recrear el dominio.** El usuario
  cambió el registro `A @ -> 31.97.148.143`. Confirmado con `nslookup` contra
  8.8.8.8/1.1.1.1 (el resolver DNS local del ISP quedó rezagado en el
  momento de la verificación, sin efecto real — Google/Cloudflare ya
  resolvían bien). Con el DNS ya apuntando al VPS, `dokploy settings
  reload-traefik` solo bastó: a los ~30s el certificado en
  `galapagosandbeyond.com:443` pasó de autofirmado (`CN=TRAEFIK DEFAULT
  CERT`) a real (`O=Let's Encrypt, CN=YR1`, `subject=CN=galapagosandbeyond.com`,
  vence 2026-12-09). `domainId` no cambió (`TBJrXzJuHZX_wjmdUVWfI`), no hizo
  falta el plan de recrear el dominio que estaba preparado como
  contingencia. **Matiz sobre el aprendizaje de la entrada de arriba:** ese
  `reload-traefik` se había corrido *antes* de que el DNS apuntara al VPS, así
  que no podía alcanzar (Let's Encrypt no valida sin DNS real, sin importar
  cuántas veces se reintente el challenge). El fix real es reload-traefik
  *después* del cutover de DNS, no necesariamente un recreate del dominio —
  el recreate queda como fallback si el reload posterior al DNS tampoco
  alcanza. `https://galapagosandbeyond.com/` responde `200`.
  `www.galapagosandbeyond.com` y `gab-staging-web` no se tocaron en este
  cambio.

Pendiente todavía: cutover de DNS de `www` (lo hace el usuario — el del apex
ya está hecho, ver arriba), mapa de redirects 301
de URLs viejas de WP, y **SMTP real de producción — confirmado que todavía
NO está seteado** (verificado en el env de `gab-production-web` esta misma
sesión, antes de este cambio: sin `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`/
`BOOKING_NOTIFY_EMAIL`). Sin esto, los emails de confirmación de compra caen
a `console.log` en vez de enviarse de verdad — usar las mismas credenciales
de Google Workspace ya probadas en `docs/log.md` 2026-08-01, no crear unas
nuevas.

## Panel de Dokploy detrás de dominio propio (2026-07-28)

El panel vivía en `http://31.97.148.143:3000` sin TLS. Ahora:

```bash
dokploy settings assign-domain-server \
  --host "panel.galapagosandbeyond.com" \
  --certificateType "letsencrypt" \
  --letsEncryptEmail "kernixstudios@gmail.com" \
  --https
dokploy settings reload-traefik
```

**El puerto 3000 crudo NO se cierra con `ufw`.** Dokploy corre como Docker
Swarm service con `mode=host` — eso se salta iptables/ufw por completo (más
bypass que el problema típico de Docker+ufw vía `DOCKER-USER`, mode host no
pasa ni por ahí). El comando real, sacado de los docs oficiales de
instalación y no de prueba y error:

```bash
docker service update --publish-rm "published=3000,target=3000,mode=host" dokploy
```

Verifica primero que el dominio responde en HTTPS — sin eso te quedas sin
forma de entrar al panel.

**Efecto colateral que hay que recordar:** el CLI local (`~/AppData/Roaming/npm/node_modules/@dokploy/cli/config.json`,
campo `url`) queda apuntando al `:3000` viejo y todo comando empieza a fallar
con `connect ETIMEDOUT`. Hay que actualizar ese `url` a
`https://panel.galapagosandbeyond.com` a mano.

## Deuda pendiente de esta configuración
- **`STRIPE_WEBHOOK_SECRET` es un placeholder**: hoy tiene el `whsec_` de
  `stripe listen` local, que no valida firmas del endpoint del dashboard. Los
  webhooks fallarán hasta hacer el paso 7.
- **La contraseña de Postgres se imprimió en claro** durante el `postgres
  deploy` (el endpoint devuelve el objeto completo). La base no expone puerto
  externo, pero conviene rotarla con `postgres change-password`.
- **El API token del CLI puede quedar invalidado sin aviso.** El 2026-08-01
  se encontró `config.json` (`~/AppData/Roaming/npm/node_modules/@dokploy/cli/config.json`)
  apuntando a una URL vieja (`http://2.24.82.87:3000`, ni siquiera la IP
  documentada) y, tras corregir la URL a `https://panel.galapagosandbeyond.com`,
  el token seguía dando `401 UNAUTHORIZED` en todo endpoint — probablemente se
  regeneró al mover el panel a HTTPS y nunca se sincronizó localmente. Los
  tokens de Dokploy no expiran solos. **Antes de asumir que el CLI/API
  funciona, probar con algo barato** (`dokploy auth -u <url> -t <token>` o
  `dget project.all`) — si da 401, hay que pedirle al usuario un token nuevo
  desde `Settings → Profile → Generate` en el dashboard, no hay forma de
  generarlo por API ni por SSH.

- **[2026-09-02] `config.json` del CLI puede quedar apuntando a un panel
  Dokploy *distinto*, no solo a una URL vieja de este mismo panel.** Se
  encontró `url` en
  `~/AppData/Roaming/npm/node_modules/@dokploy/cli/config.json` con el valor
  `https://dokploy.kernixstudios.com` — otra instancia real (o al menos otro
  dataset) donde `project.all` solo devuelve `Kernix Studios`,
  `chatbot-hackathon` y `Agencia Creativa`, nada de Galápagos & Beyond. No es
  el típico caso de "quedó apuntando al `:3000` viejo" ya documentado arriba:
  acá la URL entera era la de otro panel. Corregido a
  `https://panel.galapagosandbeyond.com`, y como era de esperar el token viejo
  no servía ahí (`401`) — se regeneró desde `Settings → Profile → Generate` y
  se reautenticó con `dokploy auth -u https://panel.galapagosandbeyond.com -t <token>`.
  **Antes de asumir que el CLI apunta al panel correcto, imprime `url` del
  `config.json` y compáralo contra `panel.galapagosandbeyond.com` explícitamente**
  — no alcanza con verificar que el comando "responde algo", porque otro panel
  válido también responde 200, solo que con los recursos equivocados.

- **[2026-09-22] Checkout en producción caído: Stripe rechaza el
  `STRIPE_SECRET_KEY` actual con `StripeAuthenticationError: Invalid API Key
  provided` (`statusCode 401`, `type invalid_request_error`).** El usuario
  reportó que lo único que había cambiado recientemente era esa env var.
  Diagnóstico vía el WebSocket de logs (ver arriba, sección CLI) contra
  `gab-production-web`: el error aparece en cada intento de checkout desde
  `2026-09-22T14:15:05Z` en adelante. El contenedor no se reinició desde el
  último deploy real (`2026-09-14T22:39`, "Add stay inquiry modal form") —
  un solo boot en los logs capturados, sin `reload` de por medio — así que
  no es el caso ya conocido de "env guardado pero nunca aplicado sin
  `reload`": el valor que Stripe rechaza coincide (por los últimos 4
  caracteres visibles en el error, que Stripe no enmascara) con el que
  `application.one` devuelve como configurado hoy. El key en sí no tiene
  ningún problema de formato: prefijo `rk_live_` correcto, 106 caracteres,
  sin espacios/CR/saltos de línea al inicio o final, sin duplicados en el
  `.env`. `STRIPE_WEBHOOK_SECRET`, `PUBLIC_SITE_URL` y `PAYPAL_ENV=live`
  están todos en modo live, sin inconsistencia de test/live entre ellos.
  Con formato correcto pero `Invalid API Key provided`, lo más probable es
  que la restricted key se haya revocado/regenerado (rolled) del lado de
  Stripe después de pegarla en Dokploy, o un error de copia/pegado no
  detectable como espacio en blanco. **Pendiente que el usuario verifique en
  Stripe Dashboard → Developers → API keys si esta key sigue activa**; si no,
  generar una nueva restricted key (mismo permiso único: Checkout Sessions →
  Write) y guardarla con `application.saveEnvironment` + `application
  reload` (no solo `save-environment` — confirmar que el contenedor
  realmente reinicia, no asumirlo).

- **[2026-09-24] Seguimiento: el usuario confirmo en el Stripe Dashboard que
  la restricted key `rk_live_...qmEe` sigue activa (no revocada, no
  regenerada) — descarta la hipotesis simple de "se hizo roll y nadie
  actualizo Dokploy". Reproducido el fallo en vivo de nuevo (click real en
  "Pay with card" en `/cruises/ecogalaxy-catamaran/`) y jalados los logs mas
  recientes por el mismo WebSocket. Resultado:** el error es **identico,
  caracter por caracter**, al de hace dos dias — `StripeAuthenticationError:
  Invalid API Key provided`, `statusCode 401`, `type invalid_request_error`,
  `requestId: undefined`, `www-authenticate: Bearer realm="Stripe"` — en dos
  intentos consecutivos (17:02:44Z y 17:02:54Z). El contenedor **no se ha
  reiniciado desde 2026-09-22T15:08:25Z** (mas de 51h, ni un `reload` ni un
  deploy nuevo en medio) — descarta tambien "el runtime tiene un valor viejo
  que `application.one` ya no refleja": medido el propio valor enmascarado
  que **Stripe devuelve en el error** (no el que asumimos nosotros) contra
  el env actual via `application.one`, coinciden en longitud exacta (106
  caracteres) y en los 4 ultimos caracteres — el key que corre en el
  contenedor es, caracter por caracter, el mismo que Stripe esta rechazando
  ahora mismo, y es el mismo que el usuario dice ver "activo" en el
  Dashboard.

  **Por que esto descarta tambien la hipotesis de "scope insuficiente
  (falta permiso Checkout Sessions -> Write)":** Stripe distingue dos capas
  de rechazo. Una restricted key real pero sin el permiso correcto pasa la
  capa de autenticacion (Stripe *si* la reconoce) y falla despues con un
  error de permisos (tipicamente mencionando el scope faltante, a veces con
  `code: 'permission_error'`). `Invalid API Key provided` es el mensaje
  generico de la capa de autenticacion en si — Stripe no reconoce el string
  como una key propia en absoluto, antes de mirar permisos. El mensaje que
  estamos viendo es el segundo caso, no el primero.

  **Hipotesis mas probable ahora, sin poder confirmarla desde este entorno
  (sin API de Stripe, sin SSH):** el usuario esta viendo como "activa" una
  key con el mismo nombre/ultimos 4 caracteres pero **en la cuenta o el modo
  equivocado** de Stripe — Stripe permite multiples cuentas/negocios bajo un
  mismo login, y el selector de cuenta (arriba a la izquierda del Dashboard)
  determina que lista de keys se ve; si se re-genero la key alguna vez con
  `roll`, el string cambia por completo (no solo un caracter), asi que una
  coincidencia casual de ultimos 4 digitos entre una key nueva y la vieja es
  estadisticamente muy improbable — mas probable es que el usuario este
  mirando la key correcta por nombre pero de la cuenta/negocio incorrecto, o
  que haya dos restricted keys con el mismo nombre (Stripe lo permite) y solo
  una de ellas sea la que esta en el `.env`.

  **Verificacion pendiente que solo puede hacer el usuario en el Dashboard**
  (no reproducible desde aca): abrir el renglon exacto de la key que termina
  en `...qmEe` (no "una" restricted key con nombre parecido) y mirar su
  columna "Last used" — si no muestra un timestamp de hoy cerca de
  17:02–17:03 UTC pese a los dos intentos fallidos reproducidos, es senal
  fuerte de que Stripe ni siquiera encuentra esa key en su registro (key
  huerfana/de otra cuenta), no que le falte permiso. Tambien confirmar el
  nombre/ID de la cuenta activa en el selector de arriba a la izquierda
  contra la cuenta real de `galapagosandbeyond.com`.

  Si tras esa verificacion la key sigue pareciendo correcta y activa, la
  salida mas rapida sigue siendo generar una restricted key **nueva** (mismo
  permiso unico: Checkout Sessions -> Write, live, cuenta correcta
  confirmada), guardarla con `application.saveEnvironment` + `application
  reload`, y verificar en los logs que aparece una **nueva boot line** (no
  solo que el comando devolvio exito) antes de reintentar un checkout real.

## Antes del cutover a producción

No es una lista de "en algún momento" — cada punto rompe algo si se salta:

1. ~~Segunda Application en Dokploy con `SITE_ENV=production`, su propia
   base~~ — hecho 2026-07-29 (`gab-production-web` + `gab-production-db`, ver
   arriba).
2. ~~Claves Stripe/PayPal live + webhook de Stripe en modo live~~ — hecho
   2026-09-09, ver «Producción en vivo» arriba.
3. ~~Dominios agregados en Dokploy~~ — `www.galapagosandbeyond.com` hecho
   2026-09-09, `galapagosandbeyond.com` (apex) hecho 2026-09-10, ambos en
   `gab-production-web` con la misma config. **Cutover de DNS del apex hecho
   2026-09-09** (certificado Let's Encrypt real emitido, ver «Producción en
   vivo» arriba) — **falta el de `www`** (lo hace el usuario); hasta entonces
   WordPress sigue sirviendo `www.galapagosandbeyond.com` en vivo, sin
   riesgo.
4. Mapa de 301 de las URLs viejas de WP — investigación hecha 2026-09-09 (ver
   `docs/log.md`), falta implementarlo en `astro.config.mjs`/middleware.
5. ~~`astro.config.mjs`: confirmar el dominio final~~ — hecho 2026-09-09,
   dominio confirmado real (ver arriba), `TODO(kevin)` removido.
6. SMTP real de producción — **confirmado que falta** (ver «Producción en
   vivo» arriba), o los emails de confirmación se quedan en los logs.
