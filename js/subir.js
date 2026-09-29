let PROYECTO_ACTUAL = "";
let BASE_FOLDER = "";

const cfgCloudinary = (typeof CONFIG !== 'undefined' && CONFIG.CLOUDINARY) ? CONFIG.CLOUDINARY : {};
const CLOUD_NAME = cfgCloudinary.CLOUD_NAME || 'p0qlmlor';
const UPLOAD_PRESET = cfgCloudinary.UPLOAD_PRESET || 'subir_gestor';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

document.addEventListener('DOMContentLoaded', async () => {
    const fallo = (msg) => {
        $('loadingState').classList.add('hidden');
        if (msg) $('errorMessage').textContent = msg;
        $('errorState').classList.remove('hidden');
    };

    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) return fallo();

    try {
        const payload = JSON.parse(atob(token));
        if (Date.now() > payload.exp) return fallo();

        PROYECTO_ACTUAL = payload.project;
        BASE_FOLDER = PROYECTO_ACTUAL;

        $('displayProjectName').textContent = PROYECTO_ACTUAL;
        $('displayExpDate').textContent = new Date(payload.exp).toLocaleString('es-UY', { dateStyle: 'medium', timeStyle: 'short' });

        let carpetas = [
            { value: 'galeria', label: 'Galería' },
            { value: 'instalaciones', label: 'Instalaciones' }
        ];
        try {
            const resp = await fetch('proyectos.json');
            if (resp.ok) {
                const data = await resp.json();
                const proy = data.proyectos.find(p => p.id === PROYECTO_ACTUAL);
                if (proy && Array.isArray(proy.carpetas) && proy.carpetas.length) carpetas = proy.carpetas;
            }
        } catch (err) {
            console.warn('Usando carpetas por defecto', err);
        }

        $('loadingState').classList.add('hidden');$('mainInterface').classList.remove('hidden');
        iniciarApp(carpetas);
    } catch (error) {
        fallo('El enlace está corrupto o mal formado.');
    }
});

function iniciarApp(carpetasIniciales) {
    const NUEVA = '__nueva__';
    const clave = PROYECTO_ACTUAL.replace(/\//g, '_');
    const K_ULTIMA = `hub_ultima_carpeta_${clave}`;
    const K_CARPETAS = `hub_subcarpetas_${clave}`;
    const ANCHOS = [[800, '800 px'], [1200, '1200 px'], [1600, '1600 px'], [1920, '1920 px'], [0, 'Original']];

    const contenedor = $('cardsContainer');
    const selCarpeta = $('globalCategory');
    const selAncho = $('globalMaxWidth');
    const selCalidad = $('globalQuality');
    const inTitulo = $('globalTitle');
    const chkOriginal = $('globalKeepOriginal');
    const barra = $('batchActions');
    const contador = $('counterText');
    const progreso = $('progressBar');
    const btnSubir = $('uploadAllBtn');
    const btnBajar = $('downloadAllBtn');
    const zona = $('dropzone');
    const inArchivos = $('fileInput');
    const aviso = $('aviso');

    let items = [];
    let seq = 0;

    /* ---------- Carpetas ---------- */
    function cargarCarpetas() {
        try {
            const g = JSON.parse(localStorage.getItem(K_CARPETAS));
            if (Array.isArray(g) && g.length) return g;
        } catch { }
        return [...carpetasIniciales];
    }
    function guardarCarpetas(l) { try { localStorage.setItem(K_CARPETAS, JSON.stringify(l)); } catch { } }
    function ultimaCarpeta() {
        let u = null;
        try { u = localStorage.getItem(K_ULTIMA); } catch { }
        const l = cargarCarpetas();
        return (u && l.find(f => f.value === u)) ? u : l[0].value;
    }
    function guardarUltima(v) { try { localStorage.setItem(K_ULTIMA, v); } catch { } }
    function slug(n) {
        return n.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    }
    function opcionesCarpeta(sel) {
        return cargarCarpetas().map(f => `<option value="${esc(f.value)}" ${f.value === sel ? 'selected' : ''}>${esc(f.label)}</option>`).join('')
            + `<option value="${NUEVA}">+ Nueva carpeta…</option>`;
    }
    function opcionesAncho(sel) {
        return ANCHOS.map(([v, t]) => `<option value="${v}" ${v === sel ? 'selected' : ''}>${t}</option>`).join('');
    }
    function pintarCarpetaGlobal(v) { selCarpeta.innerHTML = opcionesCarpeta(v || ultimaCarpeta()); }
    pintarCarpetaGlobal();

    function resolverCarpeta(sel, alResolver) {
        if (sel.value !== NUEVA) return alResolver(sel.value);
        const crudo = prompt('Nombre de la nueva carpeta:');
        const s = crudo ? slug(crudo) : '';
        if (!s) return alResolver(ultimaCarpeta());
        const l = cargarCarpetas();
        if (!l.find(f => f.value === s)) { l.push({ value: s, label: crudo.trim() }); guardarCarpetas(l); }
        alResolver(s);
    }

    /* ---------- Utilidades ---------- */
    function formatoBytes(b) {
        if (!b) return '0 B';
        const u = ['B', 'KB', 'MB', 'GB'];
        const i = Math.min(Math.floor(Math.log(b) / Math.log(1024)), 3);
        return parseFloat((b / Math.pow(1024, i)).toFixed(1)) + ' ' + u[i];
    }
    function nombreFinal(it) {
        return it.keep ? it.nombreOrig : `${it.fecha}_${it.nombre || 'imagen'}`;
    }
    function dimensiones(img, max) {
        let w = img.naturalWidth, h = img.naturalHeight;
        if (max > 0 && w > max) { h = Math.round(h * max / w); w = max; }
        return { w, h };
    }
    function generarBlob(it) {
        return new Promise((resolve) => {
            const c = document.createElement('canvas');
            const { w, h } = dimensiones(it.img, it.ancho);
            c.width = w; c.height = h;
            c.getContext('2d').drawImage(it.img, 0, 0, w, h);
            c.toBlob(resolve, 'image/webp', it.calidad);
        });
    }
    function textoEstado(it) {
        return { pendiente: 'Pendiente', subiendo: 'Subiendo…', ok: '✓ Subida', error: 'Error · reintentar' }[it.estado];
    }
    function setEstado(it, estado, msg = '') {
        it.estado = estado;
        const el = $(`estado-${it.id}`);
        if (el) { el.className = `estado ${estado}`; el.textContent = textoEstado(it); el.title = msg; }
        actualizarBarra();
    }
    function mostrarAviso(txt) {
        if (aviso) {
            aviso.textContent = txt;
            aviso.classList.toggle('hidden', !txt);
        }
    }

    /* ---------- Agregar archivos ---------- */
    async function agregarArchivos(lista) {
        lista = Array.from(lista);
        const validos = lista.filter(f => f.type.startsWith('image/'));
        const carpeta = selCarpeta.value === NUEVA ? ultimaCarpeta() : selCarpeta.value;
        const p = (n) => String(n).padStart(2, '0');

        const nuevos = await Promise.all(validos.map(f => new Promise((res) => {
            const url = URL.createObjectURL(f);
            const img = new Image();
            img.onload = () => {
                const d = new Date(f.lastModified || Date.now());
                res({
                    id: ++seq, file: f, img, url,
                    tam: f.size, ts: d.getTime(),
                    fecha: `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`,
                    keep: chkOriginal.checked,
                    nombreOrig: f.name.replace(/\.[^.]+$/, '') || f.name,
                    nombre: 'imagen', carpeta,
                    titulo: inTitulo.value.trim(), desc: '',
                    ancho: parseInt(selAncho.value), calidad: selCalidad ? parseFloat(selCalidad.value) : 0.8,
                    estado: 'pendiente'
                });
            };
            img.onerror = () => { URL.revokeObjectURL(url); res(null); };
            img.src = url;
        })));

        const ok = nuevos.filter(Boolean);
        const omitidos = lista.length - ok.length;
        mostrarAviso(omitidos ? `${omitidos} archivo${omitidos === 1 ? '' : 's'} no se pudo${omitidos === 1 ? '' : 'ieron'} leer como imagen y se omitió.` : '');
        items = items.concat(ok).sort((a, b) => b.ts - a.ts);
        render();
    }

    /* ---------- Render (Con Título y Descripción fijos y visibles) ---------- */
    function tarjeta(it) {
        return `
        <article class="card flex flex-col gap-4 shadow-sm transition-all hover:shadow-md p-4 bg-white rounded-xl border" data-id="${it.id}" style="border-color: var(--border-color);">
            <div class="relative rounded-lg overflow-hidden aspect-video flex items-center justify-center border bg-slate-900" style="border-color: var(--border-color);">
                <img src="${it.url}" alt="Vista previa de ${esc(it.nombreOrig)}" class="preview-canvas object-contain w-full h-full">
                <span class="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-200" id="peso-${it.id}">…</span>
            </div>
            
            <div class="flex flex-col gap-2.5 text-xs">
                <div class="flex justify-between items-center pb-1 border-b border-slate-100">
                    <span style="color: var(--text-muted);">Original: <strong style="color: var(--text-main);">${formatoBytes(it.tam)}</strong></span>
                    <div class="flex items-center gap-1.5">
                        <input type="checkbox" data-campo="keep" ${it.keep ? 'checked' : ''} class="w-3.5 h-3.5 cursor-pointer accent-blue-600">
                        <span class="cursor-pointer font-medium" style="color: var(--text-main);">Respetar nombre</span>
                    </div>
                </div>

                ${it.keep 
                    ? `<div class="w-full border rounded px-2.5 py-1.5 truncate bg-slate-50 font-mono text-xs" style="border-color: var(--border-color); color: var(--text-muted);">${esc(it.nombreOrig)}</div>` 
                    : `<input type="text" data-campo="nombre" value="${esc(it.nombre)}" placeholder="Nombre corto..." class="w-full border rounded px-2.5 py-1.5 focus-ring font-mono text-xs bg-white" style="border-color: var(--border-color);">`}
                
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="font-semibold block mb-1" style="color: var(--text-muted);">Carpeta:</label>
                        <select data-campo="carpeta" class="w-full border rounded px-2 py-1.5 focus-ring bg-white" style="border-color: var(--border-color);">
                            ${opcionesCarpeta(it.carpeta)}
                        </select>
                    </div>
                    <div>
                        <label class="font-semibold block mb-1" style="color: var(--text-muted);">Ancho máx.:</label>
                        <select data-campo="ancho" class="w-full border rounded px-2 py-1.5 focus-ring bg-white" style="border-color: var(--border-color);">
                            ${opcionesAncho(it.ancho)}
                        </select>
                    </div>

                    <!-- TÍTULO VISIBLE Y FIJO -->
                    <div class="col-span-2">
                        <label class="font-semibold block mb-1" style="color: var(--text-muted);">Título descriptivo:</label>
                        <input type="text" data-campo="titulo" value="${esc(it.titulo)}" placeholder="Ej. Vista principal" class="w-full border rounded px-2.5 py-1.5 focus-ring bg-white" style="border-color: var(--border-color);">
                    </div>

                    <!-- DESCRIPCIÓN VISIBLE Y FIJA -->
                    <div class="col-span-2">
                        <label class="font-semibold block mb-1" style="color: var(--text-muted);">Descripción (Opcional):</label>
                        <textarea data-campo="desc" rows="2" placeholder="Detalles de la toma..." class="w-full border rounded px-2.5 py-1.5 focus-ring bg-white" style="border-color: var(--border-color);">${esc(it.desc)}</textarea>
                    </div>
                </div>
                
                <div class="truncate mt-1 p-2 rounded border flex justify-between items-center bg-slate-50 font-mono text-[11px] text-blue-700 font-medium" style="border-color: var(--border-color);">
                    <span class="truncate"><span style="color: var(--text-muted);">${esc(BASE_FOLDER)}/${esc(it.carpeta)}/</span>${esc(nombreFinal(it))}.webp</span>
                </div>
            </div>

            <div class="flex justify-between items-center pt-3 border-t mt-auto gap-2 flex-wrap" style="border-color: var(--border-color);">
                <button class="btn btn-danger text-xs font-semibold text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded transition-colors cursor-pointer" type="button" data-acc="eliminar">Eliminar</button>
                <div class="flex items-center gap-2 flex-wrap justify-end">
                    <span class="estado ${it.estado} text-xs px-2.5 py-1.5 rounded shrink-0 bg-slate-100 font-medium" id="estado-${it.id}" style="color: var(--text-muted);">${textoEstado(it)}</span>
                    <button class="btn btn-secundario btn-base btn-sec font-semibold px-3 py-1.5 rounded text-xs transition-colors cursor-pointer bg-slate-200 hover:bg-slate-300 text-slate-700" type="button" data-acc="bajar">Descargar</button>
                    <button class="btn btn-primario btn-base btn-main font-semibold px-3 py-1.5 rounded text-xs transition-colors cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-sm" type="button" data-acc="subir">Subir</button>
                </div>
            </div>
        </article>`;
    }

    function actualizarRuta(it) {
        const art = contenedor.querySelector(`[data-id="${it.id}"]`);
        const r = art && art.querySelector('.ruta');
        if (r) r.innerHTML = `<span>${esc(BASE_FOLDER)}/${esc(it.carpeta)}/</span>${esc(nombreFinal(it))}.webp`;
    }

    async function medir(it) {
        const blob = await generarBlob(it);
        const el = $(`peso-${it.id}`);
        if (!el || !blob) return;
        const dif = it.tam ? Math.round((blob.size - it.tam) / it.tam * 100) : 0;
        el.textContent = `${formatoBytes(blob.size)} · ${dif > 0 ? '+' : ''}${dif}%`;
    }

    function render() {
        contenedor.innerHTML = items.map(tarjeta).join('');
        items.forEach(it => { medir(it); });
        actualizarBarra();
    }

    function actualizarBarra() {
        const total = items.length;
        const ok = items.filter(i => i.estado === 'ok').length;
        const err = items.filter(i => i.estado === 'error').length;
        if (barra) barra.classList.toggle('hidden', !total);
        if (contador) contador.textContent = `${total} ${total === 1 ? 'imagen' : 'imágenes'} · ${ok} subida${ok === 1 ? '' : 's'}${err ? ` · ${err} con error` : ''}`;
        if (progreso) progreso.style.width = total ? `${ok / total * 100}%` : '0%';
    }

    /* ---------- Subir / descargar ---------- */
    async function subir(it) {
        if (it.estado === 'subiendo' || it.estado === 'ok') return;
        setEstado(it, 'subiendo');
        try {
            const blob = await generarBlob(it);
            const nombre = nombreFinal(it);
            const fd = new FormData();
            fd.append('file', blob, `${nombre}.webp`);
            fd.append('upload_preset', UPLOAD_PRESET);
            fd.append('public_id', nombre);
            fd.append('folder', `${BASE_FOLDER}/${it.carpeta}`);
            fd.append('tags', `${clave}_${it.carpeta}`);

            const limpiar = (s) => (s || '').trim().replace(/[|=]/g, ' ');
            const contexto = [
                it.titulo.trim() && `caption=${limpiar(it.titulo)}`,
                it.desc.trim() && `alt=${limpiar(it.desc)}`
            ].filter(Boolean).join('|');
            if (contexto) fd.append('context', contexto);

            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || 'Error de Cloudinary');
            setEstado(it, 'ok');
        } catch (err) {
            setEstado(it, 'error', err.message);
        }
    }

    async function subirTodas() {
        const cola = items.filter(i => i.estado === 'pendiente' || i.estado === 'error');
        if (!cola.length) return;
        if (btnSubir) btnSubir.disabled = true;
        await Promise.all(Array.from({ length: 3 }, async () => {
            while (cola.length) await subir(cola.shift());
        }));
        if (btnSubir) btnSubir.disabled = false;
    }

    async function descargar(it) {
        const blob = await generarBlob(it);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${nombreFinal(it)}.webp`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    /* ---------- Eventos de tarjetas (delegados) ---------- */
    const contexto = (e) => {
        const art = e.target.closest('.card');
        return art ? items.find(x => x.id === +art.dataset.id) : null;
    };

    contenedor.addEventListener('input', (e) => {
        const it = contexto(e), c = e.target.dataset.campo;
        if (!it || !['nombre', 'titulo', 'desc'].includes(c)) return;
        it[c] = e.target.value;
        if (c === 'nombre') actualizarRuta(it);
    });

    contenedor.addEventListener('change', (e) => {
        const it = contexto(e), c = e.target.dataset.campo;
        if (!it) return;
        if (c === 'keep') { it.keep = e.target.checked; render(); }
        else if (c === 'ancho') { it.ancho = parseInt(e.target.value); medir(it); }
        else if (c === 'carpeta') resolverCarpeta(e.target, (v) => { it.carpeta = v; render(); });
    });

    contenedor.addEventListener('click', (e) => {
        const b = e.target.closest('[data-acc]');
        const it = contexto(e);
        if (!b || !it) return;
        if (b.dataset.acc === 'subir') subir(it);
        else if (b.dataset.acc === 'bajar') descargar(it);
        else if (b.dataset.acc === 'eliminar') {
            URL.revokeObjectURL(it.url);
            items = items.filter(x => x.id !== it.id);
            render();
        }
    });

    /* ---------- Controles globales ---------- */
    if (selCarpeta) {
        selCarpeta.addEventListener('change', () => resolverCarpeta(selCarpeta, (v) => {
            pintarCarpetaGlobal(v); guardarUltima(v);
            items.forEach(i => { i.carpeta = v; });
            render();
        }));
    }
    if (selAncho) selAncho.addEventListener('change', () => { items.forEach(i => { i.ancho = parseInt(selAncho.value); }); render(); });
    if (selCalidad) selCalidad.addEventListener('change', () => { items.forEach(i => { i.calidad = parseFloat(selCalidad.value); }); render(); });
    if (chkOriginal) chkOriginal.addEventListener('change', () => { items.forEach(i => { i.keep = chkOriginal.checked; }); render(); });

    if (btnSubir) btnSubir.addEventListener('click', subirTodas);
    if (btnBajar) btnBajar.addEventListener('click', () => items.forEach((it, i) => setTimeout(() => descargar(it), i * 250)));

    /* ---------- Selección y arrastrar/soltar ---------- */
    if (inArchivos) inArchivos.addEventListener('change', (e) => { agregarArchivos(e.target.files); inArchivos.value = ''; });
    if (zona) {
        ['dragenter', 'dragover'].forEach(ev => zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.add('arrastrando'); }));
        ['dragleave', 'drop'].forEach(ev => zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.remove('arrastrando'); }));
        zona.addEventListener('drop', (e) => agregarArchivos(e.dataTransfer.files));
    }

    window.addEventListener('beforeunload', (e) => {
        if (items.some(i => i.estado === 'subiendo')) { e.preventDefault(); e.returnValue = ''; }
    });
}