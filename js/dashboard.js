document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('linkGeneratorForm');
    const projectSelect = document.getElementById('projectSelect');
    const resultContainer = document.getElementById('resultContainer');
    const generatedLinkInput = document.getElementById('generatedLink');
    const copyBtn = document.getElementById('copyBtn');
    const copyStatus = document.getElementById('copyStatus');

    let proyectosData = [];

    // 1. Cargar el JSON de proyectos o usar un respaldo integrado
    try {
        const response = await fetch('proyectos.json');
        if (!response.ok) throw new Error('No se pudo cargar proyectos.json');
        const data = await response.json();
        proyectosData = data.proyectos;
    } catch (error) {
        console.warn('No se pudo cargar el JSON externo, cargando proyectos por defecto:', error);
        proyectosData = [
            {
                id: "monarca",
                nombre: "Residencial Monarca",
                carpetas: [
                    { value: "galeria", label: "Galería" },
                    { value: "instalaciones", label: "Instalaciones" }
                ]
            },
            {
                id: "consAge",
                nombre: "Consultorio Agenda (consAge)",
                carpetas: [
                    { value: "general", label: "General" },
                    { value: "pacientes", label: "Pacientes" }
                ]
            }
        ];
    }

    // Llenar el selector de proyectos
    projectSelect.innerHTML = '<option value="">-- Selecciona un proyecto --</option>';
    proyectosData.forEach(proj => {
        const opt = document.createElement('option');
        opt.value = proj.id;
        opt.textContent = proj.nombre;
        projectSelect.appendChild(opt);
    });

    // 2. Configurar la fecha mínima y predeterminarla a 24 horas a partir de ahora
    const now = new Date();
    const in24Hours = new Date(now.getTime() + (24 * 60 * 60 * 1000));

    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    in24Hours.setMinutes(in24Hours.getMinutes() - in24Hours.getTimezoneOffset());

    const expirationInput = document.getElementById('expirationDate');
    expirationInput.min = now.toISOString().slice(0, 16);
    expirationInput.value = in24Hours.toISOString().slice(0, 16);

    // 3. Generar el link al enviar el formulario
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const selectedProjectId = projectSelect.value;
        const expirationDate = expirationInput.value;

        if (!selectedProjectId) return;

        const expirationTimestamp = new Date(expirationDate).getTime();

        // Empaquetar los datos del token
        const payload = {
            project: selectedProjectId,
            exp: expirationTimestamp
        };

        // Codificar a Base64
        const token = btoa(JSON.stringify(payload));
        const baseUrl = window.location.origin; 
        const finalUrl = `${baseUrl}/subir.html?token=${token}`;

        // Mostrar el resultado en pantalla
        generatedLinkInput.value = finalUrl;
        resultContainer.classList.remove('hidden');
        copyStatus.textContent = '';
    });

    // 4. Funcionalidad para copiar el link al portapapeles
    copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(generatedLinkInput.value);
            copyStatus.textContent = '¡Enlace copiado al portapapeles!';
            setTimeout(() => {
                copyStatus.textContent = '';
            }, 3000);
        } catch (err) {
            copyStatus.textContent = 'Error al copiar. Selecciona y copia manualmente.';
        }
    });
});