<script lang="ts">
	import { onMount } from 'svelte';
	import { navigateTo } from '$lib/utils';
	import { addToast } from '$lib/stores/appState';
	import { apiGet, apiDelete, apiPut, apiPost, formatBytes } from '$lib/utils';
	import ResourceList from '$lib/components/ResourceList.svelte';
	import ConfirmationModal from '$lib/components/modals/ConfirmationModal.svelte';
	import UserPasswordModal from '$lib/components/modals/UserPasswordModal.svelte';
	import PgsqlAddModal from '$lib/components/modals/add/PgsqlAddModal.svelte';
	import PgsqlExtensionsModal from '$lib/components/modals/PgsqlExtensionsModal.svelte';

	// Accept params prop to suppress SvelteKit warning
	export const params: Record<string, string> = {};

	let databases: Record<string, unknown>[] = [];
	let availableExtensions: string[] = [];
	let loading = true;
	let showPasswordModal = false;
	let passwordModalLoading = false;
	let databaseToChangePassword: Record<string, unknown> | null = null;
	let showAddModal = false;
	let addModalLoading = false;
	let showExtensionsModal = false;
	let extensionsModalLoading = false;
	let databaseForExtensions: Record<string, unknown> | null = null;
	let showDeleteModal = false;
	let deleteModalLoading = false;
	let databaseToDelete: Record<string, unknown> | null = null;

	const columns = [
		{ key: 'name', label: 'Database Name', type: 'text' as const },
		{ key: 'size', label: 'Size', type: 'text' as const }
	];

	const actions = [
		{ label: 'Change Password', action: 'password', variant: 'secondary' as const },
		{ label: 'Extensions', action: 'extensions', variant: 'secondary' as const },
		{ label: 'Delete', action: 'delete', variant: 'danger' as const, requiresConfirmation: true }
	];

	// Load databases on mount
	onMount(() => {
		loadDatabases();
	});

	async function loadDatabases() {
		loading = true;
		try {
			const data = await apiGet<Record<string, unknown>>('/pgsql/list');

			// Handle PostgreSQL API response structure
			const databasesObj = (data.databases as Record<string, unknown>) || {};
			databases = Object.keys(databasesObj).map((key) => ({
				name: key,
				size: formatBytes(((databasesObj[key] as Record<string, unknown>)?.size as number) || 0),
				extensions: (databasesObj[key] as Record<string, unknown>) || {}
			}));

			// Store available extensions (sorted alphabetically)
			availableExtensions = ((data.extensions as string[]) || []).sort();
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
			case 'extensions':
				manageExtensions(item);
				break;
			case 'delete':
				// Delete confirmation is now handled by handleConfirmAction
				break;
		}
	}

	function handleConfirmAction(event: CustomEvent) {
		const { action, item } = event.detail;
		if (action === 'delete') {
			databaseToDelete = item;
			showDeleteModal = true;
		}
	}

	async function manageExtensions(database: unknown) {
		databaseForExtensions = database as Record<string, unknown>;
		showExtensionsModal = true;
	}

	async function deleteDatabase(database: unknown) {
		deleteModalLoading = true;
		try {
			await apiDelete(`/pgsql/db/${(database as Record<string, unknown>).name}`);

			addToast({
				type: 'success',
				message: `Database ${(database as Record<string, unknown>).name} deleted successfully`
			});
			loadDatabases();
			showDeleteModal = false;
			databaseToDelete = null;
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
		} finally {
			deleteModalLoading = false;
		}
	}

	async function createDatabase(databaseData: {
		database_name: string;
		password: string;
		collate?: string;
	}) {
		addModalLoading = true;
		try {
			await apiPost('/pgsql/db/add', databaseData);

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
			await apiPut('/pgsql/passwd', {
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

	function handlePasswordSubmit(event: CustomEvent) {
		const { detail: passwordData } = event;
		changePassword(passwordData);
	}

	function handlePasswordCancel() {
		showPasswordModal = false;
		databaseToChangePassword = null;
		passwordModalLoading = false;
	}

	function handleAddSubmit(event: CustomEvent) {
		const { detail: databaseData } = event;
		createDatabase(databaseData);
	}

	function handleAddCancel() {
		showAddModal = false;
		addModalLoading = false;
	}

	function handleExtensionsCancel() {
		showExtensionsModal = false;
		databaseForExtensions = null;
		extensionsModalLoading = false;
	}

	async function handleExtensionInstalled(_event: CustomEvent) {
		// Store the current database name before closing
		const currentDatabaseName = databaseForExtensions?.name;

		// Close the extensions modal
		showExtensionsModal = false;
		databaseForExtensions = null;
		extensionsModalLoading = false;

		// Refresh the database list to show updated extension status
		await loadDatabases();

		// Reopen the modal for the same database to show updated extensions
		if (currentDatabaseName) {
			const updatedDatabase = databases.find((db) => db.name === currentDatabaseName);
			if (updatedDatabase) {
				databaseForExtensions = updatedDatabase;
				showExtensionsModal = true;
			}
		}
	}

	function handleDeleteConfirm() {
		if (databaseToDelete) {
			deleteDatabase(databaseToDelete);
		}
	}

	function handleDeleteCancel() {
		showDeleteModal = false;
		databaseToDelete = null;
		deleteModalLoading = false;
	}
</script>

<svelte:head>
	<title>PostgreSQL Databases - devil WEB</title>
</svelte:head>

<ResourceList
	title="PostgreSQL Databases"
	items={databases}
	{loading}
	{columns}
	{actions}
	searchPlaceholder="Search databases..."
	addButtonLabel="Add Database"
	on:action={handleAction}
	on:confirmAction={handleConfirmAction}
/>

<UserPasswordModal
	showModal={showPasswordModal}
	loading={passwordModalLoading}
	username={databaseToChangePassword?.name}
	title="Change PostgreSQL Database Password"
	description="Changing password for database"
	on:submit={handlePasswordSubmit}
	on:cancel={handlePasswordCancel}
/>

<PgsqlAddModal
	showModal={showAddModal}
	loading={addModalLoading}
	on:submit={handleAddSubmit}
	on:cancel={handleAddCancel}
/>

<PgsqlExtensionsModal
	showModal={showExtensionsModal}
	loading={extensionsModalLoading}
	database={databaseForExtensions}
	{availableExtensions}
	on:cancel={handleExtensionsCancel}
	on:extensionInstalled={handleExtensionInstalled}
/>

<ConfirmationModal
	showModal={showDeleteModal}
	title="Delete PostgreSQL Database"
	message={databaseToDelete
		? `Are you sure you want to delete database "${databaseToDelete.name}"? This action cannot be undone and will permanently delete all data in the database.`
		: ''}
	confirmText="Delete Database"
	cancelText="Cancel"
	confirmVariant="danger"
	loading={deleteModalLoading}
	on:confirm={handleDeleteConfirm}
	on:cancel={handleDeleteCancel}
/>
