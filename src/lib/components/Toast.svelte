<script lang="ts">
	import { toasts, removeToast, type Toast } from '$lib/stores/appState';
	import { fly } from 'svelte/transition';

	function getToastIcon(type: Toast['type']): string {
		switch (type) {
			case 'success':
				return '✓';
			case 'error':
				return '✕';
			case 'warning':
				return '⚠';
			case 'info':
			default:
				return 'ℹ';
		}
	}

	function getToastClasses(type: Toast['type']): string {
		const base = 'flex items-center p-4 rounded-lg shadow-lg border-l-4 max-w-sm';
		switch (type) {
			case 'success':
				return `${base} bg-green-800 border-green-500 text-green-100`;
			case 'error':
				return `${base} bg-red-800 border-red-500 text-red-100`;
			case 'warning':
				return `${base} bg-yellow-800 border-yellow-500 text-yellow-100`;
			case 'info':
			default:
				return `${base} bg-blue-800 border-blue-500 text-blue-100`;
		}
	}
</script>

<div class="fixed top-4 right-4 z-50 space-y-2" role="region" aria-label="Notifications">
	{#each $toasts as toast (toast.id)}
		<div
			class={getToastClasses(toast.type)}
			transition:fly={{ x: 300, duration: 300 }}
			role="alert"
			aria-live="polite"
		>
			<div class="flex items-center">
				<span class="text-xl mr-3" aria-hidden="true">
					{getToastIcon(toast.type)}
				</span>
				<div class="flex-1">
					<p class="text-sm font-medium">{toast.message}</p>
				</div>
				<button
					class="ml-3 text-lg hover:opacity-70 focus:outline-hidden focus:ring-2 focus:ring-white focus:ring-opacity-50 rounded-sm"
					on:click={() => removeToast(toast.id)}
					aria-label="Close notification"
				>
					×
				</button>
			</div>
		</div>
	{/each}
</div>
