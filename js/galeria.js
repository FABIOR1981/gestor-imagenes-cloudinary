// Galería para quien entra con un ENLACE (no administrador).
// Muestra solo lo que los permisos del enlace permiten: ver, modificar, eliminar y subir.
// La validación real de cada acción la hace el servidor; los botones ocultos son solo comodidad.
document.addEventListener('DOMContentLoaded', async () => {
    const FUNCIONES = '/.netlify/functions';
    const params = new URLSearchParams(window.location.search);
    const TOKEN = params.get('token');
    const MODO = params.get('modo') === 'admin' ? 'admin' : 'cliente';

    const $ = id => document.getElementById(id);
    const selCarpeta = $('selCarpeta'), grilla = $('grilla'), estado = $('estado');
    const btnMas = $('btnMas'), btnBorrarSel = $('btnBorrarSel'), contSel = $('contSel');
    const modal = $('modal');

    let CLAVE = '';
    let PROYECTO = '';
    let PERMISOS = [];
    let proyectos = [];
    let imagenes = [];
    let siguiente = null;
    let carpetasConocidas = new Set();
    const seleccion = new Set();
    let editando = null;

    const puede = permiso => PERMISOS.includes(permiso);
    const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const relCarpeta = img => img.carpeta.slice(PROYECTO.length + 1);
    const nombreDe = img => img.public_id.slice(img.public_id.lastIndexOf('/') + 1);
    const miniatura = url => url.replace('/upload/', '/upload/c_fill,w_360,h_270,f_auto,q_auto/');
    const mensaje = (t, error = false) => { estado.textContent = t; estado.className = `text-sm mb-3 ${error ? 'text-red-600' : 'text-slate-500'}`; };

    function verSolo(id) {
        ['estadoCarga', 'estadoError', 'app'].forEach(x => $(x).classList.toggle('hidden', x !== id));
    }
    function mostrarError(texto) {
        $('mensajeError').textContent = texto;
        verSolo('estadoError');
    }

    // ---------- Acceso ----------
    // Devuelve 'ok', 'clave' (hay que pedir la contraseña) o { error }
    async function verificar(clave) {
        const res = await fetch(`${FUNCIONES}/verificar-enlace`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: TOKEN, clave })
        });
        const data = await res.json().catch(() => ({}));

        if (res.status === 401 && (data.requiereClave || (clave && data.error === 'Contraseña incorrecta'))) return 'clave';
        if (!res.ok || !data.valida) return { error: data.error || 'Enlace inválido o vencido.' };

        CLAVE = clave || '';
        PROYECTO = data.proyecto;
        PERMISOS = data.permisos || [];
        await iniciar(data.exp);
        return 'ok';
    }

    // Pantalla de contraseña compartida (js/acceso.js)
    const tarjetaClave = Acceso.tarjeta({
        titulo: 'Acceso protegido',
        texto: 'Ingresá la contraseña proporcionada por el administrador.',
        placeholder: 'Contraseña',
        boton: '🔓 Desbloquear acceso',
        recortar: true,
        alEnviar: async (valor) => {
            const r = await verificar(valor);
            if (r === 'clave') throw new Error('Contraseña incorrecta.');
            if (r !== 'ok') throw new Error(r.error);
            Acceso.guardarClave(TOKEN, valor);
            tarjetaClave.ocultar();
        }
    });

    async function api(funcion, cuerpo) {
        const res = await fetch(`${FUNCIONES}/${funcion}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: TOKEN, clave: CLAVE, ...cuerpo })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Error del servidor');
        return data;
    }

    // ---------- Carpetas ----------
    function pintarCarpetas() {
        const actual = selCarpeta.value;
        const lista = [...carpetasConocidas].sort((a, b) => a.localeCompare(b, 'es'));
        selCarpeta.innerHTML = '<option value="">Todas las carpetas</option>' +
            lista.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
        selCarpeta.value = lista.includes(actual) ? actual : '';
        $('listaCarpetas').innerHTML = lista.map(c => `<option value="${esc(c)}"></option>`).join('');
    }

    // ---------- Listado ----------
    async function cargar(reiniciar) {
        if (reiniciar) { imagenes = []; siguiente = null; seleccion.clear(); grilla.innerHTML = ''; }
        mensaje('Cargando…');
        try {
            const data = await api('listar-imagenes', { carpeta: selCarpeta.value || undefined, cursor: siguiente || undefined });
            imagenes = imagenes.concat(data.imagenes);
            siguiente = data.siguiente;
            imagenes.forEach(i => { const r = relCarpeta(i); if (r) carpetasConocidas.add(r); });
            if (!selCarpeta.value) pintarCarpetas();
            dibujar();
            mensaje(imagenes.length ? `${imagenes.length} imagen(es) cargadas.` : 'No hay imágenes en esta selección.');
        } catch (err) {
            mensaje(err.message, true);
        }
    }

    function tarjeta(img) {
        const nombre = nombreDe(img);
        const chips = img.metadatos.map(m => `<span class="text-[11px] bg-slate-100 rounded px-1.5 py-0.5">${esc(m.name)}: ${esc(m.value)}</span>`).join('');
        const botones = [
            puede('modificar') ? '<button type="button" class="editar flex-1 py-2 hover:bg-slate-50">✏️ Editar</button>' : '',
            puede('eliminar') ? '<button type="button" class="borrar flex-1 py-2 text-red-600 hover:bg-red-50 border-l">🗑 Eliminar</button>' : ''
        ].join('');
        return `<article class="bg-white rounded-xl shadow overflow-hidden flex flex-col" data-id="${esc(img.public_id)}">
            <div class="relative">
                <img src="${esc(miniatura(img.url))}" alt="${esc(img.descripcion || nombre)}" loading="lazy" class="w-full h-40 object-cover bg-slate-100">
                ${puede('eliminar') ? `<input type="checkbox" class="sel absolute top-2 left-2 w-5 h-5" ${seleccion.has(img.public_id) ? 'checked' : ''}>` : ''}
            </div>
            <div class="p-3 text-sm flex-1 space-y-1">
                <p class="font-semibold truncate" title="${esc(nombre)}">${esc(img.titulo || nombre)}</p>
                <p class="text-xs text-slate-500 truncate">${esc(relCarpeta(img))} · ${esc(nombre)}</p>
                ${img.descripcion ? `<p class="text-xs text-slate-600">${esc(img.descripcion)}</p>` : ''}
                <div class="flex flex-wrap gap-1">${chips}</div>
            </div>
            ${botones ? `<div class="flex border-t text-sm">${botones}</div>` : ''}
        </article>`;
    }

    function dibujar() {
        grilla.innerHTML = imagenes.map(tarjeta).join('');
        btnMas.classList.toggle('hidden', !siguiente);
        actualizarSeleccion();
    }
    function actualizarSeleccion() {
        contSel.textContent = seleccion.size;
        btnBorrarSel.classList.toggle('hidden', seleccion.size === 0 || !puede('eliminar'));
    }

    grilla.addEventListener('click', (e) => {
        const art = e.target.closest('article');
        if (!art) return;
        const img = imagenes.find(i => i.public_id === art.dataset.id);
        if (!img) return;
        if (e.target.closest('.editar')) abrirEdicion(img);
        if (e.target.closest('.borrar')) eliminar([img.public_id], `"${img.titulo || nombreDe(img)}"`);
    });
    grilla.addEventListener('change', (e) => {
        if (!e.target.classList.contains('sel')) return;
        const id = e.target.closest('article').dataset.id;
        e.target.checked ? seleccion.add(id) : seleccion.delete(id);
        actualizarSeleccion();
    });

    // ---------- Eliminar ----------
    async function eliminar(ids, descripcion) {
        if (!confirm(`¿Eliminar ${descripcion}? Esta acción no se puede deshacer.`)) return;
        try {
            for (let i = 0; i < ids.length; i += 50) {
                await api('eliminar-imagen', { public_ids: ids.slice(i, i + 50) });
            }
            imagenes = imagenes.filter(i => !ids.includes(i.public_id));
            ids.forEach(id => seleccion.delete(id));
            dibujar();
            mensaje('Eliminado.');
        } catch (err) {
            mensaje(err.message, true);
        }
    }
    btnBorrarSel.addEventListener('click', () => eliminar([...seleccion], `${seleccion.size} imagen(es) seleccionadas`));

    // ---------- Editar ----------
    function agregarFila(nombre = '', valor = '') {
        const fila = document.createElement('div');
        fila.className = 'flex gap-2 fila-meta';
        fila.innerHTML = `<input class="meta-nombre border rounded px-2 py-1.5 w-2/5" placeholder="etiqueta" maxlength="40" value="${esc(nombre)}">
            <input class="meta-valor border rounded px-2 py-1.5 flex-1" placeholder="valor" maxlength="200" value="${esc(valor)}">
            <button type="button" class="quitar text-red-600 px-2" title="Quitar">✕</button>`;
        $('editMetadatos').appendChild(fila);
    }
    $('btnAgregarMeta').addEventListener('click', () => agregarFila());
    $('editMetadatos').addEventListener('click', (e) => { if (e.target.classList.contains('quitar')) e.target.closest('.fila-meta').remove(); });

    function abrirEdicion(img) {
        editando = img;
        $('errorEditar').textContent = '';
        $('editVista').src = miniatura(img.url);
        $('editNombre').value = nombreDe(img);
        $('editCarpeta').value = relCarpeta(img);
        $('editTitulo').value = img.titulo;
        $('editDescripcion').value = img.descripcion;
        $('editMetadatos').innerHTML = '';
        img.metadatos.forEach(m => agregarFila(m.name, m.value));
        modal.classList.remove('hidden');
    }
    const cerrarEdicion = () => { modal.classList.add('hidden'); editando = null; };
    $('btnCancelar').addEventListener('click', cerrarEdicion);
    modal.addEventListener('click', (e) => { if (e.target === modal) cerrarEdicion(); });

    $('formEditar').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!editando) return;
        const carpeta = $('editCarpeta').value.trim();
        const metadatos = [...document.querySelectorAll('.fila-meta')]
            .map(f => ({ name: f.querySelector('.meta-nombre').value.trim(), value: f.querySelector('.meta-valor').value.trim() }))
            .filter(m => m.name && m.value);

        // Aviso: valores numéricos repetidos en la misma carpeta (ej. orden=4 ya usado)
        for (const m of metadatos) {
            if (!/^-?\d+(?:\.\d+)?$/.test(m.value)) continue;
            const choque = imagenes.some(o => o.public_id !== editando.public_id && relCarpeta(o) === carpeta &&
                o.metadatos.some(x => x.name === m.name && x.value === m.value));
            if (choque && !confirm(`Otra imagen de "${carpeta}" ya tiene ${m.name}=${m.value}. ¿Guardar igual?`)) return;
        }

        $('btnGuardar').disabled = true;
        try {
            await api('modificar-imagen', {
                public_id: editando.public_id,
                nombre: $('editNombre').value.trim(),
                carpeta,
                titulo: $('editTitulo').value.trim(),
                descripcion: $('editDescripcion').value.trim(),
                metadatos
            });
            cerrarEdicion();
            await cargar(true);
            mensaje('Cambios guardados.');
        } catch (err) {
            $('errorEditar').textContent = err.message;
        } finally {
            $('btnGuardar').disabled = false;
        }
    });

    // ---------- Controles ----------
    selCarpeta.addEventListener('change', () => cargar(true));
    $('btnRecargar').addEventListener('click', () => cargar(true));
    btnMas.addEventListener('click', () => cargar(false));

    async function iniciar(exp) {
        try {
            const r = await fetch('proyectos.json');
            proyectos = (await r.json()).proyectos || [];
        } catch { proyectos = []; }
        const def = proyectos.find(p => p.id === PROYECTO);
        $('nombreProyecto').textContent = (def && def.nombre) || PROYECTO;
        $('fechaVence').textContent = new Date(exp).toLocaleString('es-UY', { dateStyle: 'medium', timeStyle: 'short' });
        carpetasConocidas = new Set(((def && def.carpetas) || []).map(c => c.value));
        pintarCarpetas();

        if (puede('alta')) {
            const pagina = MODO === 'cliente' ? 'subir-cliente.html' : 'subir.html';
            $('enlaceSubir').href = `${pagina}?token=${encodeURIComponent(TOKEN)}&modo=${MODO}`;
            $('enlaceSubir').classList.remove('hidden');
        }

        verSolo('app');
        if (!puede('listar')) {
            $('avisoSinPermiso').classList.remove('hidden');
            $('barraControles').classList.add('hidden');
            return;
        }
        await cargar(true);
    }

    // ---------- Arranque ----------
    if (!TOKEN) { mostrarError('Falta el enlace de acceso.'); return; }
    try {
        const r = await verificar(Acceso.leerClave(TOKEN) || undefined); // usa la contraseña ya escrita en esta pestaña
        if (r === 'clave') { verSolo(null); tarjetaClave.mostrar(); }
        else if (r !== 'ok') mostrarError(r.error);
    } catch {
        mostrarError('No se pudo validar el acceso con el servidor.');
    }
});
