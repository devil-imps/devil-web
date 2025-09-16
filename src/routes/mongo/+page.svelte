<script lang="ts">
	import { onMount } from 'svelte';
	import { navigateTo } from '$lib/utils';
	import { addToast } from '$lib/stores/appState';
	import { apiGet, apiDelete, apiPost, apiPut, formatBytes } from '$lib/utils';
	import ConfirmationModal from '$lib/components/modals/ConfirmationModal.svelte';
	import MongoAddModal from '$lib/components/modals/add/MongoAddModal.svelte';
	import UserPasswordModal from '$lib/components/modals/UserPasswordModal.svelte';
	import ResourceList from '$lib/components/ResourceList.svelte';

	// Accept params prop to suppress SvelteKit warning
	export const params: Record<string, string> = {};

	let databases: Record<string, unknown>[] = [];
	let loading = true;
	let showDeleteModal = false;
	let deleteModalLoading = false;
	let databaseToDelete: Record<string, unknown> | null = null;
	let showAddModal = false;
	let addModalLoading = false;
	let showPasswordModal = false;
	let passwordModalLoading = false;
	let databaseToChangePassword: Record<string, unknown> | null = null;

	$: deleteMessage = databaseToDelete
		? `Are you sure you want to delete database '${(databaseToDelete as Record<string, unknown>).name}'? This action cannot be undone.`
		: '';

	const columns = [
		{ key: 'name', label: 'Database Name', type: 'text' as const },
		{ key: 'size', label: 'Size', type: 'text' as const }
	];

	const actions = [
		{ label: 'Change Password', action: 'password', variant: 'secondary' as const },
		{ label: 'Delete', action: 'delete', variant: 'danger' as const, requiresConfirmation: true }
	];

	// Load databases on mount
	onMount(() => {
		loadDatabases();
	});

	async function loadDatabases() {
		loading = true;
		try {
			const data = await apiGet<Record<string, unknown>>('/mongo/list');

			// Handle MongoDB API response structure
			const databasesObj = (data.databases as Record<string, unknown>) || {};
			databases = Object.keys(databasesObj).map((key) => ({
				name: key,
				...(databasesObj[key] as Record<string, unknown>),
				size: formatBytes(((databasesObj[key] as Record<string, unknown>)?.size as number) || 0)
			}));
		} catch (error) {
			console.error('Error loading databases:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to load databases'
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
			case 'password':
				databaseToChangePassword = item;
				showPasswordModal = true;
				break;
			// Delete action is handled by ResourceList with requiresConfirmation
		}
	}

	function handleConfirmAction(event: CustomEvent) {
		const { action, item } = event.detail;

		switch (action) {
			case 'delete':
				databaseToDelete = item;
				showDeleteModal = true;
				break;
		}
	}

	async function deleteDatabase(database: unknown) {
		try {
			await apiDelete(`/mongo/db/${(database as Record<string, unknown>).name}`);

			addToast({
				type: 'success',
				message: `Database ${(database as Record<string, unknown>).name} deleted successfully`
			});
			loadDatabases();
		} catch (error) {
			console.error('Error deleting database:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to delete database'
			});
		}
	}

	async function createDatabase(databaseData: { database_name: string; password: string }) {
		addModalLoading = true;
		try {
			await apiPost('/mongo/db/add', databaseData);

			addToast({
				type: 'success',
				message: `Database ${databaseData.database_name} created successfully`
			});
			showAddModal = false;
			loadDatabases();
		} catch (error) {
			console.error('Error creating database:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to create database'
			});
		} finally {
			addModalLoading = false;
		}
	}

	async function changePassword(passwordData: { password: string }) {
		passwordModalLoading = true;
		try {
			await apiPut('/mongo/passwd', {
				...passwordData,
				user_name: databaseToChangePassword?.name
			});

			addToast({
				type: 'success',
				message: `Password changed for database ${databaseToChangePassword?.name}`
			});
			showPasswordModal = false;
			databaseToChangePassword = null;
		} catch (error) {
			console.error('Error changing password:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to change password'
			});
		} finally {
			passwordModalLoading = false;
		}
	}

	async function handleConfirmDelete() {
		if (!databaseToDelete) return;

		deleteModalLoading = true;
		try {
			await deleteDatabase(databaseToDelete);
		} finally {
			deleteModalLoading = false;
			showDeleteModal = false;
			databaseToDelete = null;
		}
	}

	function handleCancelDelete() {
		showDeleteModal = false;
		databaseToDelete = null;
	}

	function handleAddSubmit(event: CustomEvent) {
		const { detail: databaseData } = event;
		createDatabase(databaseData);
	}

	function handleAddCancel() {
		showAddModal = false;
		addModalLoading = false;
	}

	function handlePasswordSubmit(event: CustomEvent) {
		const { detail: passwordData } = event;
		changePassword(passwordData);
	}

	function handlePasswordCancel() {
		showPasswordModal = false;
		databaseToChangePassword = null;
		passwordModalLoading = false;
	}
</script>

<svelte:head>
	<title>MongoDB Databases - devil WEB</title>
</svelte:head>

<ResourceList
	title="MongoDB Databases"
	items={databases}
	{loading}
	{columns}
	{actions}
	searchPlaceholder="Search databases..."
	addButtonLabel="Add Database"
	on:action={handleAction}
	on:confirmAction={handleConfirmAction}
/>

<ConfirmationModal
	showModal={showDeleteModal}
	title="Delete MongoDB Database"
	message={deleteMessage}
	confirmText="Delete Database"
	cancelText="Cancel"
	confirmVariant="danger"
	loading={deleteModalLoading}
	on:confirm={handleConfirmDelete}
	on:cancel={handleCancelDelete}
/>

<MongoAddModal
	showModal={showAddModal}
	loading={addModalLoading}
	on:submit={handleAddSubmit}
	on:cancel={handleAddCancel}
/>

<UserPasswordModal
	showModal={showPasswordModal}
	loading={passwordModalLoading}
	username={databaseToChangePassword?.name}
	title="Change MongoDB Database Password"
	description="Changing password for database"
	entityName={String(databaseToChangePassword?.name || '')}
	on:submit={handlePasswordSubmit}
	on:cancel={handlePasswordCancel}
/>
