// Pantalla de contraseña y sesión de administrador, compartidas por TODAS las páginas.
// El aspecto y los textos de la pantalla de contraseña se cambian solo acá.
// Los estilos van incluidos en este archivo, así que se ve igual con o sin Tailwind.
// Usa las variables de color y las clases card / btn-primary de css/styles.css.
const Acceso = (() => {
    const ESTILOS = `
        .acceso-overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 100; background: rgba(241, 245, 249, 0.2); }
        .acceso-tarjeta { width: 100%; max-width: 400px; padding: 32px 28px; text-align: center; background: #fff; border-radius: 22px; box-shadow: 0 10px 30px -14px rgba(30,41,59,.3); border-top: 4px solid var(--primary-color, #2563EB); box-sizing: border-box; }
        .acceso-tarjeta .icono-estado { font-size: 42px; margin-bottom: 10px; }
        .acceso-tarjeta h1 { font-size: 1.4rem; font-weight: 700; margin: 0 0 10px; color: var(--text-main, #0F172A); }
        .acceso-tarjeta .acceso-texto { font-size: .9rem; margin: 0 0 22px; color: var(--text-muted, #64748B); }
        .acceso-tarjeta form { display: flex; flex-direction: column; gap: 14px; margin: 0; }
        .acceso-tarjeta input[type="password"] { width: 100%; box-sizing: border-box; padding: 12px 14px; font-size: 1rem;
            text-align: center; background: #fff; color: var(--text-main, #0F172A);
            border: 1.5px solid var(--border-color, #E2E8F0); border-radius: var(--radius, 12px); transition: border-color 0.2s, box-shadow 0.2s; }
        .acceso-tarjeta input[type="password"]:focus { outline: none; border-color: var(--primary-color, #2563EB);
            box-shadow: 0 0 0 4px rgba(37, 99, 235, .14); }
        .acceso-tarjeta .acceso-error { margin: 0; font-size: .82rem; font-weight: 600; color: #DC2626; }
        .acceso-overlay.hidden, .acceso-tarjeta .acceso-error.hidden { display: none !important; }
    `;
    function inyectarEstilos() {
        if (document.getElementById('acceso-estilos')) return;
        const estilo = document.createElement('style');
        estilo.id = 'acceso-estilos';
        estilo.textContent = ESTILOS;
        document.head.appendChild(estilo);
    }

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
        inyectarEstilos();
        const overlay = document.createElement('div');
        overlay.className = 'acceso-overlay hidden';
        overlay.innerHTML = `
            <div class="card acceso-tarjeta">
                <div class="icono-estado"></div>
                <h1></h1>
                <p class="acceso-texto"></p>
                <form>
                    <input type="password" autocomplete="current-password" required>
                    <button type="submit" class="btn-primary"></button>
                    <p class="acceso-error hidden"></p>
                </form>
            </div>`;

        const el = overlay.querySelector('.acceso-tarjeta');
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
                overlay.classList.remove('hidden');
                if (aviso) api.mostrarError(aviso); else error.classList.add('hidden');
                entrada.focus();
            },
            ocultar() { overlay.classList.add('hidden'); },
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

        document.body.appendChild(overlay);
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