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
galeria.html + js/galeria.js            Galería para quien entra con enlace: ver/editar/eliminar/subir según permisos
subir.html / subir-cliente.html         Portal de carga (pantalla completa / simplificada); requiere permiso "alta"
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

## Guía de uso

### Pantallas

| Página | Quién la usa | Para qué |
| --- | --- | --- |
| `index.html` | Administrador | Ingresar con la contraseña de admin y generar enlaces |
| `admin.html` | Administrador | ABM completo: ver, subir, editar, mover y eliminar imágenes de cualquier proyecto |
| `galeria.html` | Quien tiene un enlace | Ver, editar y eliminar imágenes de su proyecto, según los permisos del enlace; botón para subir si tiene `alta` |
| `subir.html` | Quien tiene un enlace con `alta` | Carga con todas las opciones |
| `subir-cliente.html` | Quien tiene un enlace con `alta` | Carga simplificada |

### Permisos de un enlace

| Permiso | Qué permite |
| --- | --- |
| `alta` | Subir imágenes (y ver las sugerencias de metadatos al subir) |
| `listar` | Ver las imágenes del proyecto (necesario para la galería) |
| `modificar` | Cambiar título, descripción, metadatos, nombre y carpeta |
| `eliminar` | Borrar imágenes |

El administrador (sesión de `index.html`) no necesita permisos: puede todo en cualquier proyecto.

### Ejemplo: darle a un cliente (Monarca) enlace para ver, editar, modificar y subir

En `index.html`, con la sesión de admin iniciada:

1. **¿Para qué proyecto es?** Residencial Monarca.
2. **¿Qué pantalla verá?** Galería - ver, editar y eliminar (según permisos).
3. **¿Qué podrá hacer?** Marcar las cuatro casillas: subir, ver, modificar y eliminar.
4. **¿Hasta cuándo estará activo?**
   - Corto (recomendado, por ejemplo 30 días): no pide contraseña.
   - Largo (más de 6 meses): el cliente debe ingresar la contraseña, que es el valor de la variable `TOKEN_SECRET_MONARCA_LARGO` en Netlify. La variable debe existir antes de generar el enlace; la contraseña se le pasa al cliente por otro medio.
5. **Generar enlace**, copiarlo y enviarlo.

El cliente verá las miniaturas de Monarca con los botones Editar y Eliminar, selección múltiple para borrar y un botón **Subir imágenes** que lo lleva a la pantalla de carga con el mismo enlace.

Editar y eliminar actúan sobre las imágenes reales, que son las que leen los sitios por tag.

Para que las cuatro casillas aparezcan marcadas por defecto en Monarca, usar `permisosCliente` en `proyectos.json` (ver el ejemplo siguiente).

### Ejemplo: restringir un proyecto a sus carpetas (`soloCarpetasDefinidas`)

Por defecto cualquier enlace puede crear carpetas nuevas dentro de su proyecto. Para que Monarca acepte solo `galeria` e `instalaciones`:

```json
{
  "id": "monarca",
  "nombre": "Residencial Monarca",
  "permisosCliente": ["alta", "listar", "modificar", "eliminar"],
  "soloCarpetasDefinidas": true,
  "carpetas": [
    { "value": "galeria", "label": "Galería" },
    { "value": "instalaciones", "label": "Instalaciones" }
  ]
}
```

- El servidor rechaza cualquier otra carpeta con "Carpeta destino inválida para este proyecto".
- Los proyectos sin `soloCarpetasDefinidas` siguen aceptando carpetas nuevas.
- La opción "+ Nueva carpeta" de la pantalla de carga y el campo de carpeta de la galería siguen visibles, pero con la restricción activa el servidor las rechaza.
- Para sumar una carpeta, agregarla a la lista `carpetas`.

### Agregar un proyecto nuevo

1. Agregarlo a `proyectos.json` con `id` (prefijo de carpeta en Cloudinary), `nombre`, `permisosCliente` y `carpetas`.
2. Si va a tener enlaces largos, crear en Netlify la variable `TOKEN_SECRET_{ID}_LARGO` (el id sin caracteres especiales y en mayúsculas; `enBlanco/residencial` pasa a `ENBLANCO_RESIDENCIAL`) con la contraseña elegida, y volver a desplegar.

### Mantenimiento

- **Cambiar la contraseña de admin:** `node herramientas/generar-hash-admin.js "nueva clave"`, pegar el resultado en `ADMIN_PASSWORD_HASH` en Netlify y volver a desplegar.
- **Cortar enlaces en una emergencia:** cambiar `TOKEN_SECRET` invalida todos los enlaces y sesiones; cambiar la variable `_LARGO` de un proyecto invalida solo sus enlaces largos. No hay revocación individual.
- **Después de cambiar variables de entorno** siempre hay que volver a desplegar.

### Lista de verificación de seguridad

- [ ] `TOKEN_SECRET` cargado (32 caracteres o más) y `ADMIN_PASSWORD_HASH` generado.
- [ ] Credenciales de Cloudinary cargadas (`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).
- [ ] Eliminados del repo `generar-token.js`, `verificar-token.js` y `consultar-metadatos.js` (versión anterior, sin autenticación).
- [ ] Preset `subir_gestor` de Cloudinary en modo **Signed** o eliminado (si sigue unsigned, cualquiera puede subir sin enlace).
- [ ] Contraseña de admin que no haya sido compartida en ningún chat o documento.
- [ ] Enlaces nuevos con vencimientos cortos siempre que sea posible.

## Cómo probar

- `herramientas/probar-generar-enlace.ps1`: login y generación de enlace.
- `herramientas/probar-imagenes.ps1`: ciclo completo (subir, listar, modificar, eliminar) en el proyecto `pruebas`.

## Limitaciones

- No hay pruebas automatizadas ni build; se prueba contra Netlify.
- No hay bloqueo por intentos fallidos de login (solo una espera de 0,8 s).
- Los enlaces no se pueden revocar uno por uno: vencen, o se invalidan cambiando `TOKEN_SECRET` (todos) o la variable `_LARGO` (los largos de un proyecto). Por eso conviene usar vencimientos cortos.
- Las funciones no usan almacenamiento externo: todo el estado está en los tokens firmados.