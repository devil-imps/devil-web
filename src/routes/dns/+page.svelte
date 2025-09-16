<script lang="ts">
	import { onMount } from 'svelte';
	import { navigateTo } from '$lib/utils';
	import { addToast } from '$lib/stores/appState';
	import { apiGet, apiDelete, apiPost } from '$lib/utils';
	import ResourceList from '$lib/components/ResourceList.svelte';
	import ConfirmationModal from '$lib/components/modals/ConfirmationModal.svelte';
	import DnsAddModal from '$lib/components/modals/add/DnsAddModal.svelte';

	// Accept params prop to suppress SvelteKit warning
	export const params: Record<string, string> = {};

	type DnsZone = {
		domain: string;
	};
	let dnsZones: DnsZone[] = [];
	let loading: boolean = true;
	let showDeleteModal = false;
	let deleteModalLoading = false;
	let zoneToDelete: DnsZone | null = null;
	let showAddModal = false;
	let addModalLoading = false;

	import type { Column, Action } from '$lib/types/resourceList';
	const columns: Column[] = [{ key: 'domain', label: 'Domain', type: 'text' }];
	const actions: Action[] = [
		{ label: 'Records', action: 'records', variant: 'secondary' },
		{ label: 'Delete', action: 'delete', variant: 'danger', requiresConfirmation: true }
	];

	// Load DNS zones on mount
	onMount(() => {
		loadDnsZones();
	});

	async function loadDnsZones() {
		loading = true;
		try {
			const data = await apiGet<Record<string, unknown>>('/dns/list');
			const rawZones: string[] = ((data.domains as { domain: string }[]) || []).map(
				(d) => d.domain
			);
			dnsZones = rawZones.map((zone) => ({
				domain: zone
			}));
		} catch (error) {
			console.error('Error loading DNS zones:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to load DNS zones'
			});
		} finally {
			loading = false;
		}
	}

	function handleAction(event: CustomEvent<{ action: string; item: Record<string, unknown> }>) {
		const { action, item } = (event as CustomEvent<{ action: string; item: DnsZone }>).detail;

		switch (action) {
			case 'add':
				showAddModal = true;
				break;
			case 'records':
				navigateTo(`/dns/${item.domain}/records`);
				break;
		}
	}

	function handleConfirmAction(
		event: CustomEvent<{ action: string; item: Record<string, unknown> }>
	) {
		const { action, item } = (event as CustomEvent<{ action: string; item: DnsZone }>).detail;

		switch (action) {
			case 'delete':
				zoneToDelete = item;
				showDeleteModal = true;
				break;
		}
	}

	async function deleteDnsZone(zone: DnsZone) {
		deleteModalLoading = true;
		try {
			await apiDelete('/dns/del', { dns_domain: zone.domain });
			addToast({
				type: 'success',
				message: `DNS zone ${zone.domain} deleted successfully`
			});
			loadDnsZones();
			showDeleteModal = false;
			zoneToDelete = null;
		} catch (error) {
			console.error('Error deleting DNS zone:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to delete DNS zone'
			});
		} finally {
			deleteModalLoading = false;
		}
	}

	async function addDnsZone(zoneData: { dns_domain: string }) {
		addModalLoading = true;
		try {
			await apiPost('/dns/add/zone', zoneData);

			addToast({
				type: 'success',
				message: `DNS zone ${zoneData.dns_domain} added successfully`
			});
			loadDnsZones();
			showAddModal = false;
		} catch (error) {
			console.error('Error adding DNS zone:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to add DNS zone'
			});
		} finally {
			addModalLoading = false;
		}
	}

	function handleAddSubmit(event: CustomEvent) {
		const { detail: zoneData } = event;
		addDnsZone(zoneData);
	}

	function handleAddCancel() {
		showAddModal = false;
		addModalLoading = false;
	}

	function handleDeleteConfirm() {
		if (zoneToDelete) {
			deleteDnsZone(zoneToDelete);
		}
	}

	function handleDeleteCancel() {
		showDeleteModal = false;
		zoneToDelete = null;
		deleteModalLoading = false;
	}
</script>

<svelte:head>
	<title>DNS Zones - devil WEB</title>
</svelte:head>

<ResourceList
	title="DNS Zones"
	items={dnsZones}
	{loading}
	{columns}
	{actions}
	searchPlaceholder="Search DNS zones..."
	addButtonLabel="Add DNS Zone"
	on:action={handleAction}
	on:confirmAction={handleConfirmAction}
/>

<ConfirmationModal
	showModal={showDeleteModal}
	title="Delete DNS Zone"
	message={zoneToDelete
		? `Are you sure you want to delete DNS zone "${zoneToDelete.domain}"? This action cannot be undone and will remove all DNS records for this domain.`
		: ''}
	confirmText="Delete Zone"
	cancelText="Cancel"
	confirmVariant="danger"
	loading={deleteModalLoading}
	on:confirm={handleDeleteConfirm}
	on:cancel={handleDeleteCancel}
/>

<DnsAddModal
	showModal={showAddModal}
	loading={addModalLoading}
	on:submit={handleAddSubmit}
	on:cancel={handleAddCancel}
/>
