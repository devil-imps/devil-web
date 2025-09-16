// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}

	interface Window {
		deferredPrompt?: BeforeInstallPromptEvent;
	}

	// Make BeforeInstallPromptEvent available globally
	var BeforeInstallPromptEvent: {
		prototype: BeforeInstallPromptEvent;
		new (): BeforeInstallPromptEvent;
	};
}

export {};
