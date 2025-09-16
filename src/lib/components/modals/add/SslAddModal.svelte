<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { addToast } from '$lib/stores/appState';
	import { apiGet, apiPost } from '$lib/utils';

	export let showModal: boolean = false;

	const dispatch = createEventDispatcher<{
		close: void;
		certificateGenerated: Record<string, unknown>;
	}>();

	let websites: Record<string, unknown>[] = [];
	let availableIPs: string[] = [];
	let availableIPObjects: Record<string, unknown>[] = [];
	let selectedWebsite: Record<string, unknown> | null = null;
	let selectedDomain: string = '';
	let selectedIP: string = '';
	let loadingWebsites = true;
	let loadingIPs = true;
	let generating = false;

	// Load websites and IPs when modal opens
	let websitesLoaded = false;

	$: if (showModal && !websitesLoaded) {
		loadWebsites();
		websitesLoaded = true;
	}

	// Update selectedWebsite when selectedDomain changes
	$: if (selectedDomain) {
		selectedWebsite = websites.find((website) => website.domain === selectedDomain) || null;
	}

	async function loadWebsites() {
		loadingWebsites = true;
		try {
			const data = await apiGet<{ websites?: Record<string, unknown>[] }>('/www/list');
			websites = data.websites || [];

			// Also load available IPs
			await loadIPs();
		} catch (error) {
			console.error('Error loading websites:', error);
			addToast({
				type: 'error',
				message: 'Failed to load websites'
			});
		} finally {
			loadingWebsites = false;
		}
	}

	async function loadIPs() {
		loadingIPs = true;
		try {
			const data = await apiGet<{
				private?: Record<string, unknown>[];
				public?: Record<string, unknown>[];
			}>('/vhost/list');

			// Store full IP objects for detailed information
			availableIPObjects = [
				...(data.private || []).map((ip) => ({ ...ip, type: 'private' })),
				...(data.public || []).map((ip) => ({ ...ip, type: 'public' }))
			];

			// Extract IP addresses from the response, preferring public IPs but including both
			// Filter out IPs with revdns starting with "s"
			const publicIPs = (data.public || [])
				.filter((item: Record<string, unknown>) => {
					const revdns = item.revdns as string;
					return !revdns.startsWith('s');
				})
				.map((item: Record<string, unknown>) => item.ip as string)
				.filter(Boolean);

			const privateIPs = (data.private || [])
				.map((item: Record<string, unknown>) => item.ip as string)
				.filter(Boolean);

			// Combine public IPs first, then private IPs
			availableIPs = [...publicIPs, ...privateIPs];
		} catch (error) {
			console.error('Error loading IPs:', error);
			addToast({
				type: 'error',
				message: 'Failed to load available IP addresses'
			});
		} finally {
			loadingIPs = false;
		}
	}
	async function generateCertificate() {
		if (!selectedWebsite) {
			addToast({
				type: 'error',
				message: 'Please select a website'
			});
			return;
		}

		if (!selectedIP) {
			addToast({
				type: 'error',
				message: 'Please select an IP address'
			});
			return;
		}

		generating = true;
		try {
			const response = await apiPost<Record<string, unknown>>('/ssl/www/add', {
				ssl_ip: selectedIP,
				domain: selectedWebsite.domain,
				le: true
			});

			addToast({
				type: 'success',
				message: `Let's Encrypt certificate generated successfully for ${selectedWebsite.domain}`
			});

			dispatch('certificateGenerated', response);
			closeModal();
		} catch (error) {
			console.error('Error generating certificate:', error);
			addToast({
				type: 'error',
				message: 'Failed to generate certificate'
			});
		} finally {
			generating = false;
		}
	}

	function getIPDisplayInfo(ip: string): string {
		const ipObject = availableIPObjects.find((item: Record<string, unknown>) => item.ip === ip);

		if (ipObject?.revdns) {
			return `(${ipObject.revdns})`;
		}
		return '';
	}

	function closeModal() {
		selectedWebsite = null;
		selectedDomain = '';
		selectedIP = '';
		dispatch('close');
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeModal();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showModal}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
		style="z-index: 9999;"
	>
		<!-- Modal Container -->
		<div
			class="bg-white dark:bg-dark-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full max-h-[90vh] overflow-y-auto"
		>
			<div class="p-6">
				<!-- Modal Header -->
				<div class="flex justify-between items-center mb-6">
					<h2 class="text-xl font-bold text-gray-900 dark:text-white">Generate SSL Certificate</h2>
					<button
						on:click={closeModal}
						class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
						type="button"
						aria-label="Close modal"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							></path>
						</svg>
					</button>
				</div>

				<!-- Modal Body -->
				{#if loadingWebsites}
					<div class="flex items-center justify-center py-8">
						<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-devil-500"></div>
						<span class="ml-3 text-gray-600 dark:text-gray-400">Loading websites...</span>
					</div>
				{:else}
					<div class="space-y-4">
						<div>
							<label
								for="website-select"
								class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
							>
								Select Website
							</label>
							<select
								id="website-select"
								bind:value={selectedDomain}
								class="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-devil-500 focus:border-transparent"
							>
								<option value="">Choose a website...</option>
								{#each websites as website (website.domain)}
									<option value={website.domain}>
										{website.domain}
									</option>
								{/each}
							</select>
						</div>

						<div>
							<label
								for="ip-select"
								class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
							>
								Select IP Address
							</label>
							{#if loadingIPs}
								<div class="flex items-center py-2">
									<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-devil-500"></div>
									<span class="ml-3 text-gray-600 dark:text-gray-400">Loading IP addresses...</span>
								</div>
							{:else}
								<select
									id="ip-select"
									bind:value={selectedIP}
									class="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-devil-500 focus:border-transparent"
									disabled={availableIPs.length === 0}
								>
									<option value="">Choose an IP address...</option>
									{#each availableIPs as ip (ip)}
										<option value={ip}>
											{ip}
											{getIPDisplayInfo(ip)}
										</option>
									{/each}
								</select>
								{#if availableIPs.length === 0}
									<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
										No IP addresses available
									</p>
								{/if}
							{/if}
						</div>

						<div class="bg-gray-50 dark:bg-dark-700 rounded-lg p-4">
							<h4 class="text-sm font-medium text-gray-900 dark:text-white mb-2">
								Certificate Details
							</h4>
							<div class="space-y-1 text-sm text-gray-600 dark:text-gray-400">
								<p><strong>Domain:</strong> {selectedWebsite?.domain || 'Not selected'}</p>
								<p><strong>IP Address:</strong> {selectedIP || 'Not selected'}</p>
								<p><strong>Type:</strong> Let's Encrypt (Free)</p>
								<p><strong>Valid for:</strong> 90 days (auto-renewal)</p>
							</div>
						</div>
					</div>

					<!-- Modal Footer -->
					<div class="flex items-center justify-end gap-3 mt-6">
						<button
							on:click={closeModal}
							class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-600 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
						>
							Cancel
						</button>
						<button
							on:click={generateCertificate}
							disabled={!selectedWebsite || !selectedIP || generating}
							class="px-4 py-2 bg-devil-500 text-white rounded-lg hover:bg-devil-600 focus:ring-2 focus:ring-devil-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
						>
							{#if generating}
								<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
								Generating...
							{:else}
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 6v6m0 0v6m0-6h6m-6 0H6"
									></path>
								</svg>
								Generate Certificate
							{/if}
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
