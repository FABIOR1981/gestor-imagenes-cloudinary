# Gestor de imágenes con Cloudinary

Aplicación web estática (HTML, CSS y JS, sin build) con funciones de Netlify. El administrador gestiona las imágenes de cada proyecto (alta, baja y modificación) y genera enlaces temporales para que terceros suban o gestionen imágenes con los permisos que él decida.

## Principios de seguridad

- El navegador **nunca** tiene `CLOUDINARY_API_SECRET`. Todo lo que modifica Cloudinary pasa por funciones de Netlify.
- La autorización la decide el servidor: el token del enlace lleva `proyecto`, `permisos` y `exp`, firmados con HMAC-SHA256. El parámetro `modo` de la URL es solo de presentación.
- La carpeta de destino se valida y se firma en el servidor. No existe preset unsigned: las subidas son firmadas y no pueden pisar imágenes existentes (`overwrite=false`).
- Un enlace solo puede actuar sobre su proyecto (`public_id` debe empezar por `proyecto/`).
- Sin `TOKEN_SECRET` (mínimo 32 caracteres) las funciones fallan; no hay clave de respaldo.

## Estructura

```text
index.html                              Login de admin y generador de enlaces
admin.html + js/admin.js                Panel ABM: miniaturas, editar, mover, eliminar, subir
subir.html / subir-cliente.html         Portal de carga (pantalla completa / simplificada)
js/subir.js                             Portal: validación del enlace, tarjetas, metadatos, subida firmada
js/dashboard.js                         Login y generación de enlaces
proyectos.json                          Proyectos, carpetas y permisos por defecto
herramientas/generar-hash-admin.js      Genera ADMIN_PASSWORD_HASH (se corre en la PC)
herramientas/probar-*.ps1               Pruebas contra el sitio desde Windows
netlify/functions/
  iniciar-sesion-admin.js               Contraseña de admin -> sesión de 2 horas
  generar-enlace.js                     (admin) crea el token del enlace
  verificar-enlace.js                   Valida enlace (+ contraseña si es largo)
  firmar-subida.js                      Permiso "alta": firma la subida a Cloudinary
  listar-imagenes.js                    Permiso "listar" (o "alta" con sugerencias:true)
  modificar-imagen.js                   Permiso "modificar": título, metadatos, nombre, carpeta
  eliminar-imagen.js                    Permiso "eliminar": hasta 50 por llamada
  utilidades/                           tokens, autorizacion, cloudinary, imagenes (compartidas)
```

## Autorización

Cada función acepta una de dos credenciales:

- **Admin**: header `Authorization: Bearer <sesion>` (sesión de `iniciar-sesion-admin`) y `proyecto` en el cuerpo. Puede todo.
- **Enlace**: `token` (y `clave` si es de larga duración) en el cuerpo. Solo su proyecto y solo los permisos del token: `alta`, `listar`, `modificar`, `eliminar`.

Los enlaces con más de 6 meses de vigencia piden una contraseña: el valor de la variable `TOKEN_SECRET_{PROYECTO}_LARGO` (el proyecto sin caracteres especiales y en mayúsculas, p. ej. `TOKEN_SECRET_ENBLANCO_RESIDENCIAL_LARGO`). Cambiar esa variable deja sin acceso a los enlaces largos de ese proyecto.

## Variables de entorno (Netlify)

```text
TOKEN_SECRET                 mínimo 32 caracteres
ADMIN_PASSWORD_HASH          scrypt$sal$hash (node herramientas/generar-hash-admin.js "clave")
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
CLOUDINARY_CLOUD_NAME        (opcional si usa CLOUDINARY_URL)
TOKEN_SECRET_*_LARGO         una por proyecto con enlaces largos
```

Tras cambiar variables hay que volver a desplegar.

## proyectos.json

```json
{
  "id": "monarca",
  "nombre": "Residencial Monarca",
  "permisosCliente": ["alta"],
  "soloCarpetasDefinidas": false,
  "carpetas": [{ "value": "galeria", "label": "Galería" }]
}
```

`id` es el prefijo de carpeta en Cloudinary. `permisosCliente` preselecciona los permisos al generar un enlace. Con `soloCarpetasDefinidas: true` solo valen las carpetas listadas; por defecto se pueden crear carpetas nuevas dentro del proyecto (hasta 3 niveles, caracteres seguros).

## Datos de cada imagen

- Carpeta Cloudinary: `proyecto/carpeta`. Tag: `proyecto_carpeta` (con `/` reemplazado por `_`); los sitios que leen por tag dependen de esto, al mover de carpeta el tag se actualiza.
- `context`: `caption` = título, `alt` = descripción, el resto son metadatos personalizados (`etiqueta=valor`). `caption` y `alt` son nombres reservados.
- Nombre generado: `AAAAMMDDHHMMSS_nombre` (editable). Si ya existe una imagen con ese nombre, la subida se rechaza.
- Reglas de metadatos (portal de carga): los textos pueden repetirse; los valores numéricos de una etiqueta no pueden repetirse en la carpeta. El panel de administración avisa pero permite continuar.
- `modificar-imagen`: si se envía `titulo`, `descripcion` o `metadatos`, el context completo se reemplaza; el cliente debe enviar los tres.

## Cómo probar

- `herramientas/probar-generar-enlace.ps1`: login y generación de enlace.
- `herramientas/probar-imagenes.ps1`: ciclo completo (subir, listar, modificar, eliminar) en el proyecto `pruebas`.

## Limitaciones

- No hay pruebas automatizadas ni build; se prueba contra Netlify.
- No hay bloqueo por intentos fallidos de login (solo una espera de 0,8 s). Si hiciera falta, usar Netlify Blobs.
- Los enlaces no se pueden revocar individualmente; vencen o se invalidan cambiando `TOKEN_SECRET` (todos) o la variable `_LARGO` (largos de un proyecto).
