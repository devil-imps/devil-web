<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let showModal: boolean = false;
	export let loading: boolean = false;

	let record: string = '';
	let dnsType: string = 'A';
	let content: string = '';
	let ttl: number = 3600;
	let prio: number | null = null;
	let weight: number | null = null;
	let caaTag: string = '';

	// DNS record types
	const dnsTypes = [
		{ value: 'A', label: 'A (IPv4 Address)' },
		{ value: 'AAAA', label: 'AAAA (IPv6 Address)' },
		{ value: 'CNAME', label: 'CNAME (Canonical Name)' },
		{ value: 'MX', label: 'MX (Mail Exchange)' },
		{ value: 'TXT', label: 'TXT (Text Record)' },
		{ value: 'SRV', label: 'SRV (Service Record)' },
		{ value: 'NS', label: 'NS (Name Server)' },
		{ value: 'CAA', label: 'CAA (Certification Authority Authorization)' }
	];

	const dispatch = createEventDispatcher();

	function closeModal() {
		if (!loading) {
			resetForm();
			dispatch('cancel');
		}
	}

	// Export resetForm function so parent can call it
	export function resetForm() {
		record = '';
		dnsType = 'A';
		content = '';
		ttl = 3600;
		prio = null; // Will be set to 10 if MX is selected via reactive statement
		weight = null;
		caaTag = '';
	}

	function handleSubmit() {
		const trimmedRecord = record.trim();
		const trimmedContent = content.trim();

		if (!trimmedRecord || !trimmedContent) {
			return; // Don't submit if required fields are empty
		}

		const recordData = {
			dns_domain: trimmedRecord,
			dns_type: dnsType,
			content: trimmedContent,
			ttl: ttl,
			...(prio !== null && prio !== undefined && { prio }),
			...(weight !== null && weight !== undefined && { weight }),
			...(caaTag && caaTag.trim() && { caaTag: caaTag.trim() })
		};

		dispatch('submit', recordData);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && !loading) {
			closeModal();
		}
		if (event.key === 'Enter' && !loading && canSubmit) {
			handleSubmit();
		}
	}

	// Show priority field for MX and SRV records
	$: showPriority = dnsType === 'MX' || dnsType === 'SRV';

	// Show weight field for SRV records
	$: showWeight = dnsType === 'SRV';

	// Show CAA tag field for CAA records
	$: showCaaTag = dnsType === 'CAA';

	// Set default priority for MX records
	$: if (dnsType === 'MX' && prio === null) {
		prio = 10;
	} else if (dnsType !== 'MX' && dnsType !== 'SRV' && prio === 10) {
		prio = null;
	}

	$: canSubmit = !!record.trim() && !!content.trim() && ttl > 0;
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
			class="bg-white dark:bg-dark-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-w-lg w-full max-h-[90vh] overflow-y-auto"
		>
			<div class="p-6">
				<div class="flex justify-between items-center mb-6">
					<h2 class="text-xl font-bold text-gray-900 dark:text-white">Add DNS Record</h2>
					{#if !loading}
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
					{/if}
				</div>

				<form on:submit|preventDefault={handleSubmit} class="space-y-4">
					<!-- Record Name Input -->
					<div>
						<label
							for="record"
							class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
						>
							Record Name
						</label>
						<input
							type="text"
							id="record"
							bind:value={record}
							placeholder="www or @ for root"
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
							disabled={loading}
							required
						/>
						<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
							Use @ for root domain record
						</p>
					</div>

					<!-- DNS Type Selection -->
					<div>
						<label
							for="dnsType"
							class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
						>
							Record Type
						</label>
						<select
							id="dnsType"
							bind:value={dnsType}
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
							disabled={loading}
						>
							{#each dnsTypes as type (type.value)}
								<option value={type.value}>{type.label}</option>
							{/each}
						</select>
					</div>

					<!-- Content/Target Input -->
					<div>
						<label
							for="content"
							class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
						>
							Content/Target
						</label>
						<input
							type="text"
							id="content"
							bind:value={content}
							placeholder={dnsType === 'A'
								? '192.168.1.1'
								: dnsType === 'CNAME'
									? 'target.domain.com'
									: 'value'}
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
							disabled={loading}
							required
						/>
					</div>

					<!-- TTL Input -->
					<div>
						<label
							for="ttl"
							class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
						>
							TTL (Time To Live)
						</label>
						<input
							type="number"
							id="ttl"
							bind:value={ttl}
							min="60"
							max="86400"
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
							disabled={loading}
							required
						/>
						<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
							Time in seconds (3600 = 1 hour)
						</p>
					</div>

					<!-- Priority (for MX and SRV records) -->
					{#if showPriority}
						<div>
							<label
								for="prio"
								class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
							>
								Priority
							</label>
							<input
								type="number"
								id="prio"
								bind:value={prio}
								min="0"
								max="65535"
								placeholder="10"
								class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
								disabled={loading}
							/>
							<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
								Lower values have higher priority
							</p>
						</div>
					{/if}

					<!-- Weight (for SRV records) -->
					{#if showWeight}
						<div>
							<label
								for="weight"
								class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
							>
								Weight
							</label>
							<input
								type="number"
								id="weight"
								bind:value={weight}
								min="0"
								max="65535"
								placeholder="0"
								class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
								disabled={loading}
							/>
							<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
								Relative weight for load balancing
							</p>
						</div>
					{/if}

					<!-- CAA Tag (for CAA records) -->
					{#if showCaaTag}
						<div>
							<label
								for="caaTag"
								class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
							>
								CAA Tag
							</label>
							<select
								id="caaTag"
								bind:value={caaTag}
								class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
								disabled={loading}
							>
								<option value="">Select CAA tag...</option>
								<option value="issue">issue</option>
								<option value="issuewild">issuewild</option>
								<option value="iodef">iodef</option>
								<option value="contactemail">contactemail</option>
								<option value="contactphone">contactphone</option>
							</select>
							<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
								CAA policy tag for certificate authorities
							</p>
						</div>
					{/if}
				</form>

				<div class="flex justify-end space-x-3 mt-6">
					<button on:click={closeModal} disabled={loading} class="btn-secondary"> Cancel </button>
					<button
						on:click={handleSubmit}
						disabled={loading || !canSubmit}
						class="btn-primary {loading || !canSubmit ? 'opacity-50 cursor-not-allowed' : ''}"
					>
						{#if loading}
							<svg class="animate-spin h-4 w-4 mr-2 inline" fill="none" viewBox="0 0 24 24">
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
						{/if}
						Add DNS Record
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
