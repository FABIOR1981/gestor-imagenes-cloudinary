document.addEventListener('DOMContentLoaded', async () => {
    const FUNCIONES = '/.netlify/functions';
    const CLAVE_SESION = 'gestor_sesion_admin';

    const loginCard = document.getElementById('loginCard');
    const loginForm = document.getElementById('loginForm');
    const adminClave = document.getElementById('adminClave');
    const loginError = document.getElementById('loginError');
    const panel = document.getElementById('panelGenerador');
    const logoutBtn = document.getElementById('logoutBtn');

    const form = document.getElementById('linkGeneratorForm');
    const projectSelect = document.getElementById('projectSelect');
    const modeSelect = document.getElementById('modeSelect');
    const expirationInput = document.getElementById('expirationDate');
    const resultContainer = document.getElementById('resultContainer');
    const generatedLinkInput = document.getElementById('generatedLink');
    const copyBtn = document.getElementById('copyBtn');
    const copyStatus = document.getElementById('copyStatus');
    const avisoLargo = document.getElementById('avisoLargo');
    const checks = [...document.querySelectorAll('input[name="permisos"]')];

    let proyectosData = [];

    // --- Sesión de administrador (dura 2 horas; vive solo en esta pestaña) ---
    function leerSesion() {
        try {
            const s = JSON.parse(sessionStorage.getItem(CLAVE_SESION));
            if (s && s.exp > Date.now()) return s;
        } catch {}
        sessionStorage.removeItem(CLAVE_SESION);
        return null;
    }

    function mostrarPanel(si) {
        loginCard.classList.toggle('hidden', si);
        panel.classList.toggle('hidden', !si);
        if (!si) adminClave.value = '';
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.textContent = '';
        try {
            const res = await fetch(`${FUNCIONES}/iniciar-sesion-admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clave: adminClave.value })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo iniciar sesión');
            sessionStorage.setItem(CLAVE_SESION, JSON.stringify({ sesion: data.sesion, exp: data.exp }));
            mostrarPanel(true);
            await cargarProyectos();
        } catch (err) {
            loginError.textContent = err.message;
        }
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem(CLAVE_SESION);
        resultContainer.classList.add('hidden');
        mostrarPanel(false);
    });

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
        const sesion = leerSesion();
        if (!sesion) {
            mostrarPanel(false);
            loginError.textContent = 'La sesión venció. Ingresá de nuevo.';
            return;
        }

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
            if (res.status === 401) {
                sessionStorage.removeItem(CLAVE_SESION);
                mostrarPanel(false);
                loginError.textContent = 'La sesión venció. Ingresá de nuevo.';
                return;
            }
            if (!res.ok) throw new Error(data.error || 'Error al generar el enlace');

            const paginas = { admin: 'subir.html', cliente: 'subir-cliente.html', galeria: 'galeria.html' };
            const pagina = paginas[modeSelect.value];
            const modo = modeSelect.value === 'galeria' ? 'cliente' : modeSelect.value;
            const url = `${window.location.origin}/${pagina}?token=${encodeURIComponent(data.token)}&modo=${encodeURIComponent(modo)}`;

            generatedLinkInput.value = url;
            resultContainer.classList.remove('hidden');
            copyStatus.textContent = '';
            avisoLargo.classList.toggle('hidden', !data.larga);
            if (data.larga) avisoLargo.textContent = 'Enlace de larga duración: al abrirlo se pedirá la contraseña guardada en la variable TOKEN_SECRET_..._LARGO de este proyecto.';
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
    if (leerSesion()) {
        mostrarPanel(true);
        await cargarProyectos();
    } else {
        mostrarPanel(false);
    }
});
