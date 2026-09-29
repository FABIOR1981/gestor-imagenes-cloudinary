document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('linkGeneratorForm');
    const resultContainer = document.getElementById('resultContainer');
    const generatedLinkInput = document.getElementById('generatedLink');
    const copyBtn = document.getElementById('copyBtn');
    const copyStatus = document.getElementById('copyStatus');

    // Configurar la fecha mínima permitida en el input como "ahora"
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('expirationDate').min = now.toISOString().slice(0, 16);

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const projectName = document.getElementById('projectName').value.trim().toLowerCase();
        const expirationDate = document.getElementById('expirationDate').value;

        // Convertir la fecha a Timestamp (milisegundos) para validarla fácilmente después
        const expirationTimestamp = new Date(expirationDate).getTime();

        // 1. Crear el payload (los datos que viajarán en la URL)
        const payload = {
            project: projectName,
            exp: expirationTimestamp
        };

        // 2. Codificar a Base64
        // Stringify convierte el objeto a texto, btoa lo pasa a Base64
        const token = btoa(JSON.stringify(payload));

        // 3. Armar la URL final
        // Suponiendo que la interfaz del cliente se llamará 'subir.html' en la misma raíz
        const baseUrl = window.location.origin; 
        const finalUrl = `${baseUrl}/subir.html?token=${token}`;

        // Mostrar el resultado
        generatedLinkInput.value = finalUrl;
        resultContainer.classList.remove('hidden');
        copyStatus.textContent = ''; // Limpiar mensajes anteriores
    });

    // Funcionalidad para copiar el link
    copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(generatedLinkInput.value);
            copyStatus.textContent = '¡Enlace copiado al portapapeles!';
            
            // Ocultar mensaje después de 3 segundos
            setTimeout(() => {
                copyStatus.textContent = '';
            }, 3000);
        } catch (err) {
            copyStatus.textContent = 'Error al copiar. Selecciona y copia manualmente.';
            copyStatus.style.color = '#D32F2F'; // Color rojo
        }
    });
});