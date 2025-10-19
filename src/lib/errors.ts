/**
 * Custom error to represent a resource conflict (e.g., unique constraint violation).
 * This allows the service layer to signal a specific type of error to the API layer,
 * which can then translate it into a 409 Conflict HTTP response.
 */
export class ConflictError extends Error {
	constructor(message: string = 'Resource already exists.') {
		super(message);
		this.name = 'ConflictError';
	}
}
