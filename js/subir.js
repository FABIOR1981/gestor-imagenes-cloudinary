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

    // Validación del enlace temporal por URL
    const urlParams = new URLSearchParams(window.location.search);
    const tokenTemporal = urlParams.get('token') || urlParams.get('t') || '';

    // Obtención segura de credenciales (leyendo de CONFIG global o valores seguros por defecto)
    const cfgCloudinary = (typeof CONFIG !== 'undefined' && CONFIG.CLOUDINARY) ? CONFIG.CLOUDINARY : {};
    const CLOUD_NAME = cfgCloudinary.CLOUD_NAME || window.env?.CLOUDINARY_CLOUD_NAME || 'p0qlmlor';
    const UPLOAD_PRESET = cfgCloudinary.UPLOAD_PRESET || window.env?.CLOUDINARY_UPLOAD_PRESET || 'subir_gestor';

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
                // Preparar datos para Cloudinary usando las variables configuradas
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', UPLOAD_PRESET);
                if (title) formData.append('context', `alt=${title}|caption=${description}`);

                const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                    method: 'POST',
                    body: formData
                });

                const resultado = await response.json();

                if (!response.ok) {
                    throw new Error(resultado.error?.message || 'Hubo un problema al subir la imagen.');
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

    // Función auxiliar para mostrar estados en la interfaz
    function mostrarEstado(mensaje, tipo) {
        if (!uploadStatus) return;
        uploadStatus.textContent = mensaje;
        uploadStatus.className = `upload-status ${tipo}`;
    }
});