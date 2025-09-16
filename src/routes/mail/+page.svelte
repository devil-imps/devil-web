<script lang="ts">
	import { onMount } from 'svelte';
	import { navigateTo } from '$lib/utils';
	import { addToast } from '$lib/stores/appState';
	import { apiGet, apiPost, apiDelete, apiPut } from '$lib/utils';
	import ResourceList from '$lib/components/ResourceList.svelte';
	import DkimModal from '$lib/components/modals/DkimModal.svelte';
	import DkimDnsModal from '$lib/components/modals/DkimDnsModal.svelte';
	import MailAccountAddModal from '$lib/components/modals/add/MailAccountAddModal.svelte';
	import MailAliasAddModal from '$lib/components/modals/add/MailAliasAddModal.svelte';
	import EmailOptionsModal from '$lib/components/modals/EmailOptionsModal.svelte';

	// Accept params prop to suppress SvelteKit warning
	export const params: Record<string, string> = {};

	let emailDomains: Record<string, unknown>[] = [];
	let loading = true;

	// DKIM modal states
	let showDkimModal = false;
	let showDkimDnsModal = false;
	let dkimModalLoading = false;
	let dkimDnsModalLoading = false;
	let selectedDomain = '';
	let dnsRecord = '';
	let dnsRecordName = '';
	let dnsRecordContent = '';

	// Email account add modal states
	let showAddModal = false;
	let addModalLoading = false;

	// Email alias add modal states
	let showAliasModal = false;
	let aliasModalLoading = false;

	// Email options modal states
	let showOptionsModal = false;
	let optionsModalLoading = false;
	let selectedDomainForOptions = '';
	let optionRbl = false;
	let optionSpamfilter = false;
	let optionRestrictspf = 'off';
	let optionMovespam = false;
	let optionAllownets = '';
	let optionHidesenderip = false;
	let originalOptionValues: Record<string, string> = {};

	const columns = [
		{ key: 'domain', label: 'Domain', type: 'text' as const },
		{ key: 'mailbox_count', label: 'Mailboxes', type: 'text' as const },
		{ key: 'alias_count', label: 'Aliases', type: 'text' as const },
		{ key: 'outgoing_ip', label: 'Outgoing IP', type: 'text' as const },
		{ key: 'dkim_key', label: 'DKIM', type: 'badge' as const }
	];

	const actions = [
		{ label: 'Options', action: 'options', variant: 'secondary' as const },
		{ label: 'Mailboxes', action: 'mailboxes', variant: 'secondary' as const },
		{ label: 'Aliases', action: 'aliases', variant: 'secondary' as const },
		{ label: 'DKIM', action: 'dkim', variant: 'secondary' as const }
	];

	// Load email domains on mount
	onMount(() => {
		loadEmailDomains();
	});

	async function loadEmailDomains() {
		loading = true;
		try {
			const data = await apiGet('/mail/list');
			emailDomains = ((data as Record<string, unknown>).domains as Record<string, unknown>[]) || [];

			// Transform data for display
			emailDomains = emailDomains.map((domain) => ({
				...domain,
				outgoing_ip: domain.option_outgoingip,
				dkim_key: domain.dkim_key ? 'Enabled' : 'Disabled',
				// Keep original dkim_key for logic checks
				_dkim_key: domain.dkim_key
			}));
		} catch (error) {
			console.error('Error loading email domains:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to load email domains'
			});
		} finally {
			loading = false;
		}
	}

	function handleAction(event: CustomEvent) {
		const { action, item } = event.detail;

		switch (action) {
			case 'add':
				addToast({
					type: 'info',
					message: 'Add email domain functionality coming soon'
				});
				break;
			case 'options':
				handleOptionsAction(item);
				break;
			case 'mailboxes':
				navigateTo(`/mail/mailboxes/${encodeURIComponent(item.domain as string)}`);
				break;
			case 'aliases':
				navigateTo(`/mail/aliases/${encodeURIComponent(item.domain as string)}`);
				break;
			case 'dkim':
				handleDkimAction(item);
				break;
		}
	}

	function handleManageWhitelist() {
		navigateTo('/mail/whitelist');
	}

	async function handleDkimAction(item: Record<string, unknown>) {
		selectedDomain = item.domain as string;

		// Check if domain is already signed using original dkim_key value
		if (item._dkim_key) {
			// Domain is already signed, show DNS record modal directly
			await loadDkimDnsRecord();
		} else {
			// Domain not signed, show confirmation modal
			showDkimModal = true;
		}
	}

	async function handleSignAndAdd() {
		dkimModalLoading = true;
		try {
			// Sign the domain
			await apiPost('/mail/dkim/sign', { domain: selectedDomain });

			// Get DNS record info for automatic addition
			const response = await apiGet(`/mail/dkim/dns/${selectedDomain}?print_record=true`);
			const data = response as Record<string, unknown>;
			const dnsRecordName = data.dkim_dns_record as string;
			const dnsRecordContent = data.dkim_dns_key as string;

			// Automatically add the DNS record
			await apiPost('/dns/add/record', {
				dns_domain: selectedDomain,
				dns_record: dnsRecordName,
				dns_record_type: 'TXT',
				dns_target: dnsRecordContent
			});

			showDkimModal = false;
			addToast({
				type: 'success',
				message: 'DKIM signing completed and DNS record added automatically'
			});

			// Reload email domains to update DKIM status
			await loadEmailDomains();
		} catch (error) {
			console.error('Error signing domain and adding DNS record:', error);
			addToast({
				type: 'error',
				message: 'Failed to sign domain and add DNS record'
			});
		} finally {
			dkimModalLoading = false;
		}
	}

	async function handleSignAndShow() {
		dkimModalLoading = true;
		try {
			// Sign the domain
			await apiPost('/mail/dkim/sign', { domain: selectedDomain });

			// Get DNS record after signing
			await loadDkimDnsRecord();

			showDkimModal = false;
			addToast({
				type: 'success',
				message: 'DKIM signing completed. Please add the DNS record manually.'
			});

			// Reload email domains to update DKIM status
			await loadEmailDomains();
		} catch (error) {
			console.error('Error signing domain:', error);
			addToast({
				type: 'error',
				message: 'Failed to sign domain'
			});
		} finally {
			dkimModalLoading = false;
		}
	}

	async function loadDkimDnsRecord() {
		try {
			const response = await apiGet(`/mail/dkim/dns/${selectedDomain}?print_record=true`);
			const data = response as Record<string, unknown>;

			// Set separate DNS record values
			dnsRecordName = data.dkim_dns_record as string;
			dnsRecordContent = data.dkim_dns_key as string;

			// Keep the formatted version for backward compatibility
			dnsRecord = `DNS record:\n${dnsRecordName}\n\nDNS record content:\n${dnsRecordContent}`;

			showDkimDnsModal = true;
		} catch (error) {
			console.error('Error loading DKIM DNS record:', error);
			addToast({
				type: 'error',
				message: 'Failed to load DKIM DNS record'
			});
		}
	}

	async function handleUnsignDomain() {
		dkimDnsModalLoading = true;
		try {
			await apiDelete(`/mail/dkim/unsign/${selectedDomain}`);

			showDkimDnsModal = false;
			selectedDomain = '';
			dnsRecord = '';
			dnsRecordName = '';
			dnsRecordContent = '';

			// Reload email domains to update DKIM status
			await loadEmailDomains();

			addToast({
				type: 'success',
				message: 'Domain unsigned successfully'
			});
		} catch (error) {
			console.error('Error unsigning domain:', error);
			addToast({
				type: 'error',
				message: 'Failed to unsign domain'
			});
		} finally {
			dkimDnsModalLoading = false;
		}
	}

	function handleDkimModalCancel() {
		showDkimModal = false;
		selectedDomain = '';
	}

	function handleDkimDnsModalClose() {
		showDkimDnsModal = false;
		selectedDomain = '';
		dnsRecord = '';
		dnsRecordName = '';
		dnsRecordContent = '';
	}

	function handleOptionsAction(item: Record<string, unknown>) {
		selectedDomainForOptions = item.domain as string;

		// Populate modal with current option values
		optionRbl = Boolean(item.option_rbl);
		optionSpamfilter = Boolean(item.option_spamfilter);
		optionRestrictspf =
			(item.option_restrictspf as number) === 1
				? 'on'
				: (item.option_restrictspf as number) === 2
					? 'reject'
					: 'off';
		optionMovespam = Boolean(item.option_movespam);
		optionAllownets = (item.option_allownets as string) || '';
		optionHidesenderip = Boolean(item.option_hidesenderip);

		// Capture original values for change detection (using API format)
		originalOptionValues = {
			rbl: optionRbl ? 'on' : 'off',
			spamfilter: optionSpamfilter ? 'on' : 'off',
			restrictspf: optionRestrictspf, // already 'on', 'off', or 'reject'
			movespam: optionMovespam ? 'on' : 'off',
			allownets: optionAllownets,
			hidesenderip: optionHidesenderip ? 'on' : 'off'
		};

		showOptionsModal = true;
	}

	async function handleOptionsSubmit(event: CustomEvent) {
		const { domain, options } = event.detail;

		// If no options to update, show message and close modal
		if (!options || options.length === 0) {
			addToast({
				type: 'info',
				message: 'No changes were made to email options'
			});
			showOptionsModal = false;
			return;
		}

		optionsModalLoading = true;

		try {
			// Send individual requests for each option
			const promises = options.map(async (optionData: { option: string; value: string }) => {
				return apiPut('/mail/options', {
					email_domain: domain,
					option: optionData.option,
					value: optionData.value
				});
			});

			// Wait for all requests to complete
			await Promise.all(promises);

			addToast({
				type: 'success',
				message: `Updated ${options.length} email option${options.length > 1 ? 's' : ''} successfully for ${domain}`
			});

			showOptionsModal = false;

			// Refresh the email domains list to show updated options
			await loadEmailDomains();
		} catch (error) {
			console.error('Error updating email options:', error);
			addToast({
				type: 'error',
				message: 'Failed to update email options'
			});
		} finally {
			optionsModalLoading = false;
		}
	}

	function handleOptionsModalCancel() {
		showOptionsModal = false;
		selectedDomainForOptions = '';
	}

	function handleAddEmailAccount() {
		showAddModal = true;
	}

	async function handleAccountSubmit(event: CustomEvent) {
		const { email_mailbox, password } = event.detail;
		addModalLoading = true;

		try {
			await apiPost('/mail/account/add', {
				email_mailbox,
				password
			});

			addToast({
				type: 'success',
				message: `Email account ${email_mailbox} created successfully`
			});

			showAddModal = false;

			// Refresh the email domains list to show updated mailbox counts
			await loadEmailDomains();
		} catch (error) {
			console.error('Error creating email account:', error);
			addToast({
				type: 'error',
				message: 'Failed to create email account'
			});
		} finally {
			addModalLoading = false;
		}
	}

	function handleAddAlias() {
		showAliasModal = true;
	}

	async function handleAliasSubmit(event: CustomEvent) {
		const { email_from, email_to } = event.detail;
		aliasModalLoading = true;

		try {
			// Check if this is a catch-all alias (starts with @)
			const isCatchAll = email_from.startsWith('@');

			await apiPost('/mail/alias/add', {
				email_from,
				email_to
			});

			if (isCatchAll) {
				const domain = email_from.substring(1); // Remove the @ prefix
				addToast({
					type: 'success',
					message: `Catch-all alias for ${domain} → ${email_to} created successfully`
				});
			} else {
				addToast({
					type: 'success',
					message: `Alias ${email_from} → ${email_to} created successfully`
				});
			}

			showAliasModal = false;

			// Refresh the email domains list to show updated alias counts
			await loadEmailDomains();
		} catch (error) {
			console.error('Error creating email alias:', error);
			addToast({
				type: 'error',
				message: 'Failed to create email alias'
			});
		} finally {
			aliasModalLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Email - devil WEB</title>
</svelte:head>

<div class="space-y-6">
	<ResourceList
		title="Email Domains"
		items={emailDomains}
		{loading}
		{columns}
		{actions}
		searchPlaceholder="Search email domains..."
		addButtonLabel="Add Email Domain"
		showAddButton={false}
		on:action={handleAction}
	>
		<div slot="header-actions" class="flex items-center gap-3">
			<button
				class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium text-sm rounded-lg border border-transparent transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-dark-900 shadow-xs hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
				on:click={handleAddEmailAccount}
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
				<span class="whitespace-nowrap">Add Email</span>
			</button>
			<button
				class="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium text-sm rounded-lg border border-transparent transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-dark-900 shadow-xs hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
				on:click={handleAddAlias}
				disabled={loading}
				type="button"
			>
				<svg class="w-4 h-4 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
					></path>
				</svg>
				<span class="whitespace-nowrap">Add Alias</span>
			</button>
			<button
				class="inline-flex items-center px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-medium text-sm rounded-lg border border-transparent transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-dark-900 shadow-xs hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
				on:click={handleManageWhitelist}
				disabled={loading}
				type="button"
			>
				<svg class="w-4 h-4 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
					></path>
				</svg>
				<span class="whitespace-nowrap">Manage Whitelist</span>
			</button>
		</div>
	</ResourceList>
</div>

<!-- DKIM Confirmation Modal -->
<DkimModal
	showModal={showDkimModal}
	domain={selectedDomain}
	loading={dkimModalLoading}
	on:signAndAdd={handleSignAndAdd}
	on:signAndShow={handleSignAndShow}
	on:cancel={handleDkimModalCancel}
/>

<!-- DKIM DNS Record Modal -->
<DkimDnsModal
	showModal={showDkimDnsModal}
	domain={selectedDomain}
	{dnsRecord}
	{dnsRecordName}
	{dnsRecordContent}
	loading={dkimDnsModalLoading}
	on:unsign={handleUnsignDomain}
	on:close={handleDkimDnsModalClose}
/>

<!-- Email Account Add Modal -->
<MailAccountAddModal
	showModal={showAddModal}
	loading={addModalLoading}
	on:cancel={() => (showAddModal = false)}
	on:submit={handleAccountSubmit}
/>

<!-- Email Alias Add Modal -->
<MailAliasAddModal
	showModal={showAliasModal}
	loading={aliasModalLoading}
	on:cancel={() => (showAliasModal = false)}
	on:submit={handleAliasSubmit}
/>

<!-- Email Options Modal -->
<EmailOptionsModal
	showModal={showOptionsModal}
	loading={optionsModalLoading}
	domain={selectedDomainForOptions}
	bind:optionRbl
	bind:optionSpamfilter
	bind:optionRestrictspf
	bind:optionMovespam
	bind:optionAllownets
	bind:optionHidesenderip
	{originalOptionValues}
	on:cancel={handleOptionsModalCancel}
	on:submit={handleOptionsSubmit}
/>
