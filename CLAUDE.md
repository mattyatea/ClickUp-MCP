# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with code in this repository. It serves as a reference for understanding the project structure, development workflow, and architectural patterns.

## Project Overview

**Project Name**: ClickUp MCP Server  
**Type**: Cloudflare Workers-based OAuth MCP Server  
**Purpose**: Provides MCP (Model Context Protocol) tools for interacting with the ClickUp API through OAuth authentication

## Common Commands

### Development Commands
- `pnpm dev` - Start local development server with Wrangler (port 8788)
- `pnpm start` - Alternative start command (same as dev)
- `pnpm type-check` - Run TypeScript type checking without emitting files
- `pnpm deploy` - Deploy to Cloudflare Workers
- `pnpm cf-typegen` - Generate TypeScript types from Wrangler configuration

### Cloudflare Workers Commands
- `npx wrangler secret put CLICKUP_CLIENT_ID` - Set ClickUp OAuth client ID
- `npx wrangler secret put CLICKUP_CLIENT_SECRET` - Set ClickUp OAuth client secret
- `npx wrangler secret put COOKIE_ENCRYPTION_KEY` - Set cookie encryption key (32 chars)
- `npx wrangler kv:namespace create "OAUTH_KV"` - Create KV namespace for OAuth
- `npx wrangler dev` - Start development server locally
- `npx wrangler deploy` - Deploy to production
- `npx wrangler logs` - View deployment logs

### Code Quality Commands
- `npx prettier --write .` - Format code using Prettier
- `npx tsc --noEmit` - Type check without compilation

## Architecture

This is a Cloudflare Workers-based OAuth MCP server that provides MCP (Model Context Protocol) tools for interacting with the ClickUp API.

### Technology Stack

- **Runtime**: Cloudflare Workers (Edge Runtime)
- **Language**: TypeScript (ES2021, strict mode)
- **Framework**: Hono for HTTP handling
- **OAuth**: @cloudflare/workers-oauth-provider
- **MCP**: @modelcontextprotocol/sdk + agents/mcp
- **API Client**: Built-in ClickUp API client
- **Validation**: Zod schemas
- **Package Manager**: pnpm

### Key Components

- **OAuth Flow**: Uses `@cloudflare/workers-oauth-provider` for OAuth authentication with ClickUp
- **MCP Server**: Extends `McpAgent` to provide structured API tools for ClickUp operations
- **Durable Objects**: Uses `MyMCP` durable object class for stateful MCP sessions
- **KV Storage**: Stores OAuth tokens and session data in Cloudflare KV
- **MCP Communication**: Real-time MCP communication via `/sse` endpoint

### Directory Structure

```
src/
├── index.ts                    # Main application entry point
├── config.ts                   # Configuration constants
├── types.ts                    # TypeScript type definitions
├── utils.ts                    # Utility functions
├── workers-oauth-utils.ts      # OAuth-specific utilities
├── handlers/                   # Request handlers
│   ├── combined-handler.ts     # Main routing logic
│   ├── oauth-handler.ts        # OAuth flow handlers
│   └── site-handler.ts         # Site and documentation handlers
└── tools/                      # Tools and utilities
    ├── clickup-tools.ts        # ClickUp API client tools
    └── error-handler.ts        # Error handling utilities
```

### Main Entry Points

- `src/index.ts` - Main application entry point, exports OAuth provider and MCP agent
- `src/handlers/combined-handler.ts` - Main routing logic that combines all handlers
- `src/handlers/oauth-handler.ts` - OAuth flow handlers (`/authorize`, `/callback`, `/webhook/clickup` endpoints)
- `src/handlers/site-handler.ts` - Site and documentation handlers (`/` endpoint)
- `src/tools/clickup-tools.ts` - ClickUp API client tools with all API operations
- `src/tools/error-handler.ts` - Error handling utilities for API responses

### Core Architecture Pattern

1. **OAuth Authentication**: User authenticates via ClickUp OAuth, tokens stored in KV
2. **MCP Agent**: Authenticated sessions create MCP agents with ClickUp API access
3. **Tool Registration**: Built-in tools for ClickUp operations are registered in the `init()` method
4. **MCP Endpoint**: `/sse` provides persistent connection for MCP communication
5. **Durable Objects**: Stateful sessions managed via Cloudflare Durable Objects

### MCP Tool Categories

- **User & Teams**: `getUserInfo`, `getWorkspaces`
- **Hierarchy**: `getSpaces`, `getFolders`, `getListsInFolder`, `getListsInSpace`, `getAllLists`
- **Tasks**: `getTasks`, `createTask`, `updateTask`, `deleteTask`, `getMyTasks`
- **Time Tracking**: `startTimeTracking`, `stopTimeTracking`, `getTimeEntries`, `createTimeEntry`, `updateTimeEntry`, `deleteTimeEntry`
- **Utilities**: `add` (basic math for testing)

## Environment Configuration

### Required Secrets (wrangler.jsonc)
- `CLICKUP_CLIENT_ID` - ClickUp OAuth application client ID
- `CLICKUP_CLIENT_SECRET` - ClickUp OAuth application client secret
- `COOKIE_ENCRYPTION_KEY` - 32-character encryption key for cookies

### Environment Variables
- `DEV_PORT` - Development server port (default: 8788)

### KV Namespaces
- `OAUTH_KV` - Stores OAuth tokens and session data

### Durable Objects
- `MyMCP` - Handles stateful MCP sessions

## OAuth Configuration

### OAuth Scopes
The application uses the default ClickUp OAuth scopes for full API access:
- Default scope provides read/write access to workspaces, spaces, folders, lists, and tasks
- Includes time tracking permissions for creating and managing time entries

### OAuth Endpoints
- `/authorize` - Initiates OAuth flow
- `/callback` - Handles OAuth callback
- `/sse` - SSE endpoint for MCP communication

## Development Workflow

### Getting Started
1. Install dependencies: `pnpm install`
2. Set up secrets: `npx wrangler secret put CLICKUP_CLIENT_ID`
3. Create KV namespace: `npx wrangler kv:namespace create "OAUTH_KV"`
4. Start development: `pnpm dev`

### Development Best Practices
- Always run `pnpm type-check` before committing
- Use Prettier for consistent code formatting
- Follow TypeScript strict mode guidelines
- Implement proper error handling using centralized error handlers
- Use Zod schemas for input validation

### Testing
- Manual testing via development server
- Type checking with `pnpm type-check`
- Deploy to preview for integration testing

## Key Dependencies

### Production Dependencies
- `@cloudflare/workers-oauth-provider` (^0.0.5) - OAuth provider for Workers
- `@modelcontextprotocol/sdk` (^1.13.0) - MCP protocol implementation
- `agents` (^0.0.95) - MCP agent framework
- `hono` (^4.8.2) - HTTP framework for request handling
- `workers-mcp` (^0.0.13) - MCP utilities for Workers
- `zod` (^3.25.67) - Runtime type validation for tool schemas

### Development Dependencies
- `@cloudflare/workers-types` (^4.20250620.0) - Cloudflare Workers type definitions
- `prettier` (^3.5.3) - Code formatting
- `typescript` (^5.8.3) - TypeScript compiler
- `wrangler` (^4.20.5) - Cloudflare Workers CLI

## Error Handling

### Centralized Error Handling
- `src/tools/error-handler.ts` - Centralized error handling for API operations
- All tools use consistent error handling with try-catch blocks
- OAuth errors return HTTP error responses with adaptive formatting (HTML for browsers, JSON for APIs)
- API errors are properly formatted for MCP responses

### Error Patterns
- Try-catch blocks around all API calls
- Proper error propagation through MCP tool responses
- Logging for debugging and monitoring

## TypeScript Configuration

### Compiler Options
- **Target**: ES2021
- **Module**: ES2022
- **Module Resolution**: Bundler
- **Strict Mode**: Enabled
- **No Emit**: True (Workers handles bundling)
- **Node Compatibility**: Enabled via compatibility flags

### Type Definitions
- Custom worker types in `worker-configuration.d.ts`
- Zod schemas for runtime validation
- Proper typing for MCP tools and responses

## Deployment

### Production Deployment
1. Ensure all secrets are set in production
2. Run `pnpm type-check` to verify code
3. Deploy with `pnpm deploy`
4. Monitor logs with `npx wrangler logs`

### Environment Considerations
- Cloudflare Workers Edge Runtime
- Durable Objects for state management
- KV storage for OAuth tokens
- Observability enabled for monitoring

## Code Style Guidelines

### General Principles
- Follow TypeScript strict mode
- Use descriptive variable and function names
- Implement proper error handling
- Use async/await over promises
- Prefer composition over inheritance

### File Organization
- Group related functionality in modules
- Use barrel exports where appropriate
- Keep handlers, tools, and utilities separate
- Follow consistent naming conventions

## Common Issues and Solutions

### OAuth Issues
- Ensure `CLICKUP_CLIENT_ID` and `CLICKUP_CLIENT_SECRET` are properly set
- Check KV namespace configuration
- Verify OAuth redirect URLs match ClickUp app settings

### MCP Tool Issues
- Validate input schemas with Zod
- Use consistent error handling patterns
- Test tool responses for proper JSON formatting

### Development Issues
- Use `pnpm dev` for local development
- Check compatibility flags in wrangler.jsonc
- Ensure Node.js compatibility is enabled

## Task Completion Best Practices

### Development Workflow
- 全てのタスクが終了したら、pnpm type-checkを実行して型エラーがないかを確認してください。型エラーがあったら修正してください

## Reference for Other Projects

This CLAUDE.md structure can be adapted for other projects by:

1. **Updating Project Overview** - Change project name, type, and purpose
2. **Modifying Commands** - Replace with project-specific commands
3. **Adapting Architecture** - Update technology stack and components
4. **Customizing Configuration** - Update environment variables and secrets
5. **Adjusting Dependencies** - List project-specific dependencies
6. **Tailoring Workflows** - Adapt development and deployment processes

### Template Structure
```markdown
# CLAUDE.md
## Project Overview
## Common Commands
## Architecture
## Environment Configuration
## Development Workflow
## Key Dependencies
## Error Handling
## [Technology-Specific Sections]
## Code Style Guidelines
## Common Issues and Solutions
## Reference for Other Projects
```