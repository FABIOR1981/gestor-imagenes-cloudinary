document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('linkGeneratorForm');
    const projectSelect = document.getElementById('projectSelect');
    const modeSelect = document.getElementById('modeSelect');
    const resultContainer = document.getElementById('resultContainer');
    const generatedLinkInput = document.getElementById('generatedLink');
    const copyBtn = document.getElementById('copyBtn');
    const copyStatus = document.getElementById('copyStatus');

    let proyectosData = [];

    try {
        const response = await fetch('proyectos.json');
        if (!response.ok) throw new Error('No se pudo cargar proyectos.json');
        const data = await response.json();
        proyectosData = data.proyectos;
    } catch (error) {
        console.warn('Usando proyectos por defecto:', error);
        proyectosData = [
            {
                id: "monarca",
                nombre: "Residencial Monarca",
                carpetas: [
                    { value: "galeria", label: "Galería" },
                    { value: "instalaciones", label: "Instalaciones" }
                ]
            }
        ];
    }

    projectSelect.innerHTML = '<option value="">-- Selecciona un proyecto --</option>';
    proyectosData.forEach(proj => {
        const opt = document.createElement('option');
        opt.value = proj.id;
        opt.textContent = proj.nombre;
        projectSelect.appendChild(opt);
    });

    const now = new Date();
    const in24Hours = new Date(now.getTime() + (24 * 60 * 60 * 1000));
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    in24Hours.setMinutes(in24Hours.getMinutes() - in24Hours.getTimezoneOffset());

    const expirationInput = document.getElementById('expirationDate');
    expirationInput.min = now.toISOString().slice(0, 16);
    expirationInput.value = in24Hours.toISOString().slice(0, 16);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const selectedProjectId = projectSelect.value;
        const selectedMode = modeSelect.value;
        const expirationDate = expirationInput.value;

        if (!selectedProjectId) return;

        const expirationTimestamp = new Date(expirationDate).getTime();

        try {
            // Llamamos a la función segura de Netlify en lugar de armar el token en el cliente
            const res = await fetch('/.netlify/functions/generar-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project: selectedProjectId, exp: expirationTimestamp })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al generar el enlace');

            const baseUrl = window.location.origin;
            const uploadPage = selectedMode === 'cliente' ? 'subir-cliente.html' : 'subir.html';
            const finalUrl = `${baseUrl}/${uploadPage}?token=${encodeURIComponent(data.token)}&modo=${encodeURIComponent(selectedMode)}`;

            generatedLinkInput.value = finalUrl;
            resultContainer.classList.remove('hidden');
            copyStatus.textContent = '';
        } catch (err) {
            alert('Hubo un error al generar el enlace seguro: ' + err.message);
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
});