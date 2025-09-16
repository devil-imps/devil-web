import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'light' | 'dark';

// Create theme store with default value
function createThemeStore() {
	const { subscribe, set, update } = writable<Theme>('dark');

	return {
		subscribe,
		set,
		update,
		toggle: () => update((theme) => (theme === 'light' ? 'dark' : 'light')),
		init: () => {
			if (browser) {
				// Check localStorage first, then system preference
				const stored = localStorage.getItem('devil-web-theme') as Theme;
				if (stored) {
					set(stored);
				} else {
					const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
					set(prefersDark ? 'dark' : 'light');
				}
			}
		},
		save: (theme: Theme) => {
			if (browser) {
				localStorage.setItem('devil-web-theme', theme);
				// Apply theme to document
				if (theme === 'dark') {
					document.documentElement.classList.add('dark');
				} else {
					document.documentElement.classList.remove('dark');
				}
			}
		}
	};
}

export const theme = createThemeStore();
