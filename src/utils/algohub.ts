export function setExtensionInstalled() {
  // content_script.js
  const meta = document.createElement('meta');
  meta.name = 'extension-installed';
  document.head.appendChild(meta);
}
