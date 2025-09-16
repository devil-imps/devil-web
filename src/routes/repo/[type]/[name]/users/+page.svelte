<script lang="ts">
	import { onMount } from 'svelte';
	import { navigateTo } from '$lib/utils';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { addToast } from '$lib/stores/appState';
	import { apiGet, apiDelete, apiPost, apiPut } from '$lib/utils';
	import ResourceList from '$lib/components/ResourceList.svelte';
	import ConfirmationModal from '$lib/components/modals/ConfirmationModal.svelte';
	import RepoUserAddModal from '$lib/components/modals/add/RepoUserAddModal.svelte';
	import UserPasswordModal from '$lib/components/modals/UserPasswordModal.svelte';

	// Get route parameters
	$: repoType = $page.params.type;
	$: repoName = $page.params.name;

	let users: Record<string, unknown>[] = [];
	let loading = true;
	let showDeleteModal = false;
	let deleteModalLoading = false;
	let userToDelete: Record<string, unknown> | null = null;
	let showAddModal = false;
	let addModalLoading = false;
	let showPasswordModal = false;
	let passwordModalLoading = false;
	let userToChangePassword: Record<string, unknown> | null = null;

	const columns = [
		{ key: 'username', label: 'Username', type: 'text' as const },
		{ key: 'read_only', label: 'Access Level', type: 'text' as const }
	];

	const actions = [
		{ label: 'Change Password', action: 'password', variant: 'secondary' as const },
		{ label: 'Delete', action: 'delete', variant: 'danger' as const, requiresConfirmation: true }
	];

	// Load users on mount and when params change
	onMount(() => {
		loadUsers();
	});

	$: if (repoType && repoName) {
		loadUsers();
	}

	async function loadUsers() {
		if (!repoType || !repoName) return;

		loading = true;
		try {
			const url = `/repo/list?repo_type=${encodeURIComponent(repoType)}&repo_name=${encodeURIComponent(repoName)}`;

			const response = await apiGet(url);

			// Handle different response formats
			if (Array.isArray(response)) {
				users = response;
			} else if (response && typeof response === 'object') {
				const responseObj = response as Record<string, unknown>;
				if (responseObj.repo_users) {
					users = Array.isArray(responseObj.repo_users)
						? (responseObj.repo_users as Record<string, unknown>[]).map(
								(user: Record<string, unknown>) => ({
									...user,
									read_only: (user.read_only as boolean) ? 'Read-Only' : 'Read-Write'
								})
							)
						: [];
				} else if (responseObj.accounts) {
					users = Array.isArray(responseObj.accounts)
						? (responseObj.accounts as Record<string, unknown>[])
						: [];
				} else if (responseObj.users) {
					users = Array.isArray(responseObj.users)
						? (responseObj.users as Record<string, unknown>[])
						: [];
				} else {
					users = [];
				}
			} else {
				users = [];
			}
		} catch (error) {
			console.error('Error loading repository users:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				if (browser) {
					navigateTo('/');
				}
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to load repository users'
			});
			users = [];
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
			case 'password': {
				const user = item as Record<string, unknown>;
				userToChangePassword = user;
				showPasswordModal = true;
				break;
			}
		}
	}

	function handleConfirmAction(event: CustomEvent) {
		const { action, item } = event.detail;

		switch (action) {
			case 'delete': {
				const user = item as Record<string, unknown>;
				userToDelete = user;
				showDeleteModal = true;
				break;
			}
		}
	}

	async function deleteUser(user: Record<string, unknown>) {
		deleteModalLoading = true;
		try {
			const username = user.username as string;
			await apiDelete(`/repo/account/${repoType}/${repoName}/${username}`);

			addToast({
				type: 'success',
				message: `User ${username} deleted successfully`
			});
			loadUsers();
			showDeleteModal = false;
			userToDelete = null;
		} catch (error) {
			console.error('Error deleting user:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				if (browser) {
					navigateTo('/');
				}
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to delete user'
			});
		} finally {
			deleteModalLoading = false;
		}
	}

	async function addUser(userData: { repo_username: string; password: string }) {
		addModalLoading = true;
		try {
			await apiPost('/repo/account/add', {
				...userData,
				repo_type: repoType,
				repo_name: repoName
			});

			addToast({
				type: 'success',
				message: `User ${userData.repo_username} added successfully`
			});
			loadUsers();
			showAddModal = false;
		} catch (error) {
			console.error('Error adding user:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				if (browser) {
					navigateTo('/');
				}
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to add user'
			});
		} finally {
			addModalLoading = false;
		}
	}

	async function changePassword(passwordData: { password: string }) {
		passwordModalLoading = true;
		try {
			await apiPut('/repo/account/passwd', {
				...passwordData,
				repo_type: repoType,
				repo_name: repoName,
				repo_username: userToChangePassword?.username
			});

			addToast({
				type: 'success',
				message: `Password changed successfully for ${userToChangePassword?.username}`
			});
			showPasswordModal = false;
			userToChangePassword = null;
		} catch (error) {
			console.error('Error changing password:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				if (browser) {
					navigateTo('/');
				}
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

	function handleAddSubmit(event: CustomEvent) {
		const { detail: userData } = event;
		addUser(userData);
	}

	function handleAddCancel() {
		showAddModal = false;
		addModalLoading = false;
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

	function goBack() {
		if (browser) {
			navigateTo('/repo');
		}
	}
</script>

<svelte:head>
	<title>Repository Users - {repoName} ({repoType}) - devil WEB</title>
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
		Back to Repositories
	</button>
</div>

<ResourceList
	title="Repository Users: {repoName} ({repoType?.toUpperCase()})"
	items={users}
	{loading}
	{columns}
	{actions}
	searchPlaceholder="Search users..."
	addButtonLabel="Add User"
	on:action={handleAction}
	on:confirmAction={handleConfirmAction}
/>

<ConfirmationModal
	showModal={showDeleteModal}
	title="Delete User"
	message={userToDelete
		? `Are you sure you want to delete user "${userToDelete.username}" from repository "${repoName}"? This action cannot be undone.`
		: ''}
	confirmText="Delete User"
	cancelText="Cancel"
	confirmVariant="danger"
	loading={deleteModalLoading}
	on:confirm={handleDeleteConfirm}
	on:cancel={handleDeleteCancel}
/>

<RepoUserAddModal
	showModal={showAddModal}
	loading={addModalLoading}
	on:submit={handleAddSubmit}
	on:cancel={handleAddCancel}
/>

<UserPasswordModal
	showModal={showPasswordModal}
	loading={passwordModalLoading}
	username={userToChangePassword?.username}
	on:submit={handlePasswordSubmit}
	on:cancel={handlePasswordCancel}
/>
