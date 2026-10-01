document.addEventListener('DOMContentLoaded', async () => {
    const FUNCIONES = '/.netlify/functions';

    const panel = document.getElementById('panelGenerador');
    const navAdmin = document.getElementById('navAdmin');
    const logoutBtn = document.getElementById('logoutBtn');
    const form = document.getElementById('linkGeneratorForm');
    const projectSelect = document.getElementById('projectSelect');
    const modeSelect = document.getElementById('modeSelect');
    const expirationInput = document.getElementById('expirationDate');
    const resultContainer = document.getElementById('resultContainer');
    const resultadoVacio = document.getElementById('resultadoVacio');
    const resultadoListo = document.getElementById('resultadoListo');
    const resumenEnlace = document.getElementById('resumenEnlace');
    const generatedLinkInput = document.getElementById('generatedLink');
    const copyBtn = document.getElementById('copyBtn');
    const copyStatus = document.getElementById('copyStatus');
    const avisoLargo = document.getElementById('avisoLargo');
    const checks = [...document.querySelectorAll('input[name="permisos"]')];

    let proyectosData = [];

    // --- Sesión de administrador (pantalla de contraseña compartida: js/acceso.js) ---
    const login = Acceso.loginAdmin(async () => {
        mostrarPanel(true);
        await cargarProyectos();
    });

    function mostrarPanel(si) {
        panel.classList.toggle('hidden', !si);
        navAdmin.classList.toggle('hidden', !si);
        if (si) login.ocultar(); else login.mostrar();
    }

    function sesionVencida() {
        Acceso.sesionAdmin.borrar();
        reiniciarResultado();
        panel.classList.add('hidden');
        navAdmin.classList.add('hidden');
        login.mostrar('La sesión venció. Ingresá de nuevo.');
    }

    logoutBtn.addEventListener('click', () => {
        Acceso.sesionAdmin.borrar();
        reiniciarResultado();
        mostrarPanel(false);
    });

    // --- Tarjeta del enlace: siempre en su lugar; al generar sale y vuelve con el enlace nuevo ---
    const esperar = ms => new Promise(r => setTimeout(r, ms));

    function reiniciarResultado() {
        generatedLinkInput.value = '';
        resultadoListo.classList.add('hidden');
        resultadoVacio.classList.remove('hidden');
        resultContainer.classList.remove('result-card', 'saliendo', 'nuevo');
    }

    async function mostrarResultado({ url, resumen, larga }) {
        resultContainer.classList.add('saliendo');            // la tarjeta se va...
        await esperar(160);
        resultadoVacio.classList.add('hidden');
        resultadoListo.classList.remove('hidden');
        resultContainer.classList.add('result-card');
        generatedLinkInput.value = url;
        resumenEnlace.textContent = resumen;
        copyStatus.textContent = '';
        avisoLargo.classList.toggle('hidden', !larga);
        if (larga) avisoLargo.textContent = 'Enlace de larga duración: al abrirlo se pedirá la contraseña guardada en la variable TOKEN_SECRET_..._LARGO de este proyecto.';
        resultContainer.classList.remove('saliendo');         // ...y vuelve con el enlace nuevo
        resultContainer.classList.remove('nuevo');
        void resultContainer.offsetWidth;                     // reinicia la animación del destello
        resultContainer.classList.add('nuevo');
    }

    // --- Proyectos y permisos por defecto ---
    function aplicarPermisosPorDefecto() {
        const proj = proyectosData.find(p => p.id === projectSelect.value);
        const defecto = (proj && proj.permisosCliente) || ['alta'];
        checks.forEach(c => { c.checked = defecto.includes(c.value); });
    }

    async function cargarProyectos() {
        try {
            const response = await fetch('proyectos.json');
            if (!response.ok) throw new Error('No se pudo cargar proyectos.json');
            proyectosData = (await response.json()).proyectos || [];
        } catch (error) {
            console.warn('No se pudo leer proyectos.json:', error);
            proyectosData = [];
        }
        projectSelect.innerHTML = '<option value="">-- Selecciona un proyecto --</option>';
        proyectosData.forEach(proj => {
            const opt = document.createElement('option');
            opt.value = proj.id;
            opt.textContent = proj.nombre;
            projectSelect.appendChild(opt);
        });
        aplicarPermisosPorDefecto();
    }
    projectSelect.addEventListener('change', aplicarPermisosPorDefecto);

    // Al elegir "Galería" se marca "Ver imágenes", que necesita para funcionar
    modeSelect.addEventListener('change', () => {
        if (modeSelect.value !== 'galeria') return;
        checks.forEach(c => { if (c.value === 'listar') c.checked = true; });
    });

    // --- Vencimiento por defecto: 24 horas ---
    const ahora = new Date();
    const en24h = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
    ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());
    en24h.setMinutes(en24h.getMinutes() - en24h.getTimezoneOffset());
    expirationInput.min = ahora.toISOString().slice(0, 16);
    expirationInput.value = en24h.toISOString().slice(0, 16);

    // --- Generar enlace ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const sesion = Acceso.sesionAdmin.leer();
        if (!sesion) { sesionVencida(); return; }

        const proyecto = projectSelect.value;
        if (!proyecto) return;
        const permisos = checks.filter(c => c.checked).map(c => c.value);
        if (!permisos.length) { alert('Elegí al menos un permiso.'); return; }
        if (modeSelect.value === 'galeria' && !permisos.includes('listar')) { alert('La galería necesita el permiso "Ver imágenes".'); return; }
        if (modeSelect.value !== 'galeria' && !permisos.includes('alta')) { alert('Esa pantalla de carga necesita el permiso "Subir imágenes".'); return; }

        try {
            const res = await fetch(`${FUNCIONES}/generar-enlace`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sesion.sesion}` },
                body: JSON.stringify({ proyecto, permisos, exp: new Date(expirationInput.value).getTime() })
            });
            const data = await res.json();
            if (res.status === 401) { sesionVencida(); return; }
            if (!res.ok) throw new Error(data.error || 'Error al generar el enlace');

            const paginas = { admin: 'subir.html', cliente: 'subir-cliente.html', galeria: 'galeria.html' };
            const pagina = paginas[modeSelect.value];
            const modo = modeSelect.value === 'galeria' ? 'cliente' : modeSelect.value;
            const url = `${window.location.origin}/${pagina}?token=${encodeURIComponent(data.token)}&modo=${encodeURIComponent(modo)}`;

            const nombresPermisos = { alta: 'subir', listar: 'ver', modificar: 'modificar', eliminar: 'eliminar' };
            const nombreProyecto = projectSelect.options[projectSelect.selectedIndex].textContent;
            const nombrePantalla = modeSelect.options[modeSelect.selectedIndex].textContent;
            const vence = new Date(data.exp).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short' });
            await mostrarResultado({
                url,
                larga: data.larga,
                resumen: `${nombreProyecto} · ${nombrePantalla} · ${permisos.map(p => nombresPermisos[p] || p).join(', ')} · vence ${vence}`
            });
        } catch (err) {
            alert('Hubo un error al generar el enlace: ' + err.message);
        }
    });

    copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(generatedLinkInput.value);
            copyStatus.textContent = '¡Enlace copiado al portapapeles!';
            setTimeout(() => { copyStatus.textContent = ''; }, 3000);
        } catch (err) {
            copyStatus.textContent = 'Error al copiar.';
        }
    });

    // --- Arranque ---
    if (Acceso.sesionAdmin.leer()) {
        mostrarPanel(true);
        await cargarProyectos();
    } else {
        mostrarPanel(false);
    }
});
