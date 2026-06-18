# Despliegue de Polla Mundialista Salvaje en `salvaje-app.web.app/pollasalvaje`

La app ya está configurada para servirse bajo **`/pollasalvaje/`**:

- `vite.config.js` → `base: '/pollasalvaje/'` en build.
- El router usa `basename = /pollasalvaje`.
- Todas las imágenes de `/public` se referencian con `asset()` (prefijan la base), así que cargan bien bajo la subruta.

Build de producción:

```bash
cd polla-salvaje
npm run build     # genera dist/ con base /pollasalvaje/
npm run preview   # pruébalo en http://localhost:5050/pollasalvaje/
```

## Importante: dominio compartido con el gimnasio

`https://salvaje-app.web.app/` lo sirve el **app del gimnasio** (Hosting del proyecto
`salvaje-app`, `public: dist`, rewrite `** → /index.html`). Firebase Hosting hace
deploys **atómicos de todo el sitio**, así que NO se puede subir la polla como un
deploy aparte sin borrar el gimnasio. Para tener la ruta `/pollasalvaje` hay que
**incluir la polla dentro del deploy del gimnasio**.

> Requisito: una cuenta de Google con acceso (rol Hosting Admin / Editor / Owner)
> en el proyecto `salvaje-app`. La cuenta `cristianechavarriaz@gmail.com` que está
> logueada en el CLI de esta máquina NO tiene acceso (responde 403).

### Pasos (los corre quien tenga acceso a `salvaje-app`)

1. **Build de la polla** (genera `polla-salvaje/dist/`):
   ```bash
   cd polla-salvaje && npm run build
   ```

2. **Build del gimnasio** (genera `Salvaje/Salvaje/dist/`):
   ```bash
   cd ../Salvaje && npm run build
   ```

3. **Copiar la polla dentro del dist del gimnasio**, bajo `pollasalvaje/`:
   ```bash
   # desde Salvaje/Salvaje
   xcopy /E /I /Y ..\polla-salvaje\dist dist\pollasalvaje
   # (o en bash: cp -r ../polla-salvaje/dist dist/pollasalvaje)
   ```

4. **Agregar el rewrite** en `Salvaje/Salvaje/firebase.json`, ANTES del catch-all:
   ```json
   "rewrites": [
     { "source": "/pollasalvaje{,/**}", "destination": "/pollasalvaje/index.html" },
     { "source": "**", "destination": "/index.html" }
   ]
   ```
   (Los assets físicos `/pollasalvaje/assets/...` se sirven directos; el rewrite solo
   cubre las rutas internas del SPA como `/pollasalvaje/predict`.)

5. **Desplegar solo hosting**:
   ```bash
   firebase login          # cuenta CON acceso a salvaje-app
   firebase deploy --only hosting
   ```
   Resultado: **https://salvaje-app.web.app/pollasalvaje**

> Nota: este flujo reconstruye y redespliega el sitio del gimnasio. Asegúrate de que
> el código del gimnasio en `Salvaje/Salvaje` sea el de producción antes de desplegar.

## Alternativa (sin tocar el gimnasio): subdominio propio

Si en vez de la ruta aceptas un subdominio, se puede crear un **sitio de Hosting
aparte** en el mismo proyecto (`pollasalvaje.web.app`), aislado del gimnasio. Para
eso habría que cambiar `base` a `'/'` y crear el sitio con `firebase hosting:sites:create pollasalvaje`.

## Reglas de Firestore (recordatorio)

Para que la polla escriba en Firestore real (y deje el modo demo local), aplica las
reglas de `firestore.rules.txt` en la consola del proyecto `salvaje-app`.
