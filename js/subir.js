document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('uploadForm');
    const imageInput = document.getElementById('imageInput');
    const imagePreview = document.getElementById('imagePreview');
    const previewContainer = document.getElementById('previewContainer');
    const uploadStatus = document.getElementById('uploadStatus');
    const submitBtn = document.getElementById('submitBtn');

    // Referencias opcionales para título y descripción (se mantienen tal cual sin alterar su lógica)
    const titleInput = document.getElementById('titleInput');
    const descriptionInput = document.getElementById('descriptionInput');

    // Validación del enlace temporal por URL (ejemplo: ?token=... o validando expiración si aplica)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenTemporal = urlParams.get('token') || urlParams.get('t') || '';

    // Vista previa de la imagen seleccionada
    if (imageInput) {
        imageInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (imagePreview) imagePreview.src = e.target.result;
                    if (previewContainer) previewContainer.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Manejo del envío del formulario
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const file = imageInput.files[0];
            if (!file) {
                mostrarEstado('Por favor selecciona una imagen.', 'error');
                return;
            }

            const title = titleInput ? titleInput.value.trim() : '';
            const description = descriptionInput ? descriptionInput.value.trim() : '';

            mostrarEstado('Subiendo imagen de forma segura...', 'info');
            if (submitBtn) submitBtn.disabled = true;

            try {
                // Convertir la imagen a Base64 para enviarla a la Netlify Function
                const base64Image = await convertirBase64(file);

                // Llamada a la Netlify Function en lugar de exponer Cloudinary en el cliente
                const response = await fetch('/.netlify/functions/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image: base64Image,
                        token: tokenTemporal,
                        title: title,
                        description: description
                    })
                });

                const resultado = await response.json();

                if (!response.ok) {
                    throw new Error(resultado.error || 'El enlace ha expirado o no es válido.');
                }

                mostrarEstado('¡Imagen subida con éxito!', 'success');
                uploadForm.reset();
                if (previewContainer) previewContainer.style.display = 'none';

            } catch (error) {
                console.error('Error en la subida:', error);
                mostrarEstado(error.message || 'Hubo un error al procesar la subida.', 'error');
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // Utilidad para convertir archivo a Base64
    function convertirBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    }

    // Función auxiliar para mostrar estados en la interfaz
    function mostrarEstado(mensaje, tipo) {
        if (!uploadStatus) return;
        uploadStatus.textContent = mensaje;
        uploadStatus.className = `upload-status ${tipo}`; // Clases estilizadas según tu CSS
    }
});