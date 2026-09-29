document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los contenedores de la UI
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const uploadState = document.getElementById('uploadState');
    const errorMessage = document.getElementById('errorMessage');
    
    const displayProjectName = document.getElementById('displayProjectName');
    const displayExpDate = document.getElementById('displayExpDate');
    
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const uploadForm = document.getElementById('uploadForm');

    // 1. Obtener el token de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    // Función para mostrar errores
    const showError = (msg) => {
        loadingState.classList.add('hidden');
        errorState.classList.remove('hidden');
        errorMessage.textContent = msg;
    };

    if (!token) {
        showError('No se encontró ningún token de acceso en el enlace.');
        return;
    }

    try {
        // 2. Decodificar el token Base64
        const decodedString = atob(token);
        const payload = JSON.parse(decodedString);
        
        // 3. Validar el vencimiento
        const now = Date.now();
        if (now > payload.exp) {
            showError('Este enlace de subida ha caducado. Por favor, solicita uno nuevo.');
            return;
        }

        // 4. Si es válido, mostrar la interfaz de subida
        loadingState.classList.add('hidden');
        uploadState.classList.remove('hidden');
        
        displayProjectName.textContent = payload.project;
        
        // Formatear fecha para que el cliente sepa hasta cuándo tiene tiempo
        const expDate = new Date(payload.exp);
        displayExpDate.textContent = expDate.toLocaleString('es-UY', { 
            dateStyle: 'medium', 
            timeStyle: 'short' 
        });

        // Evento para mostrar los nombres de archivos seleccionados
        fileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                fileList.innerHTML = `<strong>${files.length} archivo(s) seleccionado(s)</strong>`;
            } else {
                fileList.innerHTML = '';
            }
        });

        // Evento temporal para simular el envío
        uploadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const statusDiv = document.getElementById('uploadStatus');
            
            if (fileInput.files.length === 0) return;

            statusDiv.style.color = 'var(--text-main)';
            statusDiv.textContent = 'Preparando subida... (En el próximo paso conectaremos esto con Cloudinary)';
            
            // Aquí irá la llamada a la Netlify Function más adelante
        });

    } catch (error) {
        // Si el token fue manipulado y atob() falla
        showError('El enlace está corrupto o mal formado.');
    }
});