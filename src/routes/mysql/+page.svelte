<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { navigateTo } from '$lib/utils';
	import { addToast } from '$lib/stores/appState';
	import { apiGet, apiDelete, apiPost, apiPut, formatBytes } from '$lib/utils';
	import ResourceList from '$lib/components/ResourceList.svelte';
	import ConfirmationModal from '$lib/components/modals/ConfirmationModal.svelte';
	import MySQLDatabaseAddModal from '$lib/components/modals/add/MySQLDatabaseAddModal.svelte';

	// Accept params prop to suppress SvelteKit warning
	export const params: Record<string, string> = {};

	let databases: Record<string, unknown>[] = [];
	let loading = true;
	let showDeleteModal = false;
	let deleteModalLoading = false;
	let databaseToDelete: Record<string, unknown> | null = null;
	let showAddModal = false;
	let addModalLoading = false;
	let mysqlSpecialUser = '';

	const columns = [
		{ key: 'Db', label: 'Database Name', type: 'text' as const },
		{ key: 'Size', label: 'Size', type: 'text' as const }
	];

	const actions = [
		{ label: 'Manage', action: 'manage', variant: 'secondary' as const },
		{ label: 'Delete', action: 'delete', variant: 'danger' as const, requiresConfirmation: true }
	];

	// Load databases on mount
	onMount(() => {
		loadDatabases();
	});

	async function loadDatabases() {
		loading = true;
		try {
			const data = await apiGet<Record<string, unknown>>('/mysql/list');
			let allDatabases = (data.databases as Record<string, unknown>[]) || [];

			// Store the special user prefix
			mysqlSpecialUser = String(data.mysql_special_user || '');

			// Filter to show only unique databases based on Db field and transform data
			const uniqueDatabases = new SvelteMap<string, Record<string, unknown>>();
			allDatabases.forEach((db: Record<string, unknown>) => {
				const dbName = db.Db as string;
				if (dbName && !uniqueDatabases.has(dbName)) {
					// Transform data during filtering for better performance
					uniqueDatabases.set(dbName, {
						...db,
						Size: formatBytes((db.Size as number) || 0)
					});
				}
			});
			databases = Array.from(uniqueDatabases.values());
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
			case 'manage':
				navigateTo(`/mysql/manage/${item.Db}`);
				break;
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

	async function addDatabase(databaseData: {
		database_name: string;
		collate?: string;
		user?: { user_name: string; password?: string; host_name?: string | null };
	}) {
		addModalLoading = true;
		try {
			// Create the database
			await apiPost('/mysql/db/add', {
				database_name: databaseData.database_name,
				collate: databaseData.collate
			});

			// Create user if specified
			if (databaseData.user) {
				if (databaseData.user.password) {
					// Create new user
					await apiPost('/mysql/user/add', {
						user_name: databaseData.user.user_name,
						password: databaseData.user.password
					});
				}

				// Grant all privileges to the user for the new database
				await apiPut('/mysql/privileges', {
					user_name: databaseData.user.user_name,
					host_name: databaseData.user.host_name || null,
					database_name: databaseData.database_name,
					mysql_privileges: ['+ALL']
				});
			}

			addToast({
				type: 'success',
				message: `MySQL database ${databaseData.database_name} created successfully${databaseData.user ? ` with user ${databaseData.user.user_name}` : ''}`
			});

			showAddModal = false;
			loadDatabases();
		} catch (error) {
			console.error('Error creating database:', error);
			addToast({
				type: 'error',
				message: 'Failed to create database'
			});
		} finally {
			addModalLoading = false;
		}
	}

	async function deleteDatabase(database: Record<string, unknown>) {
		deleteModalLoading = true;
		try {
			await apiDelete(`/mysql/db/${database.Db}`);
			addToast({
				type: 'success',
				message: `Database ${database.Db} deleted successfully`
			});
			loadDatabases();
			showDeleteModal = false;
			databaseToDelete = null;
		} catch (error) {
			console.error('Error deleting database:', error);
			addToast({
				type: 'error',
				message: 'Failed to delete database'
			});
		} finally {
			deleteModalLoading = false;
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

	function handleAddSubmit(event: CustomEvent) {
		const { detail: databaseData } = event;
		addDatabase(databaseData);
	}

	function handleAddCancel() {
		showAddModal = false;
		addModalLoading = false;
	}

	function navigateToUsers() {
		navigateTo('/mysql/users');
	}
</script>

<svelte:head>
	<title>MySQL Databases - devil WEB</title>
</svelte:head>

<div class="space-y-6">
	<ResourceList
		title="MySQL Databases"
		items={databases}
		{loading}
		{columns}
		{actions}
		searchPlaceholder="Search databases..."
		addButtonLabel="Add Database"
		showAddButton={true}
		on:action={handleAction}
		on:confirmAction={handleConfirmAction}
	>
		<div slot="header-actions" class="flex items-center gap-3">
			<button
				class="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium text-sm rounded-lg border border-transparent transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-dark-900 shadow-xs hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
				on:click={navigateToUsers}
				disabled={loading}
				type="button"
			>
				<svg class="w-4 h-4 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
					></path>
				</svg>
				<span class="whitespace-nowrap">View Users</span>
			</button>
		</div>
	</ResourceList>
</div>

<ConfirmationModal
	showModal={showDeleteModal}
	title="Delete Database"
	message={databaseToDelete
		? `Are you sure you want to delete the database "${databaseToDelete.Db}"? This action cannot be undone and will permanently remove all data in the database.`
		: ''}
	confirmText="Delete Database"
	cancelText="Cancel"
	confirmVariant="danger"
	loading={deleteModalLoading}
	on:confirm={handleDeleteConfirm}
	on:cancel={handleDeleteCancel}
/>

<MySQLDatabaseAddModal
	showModal={showAddModal}
	loading={addModalLoading}
	{mysqlSpecialUser}
	on:submit={handleAddSubmit}
	on:cancel={handleAddCancel}
/>
