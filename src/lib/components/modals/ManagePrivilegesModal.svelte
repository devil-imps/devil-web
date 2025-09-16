<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';

	export let showModal: boolean;
	export let databaseName: string;
	export let user: Record<string, unknown> | null = null;
	export let loading: boolean = false;
	export let currentPrivileges: string[] = [];

	const dispatch = createEventDispatcher();

	// Privilege categories and their options
	const privilegeCategories = {
		data: {
			title: 'Data',
			privileges: [
				{ key: 'SELECT', label: 'SELECT' },
				{ key: 'INSERT', label: 'INSERT' },
				{ key: 'UPDATE', label: 'UPDATE' },
				{ key: 'DELETE', label: 'DELETE' }
			]
		},
		structure: {
			title: 'Structure',
			privileges: [
				{ key: 'CREATE', label: 'CREATE' },
				{ key: 'ALTER', label: 'ALTER' },
				{ key: 'INDEX', label: 'INDEX' },
				{ key: 'DROP', label: 'DROP' },
				{ key: 'CREATE_TEMPORARY_TABLES', label: 'CREATE TEMPORARY TABLES' },
				{ key: 'SHOW_VIEW', label: 'SHOW VIEW' },
				{ key: 'CREATE_ROUTINE', label: 'CREATE ROUTINE' },
				{ key: 'ALTER_ROUTINE', label: 'ALTER ROUTINE' },
				{ key: 'EXECUTE', label: 'EXECUTE' },
				{ key: 'CREATE_VIEW', label: 'CREATE VIEW' },
				{ key: 'EVENT', label: 'EVENT' },
				{ key: 'TRIGGER', label: 'TRIGGER' }
			]
		},
		administration: {
			title: 'Administration',
			privileges: [
				{ key: 'LOCK_TABLES', label: 'LOCK TABLES' },
				{ key: 'REFERENCES', label: 'REFERENCES' }
			]
		}
	};

	// Track selected privileges
	let selectedPrivileges: SvelteSet<string> = new SvelteSet();

	function handleCheckboxChange(privilegeKey: string, event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.checked) {
			selectedPrivileges.add(privilegeKey);
		} else {
			selectedPrivileges.delete(privilegeKey);
		}
	}

	function selectAllInCategory(categoryKey: string) {
		const category = privilegeCategories[categoryKey as keyof typeof privilegeCategories];
		category.privileges.forEach((priv) => {
			selectedPrivileges.add(priv.key);
		});
	}

	function deselectAllInCategory(categoryKey: string) {
		const category = privilegeCategories[categoryKey as keyof typeof privilegeCategories];
		category.privileges.forEach((priv) => {
			selectedPrivileges.delete(priv.key);
		});
	}

	function selectAll() {
		Object.keys(privilegeCategories).forEach((categoryKey) => {
			selectAllInCategory(categoryKey);
		});
	}

	function deselectAll() {
		selectedPrivileges.clear();
	}

	function handleSave() {
		const privileges = Array.from(selectedPrivileges);
		dispatch('managePrivileges', { user, privileges });
	}

	function handleCancel() {
		dispatch('cancel');
		selectedPrivileges.clear();
	}

	// Reset selections when modal opens and initialize with current privileges
	$: if (showModal && user && currentPrivileges) {
		selectedPrivileges.clear();
		if (currentPrivileges.includes('ALL') || currentPrivileges.includes('ALL PRIVILEGES')) {
			// If user has ALL privileges, select all available privileges
			Object.values(privilegeCategories)
				.flatMap((cat) => cat.privileges.map((priv) => priv.key))
				.forEach((key) => {
					selectedPrivileges.add(key);
				});
		} else {
			// Otherwise, select only the specific privileges
			currentPrivileges
				.map((priv) => priv.replace(/^[+-]/, ''))
				.forEach((priv) => {
					selectedPrivileges.add(priv);
				});
		}
	} else if (showModal) {
		selectedPrivileges.clear();
	}
</script>

{#if showModal}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
		<div
			class="bg-white dark:bg-dark-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
		>
			<div class="p-6">
				<div class="flex justify-between items-center mb-6">
					<h2 class="text-xl font-bold text-gray-900 dark:text-white">
						Manage Privileges - {user?.User}@{user?.Host}
					</h2>
					{#if !loading}
						<button
							on:click={handleCancel}
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

				<div class="mb-4">
					<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
						Configure privileges for user <strong>{user?.User}</strong> on database
						<strong>{databaseName}</strong>:
					</p>
				</div>

				<!-- Global Actions -->
				<div class="mb-6 flex gap-2">
					<button
						type="button"
						on:click={selectAll}
						disabled={loading}
						class="px-3 py-1 text-sm bg-blue-600 text-white rounded-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
					>
						Select All
					</button>
					<button
						type="button"
						on:click={deselectAll}
						disabled={loading}
						class="px-3 py-1 text-sm bg-gray-600 text-white rounded-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
					>
						Deselect All
					</button>
				</div>

				<!-- Privilege Categories -->
				<div class="space-y-6">
					{#each Object.entries(privilegeCategories) as [categoryKey, category] (categoryKey)}
						<div class="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
							<div class="flex justify-between items-center mb-3">
								<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
									{category.title}
								</h3>
								<div class="flex gap-2">
									<button
										type="button"
										on:click={() => selectAllInCategory(categoryKey)}
										disabled={loading}
										class="px-2 py-1 text-xs bg-green-600 text-white rounded-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
									>
										Select All
									</button>
									<button
										type="button"
										on:click={() => deselectAllInCategory(categoryKey)}
										disabled={loading}
										class="px-2 py-1 text-xs bg-red-600 text-white rounded-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
									>
										Deselect All
									</button>
								</div>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
								{#each category.privileges as privilege (privilege.key)}
									{@const isCurrentlyActive =
										currentPrivileges.includes(privilege.key) ||
										currentPrivileges.includes('ALL') ||
										currentPrivileges.includes('ALL PRIVILEGES')}
									<label
										class="flex items-center space-x-2 cursor-pointer p-2 rounded {isCurrentlyActive
											? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
											: ''}"
									>
										<input
											type="checkbox"
											checked={selectedPrivileges.has(privilege.key)}
											on:change={(e) => handleCheckboxChange(privilege.key, e)}
											disabled={loading}
											class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
										/>
										<div class="flex-1">
											<span class="text-sm text-gray-900 dark:text-white">{privilege.label}</span>
											{#if isCurrentlyActive}
												<span class="ml-2 text-xs text-green-600 dark:text-green-400 font-medium"
													>(Active)</span
												>
											{/if}
										</div>
									</label>
								{/each}
							</div>
						</div>
					{/each}
				</div>

				<!-- Action Buttons -->
				<div class="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
					<button
						type="button"
						on:click={handleCancel}
						disabled={loading}
						class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={handleSave}
						disabled={loading || selectedPrivileges.size === 0}
						class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
					>
						{#if loading}
							<svg
								class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
								xmlns="http://www.w3.org/2000/svg"
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
							Updating...
						{:else}
							Update Privileges ({selectedPrivileges.size})
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
