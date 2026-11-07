import { mount } from 'svelte';
import '@fontsource-variable/inter';
import './app.css';
import App from './App.svelte';
import { i18n } from './lib/i18n.svelte';
import { registerSW } from 'virtual:pwa-register';
import { reloadOnce } from './lib/update';

// a new deployment takes over at once: with registerType "autoUpdate" the page reloads as soon as
// the new service worker controls it, so old code never asks for files that no longer exist
registerSW({ immediate: true });
// a lazily loaded file of an outdated version is gone from the server → load the current version
window.addEventListener('vite:preloadError', () => { reloadOnce(); });

document.documentElement.lang = i18n.lang;

const app = mount(App, { target: document.getElementById('app')! });

export default app;
