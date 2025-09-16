<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let showModal: boolean = false;
	export let phpVersions: string[] = [];
	export let phpUsage: Record<string, number> = {};
	export let phpLimit: number = 0;
	export let phpQueue: Record<string, number> = {};

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
			class="bg-white dark:bg-dark-800 rounded-xl shadow-2xl border border-gray-200 dark:border-dark-700 max-w-2xl w-full max-h-[90vh] overflow-hidden transform transition-all duration-300 scale-100"
		>
			<!-- Modal Header -->
			<div
				class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-700 bg-linear-to-r from-devil-500/10 to-transparent"
			>
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 bg-devil-500 rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
							<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
						</svg>
					</div>
					<div>
						<h2 class="text-xl font-bold text-gray-900 dark:text-white">PHP Interpreters</h2>
						<p class="text-sm text-gray-600 dark:text-gray-400">
							Monitor PHP version usage and limits
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
				<div class="space-y-6">
					{#each phpVersions as version (version)}
						<div
							class="group bg-gray-50 dark:bg-dark-700/50 rounded-lg p-4 border border-gray-200 dark:border-dark-600 hover:border-devil-300 dark:hover:border-devil-500 transition-all duration-200"
						>
							<div class="flex items-center justify-between mb-3">
								<div class="flex items-center gap-3">
									<div class="w-8 h-8 bg-devil-500 rounded-md flex items-center justify-center">
										<span class="text-xs font-bold text-white">PHP</span>
									</div>
									<div>
										<h3 class="font-semibold text-gray-900 dark:text-white">PHP {version}</h3>
										<p class="text-xs text-gray-600 dark:text-gray-400">
											Version {version} Interpreter
										</p>
									</div>
								</div>
								<div class="text-right">
									<div class="text-lg font-bold text-devil-600 dark:text-devil-400">
										{phpUsage[String(version)] || 0}%
									</div>
									<div class="text-xs text-gray-500 dark:text-gray-400">Active</div>
								</div>
							</div>

							<!-- Progress Bar -->
							<div class="mb-3">
								<div class="w-full bg-gray-200 dark:bg-dark-600 rounded-full h-2.5 overflow-hidden">
									<div
										class="bg-linear-to-r from-devil-500 to-devil-600 h-2.5 rounded-full transition-all duration-500 ease-out relative"
										style="width: {Math.min(phpUsage[String(version)] || 0, 100)}%"
									>
										<div class="absolute inset-0 bg-white/20 animate-pulse"></div>
									</div>
								</div>
							</div>

							<!-- Usage Stats -->
							<div class="flex items-center justify-between text-sm">
								<div class="flex items-center gap-4">
									<div class="flex items-center gap-2">
										<div class="w-2 h-2 bg-green-500 rounded-full"></div>
										<span class="text-gray-600 dark:text-gray-400">Active: 0</span>
									</div>
									<div class="flex items-center gap-2">
										<div class="w-2 h-2 bg-blue-500 rounded-full"></div>
										<span class="text-gray-600 dark:text-gray-400">Limit: {phpLimit}</span>
									</div>
									<div class="flex items-center gap-2">
										<div class="w-2 h-2 bg-yellow-500 rounded-full"></div>
										<span class="text-gray-600 dark:text-gray-400"
											>Queue: {phpQueue[String(version)] || 0}</span
										>
									</div>
								</div>
								<div class="text-xs text-gray-500 dark:text-gray-400">
									{phpUsage[String(version)] || 0} / {phpLimit} processes
								</div>
							</div>
						</div>
					{/each}
				</div>

				<!-- Summary Footer -->
				<div class="mt-6 pt-4 border-t border-gray-200 dark:border-dark-600">
					<div class="flex items-center justify-between text-sm">
						<div class="text-gray-600 dark:text-gray-400">
							<span class="font-medium">{phpVersions.length}</span> PHP versions configured
						</div>
						<div class="text-gray-600 dark:text-gray-400">
							Total limit: <span class="font-medium text-devil-600"
								>{phpLimit * phpVersions.length}</span
							> processes
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
