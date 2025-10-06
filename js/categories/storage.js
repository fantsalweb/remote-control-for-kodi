// js/categories/storage.js
const STORAGE_KEY = 'globalCategories_v1';

export function loadCategories() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('loadCategories error', e);
    return [];
  }
}

export function saveCategories(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('saveCategories error', e);
  }
}

export function clearCategories() {
  localStorage.removeItem(STORAGE_KEY);
}
