import '@testing-library/jest-dom/vitest';

// jsdom не реалізує matchMedia, який використовує хук теми (useTheme)
window.matchMedia = ((query: string) => ({
  matches: false,
  media: query,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent() {
    return false;
  },
  onchange: null,
})) as never;
