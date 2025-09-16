<script lang="ts">
	import { onMount } from 'svelte';
	import { navigateTo } from '$lib/utils';
	import { addToast } from '$lib/stores/appState';
	import { apiGet, apiPost, apiDelete } from '$lib/utils';
	import ResourceList from '$lib/components/ResourceList.svelte';
	import ConfirmationModal from '$lib/components/modals/ConfirmationModal.svelte';
	import WhitelistAddModal from '$lib/components/modals/add/WhitelistAddModal.svelte';

	// Accept params prop to suppress SvelteKit warning
	export const params: Record<string, string> = {};

	let whitelistDomains: Record<string, unknown>[] = [];
	let loading = true;
	let showDeleteModal = false;
	let deleteModalLoading = false;
	let domainToDelete: string | null = null;
	let showAddModal = false;
	let addModalLoading = false;

	const columns = [{ key: 'domain', label: 'Domain', type: 'text' as const }];

	const actions = [
		{ label: 'Delete', action: 'delete', variant: 'danger' as const, requiresConfirmation: true }
	];

	// Load whitelist domains on mount
	onMount(() => {
		loadWhitelistDomains();
	});

	async function loadWhitelistDomains() {
		loading = true;
		try {
			const data = await apiGet('/mail/whitelist/list');
			// The API returns domains as an array of objects with domain property
			const domains = (data as { domains?: { domain: string }[] }).domains || [];
			whitelistDomains = domains.map((domainObj: { domain: string }) => ({
				domain: domainObj.domain
			}));
		} catch (error) {
			console.error('Error loading whitelist domains:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to load whitelist domains'
			});
		} finally {
			loading = false;
		}
	}

	function handleAction(event: CustomEvent) {
		const { action, item } = event.detail;

		switch (action) {
			case 'add':
				showAddModal = true;
				break;
			case 'delete':
				domainToDelete = item.domain as string;
				showDeleteModal = true;
				break;
		}
	}

	function handleConfirmAction(event: CustomEvent) {
		const { action, item } = event.detail;

		switch (action) {
			case 'delete':
				domainToDelete = item.domain as string;
				showDeleteModal = true;
				break;
		}
	}

	async function confirmDelete() {
		if (!domainToDelete) return;

		deleteModalLoading = true;
		try {
			await apiDelete(`/mail/whitelist/${domainToDelete}`);
			addToast({
				type: 'success',
				message: `Domain ${domainToDelete} removed from whitelist`
			});
			await loadWhitelistDomains(); // Reload the list
		} catch (error) {
			console.error('Error deleting whitelist domain:', error);
			addToast({
				type: 'error',
				message: 'Failed to remove domain from whitelist'
			});
		} finally {
			deleteModalLoading = false;
			showDeleteModal = false;
			domainToDelete = null;
		}
	}

	function cancelDelete() {
		showDeleteModal = false;
		domainToDelete = null;
		deleteModalLoading = false;
	}

	async function handleAddSubmit(event: CustomEvent) {
		const { domain } = event.detail;

		addModalLoading = true;
		try {
			await apiPost('/mail/whitelist/add', { domain });
			addToast({
				type: 'success',
				message: `Domain ${domain} added to whitelist`
			});
			showAddModal = false;
			await loadWhitelistDomains(); // Reload the list
		} catch (error) {
			console.error('Error adding whitelist domain:', error);
			addToast({
				type: 'error',
				message: 'Failed to add domain to whitelist'
			});
		} finally {
			addModalLoading = false;
		}
	}

	function handleAddCancel() {
		showAddModal = false;
	}

	function goBack() {
		navigateTo('/mail');
	}
</script>

<svelte:head>
	<title>Mail Whitelist - devil WEB</title>
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
		Back to Email Domains
	</button>
</div>

<ResourceList
	title="Mail Whitelist"
	items={whitelistDomains}
	{loading}
	{columns}
	{actions}
	searchPlaceholder="Search whitelisted domains..."
	addButtonLabel="Add Domain"
	on:action={handleAction}
	on:confirmAction={handleConfirmAction}
/>

<ConfirmationModal
	bind:showModal={showDeleteModal}
	title="Remove Domain from Whitelist"
	message="Are you sure you want to remove this domain from the mail whitelist? This action cannot be undone."
	confirmText="Remove"
	loading={deleteModalLoading}
	on:confirm={confirmDelete}
	on:cancel={cancelDelete}
/>

<WhitelistAddModal
	bind:showModal={showAddModal}
	loading={addModalLoading}
	on:submit={handleAddSubmit}
	on:cancel={handleAddCancel}
/>
