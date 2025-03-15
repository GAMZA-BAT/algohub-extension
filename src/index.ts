import algohubInit from './contentAlgohub';
import bojInit from './contentBoj';
import programmersInit from './contentProgrammers';

(() => {
  const url = window.location.hostname;

  // siteURL: initFn
  const siteMap: Record<string, () => void> = {
    algohub: algohubInit,
    acmicpc: bojInit,
    programmers: programmersInit,
  };

  const initFn = Object.entries(siteMap).find(([site]) =>
    url.includes(site),
  )?.[1];

  if (initFn) {
    initFn();
  }
})();
