<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import ConfirmationModal from './modals/ConfirmationModal.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import { clearCredentials, appState } from '$lib/stores/appState';
	import { apiService } from '$lib/services/api';
	import { navigateTo } from '$lib/utils';

	export let isOpen = false;

	let showLogoutModal = false;

	const navigationItems = [
		{
			name: 'Dashboard',
			path: `${base}/dashboard`,
			icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z'
		},
		{
			name: 'Websites',
			path: `${base}/www`,
			icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 01 9-9'
		},
		{
			name: 'DNS',
			path: `${base}/dns`,
			icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2'
		},
		{
			name: 'Email',
			path: `${base}/mail`,
			icon: 'M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
		},
		{
			name: 'MySQL',
			path: `${base}/mysql`,
			icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4'
		},
		{
			name: 'PostgreSQL',
			path: `${base}/pgsql`,
			icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
		},
		{
			name: 'MongoDB',
			path: `${base}/mongo`,
			icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01'
		},
		{
			name: 'FTP',
			path: `${base}/ftp`,
			icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10'
		},
		{
			name: 'SSL',
			path: `${base}/ssl`,
			icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
		},
		{
			name: 'Repositories',
			path: `${base}/repo`,
			icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z'
		},
		{
			name: 'Ports',
			path: `${base}/port`,
			icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
		}
	];

	function handleLogout() {
		showLogoutModal = true;
	}

	function confirmLogout() {
		apiService.disconnect();
		clearCredentials();
		navigateTo(`${base}/`);
	}

	function cancelLogout() {
		showLogoutModal = false;
	}

	function closeSidebar() {
		isOpen = false;
	}

	$: currentPath = $page.url.pathname;
</script>

<!-- Mobile sidebar overlay -->
{#if isOpen}
	<div
		class="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
		on:click={closeSidebar}
		on:keydown={(e) => e.key === 'Escape' && closeSidebar()}
		role="button"
		tabindex="0"
		aria-label="Close sidebar"
	></div>
{/if}

<!-- Sidebar -->
<aside
	class="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-dark-700 transform {isOpen
		? 'translate-x-0'
		: '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out lg:static lg:inset-0"
>
	<div class="flex flex-col h-full">
		<!-- Logo/Header -->
		<div
			class="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-dark-700"
		>
			<div class="flex items-center">
				<img src="{base}/icon-96.png" alt="devil Imps Logo" class="w-8 h-8 rounded-lg" />
				<span class="ml-3 text-xl font-bold text-devil-600 dark:text-devil-700">devil Imps</span>
			</div>

			<!-- Mobile close button -->
			<button
				class="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700"
				on:click={closeSidebar}
				aria-label="Close sidebar"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					></path>
				</svg>
			</button>
		</div>

		<!-- Navigation -->
		<nav class="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
			{#each navigationItems as item (item.path)}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a
					href={item.path}
					class="nav-item {currentPath === item.path ? 'active' : ''}"
					on:click={closeSidebar}
				>
					<svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon}
						></path>
					</svg>
					{item.name}
				</a>
			{/each}
		</nav>

		<!-- Footer -->
		<div class="p-4 border-t border-gray-200 dark:border-dark-700">
			<!-- Domain info -->
			{#if $appState.isConnected}
				<div class="mb-4 p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
					<div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
						Connected devil-API
					</div>
					<div class="text-xs text-gray-900 dark:text-white font-medium break-all">
						{$appState.domain}
					</div>
				</div>
			{/if}

			<div class="flex items-center justify-between mb-4">
				<span class="text-sm text-gray-600 dark:text-gray-400">Theme</span>
				<ThemeToggle />
			</div>

			<button
				on:click={handleLogout}
				class="w-full btn-danger text-sm inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-dark-900 shadow-xs hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
				type="button"
			>
				<svg class="w-4 h-4 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
					></path>
				</svg>
				<span class="whitespace-nowrap">Logout</span>
			</button>
		</div>
	</div>
</aside>

<ConfirmationModal
	showModal={showLogoutModal}
	title="Confirm Logout"
	message="Are you sure you want to logout? You will need to enter your credentials again to access the application."
	confirmText="Logout"
	cancelText="Cancel"
	confirmVariant="danger"
	on:confirm={confirmLogout}
	on:cancel={cancelLogout}
/>
