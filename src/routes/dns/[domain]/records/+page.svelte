<script lang="ts">
	import { onMount } from 'svelte';
	import { navigateTo } from '$lib/utils';
	import { page } from '$app/stores';
	import { addToast } from '$lib/stores/appState';
	import { apiGet, apiDelete, apiPost } from '$lib/utils';
	import ResourceList from '$lib/components/ResourceList.svelte';
	import ConfirmationModal from '$lib/components/modals/ConfirmationModal.svelte';
	import DnsRecordAddModal from '$lib/components/modals/add/DnsRecordAddModal.svelte';

	// Get domain from URL params
	$: domain = $page.params.domain;

	type DnsRecord = {
		id: number;
		domain: number;
		record: string;
		dns_type: string;
		content: string;
		ttl: number;
		prio: number | null;
		weight: number | null;
	};

	let dnsRecords: DnsRecord[] = [];
	let loading: boolean = true;

	// Define columns for DNS records
	const columns = [
		{ key: 'record', label: 'Record', type: 'text' as const },
		{ key: 'dns_type', label: 'Type', type: 'text' as const },
		{ key: 'prio', label: 'Priority', type: 'text' as const },
		{ key: 'weight', label: 'Weight', type: 'text' as const },
		{ key: 'ttl', label: 'TTL', type: 'text' as const },
		{ key: 'content', label: 'Content', type: 'text' as const }
	];

	// Define actions for DNS records
	const actions = [
		{ label: 'Delete', action: 'delete', variant: 'danger' as const, requiresConfirmation: true }
	];

	// Modal state variables
	let showDeleteModal = false;
	let deleteModalLoading = false;
	let recordToDelete: DnsRecord | null = null;
	let showAddModal = false;
	let addModalLoading = false;
	let addModalComponent: { resetForm: () => void } | null = null; // Reference to the modal component

	// Load DNS records on mount
	onMount(() => {
		if (!domain) {
			navigateTo('/dns');
			return;
		}
		loadDnsRecords();
	});

	async function loadDnsRecords() {
		if (!domain) return;

		loading = true;
		try {
			const response = await apiGet<Record<string, unknown>>(
				`/dns/list?dns_domain=${encodeURIComponent(domain)}`
			);
			const records = (response.records as Record<string, unknown>[]) || [];

			// Transform records for display
			dnsRecords = records.map((record: Record<string, unknown>) => ({
				id: record.id as number,
				domain: record.domain as number,
				record: record.record as string,
				dns_type: record.dns_type as string,
				content: record.content as string,
				ttl: record.ttl as number,
				prio: record.prio as number | null,
				weight: record.weight as number | null
			}));
		} catch (error) {
			console.error('Error loading DNS records:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to load DNS records'
			});
		} finally {
			loading = false;
		}
	}

	function handleBack() {
		navigateTo('/dns');
	}

	function handleAction(_event: CustomEvent<{ action: string; item: Record<string, unknown> }>) {
		// Handle actions that don't require confirmation
		const { action } = _event.detail;

		switch (action) {
			case 'add':
				showAddModal = true;
				break;
		}
	}

	function handleConfirmAction(
		event: CustomEvent<{ action: string; item: Record<string, unknown> }>
	) {
		const { action, item } = event.detail;

		switch (action) {
			case 'delete':
				recordToDelete = item as DnsRecord;
				showDeleteModal = true;
				break;
		}
	}

	async function deleteDnsRecord(record: DnsRecord) {
		deleteModalLoading = true;
		try {
			await apiDelete('/dns/del', {
				dns_domain: domain,
				dns_record_id: record.id
			});

			addToast({
				type: 'success',
				message: `DNS record "${record.record}" (${record.dns_type}) deleted successfully`
			});

			// Refresh the records list
			loadDnsRecords();
			showDeleteModal = false;
			recordToDelete = null;
		} catch (error) {
			console.error('Error deleting DNS record:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to delete DNS record'
			});
		} finally {
			deleteModalLoading = false;
		}
	}

	function handleDeleteConfirm() {
		if (recordToDelete) {
			deleteDnsRecord(recordToDelete);
		}
	}

	function handleDeleteCancel() {
		showDeleteModal = false;
		recordToDelete = null;
		deleteModalLoading = false;
	}

	async function addDnsRecord(recordData: {
		dns_domain: string;
		dns_type: string;
		content: string;
		ttl: number;
		prio?: number;
		weight?: number;
		caaTag?: string;
	}) {
		addModalLoading = true;
		try {
			// Ensure all required fields are present and non-empty
			if (!recordData.dns_domain || !recordData.dns_type || !recordData.content) {
				throw new Error('Missing required fields');
			}

			// Map the form data to the new API payload structure
			const apiPayload: {
				dns_domain: string;
				dns_record: string;
				dns_record_type: string;
				dns_target: string;
				ttl: number;
				caa_tag?: string;
				dns_prio?: number;
				dns_weight?: number;
			} = {
				dns_domain: domain as string, // Use the domain from URL params
				dns_record: recordData.dns_domain as string,
				dns_record_type: recordData.dns_type as string,
				dns_target: recordData.content as string,
				ttl: recordData.ttl
			};

			// Only include optional fields for specific record types
			if (recordData.dns_type === 'CAA' && recordData.caaTag) {
				apiPayload.caa_tag = recordData.caaTag;
			}

			if (
				(recordData.dns_type === 'MX' || recordData.dns_type === 'SRV') &&
				recordData.prio !== undefined &&
				recordData.prio !== null
			) {
				apiPayload.dns_prio = recordData.prio;
			}

			if (
				recordData.dns_type === 'SRV' &&
				recordData.weight !== undefined &&
				recordData.weight !== null
			) {
				apiPayload.dns_weight = recordData.weight;
			}

			await apiPost('/dns/add/record', apiPayload);

			addToast({
				type: 'success',
				message: `DNS record "${recordData.dns_domain}" (${recordData.dns_type}) added successfully`
			});

			// Reset the modal form after successful submission
			if (addModalComponent && typeof addModalComponent.resetForm === 'function') {
				addModalComponent.resetForm();
			}

			// Refresh the records list
			loadDnsRecords();
			showAddModal = false;
		} catch (error) {
			console.error('Error adding DNS record:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to add DNS record'
			});
		} finally {
			addModalLoading = false;
		}
	}

	function handleAddSubmit(event: CustomEvent) {
		const { detail: recordData } = event;
		addDnsRecord(recordData);
	}

	function handleAddCancel() {
		showAddModal = false;
		addModalLoading = false;
	}
</script>

<svelte:head>
	<title>DNS Records for {domain} - devil WEB</title>
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
				Back to DNS Zones
			</button>
		</div>
	</div>

	<ResourceList
		title="DNS Records for {domain}"
		items={dnsRecords}
		{loading}
		{columns}
		{actions}
		searchPlaceholder="Search DNS records..."
		showAddButton={true}
		addButtonLabel="Add DNS Record"
		on:action={handleAction}
		on:confirmAction={handleConfirmAction}
	/>
</div>

<ConfirmationModal
	showModal={showDeleteModal}
	title="Delete DNS Record"
	message={recordToDelete
		? `Are you sure you want to delete the DNS record "${recordToDelete.record}" (${recordToDelete.dns_type}) pointing to "${recordToDelete.content}"? This action cannot be undone.`
		: ''}
	confirmText="Delete Record"
	cancelText="Cancel"
	confirmVariant="danger"
	loading={deleteModalLoading}
	on:confirm={handleDeleteConfirm}
	on:cancel={handleDeleteCancel}
/>

<DnsRecordAddModal
	bind:this={addModalComponent}
	showModal={showAddModal}
	loading={addModalLoading}
	on:submit={handleAddSubmit}
	on:cancel={handleAddCancel}
/>
