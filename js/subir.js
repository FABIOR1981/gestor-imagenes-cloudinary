let PROYECTO_ACTUAL = "";
let BASE_FOLDER = "";

const cfgCloudinary = (typeof CONFIG !== 'undefined' && CONFIG.CLOUDINARY) ? CONFIG.CLOUDINARY : {};
const CLOUD_NAME = cfgCloudinary.CLOUD_NAME || 'p0qlmlor';
const UPLOAD_PRESET = cfgCloudinary.UPLOAD_PRESET || 'subir_gestor';

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const mainInterface = document.getElementById('mainInterface');

    if (!token) {
        loadingState.classList.add('hidden');
        errorState.classList.remove('hidden');
        return;
    }

    try {
        const decodedString = atob(token);
        const payload = JSON.parse(decodedString);
        
        if (Date.now() > payload.exp) {
            loadingState.classList.add('hidden');
            errorState.classList.remove('hidden');
            return;
        }

        PROYECTO_ACTUAL = payload.project; 
        BASE_FOLDER = PROYECTO_ACTUAL; 

        document.getElementById('displayProjectName').textContent = PROYECTO_ACTUAL;
        document.getElementById('displayExpDate').textContent = new Date(payload.exp).toLocaleString('es-UY', { dateStyle: 'medium', timeStyle: 'short' });

        let projectFolders = [
            { value: 'galeria', label: 'Galería' },
            { value: 'instalaciones', label: 'Instalaciones' }
        ];

        try {
            const response = await fetch('proyectos.json');
            if (response.ok) {
                const data = await response.json();
                const foundProj = data.proyectos.find(p => p.id === PROYECTO_ACTUAL);
                if (foundProj && Array.isArray(foundProj.carpetas) && foundProj.carpetas.length > 0) {
                    projectFolders = foundProj.carpetas;
                }
            }
        } catch (err) {
            console.warn('Usando carpetas por defecto', err);
        }

        loadingState.classList.add('hidden');
        mainInterface.classList.remove('hidden');
        initApp(projectFolders); 

    } catch (error) {
        loadingState.classList.add('hidden');
        errorState.classList.remove('hidden');
        document.getElementById('errorMessage').textContent = "El enlace está corrupto o mal formado.";
    }
});

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
    const globalTitle = document.getElementById('globalTitle');
    const globalKeepOriginal = document.getElementById('globalKeepOriginal');
    const batchActions = document.getElementById('batchActions');
    const counterText = document.getElementById('counterText');
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    const uploadAllBtn = document.getElementById('uploadAllBtn');

    let imageFiles = [];

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

    globalCategory.addEventListener('change', () => {
        handleFolderSelectChange(globalCategory, (finalValue) => {
            populateGlobalCategory(finalValue);
            setLastFolder(finalValue);
            imageFiles.forEach(item => { item.category = finalValue; });
            renderCards();
        });
    });

    globalMaxWidth.addEventListener('change', () => {
        const maxWidthVal = parseInt(globalMaxWidth.value);
        imageFiles.forEach(item => { item.maxWidth = maxWidthVal; });
        renderCards();
    });

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
                        keepOriginal: globalKeepOriginal.checked,
                        originalName: rawName,
                        customName: 'imagen',
                        category: defaultFolder,
                        customTitle: globalTitle.value.trim(),
                        customDescription: '',
                        maxWidth: parseInt(globalMaxWidth.value),
                        dateStr: dateStr,
                        quality: 0.8
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

    globalKeepOriginal.addEventListener('change', () => {
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

    function renderCards() {
        cardsContainer.innerHTML = '';
        if (imageFiles.length > 0) {
            batchActions.classList.remove('hidden');
            counterText.textContent = `${imageFiles.length} ${imageFiles.length === 1 ? 'imagen cargada' : 'imágenes cargadas'}`;
        } else {
            batchActions.classList.add('hidden');
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

                    ${item.keepOriginal ? `<div class="w-full border rounded px-2.5 py-1.5 truncate bg-slate-50 font-mono text-xs" style="border-color: var(--border-color); color: var(--text-muted);">${item.originalName}</div>` : `<input type="text" value="${item.customName}" data-index="${index}" placeholder="Nombre corto..." class="custom-name-input w-full border rounded px-2.5 py-1.5 focus-ring font-mono text-xs">`}
                    
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="font-semibold block mb-1" style="color: var(--text-muted);">Carpeta:</label>
                            <select data-index="${index}" class="category-select w-full border rounded px-2 py-1.5 focus-ring bg-white">
                                ${buildFolderOptionsHtml(item.category)}
                            </select>
                        </div>
                        <div>
                            <label class="font-semibold block mb-1" style="color: var(--text-muted);">Ancho máx.:</label>
                            <select data-index="${index}" class="card-maxwidth-select w-full border rounded px-2 py-1.5 focus-ring bg-white">
                                <option value="800" ${item.maxWidth === 800 ? 'selected' : ''}>800 px</option>
                                <option value="1200" ${item.maxWidth === 1200 ? 'selected' : ''}>1200 px</option>
                                <option value="1600" ${item.maxWidth === 1600 ? 'selected' : ''}>1600 px</option>
                                <option value="1920" ${item.maxWidth === 1920 ? 'selected' : ''}>1920 px</option>
                                <option value="0" ${item.maxWidth === 0 ? 'selected' : ''}>Original</option>
                            </select>
                        </div>
                        <div class="col-span-2">
                            <label class="font-semibold block mb-1" style="color: var(--text-muted);">Título descriptivo:</label>
                            <input type="text" value="${item.customTitle.replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}" data-index="${index}" placeholder="Ej. Vista principal" class="title-input w-full border rounded px-2.5 py-1.5 focus-ring">
                        </div>
                        <div class="col-span-2">
                            <label class="font-semibold block mb-1" style="color: var(--text-muted);">Descripción (Opcional):</label>
                            <textarea data-index="${index}" placeholder="Detalles de la toma..." class="description-input w-full border rounded px-2.5 py-1.5 focus-ring" rows="2">${item.customDescription ? item.customDescription.replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])) : ''}</textarea>
                        </div>
                    </div>
                    
                    <!-- Ruta final resultante -->
                    <div class="truncate mt-1 p-2 rounded border flex justify-between items-center bg-slate-50 font-mono text-[11px] text-blue-700 font-medium" style="border-color: var(--border-color);">
                        <span class="truncate"><span style="color: var(--text-muted);">${BASE_FOLDER}/${item.category}/</span>${finalGeneratedName}</span>
                        <span id="size-badge-${index}" class="px-2 py-0.5 rounded shrink-0 bg-slate-200 text-slate-700 font-sans font-semibold">Calc...</span>
                    </div>
                </div>

                <!-- Botones de Acción Individual Uniformados -->
                    <div class="flex justify-between items-center pt-3 border-t mt-auto gap-2 flex-wrap" style="border-color: var(--border-color);">
                        <button data-index="${index}" class="delete-btn btn-danger">Eliminar</button>
                        <div class="flex items-center gap-2 flex-wrap justify-end">
                            <span id="upload-status-${index}" class="text-xs px-2.5 py-1.5 rounded shrink-0 bg-slate-100 font-medium" style="color: var(--text-muted);">Pendiente</span>
                            <button data-index="${index}" class="upload-btn btn-base btn-main">Subir</button>
                            <button data-index="${index}" class="download-single-btn btn-base btn-sec">Descargar</button>
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
        document.querySelectorAll('.custom-name-input').forEach(i => i.addEventListener('input', e => imageFiles[e.target.dataset.index].customName = e.target.value));
        document.querySelectorAll('.card-keep-original').forEach(c => c.addEventListener('change', e => { imageFiles[e.target.dataset.index].keepOriginal = e.target.checked; renderCards(); }));
        document.querySelectorAll('.title-input').forEach(i => i.addEventListener('input', e => imageFiles[e.target.dataset.index].customTitle = e.target.value));
        document.querySelectorAll('.description-input').forEach(i => i.addEventListener('input', e => imageFiles[e.target.dataset.index].customDescription = e.target.value));
        document.querySelectorAll('.card-maxwidth-select').forEach(s => s.addEventListener('change', e => { imageFiles[e.target.dataset.index].maxWidth = parseInt(e.target.value); drawPreviewAndMeasure(e.target.dataset.index); }));
        document.querySelectorAll('.category-select').forEach(s => s.addEventListener('change', e => handleFolderSelectChange(s, val => { imageFiles[e.target.dataset.index].category = val; renderCards(); })));
        document.querySelectorAll('.delete-btn').forEach(b => b.addEventListener('click', e => { imageFiles.splice(e.target.dataset.index, 1); renderCards(); }));
        
        document.querySelectorAll('.upload-btn').forEach(b => b.addEventListener('click', e => uploadToCloudinary(e.target.dataset.index)));
        document.querySelectorAll('.download-single-btn').forEach(b => b.addEventListener('click', async e => {
            const item = imageFiles[e.target.dataset.index];
            const blob = await buildProcessedBlob(item);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `${getFinalName(item)}.webp`;
            a.click(); URL.revokeObjectURL(url);
        }));
        
        uploadAllBtn.onclick = () => imageFiles.forEach((_, idx) => setTimeout(() => uploadToCloudinary(idx), idx * 400));
        downloadAllBtn.onclick = () => imageFiles.forEach((_, idx) => setTimeout(async () => {
            const item = imageFiles[idx];
            const blob = await buildProcessedBlob(item);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `${getFinalName(item)}.webp`;
            a.click(); URL.revokeObjectURL(url);
        }, idx * 250));
    }

    async function uploadToCloudinary(index) {
        const item = imageFiles[index];
        const statusEl = document.getElementById(`upload-status-${index}`);
        const folderPath = `${BASE_FOLDER}/${item.category}`; 
        const tag = `${PROYECTO_ACTUAL.replace(/\//g, '_')}_${item.category}`;

        if (statusEl) {
            statusEl.textContent = 'Subiendo…'; 
            statusEl.className = "text-xs px-2.5 py-1.5 rounded shrink-0 bg-blue-50 text-blue-600 font-semibold";
        }

        try {
            const blob = await buildProcessedBlob(item);
            const finalName = getFinalName(item);
            const formData = new FormData();
            
            formData.append('file', blob, `${finalName}.webp`);
            formData.append('upload_preset', UPLOAD_PRESET);
            formData.append('public_id', finalName);
            formData.append('folder', folderPath);
            formData.append('tags', tag);

            const title = (item.customTitle || '').trim().replace(/[|]/g, ' ');
            const description = (item.customDescription || '').trim().replace(/[|]/g, ' ');
            const context = [
                title ? `caption=${title}` : '',
                description ? `alt=${description}` : ''
            ].filter(Boolean).join('|');

            if (context) formData.append('context', context);

            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                method: 'POST', body: formData
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error?.message || 'Error de Cloudinary');

            if (statusEl) {
                statusEl.textContent = `✓ Éxito`; 
                statusEl.className = "text-xs px-2.5 py-1.5 rounded shrink-0 bg-emerald-50 text-emerald-700 font-semibold";
            }
        } catch (err) {
            if (statusEl) {
                statusEl.textContent = 'Error ✕'; 
                statusEl.className = "text-xs px-2.5 py-1 rounded shrink-0 bg-red-50 text-red-600 font-semibold";
                statusEl.title = err.message;
            }
        }
    }
}