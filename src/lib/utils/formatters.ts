/**
 * Format bytes into human readable format
 */
export function formatBytes(bytes: number): string {
	// Input validation and sanitization
	if (typeof bytes !== 'number' || isNaN(bytes) || bytes < 0) {
		return '0 Bytes';
	}

	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
	const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);

	const value = bytes / Math.pow(k, i);
	const formatted = i === 0 ? value.toString() : value.toFixed(2);

	return `${formatted} ${sizes[i]}`;
}

/**
 * Format mail quota bytes (API returns values in KB, not bytes)
 */
export function formatMailQuotaBytes(quotaKB: number): string {
	// Input validation and sanitization
	if (typeof quotaKB !== 'number' || isNaN(quotaKB) || quotaKB < 0) {
		return '0 Bytes';
	}

	if (quotaKB === 0) return '0 Bytes';

	// Convert KB to bytes first
	const bytes = quotaKB * 1024;
	return formatBytes(bytes);
}

/**
 * Format FTP quota display showing used and limit quota
 */
export function formatQuota(quotaMB: number, quotaUsedBytes: number): string {
	// Input validation and sanitization
	if (typeof quotaMB !== 'number' || isNaN(quotaMB) || quotaMB < 0) {
		quotaMB = 0;
	}
	if (typeof quotaUsedBytes !== 'number' || isNaN(quotaUsedBytes) || quotaUsedBytes < 0) {
		quotaUsedBytes = 0;
	}

	// Format used quota (convert bytes to appropriate unit)
	const usedFormatted = formatBytes(quotaUsedBytes);

	// Format quota limit (convert MB to appropriate unit)
	let limitFormatted: string;
	if (quotaMB >= 1024) {
		limitFormatted = `${(quotaMB / 1024).toFixed(2)} GB`;
	} else {
		limitFormatted = `${quotaMB} MB`;
	}

	return `${usedFormatted} / ${limitFormatted}`;
}

/**
 * Format date string to readable format
 */
export function formatDate(dateString: string | null | undefined): string {
	if (!dateString) return 'N/A';
	const date = new Date(dateString);
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		hour12: true
	});
}

/**
 * Format percentage with optional decimal places
 */
export function formatPercentage(value: number, decimals: number = 1): string {
	return `${value.toFixed(decimals)}%`;
}

/**
 * Capitalize first letter of string
 */
export function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert snake_case to Title Case
 */
export function snakeToTitle(str: string): string {
	return str
		.split('_')
		.map((word) => capitalize(word))
		.join(' ');
}
