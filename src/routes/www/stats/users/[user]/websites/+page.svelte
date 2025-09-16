<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { navigateTo } from '$lib/utils';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { addToast } from '$lib/stores/appState';
	import { apiGet, apiDelete, apiPost } from '$lib/utils';
	import ResourceList from '$lib/components/ResourceList.svelte';
	import ConfirmationModal from '$lib/components/modals/ConfirmationModal.svelte';

	// Accept params prop to suppress SvelteKit warning
	export const params: Record<string, string> = {};

	let websitesData: Record<string, unknown>[] = [];
	let loading = true;
	let userName: string = '';
	let showDeleteModal = false;
	let deleteModalLoading = false;
	let domainToDelete: Record<string, unknown> | null = null;
	let showAddModal = false;
	let addModalLoading = false;
	let availableDomains: string[] = [];
	let selectedDomain: string = '';

	// Columns for websites data
	const columns = [{ key: 'domain', label: 'Domain', type: 'text' as const }];

	// Function to get actions for the current user
	function getUserActions() {
		const hasUnderscore = userName.includes('_');

		return [
			{
				label: 'Delete',
				action: 'delete',
				variant: 'danger' as const,
				requiresConfirmation: true,
				disabled: !hasUnderscore
			}
		];
	}

	// Load websites data on mount
	onMount(() => {
		// Get the username from the URL parameters
		const unsubscribe = page.subscribe(($page) => {
			userName = $page.params.user || '';
			if (userName) {
				loadWebsitesData();
			}
		});

		return unsubscribe;
	});

	async function loadWebsitesData() {
		loading = true;
		try {
			// Use the correct API endpoint for statistics list
			const data = await apiGet<Record<string, unknown>>('/www/stats/list');

			// Transform the data into a format suitable for ResourceList
			const transformedData: Record<string, unknown>[] = [];

			// Parse the matomo_list from the response and find the specific user
			if (data.matomo_list && Array.isArray(data.matomo_list)) {
				const userData = data.matomo_list.find(
					(user: Record<string, unknown>) => user.user === userName
				);

				if (userData && userData.domains && Array.isArray(userData.domains)) {
					userData.domains.forEach((domain: string) => {
						transformedData.push({
							domain: domain
						});
					});
				}
			}

			websitesData = transformedData;
		} catch (error) {
			console.error('Error loading websites data:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			// Show empty data instead of error for better UX
			websitesData = [];
			addToast({
				type: 'error',
				message: `Failed to load websites for user ${userName}`
			});
		} finally {
			loading = false;
		}
	}

	function goBack() {
		if (browser) {
			navigateTo('/www/stats/users');
		}
	}

	function handleAction(event: CustomEvent<{ action: string; item: Record<string, unknown> }>) {
		const { action, item } = event.detail;

		switch (action) {
			case 'delete':
				domainToDelete = item;
				showDeleteModal = true;
				break;
			case 'add':
				handleAddWebsite();
				break;
		}
	}

	function handleConfirmAction(
		event: CustomEvent<{ action: string; item: Record<string, unknown> }>
	) {
		const { action, item } = event.detail;

		switch (action) {
			case 'delete':
				domainToDelete = item;
				showDeleteModal = true;
				break;
		}
	}

	async function deleteDomainAccess(domain: Record<string, unknown>) {
		deleteModalLoading = true;
		try {
			const domainName = domain.domain as string;
			await apiDelete(`/www/stats/access/${domainName}/${userName}`, {
				www_domain: domainName,
				user_name: userName
			});

			addToast({
				type: 'success',
				message: `Domain access removed for ${domainName}`
			});

			// Refresh the data
			loadWebsitesData();
			showDeleteModal = false;
			domainToDelete = null;
		} catch (error) {
			console.error('Error deleting domain access:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to remove domain access'
			});
		} finally {
			deleteModalLoading = false;
		}
	}

	function handleDeleteConfirm() {
		if (domainToDelete) {
			deleteDomainAccess(domainToDelete);
		}
	}

	function handleDeleteCancel() {
		showDeleteModal = false;
		domainToDelete = null;
	}

	async function loadAvailableDomains() {
		try {
			const data = await apiGet<Record<string, unknown>>('/www/stats/list');

			// Extract all unique domains from matomo_list
			const allDomains = new SvelteSet<string>();
			if (data.matomo_list && Array.isArray(data.matomo_list)) {
				data.matomo_list.forEach((userData: Record<string, unknown>) => {
					const domains = userData.domains as string[];
					if (domains && Array.isArray(domains)) {
						domains.forEach((domain: string) => allDomains.add(domain));
					}
				});
			}

			// Filter out domains that current user already has access to
			const currentUserDomains = new Set(websitesData.map((item) => item.domain as string));
			availableDomains = Array.from(allDomains)
				.filter((domain) => !currentUserDomains.has(domain))
				.sort();
		} catch (error) {
			console.error('Error loading available domains:', error);
			addToast({
				type: 'error',
				message: 'Failed to load available domains'
			});
		}
	}

	function handleAddWebsite() {
		loadAvailableDomains();
		showAddModal = true;
		selectedDomain = '';
	}

	async function addDomainAccess() {
		if (!selectedDomain) {
			addToast({
				type: 'error',
				message: 'Please select a domain'
			});
			return;
		}

		addModalLoading = true;
		try {
			await apiPost('/www/stats/access/add', {
				www_domain: selectedDomain,
				user_name: userName
			});

			addToast({
				type: 'success',
				message: `Domain access added for ${selectedDomain}`
			});

			// Refresh the data
			loadWebsitesData();
			showAddModal = false;
			selectedDomain = '';
		} catch (error) {
			console.error('Error adding domain access:', error);
			addToast({
				type: 'error',
				message: 'Failed to add domain access'
			});
		} finally {
			addModalLoading = false;
		}
	}

	function handleAddCancel() {
		showAddModal = false;
		selectedDomain = '';
	}
</script>

<svelte:head>
	<title>Websites for {userName} - devil WEB</title>
</svelte:head>

<div class="mb-4">
	<button
		on:click={goBack}
		class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200"
	>
		<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"
			></path>
		</svg>
		Back to Users
	</button>
</div>

<ResourceList
	title="Websites for {userName}"
	items={websitesData}
	{loading}
	{columns}
	actions={getUserActions}
	searchPlaceholder="Search websites..."
	addButtonLabel="Add access to website"
	on:action={handleAction}
	on:confirmAction={handleConfirmAction}
/>

<!-- Delete Confirmation Modal -->
<ConfirmationModal
	bind:showModal={showDeleteModal}
	loading={deleteModalLoading}
	title="Remove Domain Access"
	message="Are you sure you want to remove access to '{domainToDelete?.domain}' for user {userName}? This action cannot be undone."
	confirmText="Remove Access"
	confirmVariant="danger"
	on:confirm={handleDeleteConfirm}
	on:cancel={handleDeleteCancel}
/>

<!-- Add Website Access Modal -->
{#if showAddModal}
	<div
		class="fixed inset-0 z-50 overflow-y-auto"
		aria-labelledby="modal-title"
		role="dialog"
		aria-modal="true"
	>
		<div
			class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
		>
			<div
				class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
				aria-hidden="true"
			></div>

			<span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true"
				>&#8203;</span
			>

			<div
				class="inline-block align-bottom bg-white dark:bg-dark-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
			>
				<div class="bg-white dark:bg-dark-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
					<div class="sm:flex sm:items-start">
						<div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
							<h3
								class="text-lg leading-6 font-medium text-gray-900 dark:text-white"
								id="modal-title"
							>
								Add Website Access
							</h3>
							<div class="mt-4">
								<label
									for="domain-select"
									class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
								>
									Select Website
								</label>
								<select
									id="domain-select"
									bind:value={selectedDomain}
									class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-dark-600 focus:outline-hidden focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
									disabled={addModalLoading}
								>
									<option value="">Choose a website...</option>
									{#each availableDomains as domain (domain)}
										<option value={domain}>{domain}</option>
									{/each}
								</select>
								{#if availableDomains.length === 0}
									<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
										No available websites to add access to.
									</p>
								{/if}
							</div>
						</div>
					</div>
				</div>
				<div class="bg-gray-50 dark:bg-dark-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
					<button
						type="button"
						on:click={addDomainAccess}
						disabled={!selectedDomain || addModalLoading}
						class="w-full inline-flex justify-center rounded-md border border-transparent shadow-xs px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto sm:text-sm"
					>
						{#if addModalLoading}
							<svg
								class="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
						{/if}
						Add Access
					</button>
					<button
						type="button"
						on:click={handleAddCancel}
						disabled={addModalLoading}
						class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-dark-600 shadow-xs px-4 py-2 bg-white dark:bg-dark-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
