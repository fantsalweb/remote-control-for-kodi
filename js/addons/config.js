import { getCategories } from '../categories/manager.js';
import { loadAddonsConfig, saveAddonsConfig } from './storage.js';

// Ejemplo de addons detectados en Kodi
const addons = [
    { id: 'alfa', name: 'Alfa' },
    { id: 'balandro', name: 'Balandro' },
    { id: 'elementum', name: 'Elementum' }
];

const categories = getCategories(); // Usamos tu gestor de categorías

// Cargar configuración previa o inicializar
let addonsConfig = loadAddonsConfig() || {};

// Renderizar la lista de addons
function renderAddons() {
    const container = document.getElementById('addonsList');
    container.innerHTML = '';

    addons.forEach(addon => {
        // Dentro de addons.forEach(...)
        const config = addonsConfig[addon.id] = addonsConfig[addon.id] || { active: true, categoryId: '', paginationWords: '' };

        // Activar/desactivar
        const activeLabel = document.createElement('label');
        activeLabel.textContent = 'Activo: ';
        const activeInput = document.createElement('input');
        activeInput.type = 'checkbox';
        activeInput.checked = config.active;
        activeInput.onchange = () => {
            config.active = activeInput.checked;
            addonsConfig[addon.id] = config;
        };
        activeLabel.appendChild(activeInput);
        controls.appendChild(activeLabel);

        // Categoría
        const catLabel = document.createElement('label');
        catLabel.textContent = 'Categoría: ';
        const catSelect = document.createElement('select');
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '(Ninguna)';
        catSelect.appendChild(defaultOption);

        function flatten(cats, level = 0) {
            let result = [];
            cats.forEach(c => {
                result.push({ id: c.id, name: `${'-'.repeat(level)} ${c.name}`.trim() });
                if (c.subcategories) result.push(...flatten(c.subcategories, level + 1));
            });
            return result;
        }
        flatten(categories).forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            catSelect.appendChild(opt);
        });
        catSelect.value = config.categoryId || '';
        catSelect.onchange = () => {
            config.categoryId = catSelect.value;
            addonsConfig[addon.id] = config;
        };
        catLabel.appendChild(catSelect);
        controls.appendChild(catLabel);

        // Palabras de paginación
        const pagLabel = document.createElement('label');
        pagLabel.textContent = 'Palabras paginación: ';
        const pagInput = document.createElement('input');
        pagInput.type = 'text';
        pagInput.value = config.paginationWords || '';
        pagInput.oninput = () => {
            config.paginationWords = pagInput.value;
            addonsConfig[addon.id] = config;
        };
        pagLabel.appendChild(pagInput);
        controls.appendChild(pagLabel); 
    });
}

// Guardar toda la configuración
document.getElementById('saveAllBtn').onclick = () => {
    saveAddonsConfig(addonsConfig);
    alert('Configuración de addons guardada.');
};

document.getElementById('config-menu').onclick = () => location.href = '../index.html';
document.getElementById('addons-menu').onclick = () => location.href = '../addons.html';
document.getElementById('categories-menu').onclick = () => location.href = '../categories.html';
document.getElementById('configure-addons-menu').onclick = () => location.href = './addons.html';

// Inicialización
renderAddons();
