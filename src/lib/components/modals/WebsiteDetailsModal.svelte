<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { addToast } from '$lib/stores/appState';
	import { apiPut } from '$lib/utils';

	export let showModal: boolean = false;
	export let website: Record<string, unknown> | null = null;
	export let loading: boolean = false;

	const dispatch = createEventDispatcher();

	// Confirmation dialog state
	let showConfirmDialog = false;

	// Option mappings for display
	const optionLabels: Record<string, string> = {
		gzip: 'GZIP Compression',
		sslonly: 'SSL Only',
		plnet: 'PL Net',
		php_eval: 'PHP Eval',
		php_exec: 'PHP Exec',
		php_openbasedir: 'PHP Open Basedir',
		cache: 'Cache',
		cache_cookie: 'Cache Cookie',
		cache_debug: 'Cache Debug',
		waf: 'Web Application Firewall',
		blacklist: 'Blacklist',
		stats_anonymize: 'Stats Anonymize',
		stats_exclude: 'Exclude IP from Statistics',
		processes: 'Processes',
		tls_min: 'TLS Minimum Version'
	};

	const optionDescriptions: Record<string, string> = {
		gzip: 'Enable GZIP compression for responses',
		sslonly: 'Force SSL/TLS connections only',
		plnet: 'Enable PL Net functionality',
		php_eval: 'Allow PHP eval() function',
		php_exec: 'Allow PHP exec() functions',
		php_openbasedir: 'PHP open_basedir restriction path',
		cache: 'Cache control',
		cache_cookie: 'Cache cookie settings - select "Name" to specify a custom cookie',
		cache_debug: 'Enable cache debugging',
		waf: 'Web Application Firewall level',
		blacklist: 'Enable IP blacklisting',
		stats_anonymize: 'Anonymize statistics',
		stats_exclude: 'Comma-separated IP addresses to exclude from statistics',
		processes: 'Number of worker processes',
		tls_min: 'Minimum TLS version'
	};

	// Form state management
	let formData: Record<string, string | number | boolean> = {};
	let originalData: Record<string, string | number | boolean> = {};
	let hasUnsavedChanges = false;
	let saving = false;

	// Initialize form data when website changes
	$: if (website && showModal) {
		initializeFormData();
	}

	function initializeFormData() {
		if (!website) return;

		formData = {};
		originalData = {};

		// Map API values to form values
		const mapApiValueToFormValue = (key: string, apiValue: unknown): string | number | boolean => {
			// Handle cache mapping - API may send numeric values or string values
			if (key === 'cache') {
				// If API sends numeric values, map them to strings
				if (typeof apiValue === 'number' || !isNaN(Number(apiValue))) {
					const cacheMap: Record<number, string> = {
						0: 'off',
						1: 'control',
						2: 'short',
						3: 'long',
						4: 'purge'
					};
					return cacheMap[Number(apiValue)] || 'off';
				}
				// If API already sends string values, use them directly
				const validCacheValues = ['control', 'short', 'long', 'purge', 'off'];
				return validCacheValues.includes(String(apiValue)) ? String(apiValue) : 'off';
			}

			// Handle cache_cookie mapping (API: ""=any, "0"=none, custom_value=custom_cookie_name)
			if (key === 'cache_cookie') {
				const stringValue = String(apiValue);
				// Empty string means "any"
				if (stringValue === '' || stringValue === 'undefined' || stringValue === 'null')
					return 'any';
				// "0" means "none"
				if (stringValue === '0') return 'none';
				// Any other value is a custom cookie name
				if (stringValue) return 'name';
				return 'any';
			}

			// Handle numeric values that should remain as numbers
			if (['waf', 'blacklist', 'processes'].includes(key)) {
				return Number(apiValue) || 0;
			}

			// Handle TLS version - ensure it's a string
			if (key === 'tls_min') {
				return String(apiValue) || '1.2';
			}

			// Handle boolean values
			if (typeof apiValue === 'boolean') {
				return apiValue;
			}

			// Handle string values
			if (typeof apiValue === 'string') {
				return apiValue;
			}

			// Handle numeric values that should be strings
			if (typeof apiValue === 'number') {
				return apiValue;
			}

			return apiValue as string | number | boolean;
		};

		// Copy all option values to form data with proper mapping
		Object.keys(optionLabels).forEach((key) => {
			const optionKey = `option_${key}`;
			const apiValue = website[optionKey];

			if (apiValue !== undefined && apiValue !== null) {
				const mappedValue = mapApiValueToFormValue(key, apiValue);
				formData[key] = mappedValue;
				originalData[key] = mappedValue;

				// Special handling for cache_cookie_name when cache_cookie is a custom name
				if (key === 'cache_cookie' && mappedValue === 'name') {
					formData['cache_cookie_name'] = String(apiValue);
					originalData['cache_cookie_name'] = String(apiValue);
				}
			} else {
				// Set defaults for missing values
				const defaults: Record<string, string | number | boolean> = {
					cache: 'off',
					cache_cookie: 'any',
					cache_cookie_name: '',
					blacklist: 0,
					waf: 0,
					tls_min: '1.2',
					gzip: false,
					sslonly: false,
					plnet: false,
					php_eval: false,
					php_exec: false,
					php_openbasedir: '',
					cache_debug: false,
					stats_anonymize: false,
					stats_exclude: '',
					processes: 1
				};

				if (defaults[key] !== undefined) {
					formData[key] = defaults[key];
					originalData[key] = defaults[key];
				}
			}
		});

		hasUnsavedChanges = false;
	}

	function updateFormValue(optionKey: string, value: string | number | boolean) {
		formData[optionKey] = value;
		hasUnsavedChanges = !isEqual(formData, originalData);
	}

	function isEqual(
		obj1: Record<string, string | number | boolean>,
		obj2: Record<string, string | number | boolean>
	): boolean {
		const keys1 = Object.keys(obj1);
		const keys2 = Object.keys(obj2);

		if (keys1.length !== keys2.length) return false;

		for (const key of keys1) {
			if (obj1[key] !== obj2[key]) return false;
		}

		return true;
	}

	async function saveChanges() {
		if (!website || !hasUnsavedChanges) return;

		saving = true;

		try {
			// Send all changed options to the API
			const promises = Object.keys(formData)
				.map(async (optionKey) => {
					const newValue = formData[optionKey];
					const originalValue = originalData[optionKey];

					// Skip cache_cookie_name - it's always handled by cache_cookie option
					if (optionKey === 'cache_cookie_name') {
						return null;
					}

					// Only update if value has changed
					if (newValue !== originalValue) {
						// Convert form values back to API format
						let apiValue: string;

						// Handle cache - send string values directly to API
						if (optionKey === 'cache') {
							apiValue = String(newValue); // Send control|short|long|purge|off directly
						}
						// Handle cache_cookie mapping (form: any/none/name -> API: any/none/custom_cookie_name)
						else if (optionKey === 'cache_cookie') {
							if (newValue === 'any') {
								apiValue = 'any';
							} else if (newValue === 'none') {
								apiValue = 'none';
							} else if (newValue === 'name') {
								// Use the custom cookie name from cache_cookie_name
								apiValue = String(formData.cache_cookie_name || '');
							} else {
								apiValue = 'any'; // Default to "any"
							}
						}
						// Skip cache_cookie_name - it's handled by cache_cookie option
						else if (optionKey === 'cache_cookie_name') {
							return null; // Don't send this as a separate API call
						}
						// Convert boolean values to "on"/"off" strings for API
						else if (typeof newValue === 'boolean') {
							apiValue = newValue ? 'on' : 'off';
						} else {
							apiValue = String(newValue);
						}

						return apiPut('/www/options', {
							www_domain: website.domain,
							www_option: optionKey,
							value: apiValue
						});
					}
				})
				.filter(Boolean);

			await Promise.all(promises);

			// Update local website data
			Object.keys(formData).forEach((key) => {
				// Skip cache_cookie_name - it's handled by cache_cookie option
				if (key === 'cache_cookie_name') {
					return;
				}
				website[`option_${key}`] = formData[key];
			});

			// Reset form state
			originalData = { ...formData };
			hasUnsavedChanges = false;

			addToast({
				type: 'success',
				message: 'All changes saved successfully'
			});
		} catch (error) {
			console.error('Error saving changes:', error);
			addToast({
				type: 'error',
				message: 'Failed to save some changes'
			});
		} finally {
			saving = false;
		}
	}

	function closeModal() {
		if (!loading && !saving) {
			if (hasUnsavedChanges) {
				showConfirmDialog = true;
			} else {
				dispatch('cancel');
			}
		}
	}

	function cancelClose() {
		showConfirmDialog = false;
	}

	function confirmClose() {
		showConfirmDialog = false;
		dispatch('cancel');
	}

	function handleTlsMinChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		updateFormValue('tls_min', target.value);
	}

	function handleWafChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		updateFormValue('waf', Number(target.value));
	}

	function handleCacheChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		updateFormValue('cache', target.value);
	}

	function handleCacheCookieChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const newValue = target.value;
		updateFormValue('cache_cookie', newValue);

		// Clear custom cookie name if not using "name" option
		if (newValue !== 'name') {
			updateFormValue('cache_cookie_name', '');
		}
	}

	function handleBlacklistChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		updateFormValue('blacklist', Number(target.value));
	}

	function handleNumberChange(event: Event, optionKey: string) {
		const target = event.target as HTMLInputElement;
		const value = parseInt(target.value);
		// Ensure processes is at least 1
		if (optionKey === 'processes' && value < 1) {
			updateFormValue(optionKey, 1);
		} else {
			updateFormValue(optionKey, value);
		}
	}

	function handleTextChange(event: Event, optionKey: string) {
		const target = event.target as HTMLInputElement;
		updateFormValue(optionKey, target.value);
	}

	function handleTextareaChange(event: Event, optionKey: string) {
		const target = event.target as HTMLTextAreaElement;
		updateFormValue(optionKey, target.value);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && !loading) {
			closeModal();
		}
	}

	$: optionKeys = (() => {
		const baseKeys = [
			'gzip',
			'sslonly',
			'plnet',
			'php_eval',
			'php_exec',
			'waf',
			'blacklist',
			'tls_min'
		];

		// Only show processes option for Python, Node.js, or Ruby sites
		if (website && website.www_type) {
			const type = String(website.www_type).toLowerCase();
			if (['python', 'nodejs', 'ruby'].includes(type)) {
				baseKeys.push('processes');
			}
		}

		return baseKeys;
	})();

	const cacheKeys = ['cache', 'cache_cookie', 'cache_debug'];

	const statsKeys = ['stats_anonymize', 'stats_exclude'];
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showModal && website}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
		<div class="bg-white dark:bg-dark-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
			<div class="p-6">
				<div class="flex justify-between items-center mb-6">
					<div>
						<h2 class="text-2xl font-bold text-gray-900 dark:text-white">Website Details</h2>
						<p class="text-lg text-gray-600 dark:text-gray-400 mt-1">
							{website.domain}
						</p>
					</div>
					{#if !loading}
						<button
							on:click={closeModal}
							class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
							aria-label="Close modal"
						>
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<!-- Basic Information -->
					<div class="space-y-4">
						<h3
							class="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-dark-700 pb-2"
						>
							Basic Information
						</h3>

						<div class="space-y-3">
							<div>
								<span class="block text-sm font-medium text-gray-700 dark:text-gray-300">
									Domain
								</span>
								<p
									class="mt-1 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-dark-700 px-3 py-2 rounded-sm"
									aria-label="Website domain"
								>
									{website.domain}
								</p>
							</div>

							<div>
								<span class="block text-sm font-medium text-gray-700 dark:text-gray-300">
									Type
								</span>
								<p
									class="mt-1 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-dark-700 px-3 py-2 rounded-sm"
									aria-label="Website type"
								>
									{website.www_type}
								</p>
							</div>

							<div>
								<span class="block text-sm font-medium text-gray-700 dark:text-gray-300">
									Directory
								</span>
								<p
									class="mt-1 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-dark-700 px-3 py-2 rounded-sm break-all"
									aria-label="Website directory"
								>
									{website.directory}
								</p>
							</div>

							<div>
								<span class="block text-sm font-medium text-gray-700 dark:text-gray-300">
									Status
								</span>
								<p
									class="mt-1 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-dark-700 px-3 py-2 rounded-sm"
									aria-label="Website status"
								>
									{website.active ? 'Active' : 'Inactive'}
								</p>
							</div>

							{#if website.info}
								<div>
									<span class="block text-sm font-medium text-gray-700 dark:text-gray-300">
										Info
									</span>
									<p
										class="mt-1 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-dark-700 px-3 py-2 rounded-sm"
										aria-label="Website info"
									>
										{website.info}
									</p>
								</div>
							{/if}
						</div>
					</div>

					<!-- Configuration Options -->
					<div class="space-y-4">
						<h3
							class="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-dark-700 pb-2"
						>
							Configuration Options
						</h3>

						<div class="space-y-3 max-h-96 overflow-y-auto">
							{#each optionKeys as optionKey (optionKey)}
								{@const optionValue = formData[optionKey]}
								{@const isBoolean = typeof optionValue === 'boolean'}
								{@const isNumber = typeof optionValue === 'number' && !isNaN(optionValue)}

								<div
									class="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-lg"
								>
									<div class="flex-1">
										<span class="block text-sm font-medium text-gray-700 dark:text-gray-300">
											{optionLabels[optionKey]}
										</span>
										{#if optionDescriptions[optionKey]}
											<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
												{optionDescriptions[optionKey]}
											</p>
										{/if}
									</div>

									<div class="ml-4">
										{#if isBoolean}
											<button
												on:click={() => updateFormValue(optionKey, !optionValue)}
												disabled={loading}
												class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
													optionValue ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
												}`}
												aria-label={`Toggle ${optionKey} ${optionValue ? 'off' : 'on'}`}
											>
												<span
													class={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
														optionValue ? 'translate-x-6' : 'translate-x-1'
													}`}
												></span>
											</button>
										{:else if optionKey === 'blacklist'}
											<select
												value={formData[optionKey]}
												on:change={handleBlacklistChange}
												disabled={loading}
												class="text-sm border border-gray-300 dark:border-dark-600 rounded-sm px-2 py-1 bg-white dark:bg-dark-800"
											>
												<option value={0}>Disabled</option>
												<option value={1}>Level 1</option>
												<option value={2}>Level 2</option>
												<option value={3}>Level 3</option>
												<option value={4}>Level 4</option>
											</select>
										{:else if optionKey === 'tls_min'}
											<select
												value={formData[optionKey]}
												on:change={handleTlsMinChange}
												disabled={loading}
												class="text-sm border border-gray-300 dark:border-dark-600 rounded-sm px-2 py-1 bg-white dark:bg-dark-800"
											>
												<option value="1.0">TLS 1.0</option>
												<option value="1.1">TLS 1.1</option>
												<option value="1.2">TLS 1.2</option>
												<option value="1.3">TLS 1.3</option>
											</select>
										{:else if optionKey === 'waf'}
											<select
												value={formData[optionKey]}
												on:change={handleWafChange}
												disabled={loading}
												class="text-sm border border-gray-300 dark:border-dark-600 rounded-sm px-2 py-1 bg-white dark:bg-dark-800"
											>
												<option value={0}>Disabled</option>
												<option value={1}>Level 1</option>
												<option value={2}>Level 2</option>
												<option value={3}>Level 3</option>
												<option value={4}>Level 4</option>
												<option value={5}>Level 5</option>
											</select>
										{:else if isNumber}
											<input
												type="number"
												bind:value={formData[optionKey]}
												on:change={(e) => handleNumberChange(e, optionKey)}
												disabled={loading}
												min={optionKey === 'processes' ? '1' : undefined}
												class="text-sm border border-gray-300 dark:border-dark-600 rounded-sm px-2 py-1 w-20 bg-white dark:bg-dark-800"
											/>
										{:else}
											<input
												type="text"
												bind:value={formData[optionKey]}
												on:change={(e) => handleTextChange(e, optionKey)}
												disabled={loading}
												class="text-sm border border-gray-300 dark:border-dark-600 rounded-sm px-2 py-1 w-32 bg-white dark:bg-dark-800"
											/>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>

					<!-- Cache Settings -->
					<div class="space-y-4">
						<h3
							class="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-dark-700 pb-2"
						>
							Cache Settings
						</h3>

						<div class="space-y-3">
							{#each cacheKeys as optionKey (optionKey)}
								{@const optionValue = formData[optionKey]}
								{@const isBoolean = typeof optionValue === 'boolean'}

								<div
									class="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-lg"
								>
									<div class="flex-1">
										<span class="block text-sm font-medium text-gray-700 dark:text-gray-300">
											{optionLabels[optionKey]}
										</span>
										{#if optionDescriptions[optionKey]}
											<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
												{optionDescriptions[optionKey]}
											</p>
										{/if}
									</div>

									<div class="ml-4">
										{#if isBoolean}
											<button
												on:click={() => updateFormValue(optionKey, !optionValue)}
												disabled={loading}
												class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
													optionValue ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
												}`}
												aria-label={`Toggle ${optionKey} ${optionValue ? 'off' : 'on'}`}
											>
												<span
													class={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
														optionValue ? 'translate-x-6' : 'translate-x-1'
													}`}
												></span>
											</button>
										{:else if optionKey === 'cache'}
											<select
												value={formData[optionKey]}
												on:change={handleCacheChange}
												disabled={loading}
												class="text-sm border border-gray-300 dark:border-dark-600 rounded-sm px-2 py-1 bg-white dark:bg-dark-800"
											>
												<option value="control">Control</option>
												<option value="short">Short</option>
												<option value="long">Long</option>
												<option value="purge">Purge</option>
												<option value="off">Off</option>
											</select>
										{:else if optionKey === 'cache_cookie'}
											<div class="flex flex-col space-y-2">
												<select
													value={formData[optionKey]}
													on:change={handleCacheCookieChange}
													disabled={loading}
													class="text-sm border border-gray-300 dark:border-dark-600 rounded-sm px-2 py-1 bg-white dark:bg-dark-800"
												>
													<option value="any">Any</option>
													<option value="none">None</option>
													<option value="name">Name</option>
												</select>
												{#if formData[optionKey] === 'name'}
													<input
														type="text"
														value={formData.cache_cookie_name || ''}
														on:input={(e) => handleTextChange(e, 'cache_cookie_name')}
														disabled={loading}
														placeholder="Enter cookie name"
														class="text-sm border border-gray-300 dark:border-dark-600 rounded-sm px-2 py-1 bg-white dark:bg-dark-800"
													/>
												{/if}
											</div>
										{:else}
											<input
												type="text"
												bind:value={formData[optionKey]}
												on:change={(e) => handleTextChange(e, optionKey)}
												disabled={loading}
												class="text-sm border border-gray-300 dark:border-dark-600 rounded-sm px-2 py-1 w-32 bg-white dark:bg-dark-800"
											/>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>

					<!-- Statistics Settings -->
					<div class="space-y-4">
						<h3
							class="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-dark-700 pb-2"
						>
							Statistics Settings
						</h3>

						<div class="space-y-3">
							{#each statsKeys as optionKey (optionKey)}
								{@const optionValue = formData[optionKey]}
								{@const isBoolean = typeof optionValue === 'boolean'}

								<div
									class="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-lg"
								>
									<div class="flex-1">
										<span class="block text-sm font-medium text-gray-700 dark:text-gray-300">
											{optionLabels[optionKey]}
										</span>
										{#if optionDescriptions[optionKey]}
											<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
												{optionDescriptions[optionKey]}
											</p>
										{/if}
									</div>

									<div class="ml-4">
										{#if isBoolean}
											<button
												on:click={() => updateFormValue(optionKey, !optionValue)}
												disabled={loading}
												class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
													optionValue ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
												}`}
												aria-label={`Toggle ${optionKey} ${optionValue ? 'off' : 'on'}`}
											>
												<span
													class={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
														optionValue ? 'translate-x-6' : 'translate-x-1'
													}`}
												></span>
											</button>
										{:else}
											<input
												type="text"
												bind:value={formData[optionKey]}
												on:change={(e) => handleTextChange(e, optionKey)}
												disabled={loading}
												class="text-sm border border-gray-300 dark:border-dark-600 rounded-sm px-2 py-1 w-32 bg-white dark:bg-dark-800"
											/>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>

				<!-- Special Options Section -->
				{#if website.option_php_openbasedir}
					<div class="mt-6 pt-6 border-t border-gray-200 dark:border-dark-700">
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
							Special Configuration
						</h3>

						<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
							<div>
								<label
									for="php-openbasedir"
									class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
								>
									PHP Open Basedir
								</label>
								<textarea
									id="php-openbasedir"
									bind:value={formData.php_openbasedir}
									on:change={(e) => handleTextareaChange(e, 'php_openbasedir')}
									disabled={loading}
									rows="3"
									class="w-full text-sm border border-gray-300 dark:border-dark-600 rounded-sm px-3 py-2 bg-white dark:bg-dark-800"
									placeholder="Enter PHP open_basedir paths..."
								></textarea>
							</div>
						</div>
					</div>
				{/if}

				<!-- Modal Footer with Save Button -->
				<div class="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-dark-700">
					<button
						on:click={closeModal}
						disabled={loading}
						class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-800 border border-gray-300 dark:border-dark-600 rounded-md hover:bg-gray-50 dark:hover:bg-dark-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						on:click={saveChanges}
						disabled={loading || saving || !hasUnsavedChanges}
						class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{#if saving}
							<svg
								class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
								fill="none"
								viewBox="0 0 24 24"
							>
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
							Saving...
						{:else}
							Save Changes
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

{#if showConfirmDialog}
	<!-- Modal overlay - using div for proper accessibility (buttons cannot contain other buttons) -->
	<div
		class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
		on:click={cancelClose}
		on:keydown={(e) => {
			if (e.key === 'Escape') cancelClose();
		}}
		role="button"
		tabindex="0"
		aria-label="Close confirmation dialog"
	>
		<!-- Modal content container -->
		<div
			class="relative bg-white dark:bg-dark-800 rounded-lg shadow-xl max-w-md w-full mx-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="confirm-dialog-title"
		>
			<div class="p-6" on:click|stopPropagation role="presentation" tabindex="-1">
				<div class="text-center">
					<h3
						id="confirm-dialog-title"
						class="text-lg font-medium text-gray-900 dark:text-white mb-4"
					>
						Unsaved Changes
					</h3>
					<p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
						You have unsaved changes. Are you sure you want to close without saving?
					</p>
					<div class="flex justify-center space-x-3">
						<button
							on:click={cancelClose}
							class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-md hover:bg-gray-50 dark:hover:bg-dark-600 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
							aria-label="Cancel and keep changes"
							type="button"
						>
							Cancel
						</button>
						<button
							on:click={confirmClose}
							class="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
							aria-label="Close without saving changes"
							type="button"
						>
							Close Without Saving
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
