<script lang="ts">
	import { onMount } from 'svelte';
	import { navigateTo } from '$lib/utils';
	import { browser } from '$app/environment';
	import { addToast } from '$lib/stores/appState';
	import { apiGet, apiDelete, apiPut, apiPost } from '$lib/utils';
	import ResourceList from '$lib/components/ResourceList.svelte';
	import ConfirmationModal from '$lib/components/modals/ConfirmationModal.svelte';
	import UserPasswordModal from '$lib/components/modals/UserPasswordModal.svelte';
	import MySQLUserAddModal from '$lib/components/modals/add/MySQLUserAddModal.svelte';

	// Accept params prop to suppress SvelteKit warning
	export const params: Record<string, string> = {};

	let users: Record<string, unknown>[] = [];
	let loading = true;
	let showDeleteModal = false;
	let deleteModalLoading = false;
	let userToDelete: Record<string, unknown> | null = null;
	let showPasswordModal = false;
	let passwordModalLoading = false;
	let userToChangePassword: Record<string, unknown> | null = null;
	let showAddModal = false;
	let addModalLoading = false;
	let mysqlSpecialUser = '';

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
				label: 'Change Password',
				action: 'password',
				variant: 'secondary' as const
			},
			{
				label: 'Delete',
				action: 'delete',
				variant: 'danger' as const,
				requiresConfirmation: true,
				disabled: !hasUnderscore
			}
		];
	}

	// Load users on mount
	onMount(() => {
		loadUsers();
	});

	async function loadUsers() {
		loading = true;
		try {
			const data = await apiGet<Record<string, unknown>>('/mysql/list');
			let allUsers = (data.users as Record<string, unknown>[]) || [];

			// Store the special user prefix
			mysqlSpecialUser = String(data.mysql_special_user || '');

			// Transform data for display
			users = allUsers.map((user) => ({
				...user,
				User: user.User || '',
				Host: user.Host || ''
			}));
		} catch (error) {
			console.error('Error loading users:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to load users'
			});
		} finally {
			loading = false;
		}
	}

	function handleAction(event: CustomEvent) {
		const { action, item } = event.detail;

		switch (action) {
			case 'password':
				userToChangePassword = item;
				showPasswordModal = true;
				break;
			case 'add':
				showAddModal = true;
				break;
		}
	}

	function handleConfirmAction(event: CustomEvent) {
		const { action, item } = event.detail;

		switch (action) {
			case 'delete':
				userToDelete = item;
				showDeleteModal = true;
				break;
		}
	}

	async function deleteUser(user: Record<string, unknown>) {
		deleteModalLoading = true;
		try {
			await apiDelete(`/mysql/user/${user.User}`);
			addToast({
				type: 'success',
				message: `User ${user.User} deleted successfully`
			});
			loadUsers();
			showDeleteModal = false;
			userToDelete = null;
		} catch (error) {
			console.error('Error deleting user:', error);
			addToast({
				type: 'error',
				message: 'Failed to delete user'
			});
		} finally {
			deleteModalLoading = false;
		}
	}

	async function changePassword(passwordData: { password: string }) {
		if (!userToChangePassword) return;

		passwordModalLoading = true;
		try {
			await apiPut('/mysql/passwd', {
				user_name: userToChangePassword.User,
				host_name: userToChangePassword.Host || null,
				password: passwordData.password
			});

			addToast({
				type: 'success',
				message: `Password changed successfully for user ${userToChangePassword.User}`
			});

			showPasswordModal = false;
			userToChangePassword = null;
		} catch (error) {
			console.error('Error changing password:', error);
			addToast({
				type: 'error',
				message: 'Failed to change password'
			});
		} finally {
			passwordModalLoading = false;
		}
	}

	async function addUser(userData: { user_name: string; password: string }) {
		addModalLoading = true;
		try {
			await apiPost('/mysql/user/add', userData);

			addToast({
				type: 'success',
				message: `MySQL user ${userData.user_name} created successfully`
			});

			showAddModal = false;
			loadUsers();
		} catch (error) {
			console.error('Error creating user:', error);
			addToast({
				type: 'error',
				message: 'Failed to create user'
			});
		} finally {
			addModalLoading = false;
		}
	}

	function handleDeleteConfirm() {
		if (userToDelete) {
			deleteUser(userToDelete);
		}
	}

	function handleDeleteCancel() {
		showDeleteModal = false;
		userToDelete = null;
		deleteModalLoading = false;
	}

	function handlePasswordSubmit(event: CustomEvent) {
		const { detail: passwordData } = event;
		changePassword(passwordData);
	}

	function handlePasswordCancel() {
		showPasswordModal = false;
		userToChangePassword = null;
		passwordModalLoading = false;
	}

	function handleAddSubmit(event: CustomEvent) {
		const { detail: userData } = event;
		addUser(userData);
	}

	function handleAddCancel() {
		showAddModal = false;
		addModalLoading = false;
	}

	function goBack() {
		if (browser) {
			navigateTo('/mysql');
		}
	}
</script>

<svelte:head>
	<title>MySQL Users - devil WEB</title>
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
	title="MySQL Users"
	items={users}
	{loading}
	{columns}
	actions={getUserActions}
	searchPlaceholder="Search users..."
	addButtonLabel="Add User"
	on:action={handleAction}
	on:confirmAction={handleConfirmAction}
/>

<ConfirmationModal
	showModal={showDeleteModal}
	title="Delete User"
	message={userToDelete
		? `Are you sure you want to delete the MySQL user "${userToDelete.User}"? This action cannot be undone and will permanently remove the user and all associated privileges.`
		: ''}
	confirmText="Delete User"
	cancelText="Cancel"
	confirmVariant="danger"
	loading={deleteModalLoading}
	on:confirm={handleDeleteConfirm}
	on:cancel={handleDeleteCancel}
/>

<UserPasswordModal
	showModal={showPasswordModal}
	loading={passwordModalLoading}
	username={String(userToChangePassword?.User)}
	entityName={String(userToChangePassword?.User)}
	on:submit={handlePasswordSubmit}
	on:cancel={handlePasswordCancel}
/>

<MySQLUserAddModal
	showModal={showAddModal}
	loading={addModalLoading}
	{mysqlSpecialUser}
	on:submit={handleAddSubmit}
	on:cancel={handleAddCancel}
/>
