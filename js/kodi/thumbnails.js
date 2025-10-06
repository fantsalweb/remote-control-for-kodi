// js/kodi/thumbnails.js

// --- Placeholder SVG ---
export const PLACEHOLDER_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
  <rect width="100%" height="100%" fill="#2b2b2b"/>
  <g fill="#666">
    <rect x="30" y="40" width="340" height="200" rx="6" ry="6" fill="#3a3a3a"/>
    <rect x="30" y="260" width="340" height="16" rx="4" ry="4"/>
    <rect x="30" y="290" width="220" height="12" rx="4" ry="4"/>
    <rect x="30" y="320" width="140" height="12" rx="4" ry="4"/>
  </g>
  <text x="50%" y="88%" font-size="18" fill="#777" text-anchor="middle" font-family="Arial, Helvetica, sans-serif">Sin imagen</text>
</svg>` )}`;

// --- Función para normalizar thumbnails Kodi ---
export function getKodiThumbnail(raw, kodiIp) {
    if (!raw) return null;

    // Rutas locales mal formadas
    if (raw.startsWith("/")) {
        return PLACEHOLDER_SVG;
    }
    // Rutas locales tipo file://
    if (raw.startsWith("file://")) {
        const encoded = encodeURIComponent("image://" + raw.replace("file://", ""));
        return `http://${kodiIp}/image/${encoded}/`;
    }
    // Rutas Kodi image://
    if (raw.startsWith("image://")) {
        return `http://${kodiIp}/image/${encodeURIComponent(raw)}/`;
    }
    // URLs externas
    if (/^https?:\/\//i.test(raw)) return raw;

    return null;
}
