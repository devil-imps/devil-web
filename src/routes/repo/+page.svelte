<script lang="ts">
	import { onMount } from 'svelte';
	import { navigateTo } from '$lib/utils';
	import { addToast } from '$lib/stores/appState';
	import { apiGet, apiDelete, apiPut, apiPost } from '$lib/utils';
	import ResourceList from '$lib/components/ResourceList.svelte';
	import ConfirmationModal from '$lib/components/modals/ConfirmationModal.svelte';
	import RepoAddModal from '$lib/components/modals/add/RepoAddModal.svelte';

	// Accept params prop to suppress SvelteKit warning
	export const params: Record<string, string> = {};

	// Define repository API response interface
	interface ApiRepository {
		name: string;
		repo_type: string;
		visibility: string;
		url: string;
		id: string;
	}

	let repositories: Record<string, unknown>[] = [];
	let loading = true;
	let showDeleteModal = false;
	let deleteModalLoading = false;
	let repositoryToDelete: Record<string, unknown> | null = null;
	let showVisibilityModal = false;
	let visibilityModalLoading = false;
	let repositoryToChange: Record<string, unknown> | null = null;
	let newVisibilityValue: string = '';
	let showAddModal = false;
	let addModalLoading = false;

	const columns = [
		{ key: 'name', label: 'Repository Name', type: 'text' as const },
		{ key: 'type', label: 'Type', type: 'text' as const },
		{
			key: 'status',
			label: 'Visibility',
			type: 'editable' as const,
			editableOptions: [
				{ value: 'Private', label: 'Private' },
				{ value: 'Public', label: 'Public' }
			]
		},
		{ key: 'url', label: 'URL', type: 'text' as const }
	];

	const actions = [
		{ label: 'Users', action: 'users', variant: 'secondary' as const },
		{ label: 'Delete', action: 'delete', variant: 'danger' as const, requiresConfirmation: true }
	];

	// Helper function to format repository type names
	function formatRepoType(type: string): string {
		switch (type.toLowerCase()) {
			case 'git':
				return 'Git';
			case 'svn':
				return 'Subversion';
			case 'hg':
				return 'Mercurial';
			default:
				return type;
		}
	}

	// Load repositories on mount
	onMount(() => {
		loadRepositories();
	});

	async function loadRepositories() {
		loading = true;
		try {
			// Try the primary repositories endpoint
			let data = await apiGet('/repo/list');

			// Handle repositories API response structure
			if (data && typeof data === 'object') {
				const dataObj = data as Record<string, unknown>;
				if (dataObj.repos && Array.isArray(dataObj.repos)) {
					repositories = (dataObj.repos as ApiRepository[]).map((repo: ApiRepository) => ({
						name: repo.name,
						type: formatRepoType(repo.repo_type),
						originalType: repo.repo_type, // Store original API value
						status: repo.visibility === 'priv' ? 'Private' : 'Public',
						url: repo.url,
						id: repo.id
					}));
				} else {
					// Fallback for different response structures
					const reposObj = (dataObj.repositories as Record<string, unknown>) || {};
					repositories = Object.keys(reposObj).map((key) => ({
						name: key,
						type: formatRepoType(
							((reposObj[key] as Record<string, unknown>)?.type as string) || 'git'
						),
						originalType: ((reposObj[key] as Record<string, unknown>)?.type as string) || 'git', // Store original API value
						status: ((reposObj[key] as Record<string, unknown>)?.status as string) || 'Private',
						url: ((reposObj[key] as Record<string, unknown>)?.url as string) || '',
						id: key
					}));
				}
			} else {
				repositories = [];
			}
		} catch (error) {
			console.error('Error loading repositories:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to load repositories'
			});
		} finally {
			loading = false;
		}
	}

	function handleAction(event: CustomEvent) {
		const { action, item } = event.detail;

		switch (action) {
			case 'add':
				showAddModal = true;
				break;
			case 'users': {
				const repo = item as Record<string, unknown>;
				// Navigate to users management page
				navigateTo(`/repo/${repo.originalType || repo.type}/${repo.name}/users`);
				break;
			}
			case 'clone': {
				const repo = item as Record<string, unknown>;
				// Copy clone URL to clipboard
				if (repo.url) {
					navigator.clipboard
						.writeText(repo.url as string)
						.then(() => {
							addToast({
								type: 'success',
								message: `Clone URL copied: ${repo.url}`
							});
						})
						.catch(() => {
							addToast({
								type: 'info',
								message: `Clone URL: ${repo.url}`
							});
						});
				} else {
					addToast({
						type: 'info',
						message: `Cloning repository: ${repo.name}`
					});
				}
				break;
			}
			default:
				console.error('Unknown action:', action);
		}
	}

	function handleConfirmAction(event: CustomEvent) {
		const { action, item } = event.detail;
		const repo = item as Record<string, unknown>;

		switch (action) {
			case 'delete':
				repositoryToDelete = repo;
				showDeleteModal = true;
				break;
			default:
				console.error('Unknown confirm action:', action);
		}
	}

	async function deleteRepository(repo: Record<string, unknown>) {
		deleteModalLoading = true;
		try {
			const repoType = (repo.originalType || repo.type) as string;
			const repoName = repo.name as string;
			await apiDelete(`/repo/repository/${repoType}/${repoName}`);

			addToast({
				type: 'success',
				message: `Repository ${repo.name} deleted successfully`
			});
			loadRepositories();
			showDeleteModal = false;
			repositoryToDelete = null;
		} catch (error) {
			console.error('Error deleting repository:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to delete repository'
			});
		} finally {
			deleteModalLoading = false;
		}
	}

	function handleDeleteCancel() {
		showDeleteModal = false;
		repositoryToDelete = null;
		deleteModalLoading = false;
	}

	function handleEdit(event: CustomEvent) {
		const { column, value, item } = event.detail;
		const repo = item as Record<string, unknown>;

		if (column === 'status') {
			// Show confirmation modal for visibility changes
			repositoryToChange = repo;
			newVisibilityValue = value;
			showVisibilityModal = true;
		}
	}

	async function changeVisibility(repo: Record<string, unknown>, newVisibility: string) {
		visibilityModalLoading = true;
		try {
			const repoType = (repo.originalType || repo.type) as string;
			const repoName = repo.name as string;
			const visibility = newVisibility === 'Private' ? 'priv' : 'pub';

			// Use the correct PUT endpoint with proper request body
			await apiPut('/repo/repository/change', {
				repo_type: repoType,
				repo_name: repoName,
				repo_visibility: visibility
			});

			addToast({
				type: 'success',
				message: `Repository visibility changed to ${newVisibility}`
			});

			// Update the local data
			repositories = repositories.map((r) =>
				r.id === repo.id ? { ...r, status: newVisibility } : r
			);
		} catch (error) {
			console.error('Error changing visibility:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to change repository visibility'
			});
		} finally {
			visibilityModalLoading = false;
		}
	}

	function handleDeleteConfirm() {
		if (repositoryToDelete) {
			deleteRepository(repositoryToDelete);
		}
	}

	function handleVisibilityConfirm() {
		if (repositoryToChange && newVisibilityValue) {
			changeVisibility(repositoryToChange, newVisibilityValue);
			showVisibilityModal = false;
			repositoryToChange = null;
			newVisibilityValue = '';
		}
	}

	function handleVisibilityCancel() {
		showVisibilityModal = false;
		repositoryToChange = null;
		newVisibilityValue = '';
		visibilityModalLoading = false;
	}

	async function createRepository(repoData: {
		repo_name: string;
		repo_type: string;
		repo_visibility: string;
	}) {
		addModalLoading = true;
		try {
			await apiPost('/repo/repository/add', repoData);

			addToast({
				type: 'success',
				message: `Repository ${repoData.repo_name} created successfully`
			});
			loadRepositories();
			showAddModal = false;
		} catch (error) {
			console.error('Error creating repository:', error);

			// Check if it's an authentication error
			if (error instanceof Error && error.message === 'Not authenticated') {
				navigateTo('/');
				return;
			}

			addToast({
				type: 'error',
				message: 'Failed to create repository'
			});
		} finally {
			addModalLoading = false;
		}
	}

	function handleAddSubmit(event: CustomEvent) {
		const { detail: repoData } = event;
		createRepository(repoData);
	}

	function handleAddCancel() {
		showAddModal = false;
		addModalLoading = false;
	}
</script>

<svelte:head>
	<title>Repositories - devil WEB</title>
</svelte:head>

<ResourceList
	title="Repositories"
	items={repositories}
	{loading}
	{columns}
	{actions}
	searchPlaceholder="Search repositories..."
	addButtonLabel="Add Repository"
	on:action={handleAction}
	on:confirmAction={handleConfirmAction}
	on:edit={handleEdit}
/>

<ConfirmationModal
	showModal={showDeleteModal}
	title="Delete Repository"
	message={repositoryToDelete
		? `Are you sure you want to delete the repository "${repositoryToDelete.name}"? This action cannot be undone.`
		: ''}
	confirmText="Delete Repository"
	cancelText="Cancel"
	confirmVariant="danger"
	loading={deleteModalLoading}
	on:confirm={handleDeleteConfirm}
	on:cancel={handleDeleteCancel}
/>

<ConfirmationModal
	showModal={showVisibilityModal}
	title="Change Repository Visibility"
	message={repositoryToChange
		? `Are you sure you want to change the visibility of "${repositoryToChange.name}" to ${newVisibilityValue}?`
		: ''}
	confirmText="Change Visibility"
	cancelText="Cancel"
	confirmVariant="primary"
	loading={visibilityModalLoading}
	on:confirm={handleVisibilityConfirm}
	on:cancel={handleVisibilityCancel}
/>

<RepoAddModal
	showModal={showAddModal}
	loading={addModalLoading}
	on:submit={handleAddSubmit}
	on:cancel={handleAddCancel}
/>
