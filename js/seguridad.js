document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);
    const app = $('app');
    let proyectos = [];

    // ---------- Sesión de administrador (pantalla compartida: js/acceso.js) ----------
    const login = Acceso.loginAdmin(() => iniciar());
    function mostrar(logueado) {
        app.classList.toggle('hidden', !logueado);
        if (logueado) login.ocultar(); else login.mostrar();
    }
    function sesionVencida() {
        Acceso.sesionAdmin.borrar();
        app.classList.add('hidden');
        login.mostrar('La sesión venció. Ingresá de nuevo.');
    }

    // ---------- Utilidades ----------
    async function copiar(texto, boton) {
        const original = boton.textContent;
        try {
            await navigator.clipboard.writeText(texto);
            boton.textContent = '¡Copiado!';
        } catch {
            boton.textContent = 'No se pudo copiar';
        }
        setTimeout(() => { boton.textContent = original; }, 2000);
    }

    // Selección sin sesgo con el generador aleatorio del navegador
    const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'; // sin 0/O, 1/l/I
    function claveAleatoria(largo = 16) {
        const limite = 256 - (256 % ALFABETO.length);
        const salida = [];
        while (salida.length < largo) {
            const bytes = new Uint8Array(32);
            crypto.getRandomValues(bytes);
            for (const b of bytes) {
                if (b < limite && salida.length < largo) salida.push(ALFABETO[b % ALFABETO.length]);
            }
        }
        return salida.join('');
    }
    function secretoBase64Url(bytes = 48) {
        const datos = new Uint8Array(bytes);
        crypto.getRandomValues(datos);
        let texto = '';
        datos.forEach(b => { texto += String.fromCharCode(b); });
        return btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    // Misma regla que nombreVariableClaveLarga() en netlify/functions/utilidades/tokens.js
    const nombreVariable = id => `TOKEN_SECRET_${String(id).replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}_LARGO`;

    // ---------- 1) ADMIN_PASSWORD_HASH (se calcula en el servidor) ----------
    $('btnHash').addEventListener('click', async () => {
        $('errorHash').textContent = '';
        $('resultadoHash').classList.add('hidden');
        const clave = $('claveNueva').value;
        if (clave.length < 12) { $('errorHash').textContent = 'Usá al menos 12 caracteres.'; return; }
        if (clave !== $('claveRepetida').value) { $('errorHash').textContent = 'Las dos contraseñas no coinciden.'; return; }

        const sesion = Acceso.sesionAdmin.leer();
        if (!sesion) { sesionVencida(); return; }
        $('btnHash').disabled = true;
        try {
            const res = await fetch('/.netlify/functions/generar-hash-clave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sesion.sesion}` },
                body: JSON.stringify({ clave })
            });
            const data = await res.json().catch(() => ({}));
            if (res.status === 401) { sesionVencida(); return; }
            if (!res.ok) throw new Error(data.error || 'No se pudo generar el valor');
            $('valorHash').value = data.valor;
            $('resultadoHash').classList.remove('hidden');
            $('claveNueva').value = '';
            $('claveRepetida').value = '';
        } catch (err) {
            $('errorHash').textContent = err.message;
        } finally {
            $('btnHash').disabled = false;
        }
    });
    $('btnCopiarHash').addEventListener('click', e => copiar($('valorHash').value, e.currentTarget));

    // ---------- 2) TOKEN_SECRET (se genera en el navegador) ----------
    $('btnSecreto').addEventListener('click', () => {
        $('valorSecreto').value = secretoBase64Url(48);
        $('resultadoSecreto').classList.remove('hidden');
    });
    $('btnCopiarSecreto').addEventListener('click', e => copiar($('valorSecreto').value, e.currentTarget));

    // ---------- 3) TOKEN_SECRET_{PROYECTO}_LARGO ----------
    const actualizarNombre = () => { $('nombreVariable').value = $('selProyecto').value ? nombreVariable($('selProyecto').value) : ''; };
    $('selProyecto').addEventListener('change', actualizarNombre);
    $('btnAleatoria').addEventListener('click', () => { $('claveLarga').value = claveAleatoria(16); });
    $('btnCopiarNombre').addEventListener('click', e => copiar($('nombreVariable').value, e.currentTarget));
    $('btnCopiarClaveLarga').addEventListener('click', e => copiar($('claveLarga').value, e.currentTarget));

    async function iniciar() {
        mostrar(true);
        try {
            const r = await fetch('proyectos.json');
            proyectos = (await r.json()).proyectos || [];
        } catch { proyectos = []; }
        $('selProyecto').innerHTML = proyectos.map(p => `<option value="${p.id.replace(/"/g, '&quot;')}">${p.nombre.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</option>`).join('');
        actualizarNombre();
    }

    Acceso.sesionAdmin.leer() ? iniciar() : mostrar(false);
});
