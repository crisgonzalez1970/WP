# Auth + Google Drive Demo

Pequeña aplicación demo con login (SQLite) y acceso a archivos en Google Drive.

Instrucciones rápidas:

1. Instalar dependencias:

```bash
npm install
```

2. Iniciar servidor:

```bash
npm start
```

3. Abrir `http://localhost:3000` en el navegador.

Usuario por defecto: `admin` / `admin` (cámbialo en producción).

Google Drive:
- Genera una cuenta de servicio en Google Cloud y descarga el JSON de credenciales.
- En la página 1 de la app pega el JSON de la cuenta de servicio en el campo "Key JSON", indica el `folderId` de la carpeta de Drive que quieres listar y un nombre para la cuenta.

Nota: Esta demo almacena la configuración de Drive en la sesión del servidor (no en base de datos). Para producción, guarda las claves con seguridad.

Ejecutar con Docker (sin instalar Node.js):

```bash
# Construir y levantar el contenedor
docker-compose up --build

# Abrir http://localhost:3000
```

El contenedor monta el código en caliente para desarrollo; si prefieres una imagen inmutable elimina el volumen del servicio en `docker-compose.yml`.

CI / Publicar imagen en Docker Hub
---------------------------------

Se incluye un workflow de GitHub Actions (`.github/workflows/ci.yml`) que construye y publica la imagen a Docker Hub cuando haces push a la rama `main`.

Para activarlo configura estos secretos en tu repositorio GitHub:

- `DOCKERHUB_USERNAME` — tu usuario de Docker Hub
- `DOCKERHUB_TOKEN` — token o contraseña de Docker Hub (mejor: token)

La acción publicará la imagen como `<usuario>/auth-drive-app:latest` y con la etiqueta del `commit`.

