// js/categories/manager.js
import { loadCategories as loadFromStorage, saveCategories as saveToStorage } from './storage.js';

export let categories = []; // array raíz (cada item puede tener .subcategories[])

function setLevels(node, level = 1) {
  node.level = level;
  node.subcategories = node.subcategories || [];
  node.subcategories.forEach(child => setLevels(child, level + 1));
}

// Convierte array plano (cada item con parentId) a árbol anidado
function buildTreeFromFlat(flat) {
  const map = {};
  flat.forEach(item => {
    map[item.id] = {
      id: item.id,
      name: item.name,
      color: item.color || '#4CAF50',
      icon: item.icon || '',
      description: item.description || '',
      parentId: item.parentId || null,
      subcategories: item.subcategories || []
    };
  });

  const roots = [];
  Object.values(map).forEach(node => {
    if (node.parentId && map[node.parentId]) {
      map[node.parentId].subcategories.push(node);
    } else {
      roots.push(node);
    }
  });

  roots.forEach(r => setLevels(r, 1));
  return roots;
}

// Normaliza datos: si storage trae estructura con subcategories la usamos, si trae plano la convertimos.
export function initCategories() {
  const loaded = loadFromStorage();
  categories.length = 0;

  if (!Array.isArray(loaded) || loaded.length === 0) {
    // nada guardado => vacío
    return categories;
  }

  // Detectar si ya viene en formato anidado (alguno tiene subcategories)
  const hasNested = loaded.some(item => Array.isArray(item.subcategories) && item.subcategories.length >= 0);

  if (hasNested) {
    // Usamos el array tal cual (pero aseguramos levels)
    loaded.forEach(item => categories.push(item));
    categories.forEach(root => setLevels(root, 1));
  } else {
    // Es plano; convertimos a árbol
    const tree = buildTreeFromFlat(loaded);
    tree.forEach(root => categories.push(root));
  }

  return categories;
}

export function getCategories() {
  return categories;
}

export function findCategoryById(id, list = categories) {
  for (const c of list) {
    if (c.id === id) return c;
    if (c.subcategories && c.subcategories.length) {
      const found = findCategoryById(id, c.subcategories);
      if (found) return found;
    }
  }
  return null;
}

// Elimina y devuelve nodo (recursivo)
function removeNodeById(id, list = categories) {
  for (let i = list.length - 1; i >= 0; i--) {
    const node = list[i];
    if (node.id === id) {
      list.splice(i, 1);
      return node;
    }
    if (node.subcategories && node.subcategories.length) {
      const removed = removeNodeById(id, node.subcategories);
      if (removed) return removed;
    }
  }
  return null;
}

export function addCategory(category) {
  // Espera un objeto { id?, name, color?, icon?, description?, parentId? }
  if (!category.id) category.id = `cat_${Date.now()}`;
  category.subcategories = category.subcategories || [];

  if (category.parentId) {
    const parent = findCategoryById(category.parentId);
    if (parent) {
      parent.subcategories = parent.subcategories || [];
      parent.subcategories.push(category);
      setLevels(parent, parent.level || 1); // reajusta niveles en la rama
    } else {
      // parent no encontrado: lo añadimos a raíz
      categories.push(category);
      setLevels(category, 1);
    }
  } else {
    // raíz
    categories.push(category);
    setLevels(category, 1);
  }

  saveToStorage(categories);
  return category;
}

export function updateCategory(updated) {
  // updated debe contener id y campos nuevos; puede contener parentId distinto al actual
  const existing = findCategoryById(updated.id);
  if (!existing) {
    throw new Error('Categoría no encontrada');
  }

  const oldParentId = existing.parentId || null;
  const newParentId = updated.parentId || null;

  // Si solo cambian propiedades (y parentId igual) actualizamos in-place
  if (oldParentId === newParentId) {
    existing.name = updated.name;
    existing.color = updated.color;
    existing.icon = updated.icon;
    existing.description = updated.description;
    // mantener subcategories tal como están
    saveToStorage(categories);
    return existing;
  }

  // Si el parentId cambia -> mover el nodo
  // Evitar mover a sí mismo o a un descendiente (ciclo)
  if (newParentId === updated.id) throw new Error('No se puede asignar la categoría como hija de sí misma');

  const nodeToMove = removeNodeById(updated.id);
  if (!nodeToMove) throw new Error('Error moviendo la categoría (no encontrada)');

  // Actualizar campos del nodo
  nodeToMove.name = updated.name;
  nodeToMove.color = updated.color;
  nodeToMove.icon = updated.icon;
  nodeToMove.description = updated.description;
  nodeToMove.parentId = newParentId || null;

  // Si newParentId es null => raíz
  if (!newParentId) {
    categories.push(nodeToMove);
    setLevels(nodeToMove, 1);
  } else {
    const newParent = findCategoryById(newParentId);
    if (!newParent) {
      // parent no encontrado: lo ponemos en raíz
      nodeToMove.parentId = null;
      categories.push(nodeToMove);
      setLevels(nodeToMove, 1);
    } else {
      // Evitar mover a un descendiente (si newParent está dentro de nodeToMove)
      if (findCategoryById(newParentId, nodeToMove.subcategories)) {
        // si newParentId es descendiente del nodoToMove -> inválido
        // Restaurar nodoToMove en su lugar original (no lo perdamos)
        // Lo guardamos en raíz como fallback
        categories.push(nodeToMove);
        setLevels(nodeToMove, 1);
        saveToStorage(categories);
        throw new Error('No se puede mover una categoría dentro de una de sus subcategorías');
      }

      newParent.subcategories = newParent.subcategories || [];
      newParent.subcategories.push(nodeToMove);
      nodeToMove.parentId = newParent.id;
      setLevels(newParent, newParent.level || 1);
    }
  }

  saveToStorage(categories);
  return nodeToMove;
}

export function deleteCategory(categoryId) {
  const removed = removeNodeById(categoryId);
  saveToStorage(categories);
  return removed;
}
