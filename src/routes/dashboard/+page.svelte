<script lang="ts">
	// Helper variable for CPU usage
	$: cpuUsage = limits?.limits?.cpu ?? 0;
	// Helper variables for processes usage
	$: processesUsage = limits?.limits?.processes?.usage ?? 0;
	$: processesLimit = limits?.limits?.processes?.limit ?? 0;
	// Helper variables for RAM usage
	$: ramUsage = limits?.limits?.ram?.usage ?? 0;
	$: ramLimit = limits?.limits?.ram?.limit ?? 0;
	// Helper variables for disk space quota
	$: diskUsage = limits?.limits?.quotas?.usage ? limits.limits.quotas.usage * 1024 * 1024 : 0;
	$: diskQuota = limits?.limits?.quotas?.quota ? limits.limits.quotas.quota * 1024 * 1024 : 0;
	import { onMount } from 'svelte';
	import { navigateTo } from '$lib/utils';
	import { appState } from '$lib/stores/appState';
	import { apiGet, formatBytes, formatDate } from '$lib/utils';
	import AccountDetailsModal from '$lib/components/modals/AccountDetailsModal.svelte';
	import PhpModal from '$lib/components/modals/PhpModal.svelte';

	// Accept params prop to suppress SvelteKit warning
	export const params: Record<string, string> = {};

	type StatsType = {
		www: number[];
		dns: number[];
		ftp: number[];
		mail_account: number[];
		mail_alias: number[];
		mysql: number[];
		pgsql: number[];
		mongo: number[];
		repo: number[];
		port: number[];
		[key: string]: number[];
	};

	type LimitsData = {
		cpu?: number;
		processes?: {
			usage?: number;
			limit?: number;
		};
		ram?: {
			usage?: number;
			limit?: number;
		};
		quotas?: {
			usage?: number;
			quota?: number;
		};
		php?: {
			usage?: Record<string, number>;
			limit?: number;
			queue?: Record<string, number>;
		};
	};

	type AccountData = {
		account_username?: string;
		account_plan?: string;
		account_expires?: string;
	};

	let stats: StatsType = {
		www: [0, 0],
		dns: [0, 0],
		ftp: [0, 0],
		mail_account: [0, 0],
		mail_alias: [0, 0],
		mysql: [0, 0],
		pgsql: [0, 0],
		mongo: [0, 0],
		repo: [0, 0],
		port: [0, 0]
	};
	let limits: { stats: StatsType; limits?: LimitsData } | null = null;
	let account: { account?: AccountData } | null = null;
	let showAccountModal = false;
	let showPhpModal = false;
	let isLoading = true;

	let phpVersions: string[] = [];
	let phpLimit = 0;
	let phpUsage: Record<string, number> = {};
	let phpQueue: Record<string, number> = {};

	// Load all dashboard data in parallel
	onMount(() => {
		loadDashboardData();
	});

	async function loadDashboardData() {
		// Prevent multiple simultaneous calls
		if (!isLoading && (limits || account)) {
			return;
		}

		// Only load data if we're connected
		if (!$appState.isConnected) {
			isLoading = false;
			return;
		}

		isLoading = true;
		try {
			// Load both limits and account data in parallel
			const [limitsData, accountData] = await Promise.all([
				apiGet('/info/limits'),
				apiGet('/info/account')
			]);

			limits = limitsData as { stats: StatsType; limits?: LimitsData };
			account = accountData as { account?: AccountData };

			// Extract stats from limits response
			if (limits?.stats) {
				Object.keys(stats).forEach((key) => {
					if (limits && limits.stats && limits.stats[key as keyof StatsType]) {
						stats[key as keyof StatsType] = limits.stats[key as keyof StatsType];
					}
				});
			}

			// Extract PHP data from limits response
			if (limits?.limits?.php) {
				const phpData = limits.limits.php;
				phpVersions = Object.keys(phpData.usage || {});
				phpLimit = phpData.limit || 0;
				phpUsage = phpData.usage || {};
				phpQueue = phpData.queue || {};
			}
		} catch (error) {
			console.error('Failed to load dashboard data:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}
		} finally {
			isLoading = false;
		}
	}

	function openPhpModal() {
		showPhpModal = true;
	}
</script>

<svelte:head>
	<title>Dashboard - devil WEB</title>
</svelte:head>

<div class="space-y-6">
	<!-- Loading State -->
	{#if isLoading}
		<div class="card">
			<div class="flex items-center justify-center py-8">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-devil-500"></div>
				<span class="ml-3 text-gray-600 dark:text-gray-400">Loading dashboard data...</span>
			</div>
		</div>
	{/if}

	<!-- Account Information -->
	{#if !isLoading && account && account.account}
		<div class="card">
			<div class="card-header">
				<div class="flex justify-between items-center">
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white">Account Information</h3>
					<button
						on:click={() => (showAccountModal = true)}
						class="btn-secondary text-sm px-3 py-1"
					>
						View Details
					</button>
				</div>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
				<div class="flex flex-col">
					<span class="text-sm font-medium text-gray-600 dark:text-gray-400">Login</span>
					<span class="text-lg font-semibold text-gray-900 dark:text-white"
						>{account.account.account_username || 'N/A'}</span
					>
				</div>
				<div class="flex flex-col">
					<span class="text-sm font-medium text-gray-600 dark:text-gray-400">Plan</span>
					<span class="text-lg font-semibold text-gray-900 dark:text-white"
						>{account.account.account_plan || 'N/A'}</span
					>
				</div>
				<div class="flex flex-col">
					<span class="text-sm font-medium text-gray-600 dark:text-gray-400">Expiration Date</span>
					<span class="text-lg font-semibold text-gray-900 dark:text-white"
						>{formatDate(account.account.account_expires)}</span
					>
				</div>
			</div>
		</div>
	{/if}

	<!-- Stats Grid: 5 per row, 2 rows -->
	{#if !isLoading}
		<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
			{#each [{ key: 'www', label: 'Websites', icon: 'blue', modal: true, svg: `<svg class='w-6 h-6 text-blue-600 dark:text-blue-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 01 9-9'/></svg>` }, { key: 'dns', label: 'DNS', icon: 'indigo', svg: `<svg class='w-6 h-6 text-indigo-600 dark:text-indigo-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'><circle cx='12' cy='12' r='10' stroke-width='2'/><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M8 12h8'/></svg>` }, { key: 'ftp', label: 'FTP Accounts', icon: 'purple', svg: `<svg class='w-6 h-6 text-purple-600 dark:text-purple-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'><rect x='3' y='7' width='18' height='13' rx='2' stroke-width='2'/><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M16 3v4M8 3v4'/></svg>` }, { key: 'mail_account', label: 'Email Accounts', icon: 'yellow', svg: `<svg class='w-6 h-6 text-yellow-600 dark:text-yellow-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'><rect x='3' y='7' width='18' height='10' rx='2' stroke-width='2'/><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M3 7l9 6 9-6'/></svg>` }, { key: 'mail_alias', label: 'Email Aliases', icon: 'yellow', svg: `<svg class='w-6 h-6 text-yellow-600 dark:text-yellow-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'><rect x='3' y='7' width='18' height='10' rx='2' stroke-width='2'/><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M3 7l9 6 9-6'/></svg>` }, { key: 'mysql', label: 'MySQL', icon: 'green', svg: `<svg class='w-6 h-6 text-green-600 dark:text-green-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'><ellipse cx='12' cy='7' rx='9' ry='4' stroke-width='2'/><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M3 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7'/></svg>` }, { key: 'pgsql', label: 'PostgreSQL', icon: 'green', svg: `<svg class='w-6 h-6 text-green-600 dark:text-green-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'><ellipse cx='12' cy='7' rx='9' ry='4' stroke-width='2'/><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M3 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7'/></svg>` }, { key: 'mongo', label: 'MongoDB', icon: 'green', svg: `<svg class='w-6 h-6 text-green-600 dark:text-green-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M12 2v20m0 0c-4-2-6-6-6-10s2-8 6-10m0 20c4-2 6-6 6-10s-2-8-6-10'/></svg>` }, { key: 'repo', label: 'Repos', icon: 'gray', svg: `<svg class='w-6 h-6 text-gray-600 dark:text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'><circle cx='7' cy='17' r='3' stroke-width='2'/><circle cx='17' cy='7' r='3' stroke-width='2'/><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M7 17V7a3 3 0 013-3h4'/></svg>` }, { key: 'port', label: 'Ports', icon: 'red', svg: `<svg class='w-6 h-6 text-red-600 dark:text-red-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'><rect x='3' y='11' width='18' height='7' rx='2' stroke-width='2'/><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M7 11V7a5 5 0 0110 0v4'/></svg>` }] as item (item.key)}
				<div class="card flex flex-col items-center justify-center text-center">
					<div
						class="p-2 {item.icon === 'gray'
							? 'bg-gray-100 dark:bg-gray-700/30'
							: 'bg-' + item.icon + '-100 dark:bg-' + item.icon + '-900/20'} rounded-lg mb-3"
					>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html item.svg}
					</div>
					<div class="flex items-center justify-center gap-2 mb-2">
						<p class="text-sm font-medium text-gray-600 dark:text-gray-400">{item.label}</p>
						{#if item.modal}
							<button
								class="btn-secondary text-xs px-2 py-0.5"
								style="line-height:1.1;"
								on:click={openPhpModal}
							>
								PHP
							</button>
						{/if}
					</div>
					<p class="text-2xl font-semibold text-gray-900 dark:text-white">
						{Array.isArray(stats[item.key]) ? stats[item.key][0] : 0}<span
							class="text-base text-gray-500 dark:text-gray-400"
							>/{Array.isArray(stats[item.key]) ? stats[item.key][1] : 0}</span
						>
					</p>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Account Limits -->
	{#if !isLoading && limits}
		<div class="card">
			<div class="card-header">
				<h3 class="text-lg font-semibold text-gray-900 dark:text-white">Account Limits</h3>
			</div>
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
				{#if limits.limits?.quotas}
					<div class="text-center">
						<div class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Disk Space</div>
						<div class="text-sm font-semibold text-gray-900 dark:text-white mb-1">
							{formatBytes(diskUsage)} / {formatBytes(diskQuota)}
						</div>
						<div class="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-1.5">
							<div
								class="bg-devil-500 h-1.5 rounded-full"
								style="width: {Math.min(
									((limits.limits?.quotas?.usage || 0) / (limits.limits?.quotas?.quota || 1)) * 100,
									100
								)}%"
							></div>
						</div>
					</div>
				{/if}

				{#if limits.limits?.ram}
					<div class="text-center">
						<div class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">RAM Usage</div>
						<div class="text-sm font-semibold text-gray-900 dark:text-white mb-1">
							{formatBytes(ramUsage)} / {formatBytes(ramLimit)}
						</div>
						<div class="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-1.5">
							<div
								class="bg-blue-500 h-1.5 rounded-full"
								style="width: {Math.min(
									((limits.limits?.ram?.usage || 0) / (limits.limits?.ram?.limit || 1)) * 100,
									100
								)}%"
							></div>
						</div>
					</div>
				{/if}

				{#if limits.limits?.processes}
					<div class="text-center">
						<div class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Processes</div>
						<div class="text-sm font-semibold text-gray-900 dark:text-white mb-1">
							{processesUsage} / {processesLimit}
						</div>
						<div class="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-1.5">
							<div
								class="bg-green-500 h-1.5 rounded-full"
								style="width: {Math.min(
									((limits.limits?.processes?.usage || 0) /
										(limits.limits?.processes?.limit || 1)) *
										100,
									100
								)}%"
							></div>
						</div>
					</div>
				{/if}

				{#if limits.limits?.cpu !== undefined}
					<div class="text-center">
						<div class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">CPU Usage</div>
						<div class="text-sm font-semibold text-gray-900 dark:text-white mb-1">
							{cpuUsage}%
						</div>
						<div class="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-1.5">
							<div
								class="bg-red-500 h-1.5 rounded-full"
								style="width: {Math.min(cpuUsage, 100)}%"
							></div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- Account Details Modal -->
<AccountDetailsModal
	bind:showModal={showAccountModal}
	{account}
	on:close={() => (showAccountModal = false)}
/>

<!-- PHP Modal -->
<PhpModal
	bind:showModal={showPhpModal}
	{phpVersions}
	{phpUsage}
	{phpLimit}
	{phpQueue}
	on:close={() => (showPhpModal = false)}
/>
