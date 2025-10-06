// js/ui/controls.js
import { sendKodiRequest } from '../kodi/rpc.js';

let activePlayerId = null;

export function getActivePlayerId() {
  return activePlayerId;
}

export function setActivePlayer(id) {
  activePlayerId = id;
}

export async function playPause() {
  if (activePlayerId !== null)
    await sendKodiRequest('Player.PlayPause', { playerid: activePlayerId });
}

export async function stopPlayer() {
  if (activePlayerId !== null) {
    await sendKodiRequest('Player.Stop', { playerid: activePlayerId });
    activePlayerId = null;

    const controlsContainer = document.getElementById('controls-container');
    if (controlsContainer) {
      controlsContainer.innerHTML = '';
      const playBtn = document.createElement('button');
      playBtn.innerText = '▶️ Reproducir';
      playBtn.onclick = () => alert('Selecciona un ítem para reproducir');
      controlsContainer.appendChild(playBtn);
    }
  }
}

export async function volumeUp() {
  const data = await sendKodiRequest('Application.GetProperties', { properties: ['volume'] });
  if (data.result && typeof data.result.volume === 'number') {
    await sendKodiRequest('Application.SetVolume', { volume: Math.min(data.result.volume + 5, 100) });
  }
}

export async function volumeDown() {
  const data = await sendKodiRequest('Application.GetProperties', { properties: ['volume'] });
  if (data.result && typeof data.result.volume === 'number') {
    await sendKodiRequest('Application.SetVolume', { volume: Math.max(data.result.volume - 5, 0) });
  }
}
