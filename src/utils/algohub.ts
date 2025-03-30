export function setExtensionInstalled() {
  if (!document.querySelector('meta[name="extension-installed"]')) {
    const meta = document.createElement('meta');
    meta.name = 'extension-installed';
    document.head.appendChild(meta);
  }
}
