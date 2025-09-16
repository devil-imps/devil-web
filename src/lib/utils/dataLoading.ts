import { onMount } from 'svelte';
import { addToast } from '$lib/stores/appState';

/**
 * Hook for loading data with loading state and error handling
 */
export function useDataLoader<T>(
	loadFunction: () => Promise<T>,
	onSuccess?: (data: T) => void,
	onError?: (error: Error) => void
) {
	let data: T | null = null;
	let loading = true;
	let error: Error | null = null;

	const loadData = async () => {
		loading = true;
		error = null;

		try {
			data = await loadFunction();
			if (onSuccess) {
				onSuccess(data);
			}
		} catch (err) {
			error = err instanceof Error ? err : new Error('Unknown error');
			console.error('Data loading error:', error);

			if (onError) {
				onError(error);
			} else {
				// Default error handling
				addToast({
					type: 'error',
					message: error.message || 'Failed to load data'
				});
			}
		} finally {
			loading = false;
		}
	};

	onMount(() => {
		loadData();
	});

	return {
		data,
		loading,
		error,
		refetch: loadData
	};
}

/**
 * Simple data loading function with loading state
 */
export async function loadDataWithState<T>(
	loadFunction: () => Promise<T>,
	setLoading: (loading: boolean) => void,
	setData: (data: T) => void,
	setError?: (error: Error | null) => void
): Promise<void> {
	setLoading(true);
	if (setError) setError(null);

	try {
		const data = await loadFunction();
		setData(data);
	} catch (error) {
		const err = error instanceof Error ? error : new Error('Unknown error');
		console.error('Data loading error:', err);

		if (setError) {
			setError(err);
		} else {
			addToast({
				type: 'error',
				message: err.message || 'Failed to load data'
			});
		}
	} finally {
		setLoading(false);
	}
}
