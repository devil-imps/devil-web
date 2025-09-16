<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let showModal: boolean = false;
	export let certificate: Record<string, unknown> | null = null;

	const dispatch = createEventDispatcher<{
		close: void;
	}>();

	function closeModal() {
		dispatch('close');
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeModal();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showModal && certificate}
	<!-- Modal Backdrop -->
	<div
		class="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
	>
		<!-- Modal Container -->
		<div
			class="bg-white dark:bg-dark-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
			role="document"
		>
			<!-- Modal Header -->
			<div
				class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-700"
			>
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 bg-devil-500 rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
							<path
								d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM12 7C16.42 7 20 8.79 20 11C20 12.1 19.1 13 18 13H17.91C17.5 13 17.19 13.3 17.09 13.69C16.43 16.22 14.46 18.11 12 18.11C9.54 18.11 7.57 16.22 6.91 13.69C6.81 13.3 6.5 13 6.09 13H6C4.9 13 4 12.1 4 11C4 8.79 7.58 7 12 7Z"
							/>
						</svg>
					</div>
					<div>
						<h2 id="modal-title" class="text-xl font-bold text-gray-900 dark:text-white">
							SSL Certificate Details
						</h2>
						<p class="text-sm text-gray-600 dark:text-gray-400">
							{certificate.domain}
						</p>
					</div>
				</div>
				<button
					on:click={closeModal}
					class="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg"
					aria-label="Close modal"
				>
					<svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						></path>
					</svg>
				</button>
			</div>

			<!-- Modal Content -->
			<div class="p-6">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<!-- Left Column -->
					<div class="space-y-4">
						<div>
							<h4 class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Domain
							</h4>
							<div class="p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
								<p class="text-sm font-mono text-gray-900 dark:text-white">
									{certificate.domain || 'N/A'}
								</p>
							</div>
						</div>

						<div>
							<h4 class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Certificate Type
							</h4>
							<div class="p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
								<p class="text-sm font-medium text-blue-600 dark:text-blue-400">
									{certificate.certType || 'Unknown'}
								</p>
							</div>
						</div>

						<div>
							<h4 class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								IP Address
							</h4>
							<div class="p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
								<p class="text-sm font-mono text-gray-900 dark:text-white">
									{certificate.ip__ip || 'N/A'}
								</p>
							</div>
						</div>

						<div>
							<h4 class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Status
							</h4>
							<div class="p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
								<p class="text-sm font-medium text-green-600 dark:text-green-400">
									{certificate.status || 'Unknown'}
								</p>
							</div>
						</div>
					</div>

					<!-- Right Column -->
					<div class="space-y-4">
						<div>
							<h4 class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Issued Date & Time
							</h4>
							<div class="p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
								<p class="text-sm text-gray-900 dark:text-white">
									{certificate.cert_issued
										? new Date(String(certificate.cert_issued)).toLocaleString('en-US', {
												year: 'numeric',
												month: '2-digit',
												day: '2-digit',
												hour: '2-digit',
												minute: '2-digit',
												second: '2-digit',
												hour12: true
											})
										: 'N/A'}
								</p>
							</div>
						</div>

						<div>
							<h4 class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Expiry Date & Time
							</h4>
							<div class="p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
								<p class="text-sm text-gray-900 dark:text-white">
									{certificate.cert_expires
										? new Date(String(certificate.cert_expires)).toLocaleString('en-US', {
												year: 'numeric',
												month: '2-digit',
												day: '2-digit',
												hour: '2-digit',
												minute: '2-digit',
												second: '2-digit',
												hour12: true
											})
										: 'N/A'}
								</p>
							</div>
						</div>

						<div>
							<h4 class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								SHA1 Fingerprint
							</h4>
							<div class="p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
								<p class="text-xs font-mono text-gray-900 dark:text-white break-all">
									{certificate.cert_sha1 || 'N/A'}
								</p>
							</div>
						</div>

						<div>
							<h4 class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Common Name
							</h4>
							<div class="p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
								<p class="text-sm font-mono text-gray-900 dark:text-white">
									{certificate.cert_cn || 'N/A'}
								</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Let's Encrypt Notice -->
				{#if certificate.le !== null && certificate.le !== undefined}
					<div
						class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
					>
						<div class="flex items-center gap-2">
							<svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
								<path
									d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM12 7C16.42 7 20 8.79 20 11C20 12.1 19.1 13 18 13H17.91C17.5 13 17.19 13.3 17.09 13.69C16.43 16.22 14.46 18.11 12 18.11C9.54 18.11 7.57 16.22 6.91 13.69C6.81 13.3 6.5 13 6.09 13H6C4.9 13 4 12.1 4 11C4 8.79 7.58 7 12 7Z"
								/>
							</svg>
							<p class="text-sm text-blue-800 dark:text-blue-200">
								This is a Let's Encrypt certificate, automatically renewed by the system.
							</p>
						</div>
					</div>
				{/if}
			</div>

			<!-- Modal Footer -->
			<div
				class="flex justify-end p-6 border-t border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-700"
			>
				<button
					on:click={closeModal}
					class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}
