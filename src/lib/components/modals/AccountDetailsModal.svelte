<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */
	import { createEventDispatcher } from 'svelte';
	import { formatDate } from '$lib/utils';

	// Define account interface
	interface AccountDetails {
		account_username?: string;
		account_plan?: string;
		account_created?: string;
		account_expires?: string;
	}

	interface AccountData {
		account?: AccountDetails;
		servers?: Record<string, unknown>;
		urls?: Record<string, unknown>;
		twofa?: boolean;
		binexec?: boolean;
	}

	export let showModal: boolean = false;
	export let account: AccountData | null = null;

	const dispatch = createEventDispatcher();

	function closeModal() {
		dispatch('close');
	}
</script>

{#if showModal}
	<!-- Modal Backdrop -->
	<div
		class="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 transition-all duration-300"
	>
		<!-- Modal Container -->
		<div
			class="bg-white dark:bg-dark-800 rounded-xl shadow-2xl border border-gray-200 dark:border-dark-700 max-w-6xl w-full max-h-[90vh] overflow-hidden transform transition-all duration-300 scale-100"
		>
			<!-- Modal Header -->
			<div
				class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-700 bg-linear-to-r from-devil-500/10 to-transparent"
			>
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 bg-devil-500 rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
							<path
								d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H19V9Z"
							/>
						</svg>
					</div>
					<div>
						<h2 class="text-xl font-bold text-gray-900 dark:text-white">Account Details</h2>
						<p class="text-sm text-gray-600 dark:text-gray-400">
							View and manage your account information
						</p>
					</div>
				</div>
				<button
					class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200 flex items-center justify-center group"
					on:click={closeModal}
					aria-label="Close modal"
				>
					<svg
						class="w-5 h-5 group-hover:scale-110 transition-transform duration-200"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
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
			<div class="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
				{#if account}
					<div class="space-y-8">
						<!-- Account Information -->
						<div
							class="bg-gray-50 dark:bg-dark-700/50 rounded-lg p-6 border border-gray-200 dark:border-dark-600"
						>
							<div class="flex items-center gap-3 mb-6">
								<div class="w-8 h-8 bg-devil-500 rounded-md flex items-center justify-center">
									<svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
										<path
											d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H19V9Z"
										/>
									</svg>
								</div>
								<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
									Account Information
								</h3>
							</div>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div
									class="bg-white dark:bg-dark-800 p-4 rounded-lg border border-gray-200 dark:border-dark-600 hover:border-devil-300 dark:hover:border-devil-500 transition-colors duration-200"
								>
									<div class="flex items-center gap-2 mb-2">
										<div class="w-2 h-2 bg-blue-500 rounded-full"></div>
										<div class="text-sm font-medium text-gray-600 dark:text-gray-400">Username</div>
									</div>
									<div class="text-lg font-semibold text-gray-900 dark:text-white font-mono">
										{account.account?.account_username || 'N/A'}
									</div>
								</div>
								<div
									class="bg-white dark:bg-dark-800 p-4 rounded-lg border border-gray-200 dark:border-dark-600 hover:border-devil-300 dark:hover:border-devil-500 transition-colors duration-200"
								>
									<div class="flex items-center gap-2 mb-2">
										<div class="w-2 h-2 bg-purple-500 rounded-full"></div>
										<div class="text-sm font-medium text-gray-600 dark:text-gray-400">Plan</div>
									</div>
									<div class="text-lg font-semibold text-gray-900 dark:text-white">
										{account.account?.account_plan || 'N/A'}
									</div>
								</div>
								<div
									class="bg-white dark:bg-dark-800 p-4 rounded-lg border border-gray-200 dark:border-dark-600 hover:border-devil-300 dark:hover:border-devil-500 transition-colors duration-200"
								>
									<div class="flex items-center gap-2 mb-2">
										<div class="w-2 h-2 bg-green-500 rounded-full"></div>
										<div class="text-sm font-medium text-gray-600 dark:text-gray-400">Created</div>
									</div>
									<div class="text-lg font-semibold text-gray-900 dark:text-white">
										{formatDate(account.account?.account_created)}
									</div>
								</div>
								<div
									class="bg-white dark:bg-dark-800 p-4 rounded-lg border border-gray-200 dark:border-dark-600 hover:border-devil-300 dark:hover:border-devil-500 transition-colors duration-200"
								>
									<div class="flex items-center gap-2 mb-2">
										<div class="w-2 h-2 bg-orange-500 rounded-full"></div>
										<div class="text-sm font-medium text-gray-600 dark:text-gray-400">Expires</div>
									</div>
									<div class="text-lg font-semibold text-gray-900 dark:text-white">
										{formatDate(account.account?.account_expires)}
									</div>
								</div>
							</div>
						</div>

						<!-- Server Information -->
						{#if account.servers}
							<div
								class="bg-gray-50 dark:bg-dark-700/50 rounded-lg p-6 border border-gray-200 dark:border-dark-600"
							>
								<div class="flex items-center gap-3 mb-6">
									<div class="w-8 h-8 bg-devil-500 rounded-md flex items-center justify-center">
										<svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
											<path
												d="M4 1C2.89 1 2 1.89 2 3V7C2 8.11 2.89 9 4 9H1V11H4C5.11 11 6 10.11 6 9V3C6 1.89 5.11 1 4 1M4 3H4V7H4V3M9 1V3H12V1H9M15 1V3H18V1H15M20 1C18.89 1 18 1.89 18 3V7C18 8.11 18.89 9 20 9H23V11H20C21.11 11 22 10.11 22 9V3C22 1.89 21.11 1 20 1M20 3H20V7H20V3M1 13V15H4V13H1M7 13V15H10V13H7M13 13V15H16V13H13M19 13V15H22V13H19M2 17C2 18.11 2.89 19 4 19H20C21.11 19 22 18.11 22 17V21C22 22.11 21.11 23 20 23H4C2.89 23 2 22.11 2 21V17Z"
											/>
										</svg>
									</div>
									<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
										Server Information
									</h3>
								</div>
								<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
									{#each Object.entries(account.servers ?? {}) as [key, value] (key)}
										<div
											class="bg-white dark:bg-dark-800 p-4 rounded-lg border border-gray-200 dark:border-dark-600 hover:border-devil-300 dark:hover:border-devil-500 transition-colors duration-200"
										>
											<div class="flex items-center gap-2 mb-2">
												<div class="w-2 h-2 bg-indigo-500 rounded-full"></div>
												<div
													class="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize"
												>
													{key}
												</div>
											</div>
											<div
												class="text-lg font-semibold text-gray-900 dark:text-white font-mono break-all"
											>
												{value || 'N/A'}
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Service URLs -->
						{#if account.urls}
							<div
								class="bg-gray-50 dark:bg-dark-700/50 rounded-lg p-6 border border-gray-200 dark:border-dark-600"
							>
								<div class="flex items-center gap-3 mb-6">
									<div class="w-8 h-8 bg-devil-500 rounded-md flex items-center justify-center">
										<svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
											<path
												d="M16.36 14C16.44 13.34 16.5 12.68 16.5 12C16.5 11.32 16.44 10.66 16.36 10H19.74C19.9 10.64 20 11.31 20 12S19.9 13.36 19.74 14M14.34 14H9.66C9.56 13.34 9.5 12.68 9.5 12S9.56 10.65 9.66 10H14.34C14.43 10.65 14.5 11.32 14.5 12S14.43 13.34 14.34 14M12 19.96C11.17 18.76 10.5 17.43 10.09 16H13.91C13.5 17.43 12.83 18.76 12 19.96M12 4.03C12.83 5.23 13.5 6.57 13.91 8H10.09C10.5 6.57 11.17 5.23 12 4.03M7.64 14H4.26C4.1 13.36 4 12.69 4 12S4.1 10.64 4.26 10H7.64C7.56 10.66 7.5 11.32 7.5 12S7.56 13.34 7.64 14M7.64 9H4.26C4.1 8.36 4 7.69 4 7S4.1 5.64 4.26 5H7.64C7.56 5.66 7.5 6.32 7.5 7S7.56 8.34 7.64 9M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2Z"
											/>
										</svg>
									</div>
									<h3 class="text-lg font-semibold text-gray-900 dark:text-white">Service URLs</h3>
								</div>
								<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
									{#each Object.entries(account.urls ?? {}) as [key, value] (key)}
										{#if value && (typeof value === 'string' || Array.isArray(value))}
											<div
												class="bg-white dark:bg-dark-800 p-4 rounded-lg border border-gray-200 dark:border-dark-600 hover:border-devil-300 dark:hover:border-devil-500 transition-colors duration-200"
											>
												<div class="flex items-center gap-2 mb-3">
													<div class="w-2 h-2 bg-cyan-500 rounded-full"></div>
													<div
														class="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize"
													>
														{key.replace('_', ' ')}
													</div>
												</div>
												{#if typeof value === 'string'}
													<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
													<a
														href={value}
														target="_blank"
														rel="noopener noreferrer"
														class="inline-flex items-center gap-2 text-devil-600 dark:text-devil-400 hover:text-devil-700 dark:hover:text-devil-300 font-mono break-all text-sm transition-colors duration-200 group"
													>
														<span class="truncate">{value}</span>
														<svg
															class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
															/>
														</svg>
													</a>
												{:else if Array.isArray(value) && value.length > 0}
													<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
													<div class="space-y-2">
														{#each value as url (url)}
															<a
																href={url}
																target="_blank"
																rel="noopener noreferrer"
																class="inline-flex items-center gap-2 text-devil-600 dark:text-devil-400 hover:text-devil-700 dark:hover:text-devil-300 font-mono break-all text-sm transition-colors duration-200 group"
															>
																<span class="truncate">{url}</span>
																<svg
																	class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
																	fill="none"
																	stroke="currentColor"
																	viewBox="0 0 24 24"
																>
																	<path
																		stroke-linecap="round"
																		stroke-linejoin="round"
																		stroke-width="2"
																		d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
																	/>
																</svg>
															</a>
														{/each}
													</div>
												{:else}
													<span class="text-gray-500 dark:text-gray-400 font-mono text-sm">
														{Array.isArray(value) ? 'No URLs configured' : String(value)}
													</span>
												{/if}
											</div>
										{/if}
									{/each}
								</div>
							</div>
						{/if}

						<!-- Security Settings -->
						<div
							class="bg-gray-50 dark:bg-dark-700/50 rounded-lg p-6 border border-gray-200 dark:border-dark-600"
						>
							<div class="flex items-center gap-3 mb-6">
								<div class="w-8 h-8 bg-devil-500 rounded-md flex items-center justify-center">
									<svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
										<path
											d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"
										/>
									</svg>
								</div>
								<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
									Security Settings
								</h3>
							</div>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div
									class="bg-white dark:bg-dark-800 p-4 rounded-lg border border-gray-200 dark:border-dark-600 hover:border-devil-300 dark:hover:border-devil-500 transition-colors duration-200"
								>
									<div class="flex items-center gap-2 mb-2">
										<div
											class="w-3 h-3 rounded-full {account.twofa ? 'bg-green-500' : 'bg-red-500'}"
										></div>
										<div class="text-sm font-medium text-gray-600 dark:text-gray-400">
											Two-Factor Authentication
										</div>
									</div>
									<div
										class="text-lg font-semibold {account.twofa
											? 'text-green-600 dark:text-green-400'
											: 'text-red-600 dark:text-red-400'}"
									>
										{account.twofa ? 'Enabled' : 'Disabled'}
									</div>
								</div>
								<div
									class="bg-white dark:bg-dark-800 p-4 rounded-lg border border-gray-200 dark:border-dark-600 hover:border-devil-300 dark:hover:border-devil-500 transition-colors duration-200"
								>
									<div class="flex items-center gap-2 mb-2">
										<div
											class="w-3 h-3 rounded-full {account.binexec ? 'bg-green-500' : 'bg-red-500'}"
										></div>
										<div class="text-sm font-medium text-gray-600 dark:text-gray-400">
											Binary Execution
										</div>
									</div>
									<div
										class="text-lg font-semibold {account.binexec
											? 'text-green-600 dark:text-green-400'
											: 'text-red-600 dark:text-red-400'}"
									>
										{account.binexec ? 'Enabled' : 'Disabled'}
									</div>
								</div>
							</div>
						</div>
					</div>
				{:else}
					<div class="flex items-center justify-center py-12">
						<div class="text-center">
							<div
								class="w-16 h-16 bg-gray-200 dark:bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4"
							>
								<svg
									class="w-8 h-8 text-gray-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-.98-5.5-2.5"
									/>
								</svg>
							</div>
							<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
								No Account Data
							</h3>
							<p class="text-gray-600 dark:text-gray-400">
								Unable to load account information at this time.
							</p>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
