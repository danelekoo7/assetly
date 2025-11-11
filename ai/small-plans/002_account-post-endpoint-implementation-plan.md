# API Endpoint Implementation Plan: POST /accounts

## 1. Endpoint Overview

The `POST /accounts` endpoint is designed to create a new financial account and its initial value entry for the authenticated user. This operation must be atomic, meaning both the account and the initial value entry are created successfully, or neither is.

## 2. Request Details

- **HTTP Method**: `POST`
- **URL Structure**: `/api/accounts`
- **Request Body**: The request body must be a JSON object with the following structure:
  - **Required**:
    - `name` (string): The name of the account (e.g., "mBank Savings"). Must be unique per user.
    - `type` (string): The type of account. Must be one of `investment_asset`, `cash_asset`, or `liability`.
    - `initial_value` (number): The initial monetary value of the account.
    - `date` (string): The date for the initial value entry in ISO 8601 format (e.g., "2023-10-28T12:00:00Z").
  - **Optional**: None.

## 3. Used Types

The implementation will use the following types defined in `src/types.ts`:

- **`CreateAccountCommand`**: This command model will serve as the basis for the Zod validation schema to ensure the request body is correctly structured.
  ```typescript
  export type CreateAccountCommand = Pick<TablesInsert<"accounts">, "name" | "type"> & {
    initial_value: number;
    date: string;
  };
  ```
- **`AccountDto`**: This DTO defines the shape of the account object returned in the success response.
  ```typescript
  export type AccountDto = Pick<Account, "id" | "name" | "type" | "currency" | "archived_at" | "created_at">;
  ```

## 4. Response Details

- **Success Response (`201 Created`)**:
  - Returns the newly created account object, matching the `AccountDto` structure.
  - Example:
    ```json
    {
      "id": "i9j0k1l2-...",
      "name": "My New Investment",
      "type": "investment_asset",
      "currency": "PLN",
      "archived_at": null,
      "created_at": "2023-10-28T11:00:00Z"
    }
    ```
- **Error Responses**:
  - `400 Bad Request`: If the request body is missing required fields or if they have invalid types/formats.
  - `401 Unauthorized`: If the user is not authenticated.
  - `409 Conflict`: If an account with the same name already exists for the user.
  - `500 Internal Server Error`: For any unexpected server-side errors, such as a database failure.

## 5. Data Flow

1. A `POST` request is sent to the `/api/accounts` endpoint.
2. The Astro middleware (`src/middleware/index.ts`) intercepts the request, validates the JWT, and attaches the user session and Supabase client to `context.locals`. If authentication fails, it returns `401 Unauthorized`.
3. The `POST` handler in `src/pages/api/accounts/index.ts` is invoked.
4. The handler parses the JSON request body and validates it using a Zod schema based on the `CreateAccountCommand` type. If validation fails, it returns a `400 Bad Request` response with error details.
5. The handler calls a service function, e.g., `AccountService.createAccountWithInitialValue(supabase, session, command)`.
6. The service function first attempts to insert the new account into the `accounts` table.
7. If the account insertion is successful, it retrieves the new account's ID.
8. Then, it attempts to insert the initial value entry into the `value_entries` table.
9. If the `value_entries` insertion fails, the service will attempt to delete the just-created account to manually "roll back" the transaction.
10. The service layer handles errors from the database. It specifically catches the unique constraint violation error (`23505`) during account creation and maps it to a `ConflictError` which results in a `409 Conflict` response in the API layer.
11. The API handler receives the created account data from the service. On success, it formats the data according to `AccountDto` and sends a `201 Created` response. If it catches a `ConflictError`, it sends `409 Conflict`. For any other database errors, it sends `500 Internal Server Error`.

## 6. Security Considerations

- **Authentication**: All requests are protected by the Astro middleware, which enforces the presence of a valid JWT. The API handler will additionally verify that a user session exists in `context.locals`.
- **Authorization**: Data access is controlled by PostgreSQL's Row-Level Security (RLS) policies on the `accounts` and `value_entries` tables. All database operations from the service layer will be executed via the Supabase client, which respects these policies and operates within the context of the authenticated user (`auth.uid()`).
- **Input Validation**: Rigorous validation of the request body using Zod is mandatory to prevent invalid data from reaching the business logic and to protect against potential injection vectors.

## 7. Error Handling

- **`400 Bad Request`**: Returned by the API handler if the Zod schema validation fails. The response body will contain a JSON object with details about the validation errors.
- **`401 Unauthorized`**: Returned by the middleware if the JWT is missing, invalid, or expired.
- **`409 Conflict`**: Returned by the API handler when the service layer indicates that the database threw a unique constraint violation on `(user_id, name)`. The service will be responsible for identifying the specific Postgres error code (`23505`) and mapping it appropriately.
- **`500 Internal Server Error`**: A generic catch-all in the API handler will return this status for any other exceptions. The error details will be logged server-side for debugging purposes.

## 8. Performance Considerations

- **Atomicity Note**: The operation is not truly atomic as it involves two separate API calls. A manual compensation (deleting the account) is performed if the second step fails. This carries a small risk of leaving an orphaned account if the cleanup operation itself fails.
- **Database Calls**: The operation requires two separate database calls (one for `accounts`, one for `value_entries`). While slightly less performant than a single transaction, the latency should be acceptable for this user-facing action.
- **Database Indexing**: The existing unique index `UNIQUE (user_id, name)` on the `accounts` table is crucial for efficiently checking for name conflicts during the first insert.

## 9. Implementation Steps

1.  **Define Zod Schema**:
    - In the new API route file `src/pages/api/accounts/index.ts`, define a Zod schema that validates the request body against the `CreateAccountCommand` structure. Include refinements, e.g., `name` must be a non-empty string.
2.  **Implement Service Logic**:
    - If it doesn't exist, create `src/lib/services/account.service.ts`.
    - Add an async function `createAccountWithInitialValue(supabase: SupabaseClient, session: Session, command: CreateAccountCommand)`.
    - Inside the function:
      a. Call `supabase.from('accounts').insert({ name: command.name, type: command.type, user_id: session.user.id }).select().single()`.
      b. In a `catch` block for this call, check if the database error code is `23505` (unique violation) and re-throw a custom `ConflictError`.
      c. If the account is created successfully, extract its `id`.
      d. Start a new `try...catch` block for the next step.
      e. Call `supabase.from('value_entries').insert({ account_id: id, date: command.date, value: command.initial_value, cash_flow: command.initial_value })`.
      f. If this second insert fails (in the new `catch` block), attempt to clean up by deleting the account: `await supabase.from('accounts').delete().eq('id', id)`. Re-throw the original error from the `value_entries` insertion.
      g. If both inserts succeed, return the created account data.
3.  **Create API Endpoint File**:
    - Create the file `src/pages/api/accounts/index.ts`.
4.  **Configure API Endpoint**:
    - Add `export const prerender = false;` to the top of the file to ensure it's a dynamic server-rendered route.
5.  **Implement `POST` Handler**:
    - Create the `POST` function handler `export async function POST({ request, locals: { supabase, session } }: APIContext)`.
    - Verify that `session` exists; if not, return a `401` response.
    - Parse the request body and validate it with the Zod schema, returning `400` on failure.
    - Wrap the call to `AccountService.createAccountWithInitialValue` in a `try...catch` block.
    - In the `catch` block, check if the error is an instance of `ConflictError` and return `409`. For all other errors, log them and return `500`.
    - On a successful service call, map the returned data to `AccountDto` and return a `201 Created` response.
6.  **Testing**:
    - Write unit tests for the `AccountService` logic, especially the error handling and cleanup process.
    - Write integration tests for the `POST /api/accounts` endpoint to cover:
      - The successful creation scenario (`201`).
      - Invalid request body (`400`).
      - Missing authentication (`401`).
      - Duplicate account name conflict (`409`).
      - Failure of the second insert (`value_entries`) and verify that the account is correctly rolled back.
