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
    if (Array.isArray(permisos) && permisos.includes('listar')) {
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

    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        let processedCount = 0;
        const defaultFolder = globalCategory.value === NEW_FOLDER_OPTION ? getLastFolder() : globalCategory.value;

        files.forEach(file => {
            if (!file.type.startsWith('image/')) return;
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
                    
                    processedCount++;
                    if (processedCount === files.filter(f => f.type.startsWith('image/')).length) {
                        imageFiles.sort((a, b) => b.timestamp - a.timestamp);
                        renderCards();
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
        fileInput.value = '';
    });

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
            card.className = "card flex flex-col gap-4 shadow-sm transition-all hover:shadow-md";
            const finalGeneratedName = `${getFinalName(item)}.webp`;

            card.innerHTML = `
                <!-- Vista Previa de la Imagen -->
                <div class="relative rounded-lg overflow-hidden aspect-video flex items-center justify-center border bg-slate-900" style="border-color: var(--border-color);">
                    <canvas id="canvas-${index}" class="preview-canvas object-contain w-full h-full"></canvas>
                </div>

                <!-- Panel de Datos e Inputs -->
                <div class="flex flex-col gap-2.5 text-xs">
                    <div class="flex justify-between items-center pb-1 border-b border-slate-100">
                        <span style="color: var(--text-muted);">Original: <strong style="color: var(--text-main);">${formatBytes(item.originalSize)}</strong></span>
                        <div class="flex items-center gap-1.5">
                            <input type="checkbox" data-index="${index}" class="card-keep-original w-3.5 h-3.5 cursor-pointer accent-blue-600" ${item.keepOriginal ? 'checked' : ''}>
                            <span class="cursor-pointer font-medium" style="color: var(--text-main);">Respetar nombre</span>
                        </div>
                    </div>

                    ${item.keepOriginal ? `<div class="w-full border rounded px-2.5 py-1.5 truncate bg-slate-50 font-mono text-xs" style="border-color: var(--border-color); color: var(--text-muted);">${item.originalName}</div>` : `<input type="text" value="${finalGeneratedName}" data-index="${index}" placeholder="Nombre del archivo..." class="custom-name-input w-full border rounded px-2.5 py-1.5 focus-ring font-mono text-xs">`}
                    
                    <div class="grid grid-cols-2 gap-2">
                        ${IS_CLIENT_MODE ? '' : `<div>
                            <label class="font-semibold block mb-1" style="color: var(--text-muted);">Carpeta:</label>
                            <select data-index="${index}" class="category-select w-full border rounded px-2 py-1.5 focus-ring bg-white">
                                ${buildFolderOptionsHtml(item.category)}
                            </select>
                        </div>`}
                        ${IS_CLIENT_MODE ? '' : `<div>
                            <label class="font-semibold block mb-1" style="color: var(--text-muted);">Ancho máx.:</label>
                            <select data-index="${index}" class="card-maxwidth-select w-full border rounded px-2 py-1.5 focus-ring bg-white">
                                <option value="800" ${item.maxWidth === 800 ? 'selected' : ''}>800 px</option>
                                <option value="1200" ${item.maxWidth === 1200 ? 'selected' : ''}>1200 px</option>
                                <option value="1600" ${item.maxWidth === 1600 ? 'selected' : ''}>1600 px</option>
                                <option value="1920" ${item.maxWidth === 1920 ? 'selected' : ''}>1920 px</option>
                                <option value="0" ${item.maxWidth === 0 ? 'selected' : ''}>Original</option>
                            </select>
                        </div>`}
                        ${IS_CLIENT_MODE ? '' : `<div class="col-span-2">
                            <div class="flex justify-between items-center mb-1">
                                <label class="font-semibold" style="color: var(--text-muted);">Calidad WebP:</label>
                                <span id="quality-val-${index}" class="font-bold text-blue-600">${Math.round(item.quality * 100)}%</span>
                            </div>
                            <input type="range" data-index="${index}" min="0.1" max="1.0" step="0.05" value="${item.quality}" class="card-quality-range w-full accent-blue-600 cursor-pointer">
                        </div>`}
                        <div class="col-span-2">
                            <label class="font-semibold block mb-1" style="color: var(--text-muted);">Título descriptivo:</label>
                            <input type="text" value="${item.customTitle.replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}" data-index="${index}" placeholder="Ej. Vista principal" class="title-input w-full border rounded px-2.5 py-1.5 focus-ring">
                        </div>
                        <div class="col-span-2">
                            <label class="font-semibold block mb-1" style="color: var(--text-muted);">Descripción (Opcional):</label>
                            <textarea data-index="${index}" placeholder="Detalles de la toma..." class="description-input w-full border rounded px-2.5 py-1.5 focus-ring" rows="2">${item.customDescription ? item.customDescription.replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])) : ''}</textarea>
                        </div>

                        <!-- SECCIÓN DE METADATOS MANUALES -->
                        <div class="col-span-2 border-t pt-3 mt-1">
                            <div class="flex justify-between items-center mb-2">
                                <label class="font-semibold" style="color: var(--text-muted);">Metadatos personalizados:</label>
                                <button type="button" data-index="${index}" class="add-meta-btn text-xs text-blue-600 font-semibold hover:underline bg-blue-50 px-2 py-1 rounded">+ Agregar campo</button>
                            </div>
                            <div class="flex flex-col gap-2" id="meta-container-${index}">
                                ${item.customMetadata.map((meta, mIdx) => `
                                    <div class="flex gap-1.5 items-center">
                                        <select data-index="${index}" data-meta-index="${mIdx}" class="meta-name-select border rounded px-2 py-1 text-xs flex-1 min-w-0 focus-ring bg-slate-50 font-mono">${buildMetadataNameOptions(item, mIdx)}</select>
                                        <input type="text" placeholder="Nombre de etiqueta nueva" value="${metadataFields.some(field => field.name === meta.name) ? '' : escapeAttribute(meta.name)}" data-index="${index}" data-meta-index="${mIdx}" class="meta-new-name-input border rounded px-2 py-1 text-xs flex-1 min-w-0 focus-ring bg-slate-50 font-mono" ${metadataFields.some(field => field.name === meta.name) ? 'hidden' : ''}>
                                        <input type="text" list="meta-values-${index}-${mIdx}" placeholder="Valor existente o nuevo" value="${escapeAttribute(meta.value)}" data-index="${index}" data-meta-index="${mIdx}" class="meta-value-input border rounded px-2 py-1 text-xs flex-1 min-w-0 focus-ring bg-white">
                                        <datalist id="meta-values-${index}-${mIdx}">${buildMetadataOptions(getMetadataValues(meta.name))}</datalist>
                                        <button type="button" data-index="${index}" data-meta-index="${mIdx}" class="remove-meta-btn text-red-500 font-bold px-2 py-1 hover:bg-red-50 rounded text-sm">×</button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    
                    ${IS_CLIENT_MODE ? '' : `<!-- Ruta final resultante -->
                    <div class="truncate mt-1 p-2 rounded border flex justify-between items-center bg-slate-50 font-mono text-[11px] text-blue-700 font-medium" style="border-color: var(--border-color);">
                        <span class="truncate"><span style="color: var(--text-muted);">${BASE_FOLDER}/${item.category}/</span>${finalGeneratedName}</span>
                        <span id="size-badge-${index}" class="px-2 py-0.5 rounded shrink-0 bg-slate-200 text-slate-700 font-sans font-semibold">Calc...</span>
                    </div>`}
                </div>

                <!-- Botones de Acción Individual Uniformados -->
                <div class="flex justify-between items-center pt-3 border-t mt-auto gap-2 flex-wrap" style="border-color: var(--border-color);">
                    <button data-index="${index}" class="delete-btn text-xs font-semibold text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded transition-colors cursor-pointer">Eliminar</button>
                    <div class="flex items-center gap-2 flex-wrap justify-end">
                        <span id="upload-status-${index}" class="text-xs px-2.5 py-1.5 rounded shrink-0 bg-slate-100 font-medium" style="color: var(--text-muted);">Pendiente</span>
                        <button data-index="${index}" class="upload-btn font-semibold px-3 py-1.5 rounded text-xs transition-colors cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-sm">Subir</button>
                        ${IS_CLIENT_MODE ? '' : `<button data-index="${index}" class="download-single-btn font-semibold px-3 py-1.5 rounded text-xs transition-colors cursor-pointer bg-slate-200 hover:bg-slate-300 text-slate-700">Descargar</button>`}
                    </div>
                </div>
            `;
            cardsContainer.appendChild(card);
            card.querySelector('.preview-canvas').addEventListener('click', () => showExpandedPreview(item.imgElement));
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
        document.querySelectorAll('.custom-name-input').forEach(i => i.addEventListener('input', e => {
            const item = imageFiles[e.target.dataset.index];
            let value = e.target.value.replace(/\.webp$/i, '');
            const generatedPrefix = `${item.dateStr}_`;
            if (value.startsWith(generatedPrefix)) value = value.slice(generatedPrefix.length);
            item.customName = value;
        }));
        document.querySelectorAll('.card-keep-original').forEach(c => c.addEventListener('change', e => { imageFiles[e.target.dataset.index].keepOriginal = e.target.checked; renderCards(); }));
        document.querySelectorAll('.title-input').forEach(i => i.addEventListener('input', e => imageFiles[e.target.dataset.index].customTitle = e.target.value));
        document.querySelectorAll('.description-input').forEach(i => i.addEventListener('input', e => imageFiles[e.target.dataset.index].customDescription = e.target.value));
        document.querySelectorAll('.card-maxwidth-select').forEach(s => s.addEventListener('change', e => { imageFiles[e.target.dataset.index].maxWidth = parseInt(e.target.value); drawPreviewAndMeasure(e.target.dataset.index); }));
        
        document.querySelectorAll('.card-quality-range').forEach(r => r.addEventListener('input', e => {
            const idx = e.target.dataset.index;
            const val = parseFloat(e.target.value);
            imageFiles[idx].quality = val;
            const qValEl = document.getElementById(`quality-val-${idx}`);
            if (qValEl) qValEl.textContent = `${Math.round(val * 100)}%`;
            drawPreviewAndMeasure(idx);
        }));

        document.querySelectorAll('.category-select').forEach(s => s.addEventListener('change', e => handleFolderSelectChange(s, val => { imageFiles[e.target.dataset.index].category = val; renderCards(); })));
        document.querySelectorAll('.delete-btn').forEach(b => b.addEventListener('click', e => { imageFiles.splice(e.target.dataset.index, 1); renderCards(); }));

        document.querySelectorAll('.add-meta-btn').forEach(b => b.addEventListener('click', e => {
            const idx = e.target.dataset.index;
            imageFiles[idx].customMetadata.push({ name: '', value: '' });
            renderCards();
        }));

        document.querySelectorAll('.meta-name-select').forEach(select => select.addEventListener('change', e => {
            const idx = e.target.dataset.index;
            const mIdx = e.target.dataset.metaIndex;
            const metadata = imageFiles[idx].customMetadata[mIdx];
            const selectedName = e.target.value;

            if (selectedName === '__new__') {
                metadata.name = '';
                metadata.value = '';
                renderCards();
                return;
            }

            metadata.name = selectedName;
            if (!metadata.value) metadata.value = getSuggestedMetadataValue(selectedName);
            if (hasNumericMetadataConflict(Number(idx), metadata.name, metadata.value) || hasDuplicateMetadataPair(imageFiles[idx], Number(mIdx), metadata.name, metadata.value)) {
                alert('Esta combinación de etiqueta y valor ya existe en esta imagen.');
                metadata.value = '';
            }
            renderCards();
        }));

        document.querySelectorAll('.meta-new-name-input').forEach(input => {
            input.addEventListener('input', e => {
                const idx = e.target.dataset.index;
                const mIdx = e.target.dataset.metaIndex;
                imageFiles[idx].customMetadata[mIdx].name = e.target.value;
            });
            input.addEventListener('change', e => {
                const idx = e.target.dataset.index;
                const mIdx = e.target.dataset.metaIndex;
                const name = e.target.value.trim();
                const metadata = imageFiles[idx].customMetadata[mIdx];
                if (name && (hasNumericMetadataConflict(Number(idx), name, metadata.value) || hasDuplicateMetadataPair(imageFiles[idx], Number(mIdx), name, metadata.value))) {
                    alert('Esta combinación de etiqueta y valor ya existe en esta imagen.');
                    imageFiles[idx].customMetadata[mIdx].name = '';
                    renderCards();
                }
            });
        });

        document.querySelectorAll('.meta-value-input').forEach(i => {
            i.addEventListener('input', e => {
                const idx = e.target.dataset.index;
                const mIdx = e.target.dataset.metaIndex;
                imageFiles[idx].customMetadata[mIdx].value = e.target.value;
            });
            i.addEventListener('change', e => {
                const idx = e.target.dataset.index;
                const mIdx = e.target.dataset.metaIndex;
                const metadata = imageFiles[idx].customMetadata[mIdx];
                if (hasNumericMetadataConflict(Number(idx), metadata.name, metadata.value) || hasDuplicateMetadataPair(imageFiles[idx], Number(mIdx), metadata.name, metadata.value)) {
                    alert('Esta combinación de etiqueta y valor ya existe en esta imagen.');
                    metadata.value = '';
                    renderCards();
                }
            });
        });

        document.querySelectorAll('.remove-meta-btn').forEach(b => b.addEventListener('click', e => {
            const idx = e.target.dataset.index;
            const mIdx = e.target.dataset.metaIndex;
            imageFiles[idx].customMetadata.splice(mIdx, 1);
            renderCards();
        }));
        
        document.querySelectorAll('.upload-btn').forEach(b => b.addEventListener('click', e => uploadToCloudinary(e.target.dataset.index)));
        document.querySelectorAll('.download-single-btn').forEach(b => b.addEventListener('click', async e => {
            const item = imageFiles[e.target.dataset.index];
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