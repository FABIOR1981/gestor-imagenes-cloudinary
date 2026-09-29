document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('linkGeneratorForm');
    const projectSelect = document.getElementById('projectSelect');
    const resultContainer = document.getElementById('resultContainer');
    const generatedLinkInput = document.getElementById('generatedLink');
    const copyBtn = document.getElementById('copyBtn');
    const copyStatus = document.getElementById('copyStatus');

    let proyectosData = [];

    // 1. Cargar el JSON de proyectos al iniciar
    try {
        const response = await fetch('proyectos.json');
        if (!response.ok) throw new Error('No se pudo cargar proyectos.json');
        const data = await response.json();
        proyectosData = data.proyectos;

        // Llenar el select con las opciones del JSON
        projectSelect.innerHTML = '<option value="">-- Selecciona un proyecto --</option>';
        proyectosData.forEach(proj => {
            const opt = document.createElement('option');
            opt.value = proj.id;
            opt.textContent = proj.nombre;
            projectSelect.appendChild(opt);
        });
    } catch (error) {
        console.error(error);
        projectSelect.innerHTML = '<option value="">Error al cargar proyectos</option>';
    }

    // Configurar la fecha mínima permitida en el input como "ahora"
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('expirationDate').min = now.toISOString().slice(0, 16);

    // 2. Generar el link al enviar el formulario
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const selectedProjectId = projectSelect.value;
        const expirationDate = document.getElementById('expirationDate').value;

        if (!selectedProjectId) return;

        const expirationTimestamp = new Date(expirationDate).getTime();

        // El payload guarda el ID del proyecto (ej: "monarca")
        const payload = {
            project: selectedProjectId,
            exp: expirationTimestamp
        };

        const token = btoa(JSON.stringify(payload));
        const baseUrl = window.location.origin; 
        const finalUrl = `${baseUrl}/subir.html?token=${token}`;

        generatedLinkInput.value = finalUrl;
        resultContainer.classList.remove('hidden');
        copyStatus.textContent = '';
    });

    // Funcionalidad para copiar el link
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