// js/ui/breadcrumb.js
export function updateBreadcrumb(breadcrumbHistory, onClick) {
  const breadcrumbDiv = document.getElementById('breadcrumb');
  breadcrumbDiv.innerHTML = '';

  breadcrumbHistory.forEach((entry, index) => {
    const span = document.createElement('span');
    span.className = 'breadcrumb-item';
    span.innerText = entry.label;
    span.onclick = () => onClick(index);
    breadcrumbDiv.appendChild(span);

    if (index < breadcrumbHistory.length - 1) {
      const sep = document.createElement('span');
      sep.className = 'breadcrumb-separator';
      sep.innerText = '>';
      breadcrumbDiv.appendChild(sep);
    }
  });
}
