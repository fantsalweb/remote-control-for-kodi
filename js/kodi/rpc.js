// js/kodi/rpc.js

/**
 * Envía una petición JSON-RPC a Kodi
 */
export async function sendKodiRequest(method, params = {}) {
    try {
        const kodiIp = document.getElementById("kodi-ip").value;
        const kodiUser = localStorage.getItem("kodiUser") || "kodi";
        const kodiPass = localStorage.getItem("kodiPass") || "1234";

        const response = await fetch(`http://${kodiIp}/jsonrpc`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Basic " + btoa(`${kodiUser}:${kodiPass}`)
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method,
                params
            })
        });

        if (!response.ok) {
            console.error("Kodi devolvió error HTTP:", response.status);
            return { error: `HTTP ${response.status}` };
        }

        const text = await response.text();
        return text ? JSON.parse(text) : null;
    } catch (err) {
        console.error("Error en sendKodiRequest:", err);
        return { error: err.message };
    }
}

/**
 * Reproduce un ítem en Kodi
 */
// Reproduce un ítem en Kodi y espera a que empiece
export async function playItemOnKodi(file) {
    await sendKodiRequest("Player.Open", { item: { file } });

    return new Promise(async (resolve, reject) => {
        const start = Date.now();
        const maxTime = 30000; // 30s máximo
        const interval = 500;

        const checkPlayer = async () => {
            const players = await sendKodiRequest("Player.GetActivePlayers");
            if (players?.result?.length > 0) {
                const playerId = players.result[0].playerid;
                await autoSelectAudioStream(playerId);
                resolve(playerId); // Ya empezó
            } else if (Date.now() - start < maxTime) {
                setTimeout(checkPlayer, interval);
            } else {
                reject(new Error("No se pudo iniciar la reproducción"));
            }
        };

        checkPlayer();
    });
}

/**
 * Selecciona automáticamente pista de audio según preferencias guardadas
 */
async function autoSelectAudioStream(playerId) {
    const preferred = localStorage.getItem("preferredAudio") || "es";
    const secondary = localStorage.getItem("secondaryAudio") || "en";

    try {
        const data = await sendKodiRequest("Player.GetProperties", {
            playerid: playerId,
            properties: ["audiostreams", "currentaudiostream"]
        });

        if (!data?.result?.audiostreams) return;

        const streams = data.result.audiostreams;
        const current = data.result.currentaudiostream;

        let selected = streams.find(s => s.language === preferred) 
                       || streams.find(s => s.language === secondary) 
                       || streams[0];

        if (selected && (!current || selected.index !== current.index)) {
            await sendKodiRequest("Player.SetAudioStream", {
                playerid: playerId,
                stream: selected.index
            });
            console.log(`✅ Audio cambiado a: ${selected.language || "desconocido"}`);
        }
    } catch (err) {
        console.error("Error autoSelectAudioStream:", err);
    }
}
