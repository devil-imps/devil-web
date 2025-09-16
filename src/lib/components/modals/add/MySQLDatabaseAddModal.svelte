<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { generateAndCopyPassword } from '$lib/utils';
	import { addToast } from '$lib/stores/appState';
	import { apiGet } from '$lib/utils';

	export let showModal: boolean = false;
	export let loading: boolean = false;
	export let mysqlSpecialUser: string = '';

	let databaseName: string = '';
	let userCreationOption: 'new' | 'existing' = 'new';
	let newUsername: string = '';
	let newPassword: string = '';
	let selectedExistingUser: Record<string, unknown> | null = null;
	let selectedCollation: string = '__default__';
	let showPassword: boolean = false;
	let isFirstOpen: boolean = true;

	let existingUsers: Record<string, unknown>[] = [];
	let collations: string[] = [];
	let usersLoading = false;
	let collationsLoading = false;

	const dispatch = createEventDispatcher();

	// Reset form only when modal is first opened, not when reopening after error
	$: if (showModal && !loading && isFirstOpen) {
		resetForm();
		loadData();
		isFirstOpen = false;
	}

	// Reset first open flag when modal is closed
	$: if (!showModal) {
		isFirstOpen = true;
	}

	// Update selectedCollation when collations change (but keep default if currently selected)
	$: if (collations && collations.length > 0 && selectedCollation === '__default__') {
		// Keep the default selection
	}

	async function loadData() {
		await Promise.all([loadExistingUsers(), loadCollations()]);
	}

	async function loadExistingUsers() {
		usersLoading = true;
		try {
			const data = await apiGet<Record<string, unknown>>('/mysql/list');
			const users = (data.users as Record<string, unknown>[]) || [];
			// Filter out the mysqlSpecialUser from the list
			existingUsers = Array.isArray(users)
				? users.filter((user) => String(user.User || '') !== mysqlSpecialUser)
				: [];
		} catch (error) {
			console.error('Error loading users:', error);
			existingUsers = [];
			addToast({
				type: 'error',
				message: 'Failed to load existing users'
			});
		} finally {
			usersLoading = false;
		}
	}

	async function loadCollations() {
		collationsLoading = true;
		try {
			const data = await apiGet<{ collations: string[] }>('/mysql/collations');
			collations = Array.isArray(data.collations) ? data.collations : [];
			// Keep the default selection
		} catch (error) {
			console.error('Error loading collations:', error);
			collations = [];
			addToast({
				type: 'error',
				message: 'Failed to load collations'
			});
		} finally {
			collationsLoading = false;
		}
	}

	function closeModal() {
		if (!loading) {
			resetForm();
			dispatch('cancel');
		}
	}

	function resetForm() {
		databaseName = '';
		userCreationOption = 'new';
		newUsername = '';
		newPassword = '';
		selectedExistingUser = null;
		selectedCollation = '__default__';
		showPassword = false;
	}

	function togglePasswordVisibility(): void {
		showPassword = !showPassword;
	}

	function passwordInput(node: HTMLInputElement, show: boolean) {
		node.type = show ? 'text' : 'password';
		return {
			update(show: boolean) {
				node.type = show ? 'text' : 'password';
			}
		};
	}

	async function generateRandomPassword(): Promise<void> {
		try {
			const generatedPassword = await generateAndCopyPassword(16);
			newPassword = generatedPassword;

			addToast({
				type: 'success',
				message: 'Random password generated and copied to clipboard!'
			});
		} catch (error) {
			console.error('Failed to generate password:', error);
			addToast({
				type: 'error',
				message: 'Failed to generate password'
			});
		}
	}

	function handleSubmit() {
		const dbName = databaseName.trim();
		const collation = selectedCollation === '__default__' ? null : selectedCollation;

		if (!dbName) return;

		let userData = null;

		if (userCreationOption === 'new') {
			const username = newUsername.trim();
			const password = newPassword.trim();

			if (!username || !password) return;

			userData = {
				user_name: `${mysqlSpecialUser}_${username}`,
				password: password
			};
		} else if (userCreationOption === 'existing') {
			if (!selectedExistingUser) return;

			userData = {
				user_name: String(selectedExistingUser.User || ''),
				host_name: selectedExistingUser.Host || null
			};
		}

		dispatch('submit', {
			database_name: `${mysqlSpecialUser}_${dbName}`,
			collate: collation,
			user: userData
		});
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !loading) {
			const dbName = databaseName.trim();
			let isValid = !!dbName;

			if (userCreationOption === 'new') {
				const username = newUsername.trim();
				const password = newPassword.trim();
				isValid = isValid && !!username && !!password;
			} else if (userCreationOption === 'existing') {
				isValid = isValid && !!selectedExistingUser;
			}

			if (isValid) {
				handleSubmit();
			}
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
					<h2 class="text-xl font-bold text-gray-900 dark:text-white">Add MySQL Database</h2>
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
					<!-- Database Name -->
					<div>
						<label
							for="databaseName"
							class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
						>
							Database Name
						</label>
						<div class="flex">
							{#if mysqlSpecialUser}
								<span
									class="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-md bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400 text-sm font-medium"
								>
									{mysqlSpecialUser}_
								</span>
							{/if}
							<input
								type="text"
								id="databaseName"
								bind:value={databaseName}
								placeholder="Enter database name"
								class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-r-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white {mysqlSpecialUser
									? ''
									: 'rounded-l-md'}"
								disabled={loading}
								required
								on:keydown={handleKeydown}
							/>
						</div>
					</div>

					<!-- User Creation Options -->
					<fieldset>
						<legend class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							User Configuration
						</legend>
						<div class="space-y-2">
							<label class="flex items-center">
								<input
									type="radio"
									bind:group={userCreationOption}
									value="new"
									class="text-blue-600 focus:ring-blue-500"
									disabled={loading}
								/>
								<span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Create new user</span>
							</label>
							<label class="flex items-center">
								<input
									type="radio"
									bind:group={userCreationOption}
									value="existing"
									class="text-blue-600 focus:ring-blue-500"
									disabled={loading}
								/>
								<span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Use existing user</span>
							</label>
						</div>
					</fieldset>

					<!-- New User Fields -->
					{#if userCreationOption === 'new'}
						<div class="space-y-4 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
							<div>
								<label
									for="newUsername"
									class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
								>
									Username
								</label>
								<div class="flex">
									{#if mysqlSpecialUser}
										<span
											class="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-md bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400 text-sm font-medium"
										>
											{mysqlSpecialUser}_
										</span>
									{/if}
									<input
										type="text"
										id="newUsername"
										bind:value={newUsername}
										placeholder="Enter username"
										class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-r-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white {mysqlSpecialUser
											? ''
											: 'rounded-l-md'}"
										disabled={loading}
										required
										on:keydown={handleKeydown}
									/>
								</div>
							</div>

							<div>
								<label
									for="newPassword"
									class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
								>
									Password
								</label>
								<div class="flex gap-2">
									<div class="relative flex-1">
										<input
											use:passwordInput={showPassword}
											id="newPassword"
											bind:value={newPassword}
											placeholder="Enter password"
											class="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
											disabled={loading}
											required
											on:keydown={handleKeydown}
										/>
										<button
											type="button"
											on:click={togglePasswordVisibility}
											class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
											disabled={loading}
										>
											{#if showPassword}
												<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
													></path>
												</svg>
											{:else}
												<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
													></path>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
													></path>
												</svg>
											{/if}
										</button>
									</div>
									<button
										type="button"
										on:click={generateRandomPassword}
										disabled={loading}
										class="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 text-sm font-medium whitespace-nowrap"
									>
										Generate
									</button>
								</div>
							</div>
						</div>
					{/if}

					<!-- Existing User Selection -->
					{#if userCreationOption === 'existing'}
						<div class="pl-4 border-l-2 border-gray-200 dark:border-gray-600">
							<label
								for="existingUser"
								class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
							>
								Select Existing User
							</label>
							{#if usersLoading}
								<div class="flex items-center space-x-2">
									<svg class="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
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
									<span class="text-sm text-gray-500 dark:text-gray-400">Loading users...</span>
								</div>
							{:else}
								<select
									id="existingUser"
									bind:value={selectedExistingUser}
									class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
									disabled={loading}
									required
								>
									<option value={null}>Select a user...</option>
									{#each existingUsers || [] as user (`${user.User}@${user.Host || '%'}`)}
										<option value={user}>
											{user.User}{user.Host && user.Host !== '%' ? `@${user.Host}` : ''}
										</option>
									{/each}
								</select>
							{/if}
						</div>
					{/if}

					<!-- Collation Selection -->
					<div>
						<label
							for="collation"
							class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
						>
							Collation (Optional)
						</label>
						{#if collationsLoading}
							<div class="flex items-center space-x-2">
								<svg class="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
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
								<span class="text-sm text-gray-500 dark:text-gray-400">Loading collations...</span>
							</div>
						{:else if collations && collations.length > 0}
							<select
								id="collation"
								bind:value={selectedCollation}
								class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
								disabled={loading}
							>
								<option value="__default__">Use system default</option>
								{#each collations || [] as collation (collation)}
									<option value={collation}>{collation}</option>
								{/each}
							</select>
						{:else}
							<select
								id="collation"
								bind:value={selectedCollation}
								class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
								disabled={loading}
							>
								<option value="__default__">Use system default</option>
								<option value="utf8mb4_general_ci">utf8mb4_general_ci (fallback)</option>
							</select>
						{/if}
						<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Leave as default if unsure</p>
					</div>

					<!-- Submit Buttons -->
					<div class="flex justify-end space-x-3 pt-4">
						{#if !loading}
							<button
								type="button"
								on:click={closeModal}
								class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
							>
								Cancel
							</button>
						{/if}
						<button
							type="submit"
							disabled={loading ||
								!databaseName.trim() ||
								(userCreationOption === 'new' && (!newUsername.trim() || !newPassword.trim())) ||
								(userCreationOption === 'existing' && !selectedExistingUser)}
							class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
						>
							{#if loading}
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
								Creating...
							{:else}
								Create Database
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
