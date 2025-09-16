/**
 * Generate a random password with specified length using uppercase, lowercase letters and numbers
 * Guarantees at least one uppercase letter, one lowercase letter, and one number
 * Uses cryptographically secure random generation when available
 */
export function generateRandomPassword(length: number = 20): string {
	// Ensure minimum length of 3 to accommodate required character types
	const minLength = Math.max(length, 3);

	const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	const lowercase = 'abcdefghijklmnopqrstuvwxyz';
	const numbers = '0123456789';
	const allChars = uppercase + lowercase + numbers;

	// Use crypto.getRandomValues for better randomness when available
	const getRandomInt = (max: number): number => {
		if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
			const array = new Uint32Array(1);
			crypto.getRandomValues(array);
			return array[0] % max;
		}
		return Math.floor(Math.random() * max);
	};

	// Generate at least one of each required character type
	const requiredChars = [
		uppercase.charAt(getRandomInt(uppercase.length)),
		lowercase.charAt(getRandomInt(lowercase.length)),
		numbers.charAt(getRandomInt(numbers.length))
	];

	// Fill the rest with random characters
	let result = requiredChars.join('');
	for (let i = requiredChars.length; i < minLength; i++) {
		result += allChars.charAt(getRandomInt(allChars.length));
	}

	// Shuffle the result to avoid predictable patterns
	return shuffleString(result);
}

/**
 * Shuffle a string randomly using Fisher-Yates algorithm
 * Uses crypto.getRandomValues for better randomness when available
 */
function shuffleString(str: string): string {
	const array = str.split('');

	// Use crypto.getRandomValues for better randomness when available
	const getRandomInt = (max: number): number => {
		if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
			const array = new Uint32Array(1);
			crypto.getRandomValues(array);
			return array[0] % max;
		}
		return Math.floor(Math.random() * max);
	};

	for (let i = array.length - 1; i > 0; i--) {
		const j = getRandomInt(i + 1);
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array.join('');
}

/**
 * Generate a random password and copy it to clipboard
 * Returns the generated password
 */
export async function generateAndCopyPassword(length: number = 20): Promise<string> {
	const password = generateRandomPassword(length);

	try {
		await navigator.clipboard.writeText(password);
		return password;
	} catch (error) {
		console.error('Failed to copy password to clipboard:', error);
		// Fallback: return password even if clipboard fails
		return password;
	}
}
