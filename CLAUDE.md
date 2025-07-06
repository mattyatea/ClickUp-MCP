# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a ClickUp MCP (Model Context Protocol) Server built with Cloudflare Workers that provides OAuth authentication and MCP tools for ClickUp integration. The server uses Cloudflare's AgentsSDK for real-time communication and supports comprehensive ClickUp API operations.

## Key Architecture

### Core Components

- **Main Entry Point**: `src/index.ts` - Extends `McpAgent` from Cloudflare's AgentsSDK to provide ClickUp-specific MCP tools
- **OAuth Handler**: `src/clickup-handler.ts` - Handles ClickUp OAuth 2.0 authentication flow
- **ClickUp Service**: `src/services/clickup-service.ts` - Centralized service for all ClickUp API interactions
- **Configuration**: `src/config.ts` - Application configuration and ClickUp API constants
- **Types**: `src/types.ts` - TypeScript type definitions for the entire project

### Technology Stack

- **Runtime**: Cloudflare Workers with Node.js compatibility
- **Framework**: Hono for HTTP handling, Cloudflare AgentsSDK for MCP
- **Authentication**: OAuth 2.0 with ClickUp using `@cloudflare/workers-oauth-provider`
- **Storage**: Cloudflare KV for OAuth state and session management
- **Validation**: Zod for schema validation

### MCP Tools Architecture

The server provides 20+ MCP tools organized into categories:
- **Authentication**: `getUserInfo`
- **Workspace Management**: `getWorkspaces`, `getSpaces`, `getFolders`, `getListsInFolder`, `getListsInSpace`, `getAllLists`
- **Task Management**: `getTasks`, `createTask`, `updateTask`, `deleteTask`, `getMyTasks`
- **Time Tracking**: `startTimeTracking`, `stopTimeTracking`, `getTimeEntries`, `createTimeEntry`, `updateTimeEntry`, `deleteTimeEntry`

## Common Development Commands

```bash
# Install dependencies
npm install

# Start development server (localhost:8788)
npm run dev

# Deploy to Cloudflare Workers
npm run deploy

# Type checking
npm run type-check

# Generate Cloudflare types
npm run cf-typegen
```

## Development Workflow

### Local Development Setup

1. **Environment Variables**: Create `.dev.vars` file with:
   - `CLICKUP_CLIENT_ID`
   - `CLICKUP_CLIENT_SECRET`
   - `COOKIE_ENCRYPTION_KEY` (32 characters)

2. **KV Namespace**: Ensure `OAUTH_KV` namespace exists (ID: `4d19b46a963d477d9ca3b39699740072`)

3. **OAuth Configuration**: ClickUp app redirect URL should be `https://your-domain.workers.dev/callback`

### Testing MCP Tools

All MCP tools require OAuth authentication via `accessToken` from `this.props.accessToken`. The tools follow a consistent pattern:
- Zod schema validation for parameters
- ClickUpService method calls
- Standardized error handling with Japanese error messages
- JSON response formatting

### Error Handling

- All services use try-catch blocks with descriptive Japanese error messages
- ClickUp API errors include HTTP status codes and response text
- OAuth errors are handled by the OAuthProvider framework

## Important Implementation Notes

### OAuth Flow

The OAuth implementation uses Cloudflare's `@cloudflare/workers-oauth-provider` with:
- Authorization endpoint: `/authorize`
- Token endpoint: `/token`
- Callback endpoint: `/callback`
- MCP endpoint: `/sse` (handled by AgentsSDK)

### API Service Patterns

When adding new ClickUp API methods to `ClickUpService`:
1. Add appropriate TypeScript interfaces in `types.ts`
2. Follow the existing pattern: URL construction, authorization headers, error handling
3. Use the `ServiceDependencies` pattern for configuration access
4. Return structured responses with proper error messages

### MCP Tool Development

When adding new MCP tools:
1. Define Zod schema for parameters
2. Use `this.props.accessToken` for ClickUp API authentication
3. Call appropriate `ClickUpService` methods
4. Return standardized `{ content: [{ text: JSON.stringify(data, null, 2), type: "text" }] }`
5. Include comprehensive error handling with Japanese messages

### Environment Management

Production secrets are managed via Wrangler:
```bash
npx wrangler secret put CLICKUP_CLIENT_ID
npx wrangler secret put CLICKUP_CLIENT_SECRET
npx wrangler secret put COOKIE_ENCRYPTION_KEY
```

## Configuration Details

### Cloudflare Workers Setup

- **Compatibility Date**: `2025-03-10`
- **Node.js Compatibility**: Enabled
- **Durable Objects**: `MyMCP` class for MCP agent instances
- **AI Binding**: Available for potential future use
- **Observability**: Enabled for monitoring

### ClickUp API Integration

Base URL: `https://api.clickup.com/api/v2`
- All API calls use Bearer token authentication
- Error responses include HTTP status and response text
- Rate limiting is handled by ClickUp's API limits

## Key Files to Understand

1. **`src/index.ts`**: Start here to understand the MCP server architecture and available tools
2. **`src/services/clickup-service.ts`**: Contains all ClickUp API integration logic
3. **`src/types.ts`**: Essential for understanding data structures
4. **`wrangler.jsonc`**: Cloudflare Workers configuration including bindings
5. **`package.json`**: Dependencies and available scripts