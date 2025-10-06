// js/ui/view.js
export function showSpinner(msg = 'Cargando...') {
  const spinner = document.getElementById('loading-spinner');
  spinner.querySelector('p').innerText = msg;
  spinner.style.display = 'flex';
}

export function hideSpinner(force = false) {
  const activeRequests = window.activeRequests || 0;
  window.activeRequests = force ? 0 : Math.max(activeRequests - 1, 0);
  if (window.activeRequests === 0) document.getElementById('loading-spinner').style.display = 'none';
}

export function setStatus(msg) {
  const statusDiv = document.getElementById('status');
  statusDiv.innerHTML = msg;
}

export function setupSearchBar() {
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', function () {
    const query = this.value.toLowerCase().trim();
    const items = document.querySelectorAll('#content-list .content-item');
    items.forEach(item => {
      const text = item.innerText.toLowerCase();
      item.style.display = text.includes(query) ? '' : 'none';
    });
  });
}
