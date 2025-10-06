// --- Limpieza de etiquetas ---
export function cleanLabel(label) { 
    return label ? label.replace(/\[.*?\]/g,'').trim() : ''; 
}

export function fixEncoding(str) {
    try {
        return decodeURIComponent(escape(str));
    } catch(e) {
        return str;
    }
}

// --- Función para parsear URLs con base64 ---
export function parsePluginUrlUniversal(file) {
    if (!file || !file.includes("?")) return {};

    const queryStr = file.split("?")[1];
    if (!queryStr) return {};

    // Intentamos parsear base64
    try {
        const decoded = atob(decodeURIComponent(queryStr));
        try {
            const json = JSON.parse(decoded);
            return json; // es JSON base64, devolvemos todo
        } catch (e) {
            // no es JSON base64, seguimos
        }
    } catch (e) {
        // no es base64, seguimos
    }

    // Parseamos query string normal (key=value&key2=value2...)
    const params = {};
    queryStr.split("&").forEach(pair => {
        const [key, value] = pair.split("=");
        if (key) {
            try {
                params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : null;
            } catch(e) {
                params[key] = value || null; // fallback
            }
        }
    });
    return params;
}