<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */
	import { createEventDispatcher } from 'svelte';
	import type { Column, Action } from '$lib/types/resourceList';

	export let title: string;
	export let items: Record<string, unknown>[] = [];
	export let loading = false;
	export let searchPlaceholder = 'Search...';
	export let columns: Column[] = [];
	export let actions: Action[] | ((item: Record<string, unknown>) => Action[]) | undefined =
		undefined;
	export let showAddButton = true;
	export let addButtonLabel = 'Add New';

	const dispatch = createEventDispatcher();

	let searchQuery = '';
	let sortColumn = '';
	let sortDirection: 'asc' | 'desc' = 'asc';

	$: filteredItems = items.filter((item) => {
		if (!searchQuery) return true;
		return Object.values(item).some((value) =>
			String(value).toLowerCase().includes(searchQuery.toLowerCase())
		);
	});

	// Memoize sort comparison for performance
	$: sortedItems = (() => {
		if (!sortColumn) return filteredItems;

		return [...filteredItems].sort((a, b) => {
			const aVal = String(a[sortColumn] ?? '');
			const bVal = String(b[sortColumn] ?? '');

			// Use localeCompare for better string comparison
			const result = aVal.localeCompare(bVal, undefined, {
				numeric: true,
				sensitivity: 'base'
			});

			return sortDirection === 'asc' ? result : -result;
		});
	})();

	function handleSort(column: string) {
		if (sortColumn === column) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = column;
			sortDirection = 'asc';
		}
	}

	function handleAction(action: string, item?: unknown) {
		// Handle global actions that don't require item-specific action config
		if (action === 'add') {
			dispatch('action', { action, item });
			return;
		}

		const actionConfig = getActionsForItem(item).find((a) => a.action === action);
		if (actionConfig?.requiresConfirmation) {
			dispatch('confirmAction', { action, item });
		} else {
			dispatch('action', { action, item });
		}
	}

	function getActionsForItem(item?: unknown): Action[] {
		if (!actions) return [];
		if (typeof actions === 'function') {
			if (item) {
				return actions(item as Record<string, unknown>);
			}
			// If actions is a function but no item is provided, return empty array
			return [];
		}
		return actions as Action[];
	}

	function formatValue(value: unknown, type: string = 'text') {
		if (value === null || value === undefined) return '-';

		switch (type) {
			case 'date':
				return new Date(String(value)).toLocaleDateString();
			case 'badge':
				return String(value);
			default:
				return String(value);
		}
	}

	function handleEditableChange(
		columnKey: string,
		newValue: string,
		item: Record<string, unknown>
	) {
		dispatch('edit', { column: columnKey, value: newValue, item });
	}

	function handleSelectChange(e: Event, columnKey: string, item: Record<string, unknown>) {
		const target = e.target as HTMLSelectElement;
		handleEditableChange(columnKey, target.value, item);
	}

	function copyToClipboard(text: string) {
		navigator.clipboard
			.writeText(text)
			.then(() => {
				dispatch('action', { action: 'clone', item: { url: text } });
			})
			.catch(() => {
				dispatch('action', { action: 'clone', item: { url: text } });
			});
	}

	function getBadgeClass(value: string) {
		const lowerValue = String(value).toLowerCase();
		if (
			lowerValue.includes('active') ||
			lowerValue.includes('enabled') ||
			lowerValue.includes('running')
		) {
			return 'badge-success';
		}
		if (
			lowerValue.includes('inactive') ||
			lowerValue.includes('disabled') ||
			lowerValue.includes('stopped')
		) {
			return 'badge-error';
		}
		if (lowerValue.includes('pending') || lowerValue.includes('processing')) {
			return 'badge-warning';
		}
		return 'badge-info';
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div>
			<h2 class="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
			<p class="text-gray-600 dark:text-gray-400 mt-1">
				{filteredItems.length}
				{filteredItems.length === 1 ? 'item' : 'items'}
			</p>
		</div>

		<div class="flex items-center gap-3">
			<!-- Custom header content slot -->
			<slot name="header-actions" />

			<!-- Add button -->
			{#if showAddButton}
				<button
					class="inline-flex items-center px-4 py-2 bg-devil-500 hover:bg-devil-600 disabled:bg-gray-400 text-white font-medium text-sm rounded-lg border border-transparent transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-devil-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-dark-900 shadow-xs hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
					on:click={() => handleAction('add')}
					disabled={loading}
					type="button"
				>
					<svg class="w-4 h-4 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 6v6m0 0v6m0-6h6m-6 0H6"
						></path>
					</svg>
					<span class="whitespace-nowrap">{addButtonLabel}</span>
				</button>
			{/if}
		</div>
	</div>

	<!-- Search and Filters -->
	<div class="flex flex-col sm:flex-row gap-4">
		<div class="flex-1">
			<input
				type="text"
				placeholder={searchPlaceholder}
				bind:value={searchQuery}
				class="input-field w-full"
				aria-label={searchPlaceholder}
				disabled={loading}
			/>
		</div>
	</div>

	<!-- Table -->
	<div class="card overflow-hidden">
		{#if loading}
			<div class="p-8 text-center" role="status" aria-live="polite">
				<svg
					class="animate-spin h-8 w-8 text-devil-500 mx-auto mb-4"
					aria-hidden="true"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
				<p class="text-gray-600 dark:text-gray-400">Loading...</p>
			</div>
		{:else if sortedItems.length === 0}
			<div class="p-8 text-center">
				<svg
					class="w-12 h-12 text-gray-400 mx-auto mb-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
					></path>
				</svg>
				<p class="text-gray-600 dark:text-gray-400 mb-2">
					{searchQuery ? 'No items match your search' : 'No items found'}
				</p>
				{#if !searchQuery && showAddButton}
					<button class="btn-primary" on:click={() => handleAction('add')}>
						{addButtonLabel}
					</button>
				{/if}
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full" aria-label={`${title} data table`}>
					<thead class="bg-gray-50 dark:bg-dark-700">
						<tr>
							{#each columns as column (column.key)}
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-600"
									on:click={() => handleSort(column.key)}
									on:keydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											handleSort(column.key);
										}
									}}
									role="columnheader"
									tabindex="0"
									aria-sort={sortColumn === column.key
										? sortDirection === 'asc'
											? 'ascending'
											: 'descending'
										: 'none'}
									aria-label={`Sort by ${column.label}`}
								>
									<div class="flex items-center space-x-1">
										<span>{column.label}</span>
										{#if sortColumn === column.key}
											<svg
												class="w-4 h-4"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												aria-hidden="true"
											>
												{#if sortDirection === 'asc'}
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M5 15l7-7 7 7"
													></path>
												{:else}
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M19 9l-7 7-7-7"
													></path>
												{/if}
											</svg>
										{/if}
									</div>
								</th>
							{/each}
							{#if actions && ((Array.isArray(actions) && actions.length > 0) || typeof actions === 'function')}
								<th
									class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
									role="columnheader"
									scope="col"
								>
									Actions
								</th>
							{/if}
						</tr>
					</thead>
					<tbody class="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-dark-700">
						{#each sortedItems as item, index (item.id || item.username || item.name || index)}
							<tr
								class="hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors duration-150"
								aria-rowindex={index + 2}
							>
								{#each columns as column (column.key)}
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
										{#if column.type === 'badge'}
											<div class="flex items-center space-x-2">
												<span class="badge {getBadgeClass(String(item[column.key]))}">
													{formatValue(item[column.key], column.type)}
												</span>
												{#if column.inlineActions}
													{#each column.inlineActions as inlineAction (inlineAction.action)}
														{#if !inlineAction.condition || inlineAction.condition(item)}
															<button
																class={`inline-flex items-center p-1 rounded-md text-xs ${
																	inlineAction.variant === 'danger'
																		? 'text-red-600 hover:text-red-800 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20'
																		: inlineAction.variant === 'primary'
																			? 'text-devil-600 hover:text-devil-800 hover:bg-devil-50 dark:text-devil-400 dark:hover:text-devil-300 dark:hover:bg-devil-900/20'
																			: 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-900/20'
																} transition-colors duration-150 ${inlineAction.loading ? 'opacity-50 cursor-not-allowed' : ''}`}
																disabled={inlineAction.loading}
																on:click={(event) => {
																	event.preventDefault();
																	event.stopPropagation();
																	handleAction(inlineAction.action, item);
																}}
																title={inlineAction.title}
																aria-label={inlineAction.title}
															>
																{#if inlineAction.loading}
																	<svg class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
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
																{:else}
																	<svg
																		class="w-3 h-3"
																		fill="none"
																		stroke="currentColor"
																		viewBox="0 0 24 24"
																	>
																		<path
																			stroke-linecap="round"
																			stroke-linejoin="round"
																			stroke-width="2"
																			d={inlineAction.icon}
																		></path>
																	</svg>
																{/if}
															</button>
														{/if}
													{/each}
												{/if}
											</div>
										{:else if column.key === 'url'}
											<div class="flex items-center space-x-2">
												{#if item[column.key]}
													<a
														href={String(item[column.key])}
														target="_blank"
														rel="noopener noreferrer"
														class="text-devil-600 hover:text-devil-800 dark:text-devil-400 dark:hover:text-devil-300 underline truncate max-w-xs"
														title={String(item[column.key])}
													>
														{formatValue(item[column.key], column.type)}
													</a>
												{:else}
													<span class="text-gray-400 dark:text-gray-500">-</span>
												{/if}
												{#if item[column.key]}
													<button
														class="btn-secondary text-xs px-2 py-1 shrink-0"
														on:click={() => copyToClipboard(String(item[column.key]))}
														title="Copy clone URL"
														aria-label="Copy to clipboard"
													>
														<svg
															class="w-3 h-3"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
															></path>
														</svg>
													</button>
												{/if}
											</div>
										{:else if column.type === 'editable'}
											<select
												class="input-field text-xs py-1 px-2 max-w-xs"
												value={String(item[column.key])}
												on:change={(e) => handleSelectChange(e, column.key, item)}
											>
												{#each column.editableOptions || [] as option (option.value)}
													<option value={option.value}>{option.label}</option>
												{/each}
											</select>
										{:else}
											<div class="flex items-center space-x-2">
												<span>{formatValue(item[column.key], column.type)}</span>
												{#if column.inlineActions}
													{#each column.inlineActions as inlineAction (inlineAction.action)}
														{#if !inlineAction.condition || inlineAction.condition(item)}
															<button
																class={`inline-flex items-center p-1 rounded-md text-xs ${
																	inlineAction.variant === 'danger'
																		? 'text-red-600 hover:text-red-800 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20'
																		: inlineAction.variant === 'primary'
																			? 'text-devil-600 hover:text-devil-800 hover:bg-devil-50 dark:text-devil-400 dark:hover:text-devil-300 dark:hover:bg-devil-900/20'
																			: 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-900/20'
																} transition-colors duration-150 ${inlineAction.loading ? 'opacity-50 cursor-not-allowed' : ''}`}
																disabled={inlineAction.loading}
																on:click={(event) => {
																	event.preventDefault();
																	event.stopPropagation();
																	handleAction(inlineAction.action, item);
																}}
																title={inlineAction.title}
																aria-label={inlineAction.title}
															>
																{#if inlineAction.loading}
																	<svg class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
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
																{:else}
																	<svg
																		class="w-3 h-3"
																		fill="none"
																		stroke="currentColor"
																		viewBox="0 0 24 24"
																	>
																		<path
																			stroke-linecap="round"
																			stroke-linejoin="round"
																			stroke-width="2"
																			d={inlineAction.icon}
																		></path>
																	</svg>
																{/if}
															</button>
														{/if}
													{/each}
												{/if}
											</div>
										{/if}
									</td>
								{/each}
								{#if actions && ((Array.isArray(actions) && actions.length > 0) || typeof actions === 'function')}
									<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
										<div class="flex justify-end space-x-2">
											{#each getActionsForItem(item) as action (action.label)}
												<button
													class={`btn-${action.variant || 'secondary'} text-xs px-2 py-1 ${action.loading ? 'opacity-50 cursor-not-allowed' : ''} ${action.disabled ? 'opacity-50 cursor-not-allowed bg-gray-300 dark:bg-gray-600' : ''}`}
													disabled={action.loading || action.disabled}
													on:click={(event) => {
														event.preventDefault();
														event.stopPropagation();
														handleAction(action.action, item);
													}}
												>
													{#if action.loading}
														<svg
															class="animate-spin h-3 w-3 mr-1 inline"
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
													{/if}
													{action.label}
												</button>
											{/each}
										</div>
									</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>
