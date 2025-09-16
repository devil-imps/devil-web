<script lang="ts">
	import { onMount } from 'svelte';
	import { navigateTo } from '$lib/utils';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { addToast } from '$lib/stores/appState';
	import { apiGet, apiPut } from '$lib/utils';
	import ResourceList from '$lib/components/ResourceList.svelte';
	import ConfirmationModal from '$lib/components/modals/ConfirmationModal.svelte';
	import AddPrivilegesModal from '$lib/components/modals/add/PrivilegesAddModal.svelte';
	import ManagePrivilegesModal from '$lib/components/modals/ManagePrivilegesModal.svelte';

	// Accept params prop to suppress SvelteKit warning
	export const params: Record<string, string> = {};

	let databaseUsers: Record<string, unknown>[] = [];
	let loading = true;
	let databaseName = '';
	let showRemoveModal = false;
	let removeModalLoading = false;
	let userToRemove: Record<string, unknown> | null = null;
	let showAddModal = false;
	let allUsers: Record<string, unknown>[] = [];
	let showManagePrivilegesModal = false;
	let managePrivilegesLoading = false;
	let userToManage: Record<string, unknown> | null = null;

	// Get database name from URL params
	$: databaseName = $page.params.database || '';

	// Privilege categories for reference
	const privilegeCategories = {
		data: {
			privileges: [{ key: 'SELECT' }, { key: 'INSERT' }, { key: 'UPDATE' }, { key: 'DELETE' }]
		},
		structure: {
			privileges: [
				{ key: 'CREATE' },
				{ key: 'ALTER' },
				{ key: 'INDEX' },
				{ key: 'DROP' },
				{ key: 'CREATE_TEMPORARY_TABLES' },
				{ key: 'SHOW_VIEW' },
				{ key: 'CREATE_ROUTINE' },
				{ key: 'ALTER_ROUTINE' },
				{ key: 'EXECUTE' },
				{ key: 'CREATE_VIEW' },
				{ key: 'EVENT' },
				{ key: 'TRIGGER' }
			]
		},
		administration: {
			privileges: [{ key: 'LOCK_TABLES' }, { key: 'REFERENCES' }]
		}
	};

	const columns = [
		{ key: 'User', label: 'Username', type: 'text' as const },
		{ key: 'Host', label: 'Host', type: 'text' as const }
	];

	// Function to get actions for a specific user
	function getUserActions(user: Record<string, unknown>) {
		const username = String(user.User || '');
		const hasUnderscore = username.includes('_');

		return [
			{
				label: 'Manage Privileges',
				action: 'manage_privileges',
				variant: 'secondary' as const,
				requiresConfirmation: false,
				disabled: !hasUnderscore
			},
			{
				label: 'Remove Access',
				action: 'remove',
				variant: 'danger' as const,
				requiresConfirmation: true,
				disabled: !hasUnderscore
			}
		];
	}

	// Load database users on mount
	onMount(() => {
		if (databaseName) {
			loadDatabaseUsers();
		}
	});

	async function loadDatabaseUsers() {
		loading = true;
		try {
			const data = await apiGet<Record<string, unknown>>('/mysql/list');
			let allDatabases = (data.databases as Record<string, unknown>[]) || [];
			allUsers = (data.users as Record<string, unknown>[]) || [];

			// Filter databases for the specific database name
			let dbUsers = allDatabases.filter((db) => db.Db === databaseName);

			// Transform data for display
			databaseUsers = dbUsers.map((db) => ({
				...db,
				User: db.User || '',
				Host: db.Host || ''
			}));
		} catch (error) {
			console.error('Error loading database users:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to load database users'
			});
		} finally {
			loading = false;
		}
	}

	// Function to get current privileges for a user
	function getCurrentPrivileges(user: Record<string, unknown>): string[] {
		const dbUser = databaseUsers.find((db) => db.User === user.User && db.Host === user.Host);

		if (dbUser) {
			// Map of privilege field names to privilege constants
			const privilegeMap: Record<string, string> = {
				Select_priv: 'SELECT',
				Insert_priv: 'INSERT',
				Update_priv: 'UPDATE',
				Delete_priv: 'DELETE',
				Create_priv: 'CREATE',
				Drop_priv: 'DROP',
				Alter_priv: 'ALTER',
				Index_priv: 'INDEX',
				Create_tmp_table_priv: 'CREATE_TEMPORARY_TABLES',
				Show_view_priv: 'SHOW_VIEW',
				Create_routine_priv: 'CREATE_ROUTINE',
				Alter_routine_priv: 'ALTER_ROUTINE',
				Execute_priv: 'EXECUTE',
				Create_view_priv: 'CREATE_VIEW',
				Event_priv: 'EVENT',
				Trigger_priv: 'TRIGGER',
				Lock_tables_priv: 'LOCK_TABLES',
				References_priv: 'REFERENCES'
			};

			const currentPrivileges: string[] = [];

			// Check each privilege field
			for (const [fieldName, privilegeName] of Object.entries(privilegeMap)) {
				const fieldValue = dbUser[fieldName];
				if (fieldValue === true || fieldValue === 'Y' || fieldValue === 'YES') {
					currentPrivileges.push(privilegeName);
				}
			}

			return currentPrivileges;
		}

		return [];
	}

	function handleAction(event: CustomEvent) {
		const { action, item } = event.detail;

		switch (action) {
			case 'add':
				showAddModal = true;
				break;
			case 'manage_privileges':
				userToManage = item;
				showManagePrivilegesModal = true;
				break;
			case 'remove':
				userToRemove = item;
				showRemoveModal = true;
				break;
		}
	}

	function handleConfirmAction(event: CustomEvent) {
		const { action, item } = event.detail;

		switch (action) {
			case 'remove':
				userToRemove = item;
				showRemoveModal = true;
				break;
		}
	}

	async function handleAddPrivileges(event: CustomEvent) {
		const { user } = event.detail;
		await addPrivileges(user);
	}

	function handleAddCancel() {
		showAddModal = false;
	}

	async function addPrivileges(selectedUser: Record<string, unknown>) {
		try {
			await apiPut('/mysql/privileges', {
				user_name: selectedUser.User,
				host_name: selectedUser.Host || null,
				database_name: databaseName,
				mysql_privileges: ['+ALL']
			});

			addToast({
				type: 'success',
				message: `Privileges granted for user ${selectedUser.User} on database ${databaseName}`
			});

			showAddModal = false;
			loadDatabaseUsers(); // Refresh the list
		} catch (error) {
			console.error('Error adding privileges:', error);
			addToast({
				type: 'error',
				message: 'Failed to add database privileges'
			});
		}
	}

	async function handleManagePrivileges(event: CustomEvent) {
		const { user, privileges } = event.detail;
		await managePrivileges(user, privileges);
	}

	async function removeAccess(user: Record<string, unknown>) {
		removeModalLoading = true;
		try {
			await apiPut('/mysql/privileges', {
				user_name: user.User,
				host_name: user.Host || null,
				database_name: databaseName,
				mysql_privileges: ['-ALL']
			});

			addToast({
				type: 'success',
				message: `Access removed for user ${user.User} from database ${databaseName}`
			});

			showRemoveModal = false;
			userToRemove = null;
			loadDatabaseUsers(); // Refresh the list
		} catch (error) {
			console.error('Error removing access:', error);
			addToast({
				type: 'error',
				message: 'Failed to remove database access'
			});
		} finally {
			removeModalLoading = false;
		}
	}

	function handleRemoveConfirm() {
		if (userToRemove) {
			removeAccess(userToRemove);
		}
	}

	function handleRemoveCancel() {
		showRemoveModal = false;
		userToRemove = null;
		removeModalLoading = false;
	}

	async function managePrivileges(user: Record<string, unknown>, selectedPrivileges: string[]) {
		managePrivilegesLoading = true;
		try {
			// Get current privileges for this user
			const currentPrivileges = getCurrentPrivileges(user);
			const currentPrivSet = new Set(currentPrivileges);
			const selectedPrivSet = new Set(selectedPrivileges);

			const privilegesToUpdate: string[] = [];

			// Add privileges that are selected but not currently active (grant with +)
			for (const priv of selectedPrivileges) {
				if (!currentPrivSet.has(priv)) {
					privilegesToUpdate.push(`+${priv}`);
				}
			}

			// Remove privileges that are currently active but not selected (revoke with -)
			for (const priv of currentPrivileges) {
				if (!selectedPrivSet.has(priv)) {
					privilegesToUpdate.push(`-${priv}`);
				}
			}

			// Only make API call if there are changes
			if (privilegesToUpdate.length > 0) {
				await apiPut('/mysql/privileges', {
					user_name: user.User,
					host_name: user.Host || null,
					database_name: databaseName,
					mysql_privileges: privilegesToUpdate
				});

				addToast({
					type: 'success',
					message: `Privileges updated for user ${user.User} on database ${databaseName}`
				});
			} else {
				// Check if user has all privileges and all are selected
				const allAvailablePrivileges = Object.values(privilegeCategories).flatMap((cat) =>
					cat.privileges.map((priv) => priv.key)
				);
				const hasAllPrivileges =
					currentPrivileges.length === allAvailablePrivileges.length &&
					currentPrivileges.every((priv) => allAvailablePrivileges.includes(priv));

				if (hasAllPrivileges) {
					addToast({
						type: 'success',
						message: `User ${user.User} already has all privileges on database ${databaseName}`
					});
				} else {
					addToast({
						type: 'info',
						message: `No privilege changes needed for user ${user.User}`
					});
				}
			}

			showManagePrivilegesModal = false;
			userToManage = null;
			loadDatabaseUsers(); // Refresh the list
		} catch (error) {
			console.error('Error managing privileges:', error);
			addToast({
				type: 'error',
				message: 'Failed to update database privileges'
			});
		} finally {
			managePrivilegesLoading = false;
		}
	}

	function handleManagePrivilegesCancel() {
		showManagePrivilegesModal = false;
		userToManage = null;
		managePrivilegesLoading = false;
	}

	function goBack() {
		if (browser) {
			navigateTo('/mysql');
		}
	}
</script>

<svelte:head>
	<title>MySQL Database Users - {databaseName} - devil WEB</title>
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
		Back to MySQL Databases
	</button>
</div>

<ResourceList
	title="Users & Privileges ({databaseName})"
	items={databaseUsers}
	{loading}
	{columns}
	actions={getUserActions}
	searchPlaceholder="Search users..."
	showAddButton={true}
	addButtonLabel="Add Privileges"
	on:action={handleAction}
	on:confirmAction={handleConfirmAction}
/>

{#if databaseUsers.length === 0 && !loading}
	<div class="text-center py-12">
		<div class="text-gray-400 dark:text-gray-600 mb-4">
			<svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-5.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 003.586 13H4"
				></path>
			</svg>
		</div>
		<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No Users Found</h3>
		<p class="text-gray-500 dark:text-gray-400">
			No users have been granted access to this database yet.
		</p>
	</div>
{/if}

<!-- Add Privileges Modal -->
<AddPrivilegesModal
	showModal={showAddModal}
	{databaseName}
	{allUsers}
	{databaseUsers}
	loading={false}
	on:addPrivileges={handleAddPrivileges}
	on:cancel={handleAddCancel}
/>

<!-- Manage Privileges Modal -->
<ManagePrivilegesModal
	showModal={showManagePrivilegesModal}
	{databaseName}
	user={userToManage}
	loading={managePrivilegesLoading}
	currentPrivileges={userToManage ? getCurrentPrivileges(userToManage) : []}
	on:managePrivileges={handleManagePrivileges}
	on:cancel={handleManagePrivilegesCancel}
/>

<ConfirmationModal
	showModal={showRemoveModal}
	title="Remove Database Access"
	message={userToRemove
		? `Are you sure you want to remove access for user "${userToRemove.User}" from database "${databaseName}"? This will revoke all privileges for this user on this database.`
		: ''}
	confirmText="Remove Access"
	cancelText="Cancel"
	confirmVariant="danger"
	loading={removeModalLoading}
	on:confirm={handleRemoveConfirm}
	on:cancel={handleRemoveCancel}
/>
