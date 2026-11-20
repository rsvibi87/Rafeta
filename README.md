# Facturación – versión para servidor propio

Node.js + SQLite. Los datos se guardan en un archivo (`facturas.db`) y se hace una copia diaria en `backups/` (se conservan 14).
El acceso está protegido con usuario y contraseña (variables `APP_USER` y `APP_PASSWORD`). Usa siempre HTTPS (Render, Railway y Fly.io lo dan por defecto).

## Probar en tu ordenador
    npm install
    APP_USER=rafael APP_PASSWORD=una-clave-larga npm start
Abre http://localhost:3000

## Subir a Render (o Railway / Fly.io)
1. Sube esta carpeta a un repositorio de GitHub.
2. En Render: New → Web Service → elige el repositorio → Runtime: Docker.
3. Variables de entorno: `APP_USER`, `APP_PASSWORD` (y `DATA_DIR=/data`).
4. **Importante:** añade un disco persistente montado en `/data`. Sin disco, los datos se pierden en cada despliegue (los planes gratuitos suelen no tenerlo).
5. Abre la URL que te da Render e identifícate. Funciona desde cualquier dispositivo.

## Subir a un VPS con Docker
    docker build -t facturacion .
    docker run -d --restart always -p 3000:3000 -v facturacion-datos:/data \
      -e APP_USER=rafael -e APP_PASSWORD=una-clave-larga facturacion
Ponlo detrás de un proxy con HTTPS (Caddy o Nginx con Let's Encrypt).

## Seguridad e integridad
- El servidor impide modificar o borrar facturas emitidas (solo cambia el estado) y reserva cada número de forma atómica: no hay duplicados ni reutilización.
- Descarga además copias JSON desde Configuración y guarda la carpeta `backups/` fuera del servidor.
- Aviso: no implementa VeriFactu (huella, QR, envío a la AEAT). Consúltalo con tu asesor.
