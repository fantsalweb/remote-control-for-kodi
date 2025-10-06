const STORAGE_KEY = 'addons_config';

export function loadAddonsConfig() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    } catch {
        return {};
    }
}

export function saveAddonsConfig(config) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
