# Gestor de imagenes con Cloudinary

## Proposito

Aplicacion web estatica para generar enlaces temporales de carga de imagenes y recibir archivos directamente en Cloudinary.

El administrador elige un proyecto, un modo de uso y una fecha de vencimiento. La aplicacion genera un enlace firmado. La persona que recibe el enlace puede cargar imagenes sin conocer credenciales de Cloudinary.

El proyecto prioriza tres cosas:

- No exponer secretos de Cloudinary en el navegador.
- Separar la experiencia completa de Administrador de la experiencia simplificada de Cliente.
- Guardar cada imagen con nombre, carpeta, titulo, descripcion y metadatos reutilizables.

## Estructura

```text
index.html                         Dashboard para administradores
subir.html                         Portal completo, modo Admin
subir-cliente.html                 Portal reducido, modo Cliente
proyectos.json                     Proyectos y carpetas permitidas
css/styles.css                     Estilos compartidos y responsive
js/dashboard.js                    Carga proyectos y genera enlaces
js/subir.js                        Validacion, tarjetas, metadatos y subida
netlify/functions/generar-token.js Firma enlaces temporales
netlify/functions/verificar-token.js Valida firma, vencimiento y password
netlify/functions/consultar-metadatos.js Consulta sugerencias en Cloudinary
```

No hay framework ni build step. Las paginas cargan JavaScript y CSS directamente. Tailwind Browser se usa desde CDN en las paginas de subida.

## Flujo principal

1. El administrador abre `index.html`.
2. `dashboard.js` carga `proyectos.json` y muestra los proyectos.
3. El administrador selecciona proyecto, modo y vencimiento.
4. `generar-token.js` crea un token HMAC con el proyecto y la fecha de expiracion.
5. El enlace apunta a una de estas paginas:
	 - `subir.html?token=...&modo=admin`
	 - `subir-cliente.html?token=...&modo=cliente`
6. `subir.js` envia el token a `verificar-token.js` antes de mostrar la interfaz.
7. Una vez validado el acceso, el portal carga las carpetas del proyecto.
8. El usuario selecciona una carpeta y agrega una o varias imagenes.
9. Cada imagen se procesa en el navegador y se sube a Cloudinary con un `upload_preset` unsigned.

El parametro `modo` decide la pagina que se genera y tambien permite que `subir.js` oculte controles avanzados en Cliente. El token es la autorizacion real; `modo` no debe considerarse una medida de seguridad.

## Modos de uso

### Admin

`subir.html` muestra todas las opciones:

- Carpeta por imagen y carpeta global.
- Ancho maximo y calidad WebP.
- Titulo global y nombre original.
- Titulo descriptivo, descripcion y metadatos personalizados.
- Descargar WebP individual o en lote.
- Subir individualmente o subir todas.
- Ruta final y estimacion de tamano.

### Cliente

`subir-cliente.html` mantiene el mismo flujo seguro, pero reduce la interfaz:

- Proyecto, vencimiento y carpeta destino.
- Seleccion de imagenes.
- Titulo, descripcion y metadatos por imagen.
- Checkbox `Respetar nombre` independiente por imagen.
- Subida individual o por lote.
- Vista previa compacta que se amplia temporalmente al hacer clic.

No se deben agregar controles de Admin a Cliente sin una razon funcional clara. La tarjeta inicial de Cliente esta disenada para concentrar carpeta, seleccion y accion de subida; las tarjetas individuales aparecen despues.

## Datos de una imagen

Cada elemento de `imageFiles` en `js/subir.js` contiene, entre otros:

```text
fileObj          Archivo original
imgElement       Imagen decodificada para canvas
originalName     Nombre sin extension
keepOriginal     Si conserva el nombre original
customName       Nombre usado cuando no conserva el original
category         Carpeta destino
customTitle      Se guarda como context caption
customDescription Se guarda como context alt
customMetadata   Lista de { name, value }
maxWidth         Ancho de procesamiento
quality          Calidad WebP
dateStr          AAAAMMDDHHMMSS usado en nombres generados
```

Si `keepOriginal` es falso, el nombre se genera como:

```text
AAAAMMDDHHMMSS_nombre.webp
```

El usuario puede editar el nombre generado. El codigo evita duplicar el prefijo de fecha al editarlo.

## Metadatos

Los metadatos se envian a Cloudinary dentro del parametro `context`:

```text
caption=Titulo|alt=Descripcion|etiqueta=valor
```

`caption` y `alt` son campos reservados para titulo y descripcion. Por eso `consultar-metadatos.js` los excluye de las sugerencias de metadatos personalizados.

Cuando cambia la carpeta destino, `subir.js` consulta:

```text
POST /.netlify/functions/consultar-metadatos
{ token, password, category }
```

La funcion consulta los recursos de Cloudinary bajo `proyecto/carpeta`, recoge `context.custom` y `metadata`, y devuelve:

```json
{
	"fields": [
		{ "name": "area", "values": ["habitacion", "cocina"] }
	]
}
```

La interfaz permite elegir una etiqueta existente, crear una nueva, elegir un valor sugerido o escribir uno nuevo.

Reglas de repeticion:

- Los valores de texto pueden repetirse entre imagenes. Ejemplo: `area=habitacion` en varias fotos.
- Los valores numericos de una etiqueta no pueden repetirse entre imagenes ni contra los valores ya existentes en la carpeta. Ejemplo: `orden=4` solo una vez.
- Si los valores existentes de una etiqueta son numericos, se sugiere automaticamente `maximo + 1`.
- Una misma tupla exacta `etiqueta + valor` tampoco se permite dos veces dentro de una imagen.

La validacion ocurre al editar y nuevamente antes de subir. Esta segunda validacion es necesaria porque el usuario puede escribir y subir sin perder el foco del campo.

## Subida a Cloudinary

`js/subir.js` procesa la imagen con un canvas, la convierte a WebP y llama a:

```text
https://api.cloudinary.com/v1_1/{cloud_name}/image/upload
```

Los datos principales enviados son:

- `upload_preset`: preset unsigned existente.
- `folder`: `proyecto/carpeta`.
- `public_id`: nombre sin extension.
- `tags`: proyecto y carpeta.
- `context`: titulo, descripcion y metadatos.

En subida multiple cada imagen se procesa de manera independiente. Un error no detiene las demas. Los errores se resumen en un modal indicando archivo y motivo; la tarjeta conserva tambien un estado breve.

## Seguridad y tokens

`generar-token.js` crea un payload con:

```json
{ "project": "...", "exp": 0, "longTerm": false }
```

El payload se codifica en Base64URL y se firma con HMAC-SHA256. `verificar-token.js` comprueba firma y vencimiento antes de autorizar el portal.

Los enlaces de larga duracion requieren una variable especifica por proyecto y una password. Revisar siempre el flujo de larga duracion antes de cambiarlo: la generacion y la verificacion deben usar exactamente el mismo secreto.

El parametro `modo` es solo de presentacion. No concede permisos adicionales.

## Variables de entorno de Netlify

Variables necesarias para los tokens:

```text
TOKEN_SECRET
```

Variables necesarias para consultar metadatos:

```text
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

Como alternativa, la funcion acepta:

```text
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
```

`CLOUDINARY_API_SECRET` nunca debe estar en HTML, JavaScript del navegador, `proyectos.json` ni en el repositorio.

Para enlaces largos se requiere, ademas, una variable con este patron:

```text
TOKEN_SECRET_{PROYECTO_SANITIZADO}_LARGO
```

Ejemplo para `enBlanco/residencial`:

```text
TOKEN_SECRET_ENBLANCO_RESIDENCIAL_LARGO
```

Despues de modificar variables en Netlify hay que ejecutar un nuevo deploy.

## Configurar un proyecto

Editar `proyectos.json` y agregar un objeto:

```json
{
	"id": "mi-proyecto",
	"nombre": "Nombre visible",
	"carpetas": [
		{ "value": "galeria", "label": "Galeria" }
	]
}
```

`id` se usa como prefijo de carpeta en Cloudinary y debe coincidir con la estructura real. `value` es el segmento de carpeta y debe ser estable; `label` solo es el texto visible.

El usuario puede crear subcarpetas desde el selector. Se guardan en `localStorage` por proyecto y navegador; no se escriben en `proyectos.json`.

## Guia para futuras modificaciones

- Mantener la validacion de token antes de mostrar la interfaz.
- Nunca trasladar `API_SECRET` al cliente.
- Respetar la diferencia entre `caption`/`alt` y metadatos personalizados.
- Cuando se agregue un campo a una tarjeta, actualizar los listeners de `attachEvents()` y la construccion de `context`.
- Si se cambia la estructura de una tarjeta, conservar los `data-index` y `data-meta-index`.
- Cualquier cambio de nombres o carpetas debe considerar recursos ya existentes en Cloudinary.
- No asumir que `modo=cliente` es seguridad; el token es la autorizacion.
- Probar tanto subida individual como subida por lote, incluyendo un archivo que falle entre varios correctos.
- Probar carpetas sin metadatos, carpetas con textos, carpetas con numeros y carpetas con muchos recursos/paginacion.

## Limitaciones conocidas

- La consulta de metadatos depende de credenciales de Cloudinary configuradas en Netlify.
- La consulta usa recursos de imagenes `upload` y recorre paginacion mediante `next_cursor`.
- Los nombres de metadatos personalizados se almacenan en `context`; no son necesariamente campos estructurados definidos en el esquema de metadata de Cloudinary.
- No hay pruebas automatizadas ni build local configurado; la validacion disponible es la comprobacion de errores del editor y las pruebas manuales en Netlify.
- El preset unsigned permite subir desde el navegador; sus restricciones deben mantenerse configuradas en Cloudinary.