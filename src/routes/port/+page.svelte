<script lang="ts">
	import { onMount } from 'svelte';
	import { navigateTo } from '$lib/utils';
	import { addToast } from '$lib/stores/appState';
	import { apiGet, apiDelete, apiPost } from '$lib/utils';
	import ResourceList from '$lib/components/ResourceList.svelte';
	import ConfirmationModal from '$lib/components/modals/ConfirmationModal.svelte';
	import PortAddModal from '$lib/components/modals/add/PortAddModal.svelte';

	// Accept params prop to suppress SvelteKit warning
	export const params: Record<string, string> = {};

	let ports: Record<string, unknown>[] = [];
	let loading = true;
	let showDeleteModal = false;
	let deleteModalLoading = false;
	let portToDelete: Record<string, unknown> | null = null;
	let showAddModal = false;
	let addModalLoading = false;

	const columns = [
		{ key: 'port', label: 'Port', type: 'text' as const },
		{ key: 'port_type', label: 'Type', type: 'badge' as const },
		{ key: 'descr', label: 'Description', type: 'text' as const }
	];

	const actions = [
		{ label: 'Delete', action: 'delete', variant: 'danger' as const, requiresConfirmation: true }
	];

	// Load ports on mount
	onMount(() => {
		loadPorts();
	});

	async function loadPorts() {
		loading = true;
		try {
			const data = (await apiGet('/port/list')) as Record<string, unknown>;
			ports = (data.ports as Record<string, unknown>[]) || [];

			// Transform data for display
			ports = ports.map((port: Record<string, unknown>) => ({
				...port,
				port_type: (port.port_type as string).toUpperCase()
			}));
		} catch (error) {
			console.error('Error loading ports:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to load ports'
			});
		} finally {
			loading = false;
		}
	}

	function handleAction(event: CustomEvent) {
		const { action } = event.detail;

		switch (action) {
			case 'add':
				showAddModal = true;
				break;
		}
	}

	function handleConfirmAction(event: CustomEvent) {
		const { action, item } = event.detail;

		switch (action) {
			case 'delete':
				portToDelete = item;
				showDeleteModal = true;
				break;
		}
	}

	async function deletePort(port: Record<string, unknown>) {
		deleteModalLoading = true;
		try {
			// Use the correct DELETE endpoint with path parameters
			await apiDelete(`/port/${(port.port_type as string).toLowerCase()}/${port.port}`);

			addToast({
				type: 'success',
				message: `Port ${port.port}/${port.port_type} deleted successfully`
			});
			loadPorts();
			showDeleteModal = false;
			portToDelete = null;
		} catch (error) {
			console.error('Error deleting port:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to delete port'
			});
		} finally {
			deleteModalLoading = false;
		}
	}

	async function addPort(portData: Record<string, unknown>) {
		addModalLoading = true;
		try {
			await apiPost('/port/add', portData);

			const portDisplay = portData.random
				? `random ${(portData.type as string).toUpperCase()}`
				: `${portData.port}/${(portData.type as string).toUpperCase()}`;

			addToast({
				type: 'success',
				message: `Port ${portDisplay} added successfully`
			});
			loadPorts();
			handleAddSuccess();
		} catch (error) {
			console.error('Error adding port:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to add port'
			});
		} finally {
			addModalLoading = false;
		}
	}

	function handleAddSubmit(event: CustomEvent) {
		const { detail: portData } = event;
		addPort(portData);
	}

	function handleAddCancel() {
		showAddModal = false;
		addModalLoading = false;
	}

	function handleAddSuccess() {
		showAddModal = false;
		addModalLoading = false;
		// The modal will reset its form when showModal becomes false
	}

	function handleDeleteConfirm() {
		if (portToDelete) {
			deletePort(portToDelete);
		}
	}

	function handleDeleteCancel() {
		showDeleteModal = false;
		portToDelete = null;
		deleteModalLoading = false;
	}
</script>

<svelte:head>
	<title>Port reservation - devil WEB</title>
</svelte:head>

<ResourceList
	title="Port reservation"
	items={ports}
	{loading}
	{columns}
	{actions}
	searchPlaceholder="Search ports..."
	addButtonLabel="Add Port"
	on:action={handleAction}
	on:confirmAction={handleConfirmAction}
/>

<ConfirmationModal
	showModal={showDeleteModal}
	title="Delete Port"
	message={portToDelete
		? `Are you sure you want to delete port ${portToDelete.port}/${portToDelete.port_type}? This action cannot be undone.`
		: ''}
	confirmText="Delete Port"
	cancelText="Cancel"
	confirmVariant="danger"
	loading={deleteModalLoading}
	on:confirm={handleDeleteConfirm}
	on:cancel={handleDeleteCancel}
/>

<PortAddModal
	showModal={showAddModal}
	loading={addModalLoading}
	on:submit={handleAddSubmit}
	on:cancel={handleAddCancel}
/>
