# REST API Plan

This document outlines the REST API for the Assetly application, designed to support the features described in the Product Requirements Document (PRD) and based on the provided database schema. The API is designed to be consumed by an Astro/React frontend, using Supabase as the backend.

## 1. Resources

The API revolves around two main resources, which map directly to the primary database tables.

- **Accounts**: Represents a user's financial account (e.g., bank account, investment portfolio, loan).
  - **Database Table**: `accounts`
- **Value Entries**: Represents a historical snapshot of an account's value on a specific date, including cash flow and investment gains/losses.
  - **Database Table**: `value_entries`

## 2. Endpoints

All endpoints are prefixed with `/api` and require authentication.

---

### **Resource: Accounts**

Manages user's financial accounts.

#### `GET /accounts`

- **Description**: Retrieves a list of all financial accounts for the authenticated user.
- **Query Parameters**:
  - `archived` (boolean, optional): Set to `true` to include archived accounts in the response. Defaults to `false`.
- **Success Response**: `200 OK`
  ```json
  [
    {
      "id": "a1b2c3d4-...",
      "name": "mBank Savings",
      "type": "cash_asset",
      "currency": "PLN",
      "archived_at": null,
      "created_at": "2023-10-27T10:00:00Z"
    },
    {
      "id": "e5f6g7h8-...",
      "name": "XTB Portfolio",
      "type": "investment_asset",
      "currency": "PLN",
      "archived_at": null,
      "created_at": "2023-10-27T10:05:00Z"
    }
  ]
  ```
- **Error Responses**: `401 Unauthorized`

---

#### `POST /accounts`

- **Description**: Creates a new financial account and its initial value entry. This is an atomic operation.
- **Request Body**:
  ```json
  {
    "name": "My New Investment",
    "type": "investment_asset",
    "initial_value": 10000.0,
    "date": "2023-10-28T12:00:00Z"
  }
  ```
- **Success Response**: `201 Created`
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
  - `400 Bad Request`: If `name`, `type`, `initial_value`, or `date` are missing or invalid.
  - `401 Unauthorized`: If the user is not authenticated.
  - `409 Conflict`: If an account with the same name already exists for this user.

---

#### `PATCH /accounts/{id}`

- **Description**: Updates an account's properties, such as its name or archival status.
- **URL Parameters**:
  - `id` (uuid): The ID of the account to update.
- **Request Body** (Example: Archiving an account):
  ```json
  {
    "archived_at": "2023-10-28T12:00:00Z"
  }
  ```
- **Request Body** (Example: Renaming an account):
  ```json
  {
    "name": "My Renamed Account"
  }
  ```
- **Success Response**: `200 OK`
  - Returns the updated account object.
- **Error Responses**:
  - `400 Bad Request`: Invalid request body.
  - `401 Unauthorized`: User not authenticated.
  - `404 Not Found`: Account with the given `id` not found or does not belong to the user.

---

#### `DELETE /accounts/{id}`

- **Description**: Permanently deletes an account and all its associated value entries (due to `ON DELETE CASCADE` in the database).
- **URL Parameters**:
  - `id` (uuid): The ID of the account to delete.
- **Success Response**: `204 No Content`
- **Error Responses**:
  - `401 Unauthorized`: User not authenticated.
  - `404 Not Found`: Account with the given `id` not found or does not belong to the user.

---

### **Resource: Value Entries**

Manages historical value records for accounts.

#### `POST /value-entries` (Upsert Operation)

- **Description**: Creates a new value entry or updates an existing one for a specific account and date. This endpoint encapsulates the complex business logic for calculating `cash_flow` and `gain_loss`.
- **Request Body**:
  ```json
  {
    "account_id": "e5f6g7h8-...",
    "date": "2023-10-28T00:00:00Z",
    "value": 15500.0,
    "cash_flow": 500.0, // Optional
    "gain_loss": null // Optional, will be calculated if null
  }
  ```
- **Success Response**: `200 OK`
  - Returns the created or updated value entry object.
  ```json
  {
    "id": "z1y2x3w4-...",
    "account_id": "e5f6g7h8-...",
    "date": "2023-10-28T00:00:00Z",
    "value": 15500.0,
    "cash_flow": 500.0,
    "gain_loss": 250.0, // Example calculated value
    "created_at": "2023-10-28T14:00:00Z",
    "updated_at": "2023-10-28T14:00:00Z"
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: If required fields are missing, validation fails (e.g., `value` + `cash_flow` + `gain_loss` inconsistency), or data types are incorrect.
  - `401 Unauthorized`: User not authenticated.
  - `404 Not Found`: The specified `account_id` does not exist or belong to the user.

---

### **Aggregated Endpoints (for UI)**

These endpoints are designed to provide data in a format optimized for specific UI components, improving frontend performance and simplifying logic.

#### `GET /grid-data`

- **Description**: Fetches all the data required to render the main spreadsheet-like grid view. This includes all accounts, all relevant dates, and the corresponding value entries.
- **Query Parameters**:
  - `from` (date-string, optional): Start date for the data range.
  - `to` (date-string, optional): End date for the data range.
- **Success Response**: `200 OK`
  ```json
  {
    "dates": ["2023-10-27", "2023-10-28"],
    "accounts": [
      {
        "id": "a1b2c3d4-...",
        "name": "mBank Savings",
        "type": "cash_asset",
        "entries": {
          "2023-10-27": { "value": 5000, "cash_flow": 0, "gain_loss": 0 },
          "2023-10-28": { "value": 5100, "cash_flow": 100, "gain_loss": 0 }
        }
      },
      {
        "id": "e5f6g7h8-...",
        "name": "XTB Portfolio",
        "type": "investment_asset",
        "entries": {
          "2023-10-27": { "value": 15000, "cash_flow": 0, "gain_loss": 0 },
          "2023-10-28": { "value": 15500, "cash_flow": 500, "gain_loss": 250 }
        }
      }
    ],
    "summary": {
      "2023-10-27": { "net_worth": 20000 },
      "2023-10-28": { "net_worth": 20600 }
    }
  }
  ```
- **Error Responses**: `401 Unauthorized`

---

#### `GET /dashboard/summary`

- **Description**: Retrieves key performance indicators for the main dashboard display. All calculations are based on the most recent value entries for all accounts.
- **Success Response**: `200 OK`
  ```json
  {
    "net_worth": 20600.0,
    "total_assets": 20600.0,
    "total_liabilities": 0.0,
    "cumulative_cash_flow": 600.0,
    "cumulative_gain_loss": 250.0
  }
  ```
- **Error Responses**: `401 Unauthorized`

## 3. Authentication and Authorization

- **Mechanism**: Authentication is handled by Supabase Auth. Clients must obtain a JSON Web Token (JWT) through Supabase's login/signup methods.
- **Implementation**: Every request to the API must include an `Authorization` header with the JWT.
  - **Format**: `Authorization: Bearer <SUPABASE_JWT>`
- **Authorization**: Data access is enforced at the database level using PostgreSQL's Row-Level Security (RLS).
  - Policies are configured on the `accounts` and `value_entries` tables to ensure users can only access and modify their own data.
  - API endpoints do not need to perform explicit user ID checks in their business logic, as the database enforces this automatically based on the authenticated user's ID (`auth.uid()`).

## 4. Validation and Business Logic

### Validation

- **Uniqueness**:
  - `Account Name`: The API will return `409 Conflict` if a user tries to create an account with a name that they already use. (`UNIQUE (user_id, name)` constraint on `accounts`).
  - `Value Entry Date`: The `POST /value-entries` endpoint acts as an "upsert," gracefully handling the `UNIQUE (account_id, date)` constraint on `value_entries`.
- **Data Types and Presence**:
  - All required fields in request bodies must be present and of the correct type (e.g., `string`, `number`, `enum`). Missing or invalid fields will result in a `400 Bad Request`.
  - The `account.type` must be one of the `account_type` enum values: `investment_asset`, `cash_asset`, or `liability`.
- **Financial Precision**: All financial values are handled as `NUMERIC(18, 4)` in the database to prevent floating-point precision issues. The API should expect and handle decimal values appropriately.

### Business Logic Implementation

The core business logic is implemented in the `POST /value-entries` endpoint, as described in the PRD (US-009):

1.  **Fetch Previous Value**: The backend first fetches the value entry for the same account on the immediately preceding day to use as a baseline (`previous_value`).
2.  **Scenario 1: Only `value` is provided**:
    - If `account.type` is `cash_asset` or `liability`: `cash_flow` is calculated as `value - previous_value`, and `gain_loss` is set to `0`.
    - If `account.type` is `investment_asset`: `gain_loss` is calculated as `value - previous_value`, and `cash_flow` is set to `0`.
3.  **Scenario 2: `value` and `cash_flow` are provided**:
    - `gain_loss` is calculated as `value - previous_value - cash_flow`.
4.  **Scenario 3: `value`, `cash_flow`, and `gain_loss` are all provided**:
    - The backend validates the data integrity: `previous_value + cash_flow + gain_loss` must equal the new `value`. If not, a `400 Bad Request` is returned with a descriptive error.
