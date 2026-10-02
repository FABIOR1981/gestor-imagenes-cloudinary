let PROYECTO_ACTUAL = "";
let BASE_FOLDER = "";
let TOKEN_ACTUAL = "";
let TOKEN_PASSWORD = "";
const IS_CLIENT_MODE = new URLSearchParams(window.location.search).get('modo') === 'cliente';

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');

    if (!token) {
        loadingState.classList.add('hidden');
        errorState.classList.remove('hidden');
        return;
    }

    TOKEN_ACTUAL = token;

    // Consulta al servidor de Netlify si el enlace es válido (y si hace falta contraseña)
    async function verificarEnlace(clave) {
        const res = await fetch('/.netlify/functions/verificar-enlace', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, clave })
        });
        const data = await res.json().catch(() => ({}));
        return { res, data };
    }

    // Pantalla de contraseña compartida (js/acceso.js), para enlaces de larga duración
    const tarjetaClave = Acceso.tarjeta({
        titulo: 'Acceso protegido',
        texto: 'Ingresá la contraseña proporcionada por el administrador.',
        placeholder: 'Contraseña',
        boton: '🔓 Desbloquear acceso',
        recortar: true,
        alEnviar: async (password) => {
            const { res, data } = await verificarEnlace(password);
            if (!res.ok || !data.valida) throw new Error(data.error || 'Contraseña incorrecta.');
            TOKEN_PASSWORD = password;
            Acceso.guardarClave(token, password);
            tarjetaClave.ocultar();
            await cargarInterfazProyecto(data.proyecto, data.exp, data.permisos);
        }
    });

    try {
        const claveGuardada = Acceso.leerClave(token); // contraseña ya escrita en esta pestaña (p. ej. en la galería)
        const { res, data } = await verificarEnlace(claveGuardada || undefined);

        // Enlace largo sin contraseña (o con la guardada ya inválida): se pide la contraseña
        const claveInvalida = res.status === 401 && claveGuardada && data.error === 'Contraseña incorrecta';
        if (res.status === 401 && (data.requiereClave || claveInvalida)) {
            loadingState.classList.add('hidden');
            tarjetaClave.mostrar();
            return;
        }

        if (!res.ok || !data.valida) {
            loadingState.classList.add('hidden');
            errorState.classList.remove('hidden');
            return;
        }

        TOKEN_PASSWORD = claveGuardada || '';
        await cargarInterfazProyecto(data.proyecto, data.exp, data.permisos);

    } catch (error) {
        loadingState.classList.add('hidden');
        errorState.classList.remove('hidden');
        document.getElementById('errorMessage').textContent = "No se pudo validar el acceso con el servidor o el enlace no es válido.";
    }
});

// Función auxiliar para inicializar la app una vez validado el acceso y permisos
async function cargarInterfazProyecto(projectName, expDate, permisos = []) {
    const loadingState = document.getElementById('loadingState');
    const mainInterface = document.getElementById('mainInterface');

    PROYECTO_ACTUAL = projectName; 
    BASE_FOLDER = PROYECTO_ACTUAL; 

    document.getElementById('displayExpDate').textContent = new Date(expDate).toLocaleString('es-UY', { dateStyle: 'medium', timeStyle: 'short' });

    // Si el enlace incluye el permiso de listar (ver), habilitamos el botón para volver a la galería
    if (!IS_CLIENT_MODE && Array.isArray(permisos) && permisos.includes('listar')) {
        const btnGaleria = document.getElementById('btnVolverGaleria');
        if (btnGaleria) {
            const modoGaleria = IS_CLIENT_MODE ? 'cliente' : 'admin';
            btnGaleria.href = `galeria.html?token=${encodeURIComponent(TOKEN_ACTUAL)}&modo=${modoGaleria}`;
            btnGaleria.classList.remove('hidden');
        }
    }

    let projectFolders = [
        { value: 'galeria', label: 'Galería' },
        { value: 'instalaciones', label: 'Instalaciones' }
    ];

    try {
        const response = await fetch('proyectos.json');
        if (response.ok) {
            const projData = await response.json();
            const foundProj = projData.proyectos.find(p => p.id === PROYECTO_ACTUAL);
            document.getElementById('displayProjectName').textContent = foundProj?.nombre || PROYECTO_ACTUAL;
            if (foundProj && Array.isArray(foundProj.carpetas) && foundProj.carpetas.length > 0) {
                projectFolders = foundProj.carpetas;
            }
        }
    } catch (err) {
        console.warn('Usando carpetas por defecto', err);
        document.getElementById('displayProjectName').textContent = PROYECTO_ACTUAL;
    }

    loadingState.classList.add('hidden');
    mainInterface.classList.remove('hidden');
    initApp(projectFolders); 
}

function initApp(initialFolders) {
    const NEW_FOLDER_OPTION = '__nueva__';
    const safeProjKey = PROYECTO_ACTUAL.replace(/\//g, '_');
    const LAST_FOLDER_KEY = `hub_ultima_carpeta_${safeProjKey}`;
    const FOLDERS_KEY = `hub_subcarpetas_${safeProjKey}`;
    const DEFAULT_FOLDERS = initialFolders;

    const fileInput = document.getElementById('fileInput');
    const cardsContainer = document.getElementById('cardsContainer');
    const globalCategory = document.getElementById('globalCategory');
    const globalMaxWidth = document.getElementById('globalMaxWidth');
    const globalQuality = document.getElementById('globalQuality');
    const globalQualityVal = document.getElementById('globalQualityVal');
    const globalTitle = document.getElementById('globalTitle');
    const globalKeepOriginal = document.getElementById('globalKeepOriginal');
    const batchActions = document.getElementById('batchActions');
    const counterText = document.getElementById('counterText');
    const cardsStepTitle = document.getElementById('cardsStepTitle');
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    const uploadAllBtn = document.getElementById('uploadAllBtn');

    let imageFiles = [];
    let metadataFields = [];
    let previewOverlay = null;
    let previewTimeout = null;
    let editingIndex = null;

    const uploadEditModal = document.getElementById('uploadEditModal');
    const uploadEditForm = document.getElementById('uploadEditForm');
    const uploadEditMetadata = document.getElementById('uploadEditMetadata');
    const uploadEditCategory = document.getElementById('uploadEditCategory');

    function closeUploadEditor() {
        editingIndex = null;
        if (uploadEditModal) uploadEditModal.classList.add('hidden');
    }

    // Una fila de metadato: etiqueta (con las ya usadas como sugerencia) y valor (con los de esa etiqueta)
    function addUploadMetaRow(name = '', value = '') {
        const row = document.createElement('div');
        row.className = 'upload-edit-meta-row';
        const listId = `uploadMetaValores-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        row.innerHTML = `
            <input type="text" class="upload-meta-name" list="uploadMetaNombres" placeholder="Etiqueta" value="${escapeAttribute(name)}">
            <input type="text" class="upload-meta-value" list="${listId}" placeholder="Valor" value="${escapeAttribute(value)}">
            <datalist id="${listId}">${buildMetadataOptions(getMetadataValues(name))}</datalist>
            <button type="button" class="upload-edit-close upload-meta-remove" aria-label="Quitar metadato">×</button>`;
        const nameInput = row.querySelector('.upload-meta-name');
        const valueInput = row.querySelector('.upload-meta-value');
        const valueList = row.querySelector('datalist');
        nameInput.addEventListener('change', () => {
            const currentName = nameInput.value.trim();
            valueList.innerHTML = buildMetadataOptions(getMetadataValues(currentName));
            if (currentName && !valueInput.value.trim()) valueInput.value = getSuggestedMetadataValue(currentName);
        });
        row.querySelector('.upload-meta-remove').addEventListener('click', () => row.remove());
        uploadEditMetadata.appendChild(row);
    }

    function openUploadEditor(index) {
        const item = imageFiles[index];
        if (!item || !uploadEditModal) return;
        editingIndex = index;
        document.getElementById('uploadEditPreview').innerHTML = `<img src="${escapeAttribute(item.imgElement.src)}" alt="Vista previa" title="Toca para ampliar">`;
        document.getElementById('uploadEditName').value = getFinalName(item);
        uploadEditCategory.innerHTML = buildFolderOptionsHtml(item.category);
        document.getElementById('uploadEditMaxWidth').value = String(item.maxWidth);
        document.getElementById('uploadEditQuality').value = String(item.quality);
        // En el modo simplificado no se elige carpeta, ancho ni calidad por imagen (rige la carpeta general)
        uploadEditCategory.closest('label').classList.toggle('hidden', IS_CLIENT_MODE);
        document.querySelector('.upload-edit-grid').classList.toggle('hidden', IS_CLIENT_MODE);
        document.getElementById('uploadEditTitulo').value = item.customTitle || '';
        document.getElementById('uploadEditDescription').value = item.customDescription || '';
        document.getElementById('uploadMetaNombres').innerHTML = metadataFields.map(field => `<option value="${escapeAttribute(field.name)}"></option>`).join('');
        uploadEditMetadata.innerHTML = '';
        item.customMetadata.forEach(meta => addUploadMetaRow(meta.name, meta.value));
        uploadEditModal.classList.remove('hidden');
    }

    if (uploadEditForm) uploadEditForm.addEventListener('submit', event => {
        event.preventDefault();
        if (editingIndex === null || !imageFiles[editingIndex]) return;
        const item = imageFiles[editingIndex];

        const name = document.getElementById('uploadEditName').value.trim().replace(/\.webp$/i, '');
        if (!name) { alert('El nombre no puede quedar vacío.'); return; }

        const metadata = [...uploadEditMetadata.querySelectorAll('.upload-edit-meta-row')].map(row => ({
            name: row.querySelector('.upload-meta-name').value.trim(),
            value: row.querySelector('.upload-meta-value').value.trim()
        })).filter(meta => meta.name || meta.value);

        // Mismas reglas de siempre: etiqueta y valor completos, sin repetir, y números únicos
        for (let i = 0; i < metadata.length; i++) {
            const meta = metadata[i];
            if (!meta.name || !meta.value) { alert('Cada metadato necesita etiqueta y valor. Completalo o quítalo.'); return; }
            if (metadata.some((other, j) => j !== i && other.name === meta.name && other.value === meta.value)) {
                alert(`«${meta.name}: ${meta.value}» está repetido en esta imagen.`); return;
            }
            if (hasNumericMetadataConflict(editingIndex, meta.name, meta.value)) {
                alert(`El valor ${meta.value} de «${meta.name}» ya está en uso. Elige otro número.`); return;
            }
        }

        item.keepOriginal = name === item.originalName;
        const generatedPrefix = `${item.dateStr}_`;
        item.customName = name.startsWith(generatedPrefix) ? name.slice(generatedPrefix.length) : name;
        if (!IS_CLIENT_MODE) {
            if (uploadEditCategory.value && uploadEditCategory.value !== NEW_FOLDER_OPTION) item.category = uploadEditCategory.value;
            item.maxWidth = parseInt(document.getElementById('uploadEditMaxWidth').value, 10);
            item.quality = parseFloat(document.getElementById('uploadEditQuality').value);
        }
        item.customTitle = document.getElementById('uploadEditTitulo').value.trim();
        item.customDescription = document.getElementById('uploadEditDescription').value.trim();
        item.customMetadata = metadata;
        closeUploadEditor();
        renderCards();
    });

    // "+ Nueva carpeta…" también funciona dentro del editor
    if (uploadEditCategory) uploadEditCategory.addEventListener('change', () => {
        handleFolderSelectChange(uploadEditCategory, value => {
            uploadEditCategory.innerHTML = buildFolderOptionsHtml(value);
            uploadEditCategory.value = value;
        });
    });

    document.getElementById('uploadEditCancel')?.addEventListener('click', closeUploadEditor);
    document.getElementById('uploadEditClose')?.addEventListener('click', closeUploadEditor);
    uploadEditModal?.addEventListener('click', event => { if (event.target === uploadEditModal) closeUploadEditor(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && editingIndex !== null) closeUploadEditor(); });
    document.getElementById('uploadEditAddMeta')?.addEventListener('click', () => { if (editingIndex !== null) addUploadMetaRow(); });
    document.getElementById('uploadEditPreview')?.addEventListener('click', event => {
        if (event.target.tagName === 'IMG' && editingIndex !== null) showExpandedPreview(imageFiles[editingIndex].imgElement);
    });

    function showExpandedPreview(imgElement) {
        if (previewOverlay) previewOverlay.remove();
        if (previewTimeout) clearTimeout(previewTimeout);

        previewOverlay = document.createElement('div');
        previewOverlay.className = 'preview-lightbox';
        previewOverlay.setAttribute('role', 'dialog');
        previewOverlay.setAttribute('aria-label', 'Vista ampliada de la imagen');

        const expandedImage = document.createElement('img');
        expandedImage.src = imgElement.src;
        expandedImage.alt = 'Vista ampliada';
        previewOverlay.appendChild(expandedImage);
        document.body.appendChild(previewOverlay);

        const closePreview = () => {
            if (previewOverlay) previewOverlay.remove();
            previewOverlay = null;
            previewTimeout = null;
        };

        previewOverlay.addEventListener('click', closePreview);
        previewTimeout = setTimeout(closePreview, 4000);
    }

    function showUploadErrors(errors) {
        const previousModal = document.getElementById('uploadErrorModal');
        if (previousModal) previousModal.remove();

        const modal = document.createElement('div');
        modal.id = 'uploadErrorModal';
        modal.className = 'upload-error-modal';
        modal.setAttribute('role', 'alertdialog');
        modal.setAttribute('aria-modal', 'true');

        const panel = document.createElement('section');
        panel.className = 'upload-error-panel';
        panel.innerHTML = '<div class="upload-error-heading"><span class="icono-estado">⚠️</span><div><h2>No se pudieron subir algunas imágenes</h2><p>Las demás imágenes se procesaron normalmente.</p></div></div>';

        const list = document.createElement('ul');
        list.className = 'upload-error-list';
        errors.forEach(error => {
            const item = document.createElement('li');
            const name = document.createElement('strong');
            name.textContent = error.name;
            const reason = document.createElement('span');
            reason.textContent = error.reason;
            item.append(name, reason);
            list.appendChild(item);
        });
        panel.appendChild(list);

        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'btn-primary upload-error-close';
        closeButton.textContent = 'Cerrar';
        closeButton.addEventListener('click', () => modal.remove());
        panel.appendChild(closeButton);
        modal.appendChild(panel);
        document.body.appendChild(modal);
    }

    function reportUploadError(index, reason, errorCollector) {
        const error = { name: `${getFinalName(imageFiles[index])}.webp`, reason };
        if (errorCollector) errorCollector.push(error);
        else showUploadErrors([error]);
    }

    function loadFolders() {
        try {
            const stored = JSON.parse(localStorage.getItem(FOLDERS_KEY));
            if (Array.isArray(stored) && stored.length) return stored;
        } catch {}
        return [...DEFAULT_FOLDERS];
    }

    function saveFolders(list) {
        try { localStorage.setItem(FOLDERS_KEY, JSON.stringify(list)); } catch (e) {}
    }

    function getLastFolder() {
        const last = localStorage.getItem(LAST_FOLDER_KEY);
        const folders = loadFolders();
        return (last && folders.find(f => f.value === last)) ? last : folders[0].value;
    }

    function setLastFolder(value) {
        try { localStorage.setItem(LAST_FOLDER_KEY, value); } catch {}
    }

    function slugifyFolder(name) {
        return name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    }

    function buildFolderOptionsHtml(selectedValue) {
        const folders = loadFolders();
        const opts = folders.map(f => `<option value="${f.value}" ${f.value === selectedValue ? 'selected' : ''}>${f.label}</option>`).join('');
        return opts + `<option value="${NEW_FOLDER_OPTION}">+ Nueva carpeta…</option>`;
    }

    function populateGlobalCategory(selectedValue) {
        globalCategory.innerHTML = buildFolderOptionsHtml(selectedValue || getLastFolder());
    }
    populateGlobalCategory(getLastFolder());

    async function loadMetadataFields(category) {
        try {
            const response = await fetch('/.netlify/functions/listar-imagenes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: TOKEN_ACTUAL, clave: TOKEN_PASSWORD, carpeta: category, sugerencias: true })
            });
            const data = await response.json();
            metadataFields = response.ok && Array.isArray(data.fields) ? data.fields : [];
        } catch (error) {
            metadataFields = [];
        }
        renderCards();
    }
    loadMetadataFields(getLastFolder());

    function handleFolderSelectChange(selectEl, onResolved) {
        if (selectEl.value !== NEW_FOLDER_OPTION) {
            onResolved(selectEl.value);
            return;
        }
        const raw = prompt('Nombre de la nueva carpeta:');
        const slug = raw ? slugifyFolder(raw) : '';
        if (!slug) {
            selectEl.value = getLastFolder();
            onResolved(selectEl.value);
            return;
        }
        const folders = loadFolders();
        if (!folders.find(f => f.value === slug)) {
            folders.push({ value: slug, label: raw.trim() });
            saveFolders(folders);
        }
        onResolved(slug);
    }

    if (globalCategory) globalCategory.addEventListener('change', () => {
        handleFolderSelectChange(globalCategory, (finalValue) => {
            populateGlobalCategory(finalValue);
            setLastFolder(finalValue);
            imageFiles.forEach(item => { item.category = finalValue; });
            loadMetadataFields(finalValue);
            renderCards();
        });
    });

    if (globalMaxWidth) globalMaxWidth.addEventListener('change', () => {
        const maxWidthVal = parseInt(globalMaxWidth.value);
        imageFiles.forEach(item => { item.maxWidth = maxWidthVal; });
        renderCards();
    });

    if (globalQuality) {
        globalQuality.addEventListener('input', () => {
            const qVal = parseFloat(globalQuality.value);
            if (globalQualityVal) globalQualityVal.textContent = Math.round(qVal * 100);
            imageFiles.forEach(item => { item.quality = qVal; });
            renderCards();
        });
    }

    function agregarArchivos(lista) {
        const files = Array.from(lista).filter(file => file.type.startsWith('image/'));
        if (!files.length) return;
        let processedCount = 0;
        const defaultFolder = globalCategory.value === NEW_FOLDER_OPTION ? getLastFolder() : globalCategory.value;

        // Se cuenta también cada archivo que falla, para que las demás miniaturas aparezcan igual
        const terminado = () => {
            processedCount++;
            if (processedCount === files.length) {
                imageFiles.sort((a, b) => b.timestamp - a.timestamp);
                renderCards();
            }
        };

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const fileDate = file.lastModified ? new Date(file.lastModified) : new Date();
                    const rawName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;

                    const yyyy = fileDate.getFullYear();
                    const mm = String(fileDate.getMonth() + 1).padStart(2, '0');
                    const dd = String(fileDate.getDate()).padStart(2, '0');
                    const hh = String(fileDate.getHours()).padStart(2, '0');
                    const min = String(fileDate.getMinutes()).padStart(2, '0');
                    const ss = String(fileDate.getSeconds()).padStart(2, '0');
                    const dateStr = `${yyyy}${mm}${dd}${hh}${min}${ss}`;

                    imageFiles.push({
                        fileObj: file,
                        imgElement: img,
                        originalSize: file.size,
                        timestamp: fileDate.getTime(),
                        keepOriginal: globalKeepOriginal ? globalKeepOriginal.checked : true,
                        originalName: rawName,
                        customName: 'imagen',
                        category: defaultFolder,
                        customTitle: globalTitle ? globalTitle.value.trim() : '',
                        customDescription: '',
                        customMetadata: [],
                        maxWidth: globalMaxWidth ? parseInt(globalMaxWidth.value) : 1200,
                        dateStr: dateStr,
                        quality: globalQuality ? parseFloat(globalQuality.value) : 0.8
                    });
                    terminado();
                };
                img.onerror = terminado;
                img.src = event.target.result;
            };
            reader.onerror = terminado;
            reader.readAsDataURL(file);
        });
    }

    fileInput.addEventListener('change', (e) => {
        agregarArchivos(e.target.files);
        fileInput.value = '';
    });

    // Arrastrar y soltar sobre la zona de carga
    const zonaCarga = document.querySelector('label[for="fileInput"]');
    if (zonaCarga) {
        ['dragenter', 'dragover'].forEach(evento => zonaCarga.addEventListener(evento, (e) => {
            e.preventDefault();
            zonaCarga.classList.add('arrastrando');
        }));
        ['dragleave', 'drop'].forEach(evento => zonaCarga.addEventListener(evento, (e) => {
            e.preventDefault();
            zonaCarga.classList.remove('arrastrando');
        }));
        zonaCarga.addEventListener('drop', (e) => {
            if (e.dataTransfer && e.dataTransfer.files.length) agregarArchivos(e.dataTransfer.files);
        });
    }

    if (globalKeepOriginal) globalKeepOriginal.addEventListener('change', () => {
        const val = globalKeepOriginal.checked;
        imageFiles.forEach(item => { item.keepOriginal = val; });
        renderCards();
    });

    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024, dm = 2;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    function getFinalName(item) {
        return item.keepOriginal ? item.originalName : `${item.dateStr}_${item.customName || 'imagen'}`;
    }

    function getScaledDimensions(img, maxWidth) {
        let width = img.naturalWidth;
        let height = img.naturalHeight;
        if (maxWidth > 0 && width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
        }
        return { width, height };
    }

    function escapeAttribute(value) {
        return String(value || '').replace(/[&<>'"]/g, character => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[character]));
    }

    function getMetadataValues(name) {
        const field = metadataFields.find(item => item.name === name);
        return field ? field.values : [];
    }

    function buildMetadataOptions(values) {
        return values.map(value => `<option value="${escapeAttribute(value)}"></option>`).join('');
    }

    function buildMetadataNameOptions(item, metadataIndex) {
        const currentName = item.customMetadata[metadataIndex].name;
        const isExistingName = metadataFields.some(field => field.name === currentName);
        const options = metadataFields.map(field => {
            const isSelected = field.name === currentName;
            return `<option value="${escapeAttribute(field.name)}" ${isSelected ? 'selected' : ''}>${escapeAttribute(field.name)}</option>`;
        }).join('');
        return `<option value="__new__" ${!isExistingName ? 'selected' : ''}>Nueva etiqueta...</option>${options}`;
    }

    function hasDuplicateMetadataPair(item, metadataIndex, name, value) {
        if (!name || !value) return false;
        return item.customMetadata.some((metadata, index) => index !== metadataIndex && metadata.name.trim() === name.trim() && metadata.value.trim() === value.trim());
    }

    function isNumericMetadata(name, value) {
        const normalizedValue = String(value || '').trim();
        if (!normalizedValue) return false;
        if (/^-?\d+(?:\.\d+)?$/.test(normalizedValue)) return true;
        const knownValues = getMetadataValues(name).map(item => String(item).trim());
        return knownValues.length > 0 && knownValues.every(item => /^-?\d+(?:\.\d+)?$/.test(item));
    }

    function hasNumericMetadataConflict(itemIndex, name, value) {
        if (!isNumericMetadata(name, value)) return false;
        const normalizedName = name.trim();
        const normalizedValue = String(value).trim();
        if (getMetadataValues(normalizedName).some(item => String(item).trim() === normalizedValue)) return true;

        return imageFiles.some((item, index) => index !== itemIndex && item.customMetadata.some(metadata =>
            metadata.name.trim() === normalizedName && metadata.value.trim() === normalizedValue
        ));
    }

    function getSuggestedMetadataValue(name) {
        const values = getMetadataValues(name).map(value => String(value).trim());
        if (!values.length || values.some(value => !/^\d+(?:\.\d+)?$/.test(value))) return '';
        return String(Math.max(...values.map(Number)) + 1);
    }

    function renderCards() {
        cardsContainer.innerHTML = '';
        if (imageFiles.length > 0) {
            batchActions.classList.remove('hidden');
            if (cardsStepTitle) cardsStepTitle.classList.remove('hidden');
            counterText.textContent = `${imageFiles.length} ${imageFiles.length === 1 ? 'imagen cargada' : 'imágenes cargadas'}`;
        } else {
            batchActions.classList.add('hidden');
            if (cardsStepTitle) cardsStepTitle.classList.add('hidden');
        }

        imageFiles.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'card upload-tile';
            const finalGeneratedName = `${getFinalName(item)}.webp`;
            const metaCount = item.customMetadata.filter(meta => meta.name && meta.value).length;
            const resumen = [];
            if (!IS_CLIENT_MODE) resumen.push(`${escapeAttribute(item.category)} · <span id="size-badge-${index}">Calc...</span>`);
            if (metaCount) resumen.push(`${metaCount} ${metaCount === 1 ? 'etiqueta' : 'etiquetas'}`);

            // Miniatura + nombre/resumen + estado y botones. El detalle completo se edita en el modal.
            card.innerHTML = `
                <button type="button" data-index="${index}" class="upload-tile-thumb edit-btn" title="Editar detalles" aria-label="Editar detalles de ${escapeAttribute(finalGeneratedName)}">
                    <canvas id="canvas-${index}" class="preview-canvas"></canvas>
                </button>
                <div class="upload-tile-info">
                    <p class="upload-tile-name" title="${escapeAttribute(finalGeneratedName)}">${escapeAttribute(item.customTitle || finalGeneratedName)}</p>
                    <p class="upload-tile-sub">${resumen.join(' · ') || '&nbsp;'}</p>
                </div>
                <div class="upload-tile-actions">
                    <span id="upload-status-${index}" class="text-xs px-2.5 py-1.5 rounded shrink-0 bg-slate-100 font-medium" style="color: var(--text-muted);">Pendiente</span>
                    <div class="upload-tile-buttons">
                        <button type="button" data-index="${index}" class="upload-card-edit edit-btn font-semibold cursor-pointer">✏️ Editar</button>
                        <button type="button" data-index="${index}" class="upload-btn font-semibold transition-colors cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-sm">Subir</button>
                        ${IS_CLIENT_MODE ? '' : `<button type="button" data-index="${index}" class="download-single-btn font-semibold transition-colors cursor-pointer bg-slate-200 hover:bg-slate-300 text-slate-700" title="Descargar .webp" aria-label="Descargar .webp">⬇</button>`}
                        <button type="button" data-index="${index}" class="delete-btn font-semibold cursor-pointer" title="Quitar de la lista" aria-label="Quitar de la lista">🗑</button>
                    </div>
                </div>
            `;
            cardsContainer.appendChild(card);
            drawPreviewAndMeasure(index);
        });
        attachEvents();
    }

    function drawPreviewAndMeasure(index) {
        const item = imageFiles[index];
        const canvas = document.getElementById(`canvas-${index}`);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const { width, height } = getScaledDimensions(item.imgElement, item.maxWidth);
        canvas.width = width; canvas.height = height;
        ctx.drawImage(item.imgElement, 0, 0, width, height);
        canvas.toBlob((blob) => {
            const badge = document.getElementById(`size-badge-${index}`);
            if (badge) {
                const newSize = blob.size;
                const diff = newSize - item.originalSize;
                const diffPercent = Math.round((diff / item.originalSize) * 100);
                badge.textContent = `${formatBytes(newSize)} (${diffPercent > 0 ? '+' : ''}${diffPercent}%)`;
                badge.style.color = newSize < item.originalSize ? '#16A34A' : '#D97706';
            }
        }, 'image/webp', item.quality);
    }

    function buildProcessedBlob(item) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const { width, height } = getScaledDimensions(item.imgElement, item.maxWidth);
            canvas.width = width; canvas.height = height;
            ctx.drawImage(item.imgElement, 0, 0, width, height);
            canvas.toBlob((blob) => resolve(blob), 'image/webp', item.quality);
        });
    }

    function attachEvents() {
        cardsContainer.querySelectorAll('.edit-btn').forEach(b => b.addEventListener('click', () => openUploadEditor(Number(b.dataset.index))));
        cardsContainer.querySelectorAll('.delete-btn').forEach(b => b.addEventListener('click', () => { imageFiles.splice(Number(b.dataset.index), 1); renderCards(); }));
        cardsContainer.querySelectorAll('.upload-btn').forEach(b => b.addEventListener('click', () => uploadToCloudinary(Number(b.dataset.index))));
        cardsContainer.querySelectorAll('.download-single-btn').forEach(b => b.addEventListener('click', async () => {
            const item = imageFiles[Number(b.dataset.index)];
            const blob = await buildProcessedBlob(item);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `${getFinalName(item)}.webp`;
            a.click(); URL.revokeObjectURL(url);
        }));

        if (uploadAllBtn) uploadAllBtn.onclick = async () => {
            const errors = [];
            const indexes = imageFiles.map((_, index) => index);
            for (const index of indexes) await uploadToCloudinary(index, errors);
            if (errors.length) showUploadErrors(errors);
        };
        if (downloadAllBtn) downloadAllBtn.onclick = () => imageFiles.forEach((_, idx) => setTimeout(async () => {
            const item = imageFiles[idx];
            const blob = await buildProcessedBlob(item);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `${getFinalName(item)}.webp`;
            a.click(); URL.revokeObjectURL(url);
        }, idx * 250));
    }

    async function uploadToCloudinary(index, errorCollector = null) {
        const item = imageFiles[index];
        const statusEl = document.getElementById(`upload-status-${index}`);
        const metadataPairs = item.customMetadata
            .map(metadata => `${metadata.name.trim()}\u0000${metadata.value.trim()}`)
            .filter(pair => pair !== '\u0000');
        const hasDuplicateMetadata = new Set(metadataPairs).size !== metadataPairs.length;
        const usedNumericPairs = new Set();
        metadataFields.forEach(field => {
            const values = field.values.map(value => String(value).trim());
            if (values.length && values.every(value => /^-?\d+(?:\.\d+)?$/.test(value))) {
                values.forEach(value => usedNumericPairs.add(`${field.name.trim()}\u0000${value}`));
            }
        });
        let hasNumericConflict = false;
        imageFiles.forEach(batchItem => batchItem.customMetadata.forEach(metadata => {
            if (!isNumericMetadata(metadata.name, metadata.value)) return;
            const pair = `${metadata.name.trim()}\u0000${metadata.value.trim()}`;
            if (usedNumericPairs.has(pair)) hasNumericConflict = true;
            usedNumericPairs.add(pair);
        }));

        if (hasDuplicateMetadata || hasNumericConflict) {
            if (statusEl) {
                statusEl.textContent = 'Error ✕';
                statusEl.className = "text-xs px-2 py-1 rounded shrink-0 bg-red-50 text-red-600 font-semibold";
            }
            reportUploadError(index, 'Hay etiquetas o valores numéricos repetidos.', errorCollector);
            return false;
        }

        if (statusEl) {
            statusEl.textContent = 'Subiendo…'; 
            statusEl.className = "text-xs px-2.5 py-1.5 rounded shrink-0 bg-blue-50 text-blue-600 font-semibold";
        }

        try {
            const blob = await buildProcessedBlob(item);
            const finalName = getFinalName(item);
            // El servidor valida el enlace y firma carpeta, nombre, tags y metadatos
            const resFirma = await fetch('/.netlify/functions/firmar-subida', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: TOKEN_ACTUAL,
                    clave: TOKEN_PASSWORD,
                    carpeta: item.category,
                    nombre: finalName,
                    titulo: item.customTitle || '',
                    descripcion: item.customDescription || '',
                    metadatos: item.customMetadata
                })
            });
            const firma = await resFirma.json();
            if (!resFirma.ok) throw new Error(firma.error || 'No se pudo autorizar la subida');

            const formData = new FormData();
            formData.append('file', blob, `${finalName}.webp`);
            Object.entries(firma.parametros).forEach(([clave, valor]) => formData.append(clave, valor));
            formData.append('api_key', firma.apiKey);
            formData.append('signature', firma.firma);

            const res = await fetch(`https://api.cloudinary.com/v1_1/${firma.cloudName}/image/upload`, {
                method: 'POST', body: formData
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error?.message || 'Error de Cloudinary');
            if (data.existing) throw new Error('Ya existe una imagen con ese nombre en la carpeta');

            if (statusEl) {
                statusEl.textContent = `✓ Éxito`; 
                statusEl.className = "text-xs px-2.5 py-1.5 rounded shrink-0 bg-emerald-50 text-emerald-700 font-semibold";
            }
            return true;
        } catch (err) {
            if (statusEl) {
                statusEl.textContent = 'Error ✕'; 
                statusEl.className = "text-xs px-2.5 py-1.5 rounded shrink-0 bg-red-50 text-red-600 font-semibold";
                statusEl.title = err.message;
            }
            reportUploadError(index, err.message || 'Error desconocido al subir a Cloudinary.', errorCollector);
            return false;
        }
    }
}