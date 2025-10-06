import { getCategories } from '../categories/manager.js';
import { saveAddonsConfig, loadAddonsConfig } from './storage.js'; // lo crearemos

let addons = []; // Array de addons con su configuración

document.addEventListener('DOMContentLoaded', () => {
  loadAddons();
  renderAddonsTable();
  setupEventListeners();
});

function loadAddons() {
  // Aquí en producción se llamaría a Kodi JSON-RPC
  // Por ahora simulamos addons instalados
  addons = loadAddonsConfig() || [
    { id: 'alfa', name: 'Alfa', active: true, categories: [], paginationWords: '' },
    { id: 'balandro', name: 'Balandro', active: false, categories: [], paginationWords: '' },
    { id: 'elamentum', name: 'Elementum', active: true, categories: [], paginationWords: '' },
  ];
}

function renderAddonsTable() {
  const tbody = document.querySelector('#addonsTable tbody');
  tbody.innerHTML = '';

  const categories = getCategories();

  addons.forEach((addon, idx) => {
    const tr = document.createElement('tr');

    // Activo
    const tdActive = document.createElement('td');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = addon.active;
    checkbox.onchange = () => { addon.active = checkbox.checked; saveAddonsConfig(addons); };
    tdActive.appendChild(checkbox);
    tr.appendChild(tdActive);

    // Nombre
    const tdName = document.createElement('td');
    tdName.textContent = addon.name;
    tr.appendChild(tdName);

    // Categorías
    const tdCats = document.createElement('td');
    const select = document.createElement('select');
    select.multiple = true;
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.innerText = cat.name;
      if (addon.categories.includes(cat.id)) opt.selected = true;
      select.appendChild(opt);
    });
    select.onchange = () => {
      addon.categories = Array.from(select.selectedOptions).map(o => o.value);
      saveAddonsConfig(addons);
    };
    tdCats.appendChild(select);
    tr.appendChild(tdCats);

    // Palabras de paginación
    const tdPages = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'text';
    input.value = addon.paginationWords;
    input.placeholder = 'next,siguiente,ver más';
    input.oninput = () => { addon.paginationWords = input.value; saveAddonsConfig(addons); };
    tdPages.appendChild(input);
    tr.appendChild(tdPages);

    // Acciones
    const tdActions = document.createElement('td');
    const btnDelete = document.createElement('button');
    btnDelete.textContent = 'Eliminar';
    btnDelete.onclick = () => {
      if(confirm(`¿Eliminar addon ${addon.name}?`)) {
        addons.splice(idx,1);
        saveAddonsConfig(addons);
        renderAddonsTable();
      }
    };
    tdActions.appendChild(btnDelete);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
}

function setupEventListeners() {
  document.getElementById('exportAddons').onclick = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(addons,null,2));
    const dl = document.createElement('a');
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download','addons_config.json');
    dl.click();
  };

  document.getElementById('importAddons').onchange = (event) => {
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const imported = JSON.parse(e.target.result);
        if(!Array.isArray(imported)) throw new Error('Formato inválido');
        addons = imported;
        saveAddonsConfig(addons);
        renderAddonsTable();
        alert('Addons importados correctamente.');
      } catch(err) {
        alert('Error importando addons: ' + err.message);
      }
    };
    reader.readAsText(file);
  };
}
