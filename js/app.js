import { cleanLabel, fixEncoding, parsePluginUrlUniversal } from './utils.js';
import { getKodiThumbnail, PLACEHOLDER_SVG } from './kodi/thumbnails.js';
import { sendKodiRequest, playItemOnKodi as rpcPlayItem } from './kodi/rpc.js';
import { showSpinner, hideSpinner, setStatus, setupSearchBar } from './ui/view.js';
import { updateBreadcrumb } from './ui/breadcrumb.js';
import { playPause, stopPlayer, volumeUp, volumeDown, setActivePlayer, getActivePlayerId } from './ui/controls.js';

// --- Variables globales ---
let breadcrumbHistory = [];
let currentView = 'addons';
let showDebugInfo = false;
let filterUnknownEnabled = true;
window.activeRequests = 0;

// --- Toggle filtro ---
function toggleFilter() {
    filterUnknownEnabled = !filterUnknownEnabled;
    document.getElementById('toggle-filter').innerText =
        filterUnknownEnabled ? 'Desactivar filtro de unknown' : 'Activar filtro de unknown';

    if (currentView === 'addons') showAddons();
    else if (currentView === 'addon' && breadcrumbHistory.length > 1) {
        const last = breadcrumbHistory[breadcrumbHistory.length - 1];
        loadAddonContent(last.addonId, last.path);
    }
}

// --- Navegación ---
function tryShowConfig() {
    if (getActivePlayerId() !== null) {
        alert("⚠️ No se puede acceder a configuración durante la reproducción.");
        return;
    }
    showConfig();
}

function tryShowAddons() {
    if (getActivePlayerId() !== null) {
        alert("⚠️ No se puede acceder a Addons durante la reproducción.");
        return;
    }
    showAddons();
}

function showConfig() {
    currentView = 'config';
    document.getElementById('config-panel').style.display = 'block';
    document.getElementById('content-list').innerHTML = '';
    document.getElementById('breadcrumb').innerHTML = '';
}

function showAddons() {
    currentView = 'addons';
    document.getElementById('config-panel').style.display = 'none';
    loadAddons();
}

// --- Breadcrumb ---
function goToBreadcrumb(index) {
    const entry = breadcrumbHistory[index];
    breadcrumbHistory = breadcrumbHistory.slice(0, index + 1);
    if (entry.type === 'root') showAddons();
    else if (entry.type === 'addon') loadAddonContent(entry.addonId, entry.path);
    updateBreadcrumb(breadcrumbHistory, goToBreadcrumb);
}

// --- Toggle debug info ---
function toggleDebugInfo() {
    showDebugInfo = !showDebugInfo;
    document.getElementById('toggle-debug-info').innerText = showDebugInfo ? 'Ocultar información avanzada' : 'Mostrar información avanzada';
    if (currentView === 'addons') showAddons();
    else if (currentView === 'addon' && breadcrumbHistory.length > 1) {
        const last = breadcrumbHistory[breadcrumbHistory.length - 1];
        loadAddonContent(last.addonId, last.path);
    }
}

// --- Cargar Addons ---
async function loadAddons() {
    breadcrumbHistory = [{ type: 'root', label: 'Addons' }];
    updateBreadcrumb(breadcrumbHistory, goToBreadcrumb);
    setStatus('Consultando addons en Kodi...');
    showSpinner();
    const data = await sendKodiRequest('Addons.GetAddons', { type: 'xbmc.addon.video', properties: ['name','version','summary','description'] });
    hideSpinner(true);

    const listDiv = document.getElementById('content-list');
    listDiv.innerHTML = '';

    if (data.error || !data.result?.addons) {
        listDiv.innerHTML = `<span class="error">Error o sin addons: ${data.error||'Ninguno encontrado'}</span>`;
        return;
    }

    data.result.addons.forEach(addon => {
        const div = document.createElement('div');
        div.className = 'content-item';
        div.innerHTML = `<h3>${cleanLabel(fixEncoding(addon.name))}</h3><p>${fixEncoding(addon.summary)||''}</p>`;
        div.onclick = () => {
            breadcrumbHistory = [{ type: 'root', label: 'Addons' }];
            breadcrumbHistory.push({ type: 'addon', addonId: addon.addonid, path: '/', label: cleanLabel(fixEncoding(addon.name)) });
            updateBreadcrumb(breadcrumbHistory, goToBreadcrumb);
            loadAddonContent(addon.addonid);
        };
        listDiv.appendChild(div);
    });
}

// --- Cargar contenido del addon ---
async function loadAddonContent(addonId, path = '/') {
    currentView = 'addon';
    breadcrumbHistory[0] = { type: 'root', label: 'Addons' };
    updateBreadcrumb(breadcrumbHistory, goToBreadcrumb);
    setStatus('Cargando contenido del addon...');
    showSpinner();

    const data = await sendKodiRequest('Files.GetDirectory', {
        directory: `plugin://${addonId}${path}`,
        media: 'video'
    });
    hideSpinner(true);

    const contentList = document.getElementById('content-list');
    contentList.innerHTML = '';

    if (data.error || !data.result?.files) {
        contentList.innerHTML = `<span class="error">Error o sin contenido: ${data.error || 'Ningún resultado'}</span>`;
        return;
    }

    data.result.files.forEach(item => {
        const meta = parsePluginUrlUniversal(item.file);

        if (meta?.url?.toLowerCase?.() === 'na') return;

        if (
            filterUnknownEnabled &&
            item.filetype === 'file' &&
            item.type === 'unknown' &&
            meta?.folder === false &&
            !meta?.regexs &&
            !meta?.mode
        ) return;

        const div = document.createElement('div');
        div.className = 'content-item';

        // Imagen
        if (item.filetype === 'file' || (item.filetype === 'directory' && item.type === 'movie')) {
            const img = document.createElement('img');
            img.src = meta?.thumbnail ? getKodiThumbnail(meta.thumbnail) 
                : item.thumbnail ? getKodiThumbnail(item.thumbnail) 
                : PLACEHOLDER_SVG;
            div.appendChild(img);
        }

        // Controles (archivos)
        if (item.filetype === 'file') {
            const controlsContainer = document.createElement('div');
            controlsContainer.className = 'controls-container';
            controlsContainer.style.marginBottom = '5px';

            const playBtn = document.createElement('button');
            playBtn.innerText = '▶️ Play';
            playBtn.onclick = () => { contentList.innerHTML=''; showDetailView(item, meta, true); };
            controlsContainer.appendChild(playBtn);

            const infoBtn = document.createElement('button');
            infoBtn.innerText = 'ℹ️ Ver información';
            infoBtn.onclick = () => { contentList.innerHTML=''; showDetailView(item, meta, false); };
            controlsContainer.appendChild(infoBtn);

            div.appendChild(controlsContainer);
        }

        const title = meta?.title || cleanLabel(fixEncoding(item.label)) || cleanLabel(fixEncoding(item.title)) || 'Sin título';
        const tipo = (item.filetype === 'directory') ? '📁 Carpeta' : '▶️ Reproducible';
        const info = document.createElement('div');
        info.innerHTML = `
            <h3>${cleanLabel(fixEncoding(title))} <small>(${tipo})</small></h3>
            ${showDebugInfo ? `<pre>Meta: ${JSON.stringify(meta, null, 2)}</pre><pre>Item: ${JSON.stringify(item, null, 2)}</pre>` : ''}
        `;
        div.appendChild(info);

        if (item.filetype === 'directory') {
            div.onclick = () => {
                breadcrumbHistory.push({
                    type: 'addon',
                    addonId,
                    path: item.file.replace(`plugin://${addonId}`, ''),
                    label: cleanLabel(fixEncoding(item.label))
                });
                updateBreadcrumb(breadcrumbHistory, goToBreadcrumb);
                loadAddonContent(addonId, item.file.replace(`plugin://${addonId}`, ''));
            };
            div.title = '📂 Haz clic para abrir carpeta';
        }

        contentList.appendChild(div);
    });
}

// --- Vista detalle ---
function showDetailView(item, meta, autoPlay=false) {
    const contentList = document.getElementById('content-list');
    contentList.innerHTML='';
    const container = document.createElement('div');
    container.className='detail-container';

    const img = document.createElement('img');
    img.src = meta?.thumbnail ? getKodiThumbnail(meta.thumbnail) :
              item.thumbnail ? getKodiThumbnail(item.thumbnail) : PLACEHOLDER_SVG;
    img.className='detail-image';
    container.appendChild(img);

    const controlsContainer = document.createElement('div');
    controlsContainer.id='controls-container';
    controlsContainer.style.marginTop='10px';
    container.appendChild(controlsContainer);

    const info = document.createElement('div');
    info.innerHTML=`<h3>${meta?.title || cleanLabel(fixEncoding(item.label)) || 'Sin título'}</h3>
                    <pre>Meta: ${JSON.stringify(meta, null, 2)}</pre>
                    <pre>Item: ${JSON.stringify(item, null, 2)}</pre>`;
    container.appendChild(info);

    if(!autoPlay){
        const playBtn = document.createElement('button');
        playBtn.innerText='▶️ Reproducir';
        playBtn.onclick=()=>{ controlsContainer.innerHTML='<p>Esperando reproducción...</p>'; playItem(item.file,true); };
        controlsContainer.appendChild(playBtn);
    } else {
        controlsContainer.innerHTML='<p>Esperando reproducción...</p>';
        playItem(item.file,true);
    }

    contentList.appendChild(container);
}

// --- Reproducción ---
async function playItem(file, fromDetail=true){
    setStatus('Intentando reproducir: '+file);
    showSpinner('Esperando que Kodi inicie la reproducción...');
    try {
        const playerId = await rpcPlayItem(file);
        setActivePlayer(playerId);
        if(fromDetail){
            const controlsContainer = document.getElementById('controls-container');
            if(controlsContainer){
                controlsContainer.innerHTML=`
                    <button onclick="KodiApp.playPause()">⏯️</button>
                    <button onclick="KodiApp.stopPlayer()">⏹️</button>
                    <button onclick="KodiApp.volumeDown()">🔉</button>
                    <button onclick="KodiApp.volumeUp()">🔊</button>
                `;
            }
        }
        setStatus('Reproduciendo: ' + file);
    } catch(err){
        setStatus(`<span class="error">Error: ${err.message}</span>`);
    } finally {
        hideSpinner(true);
    }
}

document.getElementById('categories-menu').addEventListener('click', () => {
    // Abrir el gestor de categorías en una nueva ventana del navegador
    window.location.href = 'views/categories.html';
});

document.getElementById('addons-config-menu').onclick = () => {
    window.location.href = 'views/addons.html';
};

// --- Inicialización ---
window.addEventListener('load', () => {
    setupSearchBar();
    showAddons();

    document.getElementById('config-menu').addEventListener('click', tryShowConfig);
    document.getElementById('addons-menu').addEventListener('click', tryShowAddons);
    document.getElementById('toggle-debug-info').addEventListener('click', toggleDebugInfo);
    document.getElementById('toggle-filter').addEventListener('click', toggleFilter);
    document.getElementById('load-addons-btn').addEventListener('click', loadAddons);
});

// --- Exposición global ---
window.KodiApp = {
    tryShowAddons,
    tryShowConfig,
    toggleDebugInfo,
    toggleFilter,
    playPause,
    stopPlayer,
    volumeUp,
    volumeDown,
    loadAddons
};
