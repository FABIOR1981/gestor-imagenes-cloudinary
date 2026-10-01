document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('linkGeneratorForm');
    const projectSelect = document.getElementById('projectSelect');
    const linkTypeSelect = document.getElementById('linkTypeSelect');
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

    if (projectSelect) {
        projectSelect.innerHTML = '<option value="">-- Selecciona un proyecto --</option>';
        proyectosData.forEach(proj => {
            const opt = document.createElement('option');
            opt.value = proj.id;
            opt.textContent = proj.nombre;
            projectSelect.appendChild(opt);
        });
    }

    const now = new Date();
    const in24Hours = new Date(now.getTime() + (24 * 60 * 60 * 1000));
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    in24Hours.setMinutes(in24Hours.getMinutes() - in24Hours.getTimezoneOffset());

    const expirationInput = document.getElementById('expirationDate');
    if (expirationInput) {
        expirationInput.min = now.toISOString().slice(0, 16);
        expirationInput.value = in24Hours.toISOString().slice(0, 16);
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const selectedProjectId = projectSelect.value;
            const expirationDate = expirationInput.value;
            const linkMode = linkTypeSelect ? linkTypeSelect.value : 'completo';

            if (!selectedProjectId) return;

            const expirationTimestamp = new Date(expirationDate).getTime();

            try {
                const res = await fetch('/.netlify/functions/generar-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        project: selectedProjectId, 
                        exp: expirationTimestamp 
                    })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Error al generar el enlace');

                const baseUrl = window.location.origin;
                let finalUrl = `${baseUrl}/subir.html?token=${data.token}`;
                
                // Si eligió cliente, agregamos el parámetro a la URL sin alterar el token ni la firma
                if (linkMode === 'cliente') {
                    finalUrl += `&mode=client`;
                }

                generatedLinkInput.value = finalUrl;
                resultContainer.classList.remove('hidden');
                copyStatus.textContent = '';
            } catch (err) {
                alert('Hubo un error al generar el enlace seguro: ' + err.message);
            }
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(generatedLinkInput.value);
                copyStatus.textContent = '¡Enlace copiado al portapapeles!';
                setTimeout(() => { copyStatus.textContent = ''; }, 3000);
            } catch (err) {
                copyStatus.textContent = 'Error al copiar.';
            }
        });
    }
});