<script lang="ts">
	import { onMount } from 'svelte';
	import { navigateTo } from '$lib/utils';
	import { addToast } from '$lib/stores/appState';
	import { apiGet, apiDelete } from '$lib/utils';
	import ResourceList from '$lib/components/ResourceList.svelte';
	import ConfirmationModal from '$lib/components/modals/ConfirmationModal.svelte';
	import SslDetailsModal from '$lib/components/modals/SslDetailsModal.svelte';
	import SslAddModal from '$lib/components/modals/add/SslAddModal.svelte';

	// Accept params prop to suppress SvelteKit warning
	export const params: Record<string, string> = {};

	let sslCertificates: Record<string, unknown>[] = [];
	let loading = true;
	let showCertificateModal = false;
	let selectedCertificate: Record<string, unknown> | null = null;
	let showGenerateModal = false;
	let showDeleteModal = false;
	let deleteModalLoading = false;
	let certificateToDelete: Record<string, unknown> | null = null;

	const columns = [
		{ key: 'domain', label: 'Domain', type: 'text' as const },
		{ key: 'certType', label: 'Type', type: 'badge' as const },
		{ key: 'ip__ip', label: 'IP Address', type: 'text' as const },
		{ key: 'cert_issued', label: 'Issued', type: 'date' as const },
		{ key: 'cert_expires', label: 'Expires', type: 'date' as const },
		{ key: 'status', label: 'Status', type: 'badge' as const }
	];

	const actions = [
		{ label: 'Details', action: 'view', variant: 'secondary' as const },
		{ label: 'Delete', action: 'delete', variant: 'danger' as const, requiresConfirmation: true }
	];

	// Load SSL certificates on mount
	onMount(() => {
		loadSslCertificates();
	});

	async function loadSslCertificates() {
		loading = true;
		try {
			const data = (await apiGet('/ssl/www/list')) as { www_certs?: Record<string, unknown>[] };
			sslCertificates = data.www_certs || [];

			// Transform data for display
			sslCertificates = sslCertificates.map((cert) => ({
				...cert,
				domain: cert.domain, // Remove the Let's Encrypt text from domain
				certType: getCertificateType(cert.le),
				status: determineStatus(cert.cert_expires as string)
			}));
		} catch (error) {
			console.error('Error loading SSL certificates:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to load SSL certificates'
			});
		} finally {
			loading = false;
		}
	}

	function getCertificateType(le: unknown): string {
		// If le field is not null, it's a Let's Encrypt certificate
		if (le !== null && le !== undefined) {
			return "Let's Encrypt";
		}

		return 'Custom';
	}

	function determineStatus(expiresAt: string): string {
		if (!expiresAt) return 'Unknown';

		const expiryDate = new Date(expiresAt);
		const now = new Date();
		const daysUntilExpiry = Math.ceil(
			(expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
		);

		if (daysUntilExpiry < 0) {
			return 'Expired';
		} else if (daysUntilExpiry <= 30) {
			return 'Expiring Soon';
		} else {
			return 'Valid';
		}
	}

	function handleAction(event: CustomEvent<{ action: string; item: Record<string, unknown> }>) {
		const { action, item } = event.detail;

		switch (action) {
			case 'add':
				showGenerateModal = true;
				break;
			case 'view':
				selectedCertificate = item;
				showCertificateModal = true;
				break;
		}
	}

	function handleConfirmAction(
		event: CustomEvent<{ action: string; item: Record<string, unknown> }>
	) {
		const { action, item } = event.detail;

		switch (action) {
			case 'delete':
				certificateToDelete = item;
				showDeleteModal = true;
				break;
		}
	}

	async function deleteCertificate(certificate: Record<string, unknown>) {
		deleteModalLoading = true;
		try {
			// Build the delete URL with optional domain parameter for SNI certificates
			let deleteUrl = `/ssl/www/${certificate.ip__ip}`;
			if (certificate.domain) {
				deleteUrl += `?domain=${encodeURIComponent(certificate.domain as string)}`;
			}

			await apiDelete(deleteUrl);

			addToast({
				type: 'success',
				message: `SSL certificate for ${certificate.domain} deleted successfully`
			});
			loadSslCertificates();
			showDeleteModal = false;
			certificateToDelete = null;
		} catch (error) {
			console.error('Error deleting certificate:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to delete certificate'
			});
		} finally {
			deleteModalLoading = false;
		}
	}

	function closeCertificateModal() {
		showCertificateModal = false;
		selectedCertificate = null;
	}

	function closeGenerateModal() {
		showGenerateModal = false;
	}

	function handleCertificateGenerated() {
		loadSslCertificates();
	}

	function handleDeleteConfirm() {
		if (certificateToDelete) {
			deleteCertificate(certificateToDelete);
		}
	}

	function handleDeleteCancel() {
		showDeleteModal = false;
		certificateToDelete = null;
		deleteModalLoading = false;
	}
</script>

<svelte:head>
	<title>SSL Certificates (WWW) - devil WEB</title>
</svelte:head>

<ResourceList
	title="SSL Certificates (WWW)"
	items={sslCertificates}
	{loading}
	{columns}
	{actions}
	searchPlaceholder="Search SSL certificates..."
	addButtonLabel="Generate Let's Encrypt"
	on:action={handleAction}
	on:confirmAction={handleConfirmAction}
/>

<SslDetailsModal
	showModal={showCertificateModal}
	certificate={selectedCertificate}
	on:close={closeCertificateModal}
/>

<SslAddModal
	showModal={showGenerateModal}
	on:close={closeGenerateModal}
	on:certificateGenerated={handleCertificateGenerated}
/>

<ConfirmationModal
	showModal={showDeleteModal}
	title="Delete SSL Certificate"
	message={certificateToDelete
		? `Are you sure you want to delete the SSL certificate for "${certificateToDelete.domain}"? This action cannot be undone.`
		: ''}
	confirmText="Delete Certificate"
	cancelText="Cancel"
	confirmVariant="danger"
	loading={deleteModalLoading}
	on:confirm={handleDeleteConfirm}
	on:cancel={handleDeleteCancel}
/>
