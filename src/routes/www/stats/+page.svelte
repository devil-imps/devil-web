<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { navigateTo } from '$lib/utils';
	import { browser } from '$app/environment';
	import { addToast } from '$lib/stores/appState';
	import { apiGet, apiDelete, apiPost } from '$lib/utils';
	import ResourceList from '$lib/components/ResourceList.svelte';
	import ConfirmationModal from '$lib/components/modals/ConfirmationModal.svelte';
	import WebsiteStatsAddModal from '$lib/components/modals/add/WebsiteStatsAddModal.svelte';

	// Accept params prop to suppress SvelteKit warning
	export const params: Record<string, string> = {};

	let statsData: Record<string, unknown>[] = [];
	let loading = true;
	let showDeleteModal = false;
	let deleteModalLoading = false;
	let domainToDelete: Record<string, unknown> | null = null;
	let showAddModal = false;
	let addModalLoading = false;

	// Columns for stats data
	const columns = [{ key: 'name', label: 'Domain', type: 'text' as const }];

	// Actions for the table
	const actions = [
		{ label: 'Delete', action: 'delete', variant: 'danger' as const, requiresConfirmation: true }
	];

	// Load stats data on mount
	onMount(() => {
		loadStatsData();
	});

	async function loadStatsData() {
		loading = true;
		try {
			const data = await apiGet<Record<string, unknown>>('/www/stats/list');
			// Transform the data into a format suitable for ResourceList
			const transformedData: Record<string, unknown>[] = [];
			const uniqueDomains = new SvelteSet<string>();

			// Collect all unique domains from matomo_list
			if (data.matomo_list && Array.isArray(data.matomo_list)) {
				data.matomo_list.forEach((item: Record<string, unknown>) => {
					const domains = (item.domains as string[]) || [];
					domains.forEach((domain: string) => {
						if (domain && domain.trim()) {
							uniqueDomains.add(domain.trim());
						}
					});
				});
			}

			// Create entries for each unique domain
			uniqueDomains.forEach((domain: string) => {
				transformedData.push({
					type: 'Domain',
					name: domain,
					details: 'Statistics tracking enabled',
					domain: domain
				});
			});

			statsData = transformedData;
		} catch (error) {
			console.error('Error loading stats data:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to load statistics data'
			});
		} finally {
			loading = false;
		}
	}

	function handleAction(event: CustomEvent<{ action: string; item: Record<string, unknown> }>) {
		const { action, item } = event.detail;

		switch (action) {
			case 'add':
				showAddModal = true;
				break;
			case 'delete':
				domainToDelete = item;
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

	async function deleteDomain(domain: Record<string, unknown>) {
		deleteModalLoading = true;
		try {
			await apiDelete(`/www/stats/domain/${domain.name}`, { www_domain: domain.name });
			addToast({
				type: 'success',
				message: `Domain ${domain.name} removed from statistics tracking`
			});
			loadStatsData(); // Reload the data
			showDeleteModal = false;
			domainToDelete = null;
		} catch (error) {
			console.error('Error deleting domain from stats:', error);
			addToast({
				type: 'error',
				message: 'Failed to remove domain from statistics tracking'
			});
		} finally {
			deleteModalLoading = false;
		}
	}

	function handleAddSubmit(event: CustomEvent<{ domain: string }>) {
		const { domain } = event.detail;
		addWebsiteToStats(domain);
	}

	function handleAddCancel() {
		showAddModal = false;
	}

	async function addWebsiteToStats(domain: string) {
		addModalLoading = true;
		try {
			await apiPost('/www/stats/domain/add', { www_domain: domain });
			addToast({
				type: 'success',
				message: `Domain ${domain} added to statistics tracking`
			});
			loadStatsData(); // Reload the data
			showAddModal = false;
		} catch (error) {
			console.error('Error adding domain to stats:', error);
			addToast({
				type: 'error',
				message: 'Failed to add domain to statistics tracking'
			});
		} finally {
			addModalLoading = false;
		}
	}

	function handleDeleteConfirm() {
		if (domainToDelete) {
			deleteDomain(domainToDelete);
		}
	}

	function handleDeleteCancel() {
		showDeleteModal = false;
		domainToDelete = null;
	}

	function goBack() {
		if (browser) {
			navigateTo('/www');
		}
	}

	function goToUsers() {
		if (browser) {
			navigateTo('/www/stats/users');
		}
	}
</script>

<svelte:head>
	<title>WWW Statistics - devil WEB</title>
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
		Back to Websites
	</button>
</div>

<ResourceList
	title="WWW Statistics"
	items={statsData}
	{loading}
	{columns}
	{actions}
	addButtonLabel="Add Website"
	searchPlaceholder="Search statistics..."
	on:action={handleAction}
	on:confirmAction={handleConfirmAction}
>
	<div slot="header-actions">
		<button
			on:click={goToUsers}
			class="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium text-sm rounded-lg border border-transparent transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-dark-900 shadow-xs hover:shadow-md"
		>
			<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
				></path>
			</svg>
			Users
		</button>
	</div>
</ResourceList>

<ConfirmationModal
	showModal={showDeleteModal}
	title="Remove Domain from Statistics"
	message={domainToDelete
		? `Are you sure you want to remove '${domainToDelete.name}' from statistics tracking? This action cannot be undone.`
		: ''}
	confirmText="Remove"
	cancelText="Cancel"
	confirmVariant="danger"
	loading={deleteModalLoading}
	on:confirm={handleDeleteConfirm}
	on:cancel={handleDeleteCancel}
/>

<WebsiteStatsAddModal
	showModal={showAddModal}
	loading={addModalLoading}
	on:submit={handleAddSubmit}
	on:cancel={handleAddCancel}
/>
