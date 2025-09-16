import { goto } from '$app/navigation';
import { base } from '$app/paths';

/**
 * Navigate to a path with proper base path handling for GitHub Pages deployment
 * @param path - The path to navigate to (without base path)
 */
export function navigateTo(path: string) {
	// Input validation
	if (!path || typeof path !== 'string') {
		console.error('navigateTo: Invalid path provided');
		return;
	}

	// Remove leading slash if present
	const cleanPath = path.startsWith('/') ? path.slice(1) : path;

	// Combine base path with the target path
	const fullPath = base ? `${base}/${cleanPath}` : `/${cleanPath}`;

	goto(fullPath); // eslint-disable-line svelte/no-navigation-without-resolve
}

/**
 * Get the full URL path including base path
 * @param path - The path to get (without base path)
 */
export function getFullPath(path: string): string {
	// Input validation
	if (!path || typeof path !== 'string') {
		console.error('getFullPath: Invalid path provided');
		return '/';
	}

	// Remove leading slash if present
	const cleanPath = path.startsWith('/') ? path.slice(1) : path;

	// Combine base path with the target path
	return base ? `${base}/${cleanPath}` : `/${cleanPath}`;
}
