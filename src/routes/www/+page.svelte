<script lang="ts">
	import { onMount } from 'svelte';
	import { navigateTo } from '$lib/utils';
	import { addToast } from '$lib/stores/appState';
	import { apiGet, apiDelete, apiPost } from '$lib/utils';
	import ResourceList from '$lib/components/ResourceList.svelte';
	import WebsiteDeleteModal from '$lib/components/modals/WebsiteDeleteModal.svelte';
	import WebsiteDetailsModal from '$lib/components/modals/WebsiteDetailsModal.svelte';
	import WebsiteAddModal from '$lib/components/modals/add/WebsiteAddModal.svelte';

	// Accept params prop to suppress SvelteKit warning
	export const params: Record<string, string> = {};

	let websites: Record<string, unknown>[] = [];
	let loading = true;
	let showDeleteModal = false;
	let deleteModalLoading = false;
	let websiteToDelete: Record<string, unknown> | null = null;
	let restartLoading = false;
	let showDetailsModal = false;
	let detailsModalLoading = false;
	let websiteForDetails: Record<string, unknown> | null = null;
	let showAddModal = false;
	let addModalLoading = false;

	// Reactive columns with inline actions
	$: columns = [
		{ key: 'domain', label: 'Domain', type: 'text' as const },
		{
			key: 'www_type',
			label: 'Type',
			type: 'badge' as const,
			inlineActions: [
				{
					action: 'restart',
					icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
					title: 'Restart Application',
					variant: 'secondary' as const,
					loading: restartLoading,
					condition: (item: Record<string, unknown>) => {
						const type = String(item.www_type || '').toLowerCase();
						return ['python', 'nodejs', 'ruby'].includes(type);
					}
				}
			]
		}
	];

	const actions = [
		{ label: 'Details', action: 'details', variant: 'secondary' as const },
		{ label: 'Delete', action: 'delete', variant: 'danger' as const, requiresConfirmation: true }
	];

	// Load websites on mount
	onMount(() => {
		loadWebsites();
	});

	async function loadWebsites() {
		loading = true;
		try {
			const data = await apiGet<Record<string, unknown>>('/www/list');
			websites = (data.websites as Record<string, unknown>[]) || [];
		} catch (error) {
			console.error('Error loading websites:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to load websites'
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
			case 'details':
				websiteForDetails = item;
				showDetailsModal = true;
				break;
			case 'restart':
				restartWebsite(item);
				break;
		}
	}

	function handleConfirmAction(
		event: CustomEvent<{ action: string; item: Record<string, unknown> }>
	) {
		const { action, item } = event.detail;

		if (action === 'delete') {
			websiteToDelete = item;
			showDeleteModal = true;
		}
	}

	async function deleteWebsite(website: Record<string, unknown>, purgeFiles: boolean = false) {
		deleteModalLoading = true;
		try {
			if (purgeFiles) {
				// Delete with file purge
				await apiDelete(`/www/del/${website.domain}`, { www_domain: website.domain, remove: true });
				addToast({
					type: 'success',
					message: `Website ${website.domain} and all files deleted successfully`
				});
			} else {
				// Regular delete (configuration only)
				await apiDelete(`/www/del/${website.domain}`, { www_domain: website.domain });
				addToast({
					type: 'success',
					message: `Website ${website.domain} configuration deleted successfully`
				});
			}
			loadWebsites();
			showDeleteModal = false;
			websiteToDelete = null;
		} catch (error) {
			console.error('Error deleting website:', error);
			addToast({
				type: 'error',
				message: 'Failed to delete website'
			});
		} finally {
			deleteModalLoading = false;
		}
	}

	function handleDeleteConfirm() {
		if (websiteToDelete) {
			deleteWebsite(websiteToDelete, false);
		}
	}

	function handleDeleteWithFilesConfirm() {
		if (websiteToDelete) {
			deleteWebsite(websiteToDelete, true);
		}
	}

	function handleDeleteCancel() {
		showDeleteModal = false;
		websiteToDelete = null;
	}

	function handleDetailsCancel() {
		showDetailsModal = false;
		websiteForDetails = null;
	}

	function handleAddCancel() {
		showAddModal = false;
	}

	async function handleAddSubmit(event: CustomEvent<Record<string, unknown>>) {
		addModalLoading = true;
		try {
			await apiPost('/www/add', event.detail);
			addToast({
				type: 'success',
				message: `Website ${event.detail.www_domain} added successfully`
			});
			loadWebsites();
			showAddModal = false;
		} catch (error) {
			console.error('Error adding website:', error);
			addToast({
				type: 'error',
				message: 'Failed to add website'
			});
		} finally {
			addModalLoading = false;
		}
	}

	async function restartWebsite(website: Record<string, unknown>) {
		restartLoading = true;
		try {
			await apiPost(`/www/restart/${website.domain}`);
			addToast({
				type: 'success',
				message: `Application ${website.domain} restarted successfully`
			});
		} catch (error) {
			console.error('Error restarting website:', error);
			addToast({
				type: 'error',
				message: 'Failed to restart application'
			});
		} finally {
			restartLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Websites - devil WEB</title>
</svelte:head>

<ResourceList
	title="Websites"
	items={websites}
	{loading}
	{columns}
	{actions}
	searchPlaceholder="Search websites..."
	addButtonLabel="Add Website"
	on:action={handleAction}
	on:confirmAction={handleConfirmAction}
>
	<div slot="header-actions">
		<button
			class="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium text-sm rounded-lg border border-transparent transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-dark-900 shadow-xs hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
			on:click={() => navigateTo('/www/stats')}
			disabled={loading}
			type="button"
		>
			<svg class="w-4 h-4 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
				></path>
			</svg>
			<span class="whitespace-nowrap">WWW Statistics</span>
		</button>
	</div>
</ResourceList>

<WebsiteDeleteModal
	showModal={showDeleteModal}
	website={websiteToDelete}
	loading={deleteModalLoading}
	on:delete={handleDeleteConfirm}
	on:deleteWithFiles={handleDeleteWithFilesConfirm}
	on:cancel={handleDeleteCancel}
/>

<WebsiteDetailsModal
	showModal={showDetailsModal}
	website={websiteForDetails}
	loading={detailsModalLoading}
	on:cancel={handleDetailsCancel}
/>

<WebsiteAddModal
	showModal={showAddModal}
	loading={addModalLoading}
	on:submit={handleAddSubmit}
	on:cancel={handleAddCancel}
/>
