// Pantalla de contraseña y sesión de administrador, compartidas por TODAS las páginas.
// El aspecto y los textos de la pantalla de contraseña se cambian solo acá.
// Requiere css/styles.css (clases card, btn-primary, icono-estado) y Tailwind, como subir.html.
const Acceso = (() => {
    const CLAVE_SESION = 'gestor_sesion_admin';
    const PREFIJO_CLAVE_ENLACE = 'gestor_clave_enlace_';

    // ---- Sesión de administrador (dura 2 horas; vive solo en esta pestaña) ----
    const sesionAdmin = {
        leer() {
            try {
                const s = JSON.parse(sessionStorage.getItem(CLAVE_SESION));
                if (s && s.exp > Date.now()) return s;
            } catch {}
            sessionStorage.removeItem(CLAVE_SESION);
            return null;
        },
        guardar(datos) { sessionStorage.setItem(CLAVE_SESION, JSON.stringify(datos)); },
        borrar() { sessionStorage.removeItem(CLAVE_SESION); }
    };

    // ---- Contraseña de un enlace largo: se escribe una sola vez por pestaña ----
    const claveDe = token => PREFIJO_CLAVE_ENLACE + String(token).slice(-24);
    function leerClave(token) {
        try { return sessionStorage.getItem(claveDe(token)) || ''; } catch { return ''; }
    }
    function guardarClave(token, clave) {
        try { sessionStorage.setItem(claveDe(token), clave); } catch {}
    }

    // ---- Tarjeta de contraseña (misma para admin y para enlaces) ----
    // alEnviar(valor) es async: si la contraseña no sirve debe lanzar Error('mensaje'), que se muestra en la tarjeta.
    function tarjeta({ icono = '🔐', titulo, texto, placeholder, boton, recortar = false, alEnviar }) {
        const el = document.createElement('div');
        el.className = 'card max-w-md mx-auto text-center hidden mt-12 p-8 shadow-xl';
        el.style.borderTop = '4px solid var(--primary-color)';
        el.innerHTML = `
            <div class="icono-estado"></div>
            <h1 class="text-2xl font-bold mb-3" style="color: var(--text-main);"></h1>
            <p class="acceso-texto text-sm mb-6" style="color: var(--text-muted);"></p>
            <form class="flex flex-col gap-4">
                <input type="password" class="border rounded px-3 py-2 text-center font-mono" autocomplete="current-password" required>
                <button type="submit" class="btn-primary"></button>
                <p class="acceso-error text-xs text-red-600 font-semibold hidden"></p>
            </form>`;

        el.querySelector('.icono-estado').textContent = icono;
        el.querySelector('h1').textContent = titulo;
        el.querySelector('.acceso-texto').textContent = texto;
        const form = el.querySelector('form');
        const entrada = el.querySelector('input');
        const enviar = el.querySelector('button');
        const error = el.querySelector('.acceso-error');
        entrada.placeholder = placeholder;
        enviar.textContent = boton;

        const api = {
            mostrar(aviso) {
                el.classList.remove('hidden');
                if (aviso) api.mostrarError(aviso); else error.classList.add('hidden');
                entrada.focus();
            },
            ocultar() { el.classList.add('hidden'); },
            mostrarError(mensaje) { error.textContent = mensaje; error.classList.remove('hidden'); }
        };

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            error.classList.add('hidden');
            enviar.disabled = true;
            try {
                await alEnviar(recortar ? entrada.value.trim() : entrada.value);
                entrada.value = '';
            } catch (err) {
                api.mostrarError(err.message || 'No se pudo verificar la contraseña.');
            } finally {
                enviar.disabled = false;
            }
        });

        document.body.appendChild(el);
        return api;
    }

    // ---- Login de administrador: valida en el servidor, guarda la sesión y avisa con alEntrar() ----
    function loginAdmin(alEntrar) {
        const t = tarjeta({
            titulo: 'Acceso de administrador',
            texto: 'Ingresá la contraseña de administrador para continuar.',
            placeholder: 'Contraseña de administrador',
            boton: '🔓 Ingresar',
            alEnviar: async (clave) => {
                const res = await fetch('/.netlify/functions/iniciar-sesion-admin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clave })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || 'No se pudo iniciar sesión');
                sesionAdmin.guardar({ sesion: data.sesion, exp: data.exp });
                t.ocultar();
                await alEntrar();
            }
        });
        return t;
    }

    return { sesionAdmin, leerClave, guardarClave, tarjeta, loginAdmin };
})();
