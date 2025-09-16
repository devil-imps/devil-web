<script lang="ts">
	import { onMount } from 'svelte';
	import { navigateTo } from '$lib/utils';
	import { page } from '$app/stores';
	import { addToast } from '$lib/stores/appState';
	import { apiGet, apiDelete, apiPost, apiPut } from '$lib/utils';
	import { formatBytes, formatMailQuotaBytes } from '$lib/utils/formatters';
	import ResourceList from '$lib/components/ResourceList.svelte';
	import MailAccountAddModal from '$lib/components/modals/add/MailAccountAddModal.svelte';
	import ConfirmationModal from '$lib/components/modals/ConfirmationModal.svelte';
	import ChangeQuotaModal from '$lib/components/modals/ChangeQuotaModal.svelte';
	import UserPasswordModal from '$lib/components/modals/UserPasswordModal.svelte';

	// Get domain from URL params
	$: domain = $page.params.domain;

	let mailboxes: Record<string, unknown>[] = [];
	let loading = true;

	// Modal states
	let showMailboxModal = false;
	let mailboxModalLoading = false;
	let showDeleteModal = false;
	let deleteModalLoading = false;
	let mailboxToDelete: Record<string, unknown> | null = null;
	let showQuotaModal = false;
	let quotaModalLoading = false;
	let mailboxToChangeQuota: Record<string, unknown> | null = null;
	let showPasswordModal = false;
	let passwordModalLoading = false;
	let mailboxToChangePassword: Record<string, unknown> | null = null;
	let recalculateLoading = false;

	// Reactive columns with inline actions
	$: columns = [
		{ key: 'address_mailbox', label: 'Email Address', type: 'text' as const },
		{
			key: 'quota_formatted',
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

	const actions = [
		{ label: 'Change Password', action: 'password', variant: 'secondary' as const },
		{ label: 'Change Quota', action: 'changeQuota', variant: 'secondary' as const },
		{ label: 'Delete', action: 'delete', variant: 'danger' as const, requiresConfirmation: true }
	];

	// Load mailboxes on mount
	onMount(() => {
		if (!domain) {
			navigateTo('/mail');
			return;
		}
		loadMailboxes();
	});

	async function loadMailboxes() {
		if (!domain) return;

		loading = true;
		try {
			const response = (await apiGet(
				`/mail/list?email_domain=${encodeURIComponent(domain)}`
			)) as Record<string, unknown>;
			const rawMailboxes = (response.mailboxes || []) as Record<string, unknown>[];

			// Transform mailbox data for display
			mailboxes = rawMailboxes.map((mailbox: Record<string, unknown>) => ({
				...mailbox,
				quota_formatted:
					(mailbox.quota as number) === 0
						? `${formatMailQuotaBytes(mailbox.quota_used as number)} / No quota`
						: `${formatMailQuotaBytes(mailbox.quota_used as number)} / ${formatBytes(mailbox.quota as number)}`
			}));
		} catch (error) {
			console.error('Error loading mailboxes:', error);
			addToast({
				type: 'error',
				message: 'Failed to load mailboxes'
			});
		} finally {
			loading = false;
		}
	}

	function handleAction(event: CustomEvent) {
		const { action, item } = event.detail;

		switch (action) {
			case 'add':
				handleAddMailbox();
				break;
			case 'password':
				mailboxToChangePassword = item;
				showPasswordModal = true;
				break;
			case 'changeQuota':
				mailboxToChangeQuota = item;
				showQuotaModal = true;
				break;
			case 'recalculate':
				recalculateQuota(item);
				break;
		}
	}

	async function recalculateQuota(mailbox: Record<string, unknown>) {
		recalculateLoading = true;
		try {
			await apiPut('/mail/quota', {
				email_mailbox: mailbox.address_mailbox,
				mail_quota: 'recalc'
			});

			addToast({
				type: 'success',
				message: `Quota recalculated for ${mailbox.address_mailbox}`
			});

			// Refresh the data to show updated quota
			loadMailboxes();
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

	async function changeQuota(quotaData: { quota: string }) {
		if (!mailboxToChangeQuota) return;

		quotaModalLoading = true;
		try {
			await apiPut('/mail/quota', {
				email_mailbox: mailboxToChangeQuota.address_mailbox,
				mail_quota: quotaData.quota
			});

			addToast({
				type: 'success',
				message: `Quota changed to ${quotaData.quota} for ${mailboxToChangeQuota.address_mailbox}`
			});

			showQuotaModal = false;
			mailboxToChangeQuota = null;

			// Refresh the data to show updated quota
			loadMailboxes();
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

	async function changePassword(passwordData: { password: string }) {
		if (!mailboxToChangePassword) return;

		passwordModalLoading = true;
		try {
			await apiPut('/mail/passwd', {
				email_mailbox: mailboxToChangePassword.address_mailbox,
				password: passwordData.password
			});

			addToast({
				type: 'success',
				message: `Password changed for ${mailboxToChangePassword.address_mailbox}`
			});

			showPasswordModal = false;
			mailboxToChangePassword = null;
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

	function handleConfirmAction(event: CustomEvent) {
		const { action, item } = event.detail;

		switch (action) {
			case 'delete':
				mailboxToDelete = item;
				showDeleteModal = true;
				break;
		}
	}

	async function handleDeleteConfirm() {
		if (!mailboxToDelete) return;

		deleteModalLoading = true;
		try {
			// Use the correct API endpoint: DELETE /mail/account/{address_mailbox}
			const encodedAddressMailbox = encodeURIComponent(String(mailboxToDelete.address_mailbox));
			await apiDelete(`/mail/account/${encodedAddressMailbox}`);

			addToast({
				type: 'success',
				message: 'Mailbox deleted successfully'
			});

			showDeleteModal = false;
			mailboxToDelete = null;

			// Refresh the mailboxes list
			loadMailboxes();
		} catch (error) {
			console.error('Error deleting mailbox:', error);
			addToast({
				type: 'error',
				message: 'Failed to delete mailbox'
			});
		} finally {
			deleteModalLoading = false;
		}
	}

	function handleDeleteCancel() {
		showDeleteModal = false;
		mailboxToDelete = null;
	}

	function handleAddMailbox() {
		showMailboxModal = true;
	}

	async function handleMailboxSubmit(event: CustomEvent) {
		const { email_mailbox, password } = event.detail;
		mailboxModalLoading = true;

		try {
			await apiPost('/mail/account/add', {
				email_mailbox,
				password
			});

			addToast({
				type: 'success',
				message: `Mailbox ${email_mailbox} created successfully`
			});

			showMailboxModal = false;

			// Refresh the mailboxes list
			loadMailboxes();
		} catch (error) {
			console.error('Error creating mailbox:', error);
			addToast({
				type: 'error',
				message: 'Failed to create mailbox'
			});
		} finally {
			mailboxModalLoading = false;
		}
	}

	async function handleQuotaSubmit(event: CustomEvent) {
		const { quota } = event.detail;
		await changeQuota({ quota });
	}

	function handleQuotaCancel() {
		showQuotaModal = false;
		mailboxToChangeQuota = null;
	}

	async function handlePasswordSubmit(event: CustomEvent) {
		const { password } = event.detail;
		await changePassword({ password });
	}

	function handlePasswordCancel() {
		showPasswordModal = false;
		mailboxToChangePassword = null;
	}

	function handleBack() {
		navigateTo('/mail');
	}
</script>

<svelte:head>
	<title>Mailboxes for {domain} - devil WEB</title>
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
				Back to Domains
			</button>
		</div>
	</div>

	<ResourceList
		title="Mailboxes for {domain}"
		items={mailboxes}
		{loading}
		{columns}
		{actions}
		searchPlaceholder="Search mailboxes..."
		showAddButton={false}
		on:action={handleAction}
		on:confirmAction={handleConfirmAction}
	>
		<div slot="header-actions" class="flex items-center gap-3">
			<button
				class="inline-flex items-center px-4 py-2 bg-devil-600 hover:bg-devil-700 disabled:bg-devil-400 text-white font-medium text-sm rounded-lg border border-transparent transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-devil-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-dark-900 shadow-xs hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
				on:click={handleAddMailbox}
				disabled={loading}
				type="button"
			>
				<svg class="w-4 h-4 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 6v6m0 0v6m0-6h6m-6 0H6"
					></path>
				</svg>
				<span class="whitespace-nowrap">Add Mailbox</span>
			</button>
		</div>
	</ResourceList>
</div>

<!-- Email Account Add Modal -->
<MailAccountAddModal
	showModal={showMailboxModal}
	loading={mailboxModalLoading}
	on:cancel={() => (showMailboxModal = false)}
	on:submit={handleMailboxSubmit}
/>

<!-- Delete Confirmation Modal -->
<ConfirmationModal
	showModal={showDeleteModal}
	title="Delete Email Mailbox"
	message={mailboxToDelete
		? `Are you sure you want to delete the mailbox "${mailboxToDelete.address_mailbox}"? This action cannot be undone.`
		: ''}
	confirmText="Delete Mailbox"
	cancelText="Cancel"
	confirmVariant="danger"
	loading={deleteModalLoading}
	on:confirm={handleDeleteConfirm}
	on:cancel={handleDeleteCancel}
/>

<!-- Change Quota Modal -->
<ChangeQuotaModal
	showModal={showQuotaModal}
	loading={quotaModalLoading}
	username={String(mailboxToChangeQuota?.address_mailbox || '')}
	currentQuota={String(mailboxToChangeQuota?.quota_formatted || '')}
	on:submit={handleQuotaSubmit}
	on:cancel={handleQuotaCancel}
/>

<!-- Change Password Modal -->
<UserPasswordModal
	showModal={showPasswordModal}
	loading={passwordModalLoading}
	username={String(mailboxToChangePassword?.address_mailbox || '')}
	title="Change Mailbox Password"
	description="Changing password for mailbox"
	entityName={String(mailboxToChangePassword?.address_mailbox || '')}
	on:submit={handlePasswordSubmit}
	on:cancel={handlePasswordCancel}
/>
