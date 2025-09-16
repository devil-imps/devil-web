<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { addToast } from '$lib/stores/appState';

	export let showModal: boolean = false;
	export let loading: boolean = false;

	// Form fields
	let wwwDomain: string = '';
	let wwwType: string = 'php';
	let pointerTarget: string = '';
	let proxyTarget: string = '';
	let proxyPort: string = '';
	let passengerBinary: string = '';
	let wwwEnvironment: string = 'production';

	// UI state
	let isFirstOpen: boolean = true;

	const dispatch = createEventDispatcher();

	// Website type options
	const websiteTypes = [
		{ value: 'php', label: 'PHP' },
		{ value: 'python', label: 'Python' },
		{ value: 'ruby', label: 'Ruby' },
		{ value: 'nodejs', label: 'Node.js' },
		{ value: 'proxy', label: 'Proxy' },
		{ value: 'pointer', label: 'Pointer' }
	];

	// Environment options for Python/Node.js/Ruby
	const environmentOptions = [
		{ value: 'production', label: 'Production' },
		{ value: 'staging', label: 'Staging' },
		{ value: 'development', label: 'Development' },
		{ value: 'test', label: 'Test' }
	];

	// Reset form only when modal is first opened, not when reopening after error
	$: if (showModal && !loading && isFirstOpen) {
		resetForm();
		isFirstOpen = false;
	}

	// Reset first open flag when modal is closed
	$: if (!showModal) {
		isFirstOpen = true;
	}

	// Reset conditional fields when type changes
	$: if (wwwType !== 'pointer') {
		pointerTarget = '';
	}
	$: if (wwwType !== 'proxy') {
		proxyTarget = '';
		proxyPort = '';
	}
	$: if (!['python', 'ruby', 'nodejs'].includes(wwwType)) {
		passengerBinary = '';
		wwwEnvironment = 'production';
	}

	function closeModal() {
		if (!loading) {
			resetForm();
			dispatch('cancel');
		}
	}

	function resetForm() {
		wwwDomain = '';
		wwwType = 'php';
		pointerTarget = '';
		proxyTarget = '';
		proxyPort = '';
		passengerBinary = '';
		wwwEnvironment = 'production';
	}

	function handleSubmit() {
		if (!wwwDomain.trim()) {
			addToast({
				type: 'error',
				message: 'Domain name is required'
			});
			return;
		}

		// Validate conditional fields
		if (wwwType === 'pointer' && !pointerTarget.trim()) {
			addToast({
				type: 'error',
				message: 'Pointer target is required for pointer type'
			});
			return;
		}

		if (wwwType === 'proxy') {
			if (!proxyTarget.trim()) {
				addToast({
					type: 'error',
					message: 'Proxy target is required for proxy type'
				});
				return;
			}
			if (!proxyPort.trim() || isNaN(Number(proxyPort))) {
				addToast({
					type: 'error',
					message: 'Valid proxy port is required for proxy type'
				});
				return;
			}
		}

		if (['python', 'ruby', 'nodejs'].includes(wwwType) && !passengerBinary.trim()) {
			addToast({
				type: 'error',
				message: 'Passenger binary is required for this website type'
			});
			return;
		}

		// Prepare data object
		const data: Record<string, unknown> = {
			www_domain: wwwDomain.trim()
		};

		if (wwwType) {
			data.www_type = wwwType;
		}

		if (pointerTarget.trim()) {
			data.pointer_target = pointerTarget.trim();
		}

		if (proxyTarget.trim()) {
			data.proxy_target = proxyTarget.trim();
		}

		if (proxyPort.trim()) {
			data.proxy_port = Number(proxyPort.trim());
		}

		if (passengerBinary.trim()) {
			data.passenger_binary = passengerBinary.trim();
		}

		if (wwwEnvironment) {
			data.www_environment = wwwEnvironment;
		}

		dispatch('submit', data);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !loading && wwwDomain.trim()) {
			handleSubmit();
		}
	}
</script>

{#if showModal}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
		<div
			class="bg-white dark:bg-dark-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-w-lg w-full max-h-[90vh] overflow-y-auto"
		>
			<div class="p-6">
				<div class="flex justify-between items-center mb-6">
					<h2 class="text-xl font-bold text-gray-900 dark:text-white">Add Website</h2>
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
					<div>
						<label
							for="wwwDomain"
							class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
						>
							Domain Name
						</label>
						<input
							type="text"
							id="wwwDomain"
							bind:value={wwwDomain}
							placeholder="example.com"
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
							disabled={loading}
							required
							on:keydown={handleKeydown}
						/>
						<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
							Enter the domain name for the website
						</p>
					</div>

					<div>
						<label
							for="wwwType"
							class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
						>
							Website Type
						</label>
						<select
							id="wwwType"
							bind:value={wwwType}
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
							disabled={loading}
						>
							{#each websiteTypes as type (type.value)}
								<option value={type.value}>{type.label}</option>
							{/each}
						</select>
						<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Select the type of website</p>
					</div>

					{#if wwwType === 'pointer'}
						<div>
							<label
								for="pointerTarget"
								class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
							>
								Pointer Target
							</label>
							<input
								type="text"
								id="pointerTarget"
								bind:value={pointerTarget}
								placeholder="target-domain.com"
								class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
								disabled={loading}
								required
								on:keydown={handleKeydown}
							/>
							<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Domain to redirect to</p>
						</div>
					{/if}

					{#if wwwType === 'proxy'}
						<div>
							<label
								for="proxyTarget"
								class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
							>
								Proxy Target
							</label>
							<input
								type="text"
								id="proxyTarget"
								bind:value={proxyTarget}
								placeholder="localhost"
								class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
								disabled={loading}
								required
								on:keydown={handleKeydown}
							/>
							<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
								Host and port to proxy requests to
							</p>
						</div>

						<div>
							<label
								for="proxyPort"
								class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
							>
								Proxy Port
							</label>
							<input
								type="number"
								id="proxyPort"
								bind:value={proxyPort}
								placeholder="3000"
								class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
								disabled={loading}
								required
								min="1"
								max="65535"
								on:keydown={handleKeydown}
							/>
							<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
								Port number for the proxy target
							</p>
						</div>
					{/if}

					{#if ['python', 'ruby', 'nodejs'].includes(wwwType)}
						<div>
							<label
								for="passengerBinary"
								class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
							>
								Passenger Binary
							</label>
							<input
								type="text"
								id="passengerBinary"
								bind:value={passengerBinary}
								placeholder="/usr/local/bin/python3"
								class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
								disabled={loading}
								required
								on:keydown={handleKeydown}
							/>
							<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
								Path to the application binary
							</p>
						</div>

						<div>
							<label
								for="wwwEnvironment"
								class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
							>
								Environment
							</label>
							<select
								id="wwwEnvironment"
								bind:value={wwwEnvironment}
								class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
								disabled={loading}
							>
								{#each environmentOptions as env (env.value)}
									<option value={env.value}>{env.label}</option>
								{/each}
							</select>
							<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Passenger environment</p>
						</div>
					{/if}
				</form>

				<div class="flex justify-end space-x-3 mt-6">
					<button on:click={closeModal} disabled={loading} class="btn-secondary"> Cancel </button>
					<button
						on:click={handleSubmit}
						disabled={loading || !wwwDomain.trim()}
						class="btn-primary {loading || !wwwDomain.trim()
							? 'opacity-50 cursor-not-allowed'
							: ''}"
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
						Add Website
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
