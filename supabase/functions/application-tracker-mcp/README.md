# KTP Application Tracker MCP

Stateless Streamable HTTP MCP server hosted as a Supabase Edge Function. It wraps the existing KTP Application API so API-key authentication, scopes, ownership, validation, rate limits, deduplication, and audit logs remain centralized in Next.js.

## Environment

`KTP_API_BASE_URL` is optional and defaults to `https://www.ktpnewbrunswick.org`. Set it to a local Next.js URL when testing locally.

## Local serving

```powershell
npx supabase functions serve --no-verify-jwt application-tracker-mcp --env-file supabase/functions/.env.local
```

Endpoint:

```text
http://localhost:54321/functions/v1/application-tracker-mcp/mcp
```

The MCP client must send:

```http
Authorization: Bearer ktp_live_your_key
```

## Production deployment

```powershell
npx supabase functions deploy --no-verify-jwt application-tracker-mcp
```

Production endpoint:

```text
https://tagpabkdkbyjfmexikxn.supabase.co/functions/v1/application-tracker-mcp/mcp
```

## Tools

- `get_my_profile`
- `list_applications`
- `get_application`
- `add_application`
- `add_applications_bulk`
- `update_application`
