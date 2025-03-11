export function isAlgohubPage(): boolean {
  return /\/algohub/.test(window.location.href);
}

export function setIsInstalledToWindow() {
  window.isExtensionInstalled = true;
}

declare global {
  interface Window {
    isExtensionInstalled: boolean;
  }
}
