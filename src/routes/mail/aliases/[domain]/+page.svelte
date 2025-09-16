<script lang="ts">
	import { onMount } from 'svelte';
	import { navigateTo } from '$lib/utils';
	import { page } from '$app/stores';
	import { addToast } from '$lib/stores/appState';
	import { apiGet, apiDelete, apiPost } from '$lib/utils';
	import ResourceList from '$lib/components/ResourceList.svelte';
	import MailAliasAddModal from '$lib/components/modals/add/MailAliasAddModal.svelte';
	import ConfirmationModal from '$lib/components/modals/ConfirmationModal.svelte';

	// Get domain from URL params
	$: domain = $page.params.domain;

	let aliases: Record<string, unknown>[] = [];
	let loading = true;

	// Modal states
	let showAliasModal = false;
	let aliasModalLoading = false;
	let showDeleteModal = false;
	let deleteModalLoading = false;
	let aliasToDelete: Record<string, unknown> | null = null;

	const columns = [
		{ key: 'address_alias', label: 'From', type: 'text' as const },
		{ key: 'address_goto', label: 'To', type: 'text' as const }
	];

	const actions = [
		{ label: 'Delete', action: 'delete', variant: 'danger' as const, requiresConfirmation: true }
	];

	// Load aliases on mount
	onMount(() => {
		if (!domain) {
			navigateTo('/mail');
			return;
		}
		loadAliases();
	});

	async function loadAliases() {
		if (!domain) return;

		loading = true;
		try {
			const response = (await apiGet(
				`/mail/list?email_domain=${encodeURIComponent(domain)}`
			)) as Record<string, unknown>;
			aliases = (response.aliases || []) as Record<string, unknown>[];
		} catch (error) {
			console.error('Error loading aliases:', error);
			addToast({
				type: 'error',
				message: 'Failed to load aliases'
			});
		} finally {
			loading = false;
		}
	}

	function handleAction(event: CustomEvent) {
		const { action } = event.detail;

		switch (action) {
			case 'add':
				handleAddAlias();
				break;
		}
	}

	function handleConfirmAction(event: CustomEvent) {
		const { action, item } = event.detail;

		switch (action) {
			case 'delete':
				aliasToDelete = item;
				showDeleteModal = true;
				break;
		}
	}

	async function handleDeleteConfirm() {
		if (!aliasToDelete) return;

		deleteModalLoading = true;
		try {
			// Use the correct API endpoint: DELETE /mail/alias/{email_from}
			const encodedEmailFrom = encodeURIComponent(String(aliasToDelete.address_alias));
			await apiDelete(`/mail/alias/${encodedEmailFrom}`);

			addToast({
				type: 'success',
				message: 'Alias deleted successfully'
			});

			showDeleteModal = false;
			aliasToDelete = null;

			// Refresh the aliases list
			loadAliases();
		} catch (error) {
			console.error('Error deleting alias:', error);
			addToast({
				type: 'error',
				message: 'Failed to delete alias'
			});
		} finally {
			deleteModalLoading = false;
		}
	}

	function handleDeleteCancel() {
		showDeleteModal = false;
		aliasToDelete = null;
	}

	function handleAddAlias() {
		showAliasModal = true;
	}

	async function handleAliasSubmit(event: CustomEvent) {
		const { email_from, email_to } = event.detail;
		aliasModalLoading = true;

		try {
			// Check if this is a catch-all alias (starts with @)
			const isCatchAll = email_from.startsWith('@');

			await apiPost('/mail/alias/add', {
				email_from,
				email_to
			});

			if (isCatchAll) {
				const domainName = email_from.substring(1); // Remove the @ prefix
				addToast({
					type: 'success',
					message: `Catch-all alias for ${domainName} → ${email_to} created successfully`
				});
			} else {
				addToast({
					type: 'success',
					message: `Alias ${email_from} → ${email_to} created successfully`
				});
			}

			showAliasModal = false;

			// Refresh the aliases list
			loadAliases();
		} catch (error) {
			console.error('Error creating alias:', error);
			addToast({
				type: 'error',
				message: 'Failed to create alias'
			});
		} finally {
			aliasModalLoading = false;
		}
	}

	function handleBack() {
		navigateTo('/mail');
	}
</script>

<svelte:head>
	<title>Aliases for {domain} - devil WEB</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<button
				on:click={handleBack}
				class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200"
			>
				<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"
					></path>
				</svg>
				Back to Domains
			</button>
		</div>
	</div>

	<ResourceList
		title="Aliases for {domain}"
		items={aliases}
		{loading}
		{columns}
		{actions}
		searchPlaceholder="Search aliases..."
		showAddButton={false}
		on:action={handleAction}
		on:confirmAction={handleConfirmAction}
	>
		<div slot="header-actions" class="flex items-center gap-3">
			<button
				class="inline-flex items-center px-4 py-2 bg-devil-600 hover:bg-devil-700 disabled:bg-devil-400 text-white font-medium text-sm rounded-lg border border-transparent transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-devil-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-dark-900 shadow-xs hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
				on:click={handleAddAlias}
				disabled={loading}
				type="button"
			>
				<svg class="w-4 h-4 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 6v6m0 0v6m0-6h6m-6 0H6"
					></path>
				</svg>
				<span class="whitespace-nowrap">Add Alias</span>
			</button>
		</div>
	</ResourceList>
</div>

<!-- Email Alias Add Modal -->
<MailAliasAddModal
	showModal={showAliasModal}
	loading={aliasModalLoading}
	on:cancel={() => (showAliasModal = false)}
	on:submit={handleAliasSubmit}
/>

<!-- Delete Confirmation Modal -->
<ConfirmationModal
	showModal={showDeleteModal}
	title="Delete Email Alias"
	message={aliasToDelete
		? `Are you sure you want to delete the alias "${aliasToDelete.address_alias}" → "${aliasToDelete.address_goto}"? This action cannot be undone.`
		: ''}
	confirmText="Delete Alias"
	cancelText="Cancel"
	confirmVariant="danger"
	loading={deleteModalLoading}
	on:confirm={handleDeleteConfirm}
	on:cancel={handleDeleteCancel}
/>
