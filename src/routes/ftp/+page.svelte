<script lang="ts">
	import { onMount } from 'svelte';
	import { navigateTo } from '$lib/utils';
	import { addToast } from '$lib/stores/appState';
	import { apiGet, apiDelete, apiPut, apiPost, formatQuota } from '$lib/utils';
	import ResourceList from '$lib/components/ResourceList.svelte';
	import ConfirmationModal from '$lib/components/modals/ConfirmationModal.svelte';
	import UserPasswordModal from '$lib/components/modals/UserPasswordModal.svelte';
	import ChangeQuotaModal from '$lib/components/modals/ChangeQuotaModal.svelte';
	import CreateFtpModal from '$lib/components/modals/add/FtpAddModal.svelte';

	// Accept params prop to suppress SvelteKit warning
	export const params: Record<string, string> = {};

	type FtpAccount = {
		username: string;
		home_directory: string;
		quota: string;
		quota_used: number;
	};
	let ftpAccounts: FtpAccount[] = [];
	let loading: boolean = true;
	let showDeleteModal = false;
	let deleteModalLoading = false;
	let ftpAccountToDelete: Record<string, unknown> | null = null;
	let showPasswordModal = false;
	let passwordModalLoading = false;
	let ftpAccountToChangePassword: Record<string, unknown> | null = null;
	let showQuotaModal = false;
	let quotaModalLoading = false;
	let ftpAccountToChangeQuota: Record<string, unknown> | null = null;
	let showCreateFtpModal = false;
	let createFtpModalLoading = false;
	let recalculateLoading = false;

	// Reactive columns with inline actions
	$: columns = [
		{ key: 'username', label: 'Username', type: 'text' as const },
		{ key: 'home_directory', label: 'Directory', type: 'text' as const },
		{
			key: 'quota',
			label: 'Quota',
			type: 'text' as const,
			inlineActions: [
				{
					action: 'recalculate',
					icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
					title: 'Recalculate Quota',
					variant: 'secondary' as const,
					loading: recalculateLoading
				}
			]
		}
	];

	// Actions array
	const actions = [
		{ label: 'Change Password', action: 'password', variant: 'secondary' as const },
		{ label: 'Change Quota', action: 'changeQuota', variant: 'secondary' as const },
		{ label: 'Delete', action: 'delete', variant: 'danger' as const, requiresConfirmation: true }
	];

	// Load FTP accounts on mount
	onMount(() => {
		loadFtpAccounts();
	});

	async function loadFtpAccounts() {
		loading = true;
		try {
			const data = (await apiGet('/ftp/list')) as Record<string, unknown>;
			const rawAccounts = (data.accounts as Record<string, unknown>[]) || [];

			// Input validation and transformation
			ftpAccounts = rawAccounts
				.filter((account: Record<string, unknown>) => account && account.account)
				.map((account: Record<string, unknown>) => {
					const quotaMB = typeof account.quota === 'number' ? account.quota : 0;
					const quotaUsedBytes = typeof account.quota_used === 'number' ? account.quota_used : 0;

					return {
						username: String(account.account || ''),
						home_directory: String(account.ftp_dir || ''),
						quota: formatQuota(quotaMB, quotaUsedBytes),
						quota_used: quotaUsedBytes,
						raw_quota: quotaMB,
						raw_quota_used: quotaUsedBytes
					};
				});
		} catch (error) {
			console.error('Error loading FTP accounts:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			// Provide more specific error messaging
			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
			addToast({
				type: 'error',
				message: `Failed to load FTP accounts: ${errorMessage}`
			});

			// Reset data on error
			ftpAccounts = [];
		} finally {
			loading = false;
		}
	}

	function handleAction(event: CustomEvent<{ action: string; item: Record<string, unknown> }>) {
		const { action, item } = (
			event as CustomEvent<{ action: string; item: Record<string, unknown> }>
		).detail;

		switch (action) {
			case 'add':
				showCreateFtpModal = true;
				break;
			case 'password': {
				const account = item as Record<string, unknown>;
				ftpAccountToChangePassword = account;
				showPasswordModal = true;
				break;
			}
			case 'changeQuota': {
				const account = item as Record<string, unknown>;
				ftpAccountToChangeQuota = account;
				showQuotaModal = true;
				break;
			}
			case 'recalculate':
				recalculateQuota(item);
				break;
		}
	}

	function handleConfirmAction(
		event: CustomEvent<{ action: string; item: Record<string, unknown> }>
	) {
		const { action, item } = (
			event as CustomEvent<{ action: string; item: Record<string, unknown> }>
		).detail;

		switch (action) {
			case 'delete': {
				const account = item as Record<string, unknown>;
				ftpAccountToDelete = account;
				showDeleteModal = true;
				break;
			}
		}
	}

	async function changePassword(passwordData: { password: string }) {
		passwordModalLoading = true;
		try {
			await apiPut('/ftp/passwd', {
				...passwordData,
				username: ftpAccountToChangePassword?.username
			});

			addToast({
				type: 'success',
				message: `Password changed for ${ftpAccountToChangePassword?.username}`
			});
			showPasswordModal = false;
			ftpAccountToChangePassword = null;
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

	async function changeQuota(quotaData: { quota: string }) {
		quotaModalLoading = true;
		try {
			await apiPut('/ftp/quota', {
				...quotaData,
				username: ftpAccountToChangeQuota?.username
			});

			addToast({
				type: 'success',
				message: `Quota changed to ${quotaData.quota} for ${ftpAccountToChangeQuota?.username}`
			});
			showQuotaModal = false;
			ftpAccountToChangeQuota = null;

			// Refresh the data to show updated quota
			loadFtpAccounts();
		} catch (error) {
			console.error('Error changing quota:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to change quota'
			});
		} finally {
			quotaModalLoading = false;
		}
	}

	async function recalculateQuota(account: Record<string, unknown>) {
		recalculateLoading = true;
		try {
			await apiPut('/ftp/quota', {
				username: account.username,
				quota: 'recalc'
			});

			addToast({
				type: 'success',
				message: `Quota recalculated for ${account.username}`
			});

			// Refresh the data to show updated quota
			loadFtpAccounts();
		} catch (error) {
			console.error('Error recalculating quota:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to recalculate quota'
			});
		} finally {
			recalculateLoading = false;
		}
	}
	async function deleteFtpAccount(account: Record<string, unknown>) {
		deleteModalLoading = true;
		try {
			await apiDelete(`/ftp/${account.username}`);
			addToast({
				type: 'success',
				message: `FTP account ${account.username} deleted successfully`
			});
			loadFtpAccounts();
			showDeleteModal = false;
			ftpAccountToDelete = null;
		} catch (error) {
			console.error('Error deleting FTP account:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to delete FTP account'
			});
		} finally {
			deleteModalLoading = false;
		}
	}

	async function createFtpAccount(ftpData: {
		username: string;
		directory: string;
		quota: string;
		password: string;
	}) {
		createFtpModalLoading = true;
		try {
			await apiPost('/ftp/add', ftpData);

			addToast({
				type: 'success',
				message: `FTP account ${ftpData.username} created successfully`
			});
			showCreateFtpModal = false;
			loadFtpAccounts();
		} catch (error) {
			console.error('Error creating FTP account:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to create FTP account'
			});
		} finally {
			createFtpModalLoading = false;
		}
	}

	function handlePasswordSubmit(event: CustomEvent) {
		const { detail: passwordData } = event;
		changePassword(passwordData);
	}

	function handlePasswordCancel() {
		showPasswordModal = false;
		ftpAccountToChangePassword = null;
		passwordModalLoading = false;
	}

	function handleQuotaSubmit(event: CustomEvent) {
		const { detail: quotaData } = event;
		changeQuota(quotaData);
	}

	function handleQuotaCancel() {
		showQuotaModal = false;
		ftpAccountToChangeQuota = null;
		quotaModalLoading = false;
	}

	function handleDeleteConfirm() {
		if (ftpAccountToDelete) {
			deleteFtpAccount(ftpAccountToDelete);
		}
	}

	function handleDeleteCancel() {
		showDeleteModal = false;
		ftpAccountToDelete = null;
		deleteModalLoading = false;
	}

	function handleCreateFtpSubmit(event: CustomEvent) {
		const { detail: ftpData } = event;
		createFtpAccount(ftpData);
	}

	function handleCreateFtpCancel() {
		showCreateFtpModal = false;
		createFtpModalLoading = false;
	}
</script>

<svelte:head>
	<title>FTP Accounts - devil WEB</title>
</svelte:head>

<ResourceList
	title="FTP Accounts"
	items={ftpAccounts}
	{loading}
	{columns}
	{actions}
	searchPlaceholder="Search FTP accounts..."
	addButtonLabel="Add FTP Account"
	on:action={handleAction}
	on:confirmAction={handleConfirmAction}
/>

<ConfirmationModal
	showModal={showDeleteModal}
	title="Delete FTP Account"
	message={ftpAccountToDelete
		? `Are you sure you want to delete FTP account "${ftpAccountToDelete.username}"? This action cannot be undone.`
		: ''}
	confirmText="Delete Account"
	cancelText="Cancel"
	confirmVariant="danger"
	loading={deleteModalLoading}
	on:confirm={handleDeleteConfirm}
	on:cancel={handleDeleteCancel}
/>

<UserPasswordModal
	showModal={showPasswordModal}
	loading={passwordModalLoading}
	username={ftpAccountToChangePassword?.username}
	on:submit={handlePasswordSubmit}
	on:cancel={handlePasswordCancel}
/>

<ChangeQuotaModal
	showModal={showQuotaModal}
	loading={quotaModalLoading}
	username={ftpAccountToChangeQuota?.username}
	currentQuota={ftpAccountToChangeQuota
		? formatQuota(
				Number(ftpAccountToChangeQuota.raw_quota) || 0,
				Number(ftpAccountToChangeQuota.raw_quota_used) || 0
			)
		: ''}
	on:submit={handleQuotaSubmit}
	on:cancel={handleQuotaCancel}
/>

<CreateFtpModal
	showModal={showCreateFtpModal}
	loading={createFtpModalLoading}
	on:submit={handleCreateFtpSubmit}
	on:cancel={handleCreateFtpCancel}
/>
