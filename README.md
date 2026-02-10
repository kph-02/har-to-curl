# API Reverse Engineering Tool

Full-stack application for reverse-engineering APIs from HAR files using LLM-powered analysis.

## Features

- **HAR File Upload & Inspection**: Upload `.har` files and browse individual requests
- **LLM-Powered Matching**: Describe an API endpoint and get the best-matching request
- **PII & Secret Redaction**: Automatic sanitization of sensitive data before LLM processing
- **Interactive Request Editor**: Modify headers, parameters, and body before execution
- **Request Execution**: Run the generated curl command and view responses
- **Token-Efficient Processing**: Two-pass strategy for large HAR files

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + shadcn/ui + Tailwind CSS
- **Backend**: NestJS + OpenAI SDK
- **Architecture**: BFF (Backend-for-Frontend) pattern

## Monorepo Structure

```
reverse-api/
├── frontend/          # Next.js application
│   ├── src/
│   │   ├── app/       # App Router pages & layouts
│   │   ├── components/# UI components
│   │   └── lib/       # API client, types, utilities
│   └── package.json
├── backend/           # NestJS application
│   ├── src/
│   │   ├── har/       # HAR upload & parsing
│   │   ├── llm/       # LLM orchestration & redaction
│   │   ├── curl/      # Curl generation & execution
│   │   └── shared/    # Config, filters, guards, session store
│   └── package.json
├── .env.example       # Environment variables template
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- OpenAI API key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   # Backend
   cd backend && npm install
   
   # Frontend
   cd ../frontend && npm install
   ```

3. Set up environment variables:
   
   **Configuration (`.env`)**:
   ```bash
   cp .env.example .env
   # Review and adjust configuration values as needed
   ```
   
   **Secrets (`.env.secrets`)** - ⚠️ Restricted Access:
   ```bash
   cp .env.secrets.example .env.secrets
   # Add your OPENAI_API_KEY and other sensitive credentials
   # DO NOT share or commit this file
   ```

### Environment Files

This project uses two separate environment files for security:

| File | Purpose | Access Level | Commit to Git? |
|------|---------|--------------|----------------|
| `.env` | Non-sensitive configuration (ports, limits, thresholds) | Team-wide | ❌ No (varies by environment) |
| `.env.secrets` | Sensitive credentials (API keys, tokens, passwords) | **Restricted** | ❌ **NEVER** |
| `.env.example` | Configuration template | Public | ✅ Yes |
| `.env.secrets.example` | Secrets template | Public | ✅ Yes |

**Production Best Practices:**
- Use secret management tools: AWS Secrets Manager, HashiCorp Vault, Google Secret Manager
- Rotate API keys regularly
- Implement role-based access control (RBAC) for secrets
- Audit secret access logs

### Running the Application

1. Start the backend (port 3001):
   ```bash
   cd backend
   npm run start:dev
   ```

2. Start the frontend (port 3000):
   ```bash
   cd frontend
   npm run dev
   ```

3. Open http://localhost:3000 in your browser

## Configuration

All configurable parameters are defined in `.env.example`. Key settings:

### Backend Configuration
- `OPENAI_API_KEY` (required): Your OpenAI API key (in `.env.secrets`)
- `OPENAI_MODEL` (required): OpenAI model to use (in `.env.secrets`)
- `LLM_SINGLE_PASS_THRESHOLD` (default: 15): Max entries for single-pass LLM strategy
- `LLM_TOP_K_CANDIDATES` (default: 3): Number of candidates selected in Pass 1
- `MAX_HAR_ENTRIES` (default: 500): Maximum HAR entries to process
- `MAX_HAR_SIZE_MB` (default: 50): Maximum HAR file size in MB (max: 100)
- `BODY_TRUNCATE_LIMIT` (default: 2000): Max characters for request/response bodies
- `SESSION_STORE_TTL_MINUTES` (default: 30): Session expiration time
- `PORT` (default: 3001): Backend server port

### Frontend Configuration
- `BACKEND_URL` (default: http://localhost:3001): Backend API URL for Next.js rewrites
  - **Development**: `http://localhost:3001`
  - **Production**: Set to your deployed backend URL (e.g., `https://api.yourdomain.com`)

## Session Store Scalability

The current implementation uses an in-memory `Map` for session storage. This is suitable for:
- Single-instance deployments
- Development and testing
- Demo/proof-of-concept scenarios

**For production horizontal scaling**, replace the in-memory store with Redis:
- Install `@nestjs/redis` or `ioredis`
- Implement a `RedisSessionStore` service
- Update `SessionStoreService` to use Redis
- Configure Redis connection in `.env`

## Security Features

- **PII Redaction**: Automatic masking of sensitive headers and body fields before LLM processing
- **SSRF Prevention**: URL validation blocks private IP ranges, localhost (in production), IPv6 private ranges, and suspicious patterns
  - **Development Mode**: Allows `localhost` and `127.0.0.1` for local testing
  - **Production Mode**: Blocks all private/internal networks
  - Known limitations: DNS rebinding attacks, redirect-based SSRF (see code comments)
- **Rate Limiting**: Throttling on analysis and execution endpoints
- **Input Validation**: DTO validation with `class-validator`
- **Secure Headers**: Helmet middleware for CSP, HSTS, etc.
- **File Size Limits**: Configurable max HAR file size (default: 50MB, max: 100MB)
- **Session Management**: Time-limited temporary storage with automatic cleanup

## Architecture

### API Proxy Pattern

The frontend uses Next.js rewrites to proxy all `/api/*` requests to the backend:
- **Frontend requests**: `/api/har/upload`
- **Proxied to backend**: `${BACKEND_URL}/har/upload`

This eliminates CORS issues and provides a single origin for the application.

### Backend Endpoints (NestJS)

- `POST /har/upload`: Upload and parse HAR file
- `POST /har/analyze`: LLM analysis to match API description
- `POST /curl/execute`: Execute parsed request

## Deployment

### Environment Variables

**Backend (`backend/.env` + `backend/.env.secrets`)**:

Configuration (`.env`):
```bash
PORT=3001
LLM_SINGLE_PASS_THRESHOLD=15
# ... other configuration
```

Secrets (`.env.secrets`):
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

**Frontend (`frontend/.env.local` or deployment platform)**:
```bash
# Point to your deployed backend
BACKEND_URL=https://api.yourdomain.com
```

### Deployment Notes

1. **Backend**: Deploy to any Node.js hosting (Heroku, Railway, AWS, etc.)
2. **Frontend**: Deploy to Vercel, Netlify, or any Next.js-compatible platform
3. **Set `BACKEND_URL`** on your frontend deployment to point to the deployed backend
4. **No CORS configuration needed** - the proxy handles cross-origin requests

## Testing

```bash
# Backend unit tests
cd backend
npm run test

# Backend e2e tests
npm run test:e2e
```

## License

MIT
