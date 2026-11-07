import { mount } from 'svelte';
import '@fontsource-variable/inter';
import './app.css';
import App from './App.svelte';
import { i18n } from './lib/i18n.svelte';

document.documentElement.lang = i18n.lang;

const app = mount(App, { target: document.getElementById('app')! });

export default app;
