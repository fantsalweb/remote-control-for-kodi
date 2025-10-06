// js/categories/ui.js
import {
  initCategories,
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  findCategoryById
} from './manager.js';

import { saveCategories as storageSaveCategories, loadCategories } from './storage.js';

let editingCategoryId = null;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  initCategories();
  refreshCategories();
  setupEventListeners();
});

// --- Refrescar árbol y dropdown ---
function refreshCategories() {
  buildCategoryTreeUI();
  populateParentOptions();
}

// --- Renderizar árbol HTML con expandir/colapsar ---
function buildCategoryTreeUI() {
  const container = document.getElementById('categoryTree');
  if (!container) return;
  container.innerHTML = '';

  // Cargamos las categorías desde el manager (estado en memoria)
  const cats = getCategories();

  function createNode(cat, level = 0) {
    const div = document.createElement('div');
    div.className = 'category-item';
    div.style.marginLeft = `${level * 20}px`;
    div.id = cat.id;

    // Flecha para expandir/colapsar
    const toggle = document.createElement('span');
    toggle.style.cursor = 'pointer';
    toggle.style.marginRight = '5px';
    toggle.style.userSelect = 'none';

    const hasChildren = cat.subcategories && cat.subcategories.length > 0;
    toggle.textContent = hasChildren ? '▼' : '•';
    div.appendChild(toggle);

    // Color
    const colorBox = document.createElement('span');
    colorBox.className = 'color-box';
    colorBox.style.backgroundColor = cat.color || '#4CAF50';
    div.appendChild(colorBox);

    // Nombre + icono
    const label = document.createElement('span');
    label.innerText = `${cat.icon ? cat.icon + ' ' : ''}${cat.name}`;
    div.appendChild(label);

    // Acciones
    const actions = document.createElement('span');
    actions.className = 'category-actions';

    const editBtn = document.createElement('button');
    editBtn.innerText = 'Editar';
    editBtn.onclick = (e) => { e.stopPropagation(); openForm(cat); };
    actions.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.innerText = 'Eliminar';
    delBtn.onclick = (e) => {
      e.stopPropagation();
      if (!confirm(`¿Eliminar "${cat.name}" y todas sus subcategorías?`)) return;
      try {
        deleteCategory(cat.id);     // llama al manager que guarda en storage
      } catch (err) {
        alert('Error al eliminar categoría: ' + (err.message || err));
        return;
      }
      refreshCategories(); // re-render inmediato
    };
    actions.appendChild(delBtn);

    div.appendChild(actions);
    container.appendChild(div);

    // Subcategorías
    let childrenDivs = [];
    if (hasChildren) {
      cat.subcategories.forEach(sub => {
        const child = createNode(sub, level + 1);
        childrenDivs.push(child);
      });

      // Comportamiento expandir/colapsar
      toggle.onclick = (e) => {
        e.stopPropagation();
        const expanded = toggle.textContent === '▼';
        toggle.textContent = expanded ? '▶' : '▼';
        childrenDivs.forEach(ch => ch.style.display = expanded ? 'none' : '');
      };
    }

    return div;
  }

  // Renderizamos las raíces
  cats.forEach(cat => createNode(cat));
}

// --- Formulario ---
function setupEventListeners() {
  document.getElementById('btnAddCategory').onclick = () => openForm();
  document.getElementById('saveCategory').onclick = saveCategory;
  document.getElementById('cancelForm').onclick = closeForm;
  const exportBtn = document.getElementById('exportCategories');
  if (exportBtn) exportBtn.addEventListener('click', exportCategories);
  const importInput = document.getElementById('importCategories');
  if (importInput) importInput.addEventListener('change', importCategories);
}

function openForm(category = null) {
  const form = document.getElementById('formContainer');
  if (!form) return;
  form.style.display = 'block';

  // Primero preparamos el estado de edición
  editingCategoryId = category ? category.id : null;
  const isEditing = !!category;

  // Poblar primero el select de padres (para que exista la opción correcta)
  populateParentOptions();

  // Rellenar el formulario
  document.getElementById('formTitle').innerText = isEditing ? 'Editar Categoría' : 'Nueva Categoría';
  document.getElementById('categoryId').value = category?.id || '';
  document.getElementById('categoryName').value = category?.name || '';
  document.getElementById('categoryColor').value = category?.color || '#4CAF50';
  document.getElementById('categoryIcon').value = category?.icon || '';
  document.getElementById('categoryDescription').value = category?.description || '';

  const parentSelect = document.getElementById('parentCategory');
  parentSelect.value = category?.parentId || '';

  // Aseguramos que si no hay valor coincidente, quede en "(Ninguna)"
  if (!parentSelect.value) parentSelect.value = '';
}

function closeForm() {
  const form = document.getElementById('formContainer');
  if (form) form.style.display = 'none';
}

// --- Guardar categoría (crear o editar) ---
function saveCategory() {
  const id = editingCategoryId || `cat_${Date.now()}`;
  const name = document.getElementById('categoryName').value.trim();
  const color = document.getElementById('categoryColor').value;
  const icon = document.getElementById('categoryIcon').value.trim();
  const description = document.getElementById('categoryDescription').value.trim();
  const parentId = document.getElementById('parentCategory').value || null;

  if (!name) return alert('El nombre de la categoría es obligatorio.');

  const payload = { id, name, color, icon, description, parentId };

  try {
    if (editingCategoryId) {
      // actualiza (y mueve si parentId cambió)
      updateCategory(payload);
    } else {
      addCategory(payload);
    }
  } catch (err) {
    alert('Error guardando categoría: ' + err.message);
    return;
  }

  closeForm();
  // recargar datos desde manager (ya guardó en storage)
  refreshCategories();
}

// --- Dropdown de padres (plana todas las categorías para listar padres) ---
function populateParentOptions() {
  const select = document.getElementById('parentCategory');
  if (!select) return;
  const cats = getCategories();

  function flatten(list, acc = []) {
    list.forEach(c => {
      acc.push(c);
      if (c.subcategories && c.subcategories.length) flatten(c.subcategories, acc);
    });
    return acc;
  }

  const all = flatten(cats);
  select.innerHTML = '<option value="">(Ninguna)</option>';
  all.forEach(c => {
    // evito proponer como padre a sí mismo en caso de edición (esto se filtra por openForm)
    if (c.id === editingCategoryId) return;
    if ((c.level || 1) < 3) {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.innerText = `${'-'.repeat((c.level || 1) - 1)} ${c.name}`.trim();
      select.appendChild(opt);
    }
  });
}

// --- Exportar e importar ---
function exportCategories() {
  const data = getCategories();
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
  const dl = document.createElement('a');
  dl.setAttribute('href', dataStr);
  dl.setAttribute('download', 'categories.json');
  dl.click();
}

function importCategories(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error('Formato inválido: array esperado');

      // Guardamos tal cual (puede venir anidado o plano); storage se encarga solo de persistir
      storageSaveCategories(imported);

      // Re-inicializamos manager en memoria (recoge los datos guardados)
      initCategories();

      // Refrescar UI inmediatamente
      refreshCategories();

      alert('Categorías importadas correctamente.');
    } catch (err) {
      alert('Error importando categorías: ' + err.message);
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}
