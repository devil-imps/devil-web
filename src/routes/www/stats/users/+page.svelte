<script lang="ts">
	import { onMount } from 'svelte';
	import { navigateTo } from '$lib/utils';
	import { browser } from '$app/environment';
	import { addToast } from '$lib/stores/appState';
	import { apiGet, apiDelete, apiPost, apiPut } from '$lib/utils';
	import ResourceList from '$lib/components/ResourceList.svelte';
	import ConfirmationModal from '$lib/components/modals/ConfirmationModal.svelte';
	import UserPasswordModal from '$lib/components/modals/UserPasswordModal.svelte';
	import WebsiteStatsAddUserModal from '$lib/components/modals/add/WebsiteStatsAddUserModal.svelte';

	// Accept params prop to suppress SvelteKit warning
	export const params: Record<string, string> = {};

	let usersData: Record<string, unknown>[] = [];
	let loading = true;
	let showDeleteModal = false;
	let deleteModalLoading = false;
	let userToDelete: Record<string, unknown> | null = null;
	let showAddUserModal = false;
	let addUserModalLoading = false;
	let showPasswordModal = false;
	let passwordModalLoading = false;
	let userToChangePassword: Record<string, unknown> | null = null;

	// Columns for users data
	const columns = [
		{ key: 'user', label: 'Username', type: 'text' as const },
		{ key: 'domains', label: 'Domains', type: 'text' as const },
		{ key: 'domain_count', label: 'Domain Count', type: 'text' as const }
	];

	// Function to get actions for a specific user
	function getUserActions(user: Record<string, unknown>) {
		const username = String(user.user || '');
		const hasUnderscore = username.includes('_');

		return [
			{
				label: 'Manage Websites',
				action: 'manageWebsites',
				variant: 'secondary' as const,
				disabled: !hasUnderscore
			},
			{
				label: 'Change Password',
				action: 'password',
				variant: 'secondary' as const
				// No disabled property - always enabled
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

	// Load users data on mount
	onMount(() => {
		loadUsersData();
	});

	async function loadUsersData() {
		loading = true;
		try {
			// Use the correct API endpoint for statistics
			const data = await apiGet<Record<string, unknown>>('/www/stats/list');

			// Transform the data into a format suitable for ResourceList
			const transformedData: Record<string, unknown>[] = [];

			// Parse the matomo_list from the response
			if (data.matomo_list && Array.isArray(data.matomo_list)) {
				data.matomo_list.forEach((userData: Record<string, unknown>) => {
					const domains = (userData.domains as string[]) || [];
					transformedData.push({
						user: userData.user || 'Unknown',
						domains: domains.length > 0 ? domains.join(', ') : 'No domains',
						domain_count: domains.length.toString()
					});
				});
			}

			usersData = transformedData;
		} catch (error) {
			console.error('Error loading users data:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			// Show empty data instead of error for better UX
			usersData = [];
			addToast({
				type: 'error',
				message: 'Failed to load users statistics data'
			});
		} finally {
			loading = false;
		}
	}

	function goBack() {
		if (browser) {
			navigateTo('/www/stats');
		}
	}

	function handleAction(event: CustomEvent<{ action: string; item: Record<string, unknown> }>) {
		const { action, item } = event.detail;

		switch (action) {
			case 'add':
				showAddUserModal = true;
				break;
			case 'manageWebsites': {
				const user = item as Record<string, unknown>;
				navigateTo(`/www/stats/users/${user.user}/websites`);
				break;
			}
			case 'password': {
				const user = item as Record<string, unknown>;
				userToChangePassword = user;
				showPasswordModal = true;
				break;
			}
			case 'delete':
				userToDelete = item;
				showDeleteModal = true;
				break;
		}
	}

	function handleConfirmAction(
		event: CustomEvent<{ action: string; item: Record<string, unknown> }>
	) {
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
			const username = user.user as string;
			await apiDelete(`/www/stats/account/${username}`, { user_name: username });

			addToast({
				type: 'success',
				message: `Statistics user ${username} deleted successfully`
			});

			// Refresh the data
			loadUsersData();
			showDeleteModal = false;
			userToDelete = null;
		} catch (error) {
			console.error('Error deleting user:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to delete statistics user'
			});
		} finally {
			deleteModalLoading = false;
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
	}

	async function addUser(userData: { username: string; password: string }) {
		addUserModalLoading = true;
		try {
			await apiPost('/www/stats/account/add', {
				user_name: userData.username,
				password: userData.password
			});

			addToast({
				type: 'success',
				message: `Statistics user ${userData.username} created successfully`
			});

			// Refresh the data
			loadUsersData();
			showAddUserModal = false;
		} catch (error) {
			console.error('Error creating user:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to create statistics user'
			});
		} finally {
			addUserModalLoading = false;
		}
	}

	function handleAddUserSubmit(event: CustomEvent<{ username: string; password: string }>) {
		addUser(event.detail);
	}

	function handleAddUserCancel() {
		showAddUserModal = false;
	}

	async function changePassword(passwordData: { password: string }) {
		passwordModalLoading = true;
		try {
			await apiPut('/www/stats/account/passwd', {
				user_name: userToChangePassword?.user,
				password: passwordData.password
			});

			addToast({
				type: 'success',
				message: `Password changed for ${userToChangePassword?.user}`
			});
			showPasswordModal = false;
			userToChangePassword = null;
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

	function handlePasswordSubmit(event: CustomEvent<{ password: string }>) {
		changePassword(event.detail);
	}

	function handlePasswordCancel() {
		showPasswordModal = false;
		userToChangePassword = null;
	}
</script>

<svelte:head>
	<title>WWW Statistics Users - devil WEB</title>
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
		Back to Statistics
	</button>
</div>

<ResourceList
	title="WWW Statistics Users"
	items={usersData}
	{loading}
	{columns}
	actions={getUserActions}
	searchPlaceholder="Search users..."
	addButtonLabel="Add User"
	on:action={handleAction}
	on:confirmAction={handleConfirmAction}
/>

{#if usersData.length === 0 && !loading}
	<div class="mt-8 text-center">
		<div
			class="mx-auto w-24 h-24 bg-gray-100 dark:bg-dark-700 rounded-full flex items-center justify-center mb-4"
		>
			<svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
				></path>
			</svg>
		</div>
		<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No Users Found</h3>
		<p class="text-gray-500 dark:text-gray-400">
			No users are currently tracking statistics or the data is not available.
		</p>
	</div>
{/if}

<ConfirmationModal
	showModal={showDeleteModal}
	title="Delete Statistics User"
	message={userToDelete
		? `Are you sure you want to delete statistics user "${userToDelete.user}"? This action cannot be undone.`
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
	username={userToChangePassword?.user}
	title="Change Statistics User Password"
	description="Changing password for statistics user"
	entityName={userToChangePassword?.user?.toString()}
	on:submit={handlePasswordSubmit}
	on:cancel={handlePasswordCancel}
/>

<WebsiteStatsAddUserModal
	showModal={showAddUserModal}
	loading={addUserModalLoading}
	on:submit={handleAddUserSubmit}
	on:cancel={handleAddUserCancel}
/>
