/**
 * Custom error to represent a resource conflict (e.g., unique constraint violation).
 * This allows the service layer to signal a specific type of error to the API layer,
 * which can then translate it into a 409 Conflict HTTP response.
 */
export class ConflictError extends Error {
  constructor(message = "Resource already exists.") {
    super(message);
    this.name = "ConflictError";
  }
}

/**
 * Custom error to represent a resource not found.
 * This allows the service layer to signal that a requested resource does not exist,
 * which can then be translated into a 404 Not Found HTTP response.
 */
export class NotFoundError extends Error {
  constructor(message = "Resource not found.") {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * Custom error to represent validation failures.
 * This allows the service layer to signal business logic validation errors,
 * which can then be translated into a 400 Bad Request HTTP response.
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
