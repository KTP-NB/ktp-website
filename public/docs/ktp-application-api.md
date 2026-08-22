# KTP Internship Tracker API

Version 1.0

The KTP Internship Tracker API lets active members add, read, and update their own internship applications from scripts, automations, Codex, Claude, or an MCP server.

Production base URL:

```text
https://www.ktpnewbrunswick.org/api/v1
```

When testing locally, replace the production origin with the localhost address shown by the development server.

## Limits

- Maximum batch size: 50 applications
- Maximum API usage: 120 operations per API key per hour
- API deletion is intentionally unavailable. Delete applications through the website.
- API keys stop working immediately when revoked.
- Inactive members and alumni cannot use the API.

## 1. Authentication and key safety

Create a key from **Member Account → API & Integrations**. The complete key is shown only once.

Send it in the `Authorization` header on every request:

```http
Authorization: Bearer ktp_live_YOUR_KEY
```

Never put an API key in a URL, commit it to Git, paste it into public messages, or share it with another member. Create separate keys for separate workflows so each can be revoked independently.

Available scopes:

- `applications:read` permits GET requests.
- `applications:write` permits POST and PATCH requests.

Every key is tied to one member. The server determines ownership from the key and never accepts a caller-supplied `user_id`.

### Store a key temporarily in PowerShell

```powershell
$secureKey = Read-Host "Paste API key" -AsSecureString
$ktpApiKey = [System.Net.NetworkCredential]::new("", $secureKey).Password
```

### Make the key available to Codex or Claude without putting it in a prompt

The safest simple approach is to place the key in an environment variable and launch the agent from that same terminal. The agent's commands can read the variable without the key appearing in your prompt or source code.

PowerShell, for the current terminal session:

```powershell
$secureKey = Read-Host "Paste API key" -AsSecureString
$env:KTP_API_KEY = [System.Net.NetworkCredential]::new("", $secureKey).Password
$env:KTP_API_BASE_URL = "https://www.ktpnewbrunswick.org/api/v1"
```

macOS or Linux, for the current terminal session:

```bash
read -s -p "Paste API key: " KTP_API_KEY
export KTP_API_KEY
export KTP_API_BASE_URL="https://www.ktpnewbrunswick.org/api/v1"
```

Then start Codex or Claude from that terminal. Tell the agent to use `KTP_API_KEY` as the bearer token according to this guide. Do not ask it to print the variable.

For a reusable local workflow, store these values in a private `.env` file that is loaded by your script:

```dotenv
KTP_API_KEY=ktp_live_YOUR_KEY
KTP_API_BASE_URL=https://www.ktpnewbrunswick.org/api/v1
```

Protect that file:

- Add `.env` and `.env.*` to `.gitignore` before creating it.
- Never upload the `.env` file with the API documentation.
- Never commit it to a repository.
- Give each workflow its own key so it can be revoked independently.
- If a key appears in a prompt, screenshot, terminal transcript, or commit, revoke it immediately and create another.

## 2. Supported endpoints

| Method | Endpoint | Required scope | Purpose |
|---|---|---|---|
| GET | `/me` | Read | Confirm the key and member identity |
| GET | `/applications` | Read | List and filter owned applications |
| POST | `/applications` | Write | Add one or up to 50 applications |
| GET | `/applications/{id}` | Read | Retrieve one owned application |
| PATCH | `/applications/{id}` | Write | Update one owned application |

## 3. Application fields

| Field | Required | Default | Description |
|---|---|---|---|
| `company` | Yes | — | Company name, up to 160 characters |
| `position` | Yes | — | Position title, up to 200 characters |
| `date_applied` | No | Today | Original application date in `YYYY-MM-DD` format |
| `status` | No | `applied` | Current tracking status |
| `details` | No | `null` | Notes, up to 5,000 characters |
| `application_url` | No | `null` | An `http://` or `https://` URL |
| `referral` | No | `false` | Whether a referral was used |
| `referral_contact` | No | `null` | Referral contact, up to 200 characters |
| `external_id` | No | `null` | Stable source identifier used to prevent duplicates |

Supported statuses:

- `applied`
- `assessment`
- `interviewing`
- `rejected`
- `offer`
- `withdrawn`

## 4. Check your connection

### curl

```bash
curl https://www.ktpnewbrunswick.org/api/v1/me \
  -H "Authorization: Bearer YOUR_KEY"
```

### PowerShell

```powershell
Invoke-RestMethod `
  -Uri "https://www.ktpnewbrunswick.org/api/v1/me" `
  -Headers @{ Authorization = "Bearer $ktpApiKey" }
```

The response identifies the member, key name, and granted scopes.

## 5. Add one application

Only `company` and `position` are required.

```bash
curl -X POST https://www.ktpnewbrunswick.org/api/v1/applications \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "company": "Example Company",
    "position": "Software Engineering Intern",
    "date_applied": "2026-09-03",
    "status": "applied",
    "details": "Submitted through the company portal",
    "application_url": "https://example.com/jobs/123",
    "referral": false,
    "external_id": "gmail-message-unique-id"
  }'
```

A successful response uses HTTP 201, reports `created: 1`, and includes the saved application.

## 6. Add multiple applications

Wrap up to 50 application objects in an `applications` array:

```bash
curl -X POST https://www.ktpnewbrunswick.org/api/v1/applications \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "applications": [
      {
        "company": "Company One",
        "position": "Data Intern",
        "external_id": "email-001"
      },
      {
        "company": "Company Two",
        "position": "Product Intern",
        "external_id": "email-002"
      }
    ]
  }'
```

Each row receives one of these results:

- `created`: a new application was saved.
- `duplicate`: an application with the same `external_id` already exists.
- `invalid`: validation failed for that row.

Valid rows are saved even when another row in the same batch is invalid.

## 7. List applications

Results are paginated. `limit` accepts 1 through 100 and defaults to 50.

```bash
curl "https://www.ktpnewbrunswick.org/api/v1/applications?page=1&limit=50" \
  -H "Authorization: Bearer YOUR_KEY"
```

The response includes:

- `data`: application records
- `pagination.page`
- `pagination.limit`
- `pagination.total`

### Filter by month

```bash
curl "https://www.ktpnewbrunswick.org/api/v1/applications?month=2026-09" \
  -H "Authorization: Bearer YOUR_KEY"
```

### Filter by status

```bash
curl "https://www.ktpnewbrunswick.org/api/v1/applications?status=interviewing" \
  -H "Authorization: Bearer YOUR_KEY"
```

Filters may be combined:

```bash
curl "https://www.ktpnewbrunswick.org/api/v1/applications?month=2026-09&status=interviewing&page=1&limit=25" \
  -H "Authorization: Bearer YOUR_KEY"
```

## 8. Read one application

```bash
curl https://www.ktpnewbrunswick.org/api/v1/applications/APPLICATION_ID \
  -H "Authorization: Bearer YOUR_KEY"
```

An application belonging to another member is never returned.

## 9. Update an application

PATCH changes only the supplied fields. `external_id` cannot be changed after creation.

```bash
curl -X PATCH https://www.ktpnewbrunswick.org/api/v1/applications/APPLICATION_ID \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "interviewing",
    "details": "First-round interview scheduled"
  }'
```

The key cannot update another member's application, even if the application ID is known.

## 10. Duplicate-safe automation

Use `external_id` when a source system provides a stable identifier. For an email workflow, the Gmail message ID is a good choice:

```json
{
  "company": "Example Company",
  "position": "Engineering Intern",
  "external_id": "gmail-message-18f3abc123"
}
```

Repeating an insert with the same `external_id` returns the existing application as a duplicate instead of creating another row. External IDs are unique within a member's account, so different members can safely process the same posting.

## 11. Response codes

| Status | Meaning |
|---|---|
| 200 | Successful read/update, or a duplicate-only batch |
| 201 | At least one application was created |
| 400 | Malformed JSON, invalid fields, or an empty request |
| 401 | Missing, invalid, expired, or revoked key |
| 403 | Missing scope or inactive membership |
| 404 | Application does not exist or belongs to another member |
| 429 | Rate limit reached; respect the `Retry-After` header |

Errors use a machine-readable structure:

```json
{
  "error": {
    "message": "Validation failed.",
    "details": ["status is invalid."]
  }
}
```

Batch creation returns summary counts and per-row results:

```json
{
  "created": 1,
  "duplicates": 1,
  "failed": 1,
  "results": [
    { "index": 0, "status": "created", "application": {} },
    { "index": 1, "status": "duplicate", "application": {} },
    { "index": 2, "status": "invalid", "errors": ["position is required."] }
  ]
}
```

## 12. OpenAPI specification

The machine-readable OpenAPI 3.1 specification is available at:

```text
https://www.ktpnewbrunswick.org/api/v1/openapi
```

Tools capable of reading OpenAPI can use this endpoint to generate clients or inspect the API programmatically.
