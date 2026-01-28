# BugBoy Demo

A demonstration Next.js application showcasing **BugStack** - an AI-powered bug-fixing tool that automatically captures errors and creates pull requests with fixes.

## What This App Demonstrates

This app contains **intentional, realistic bugs** that BugStack can detect and fix. When you trigger these bugs:

1. The `error-capture-sdk` captures the error with full context
2. BugStack analyzes the error and generates a fix
3. A pull request is automatically created with the solution

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and add your BugStack credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
ERROR_SERVICE_URL=https://api.bugstack.dev
BUGSTACK_API_KEY=your_api_key_here
GITHUB_REPO=MasonBachmann7/bugboy
```

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

## Intentional Bugs

This app contains three API endpoints with subtle, realistic bugs:

### 1. List Users (`GET /api/users`)

**Bug:** Calls `.map()` on potentially undefined data

```typescript
// The database can return undefined on connection timeout
const users = await db.users.findMany();
// BUG: No null check before mapping
const formattedUsers = users.map(user => ({ ... }));
```

**Expected Error:** `TypeError: Cannot read properties of undefined (reading 'map')`

**How BugStack Fixes It:** Adds proper null checking before array operations.

---

### 2. Get Product (`GET /api/products/[id]`)

**Bug:** `parseInt()` returns NaN for invalid IDs, causing comparison issues

```typescript
const productId = parseInt(params.id);
// BUG: NaN === NaN is always false, so this check doesn't work
const product = await db.products.findUnique({ where: { id: productId } });
```

**Expected Error:** Unexpected 404 responses or silent failures due to NaN comparisons

**How BugStack Fixes It:** Validates the parsed ID with `isNaN()` before proceeding.

---

### 3. Process Checkout (`POST /api/checkout`)

**Bug:** Missing `await` on async payment processing

```typescript
// BUG: Missing await - paymentResult is a Promise, not the actual result
const paymentResult = paymentService.processPayment({ ... });

if (!paymentResult.success) {  // Always undefined!
  // This check never works correctly
}
```

**Expected Error:** Unhandled promise rejection or incorrect payment status handling

**How BugStack Fixes It:** Adds the missing `await` keyword for proper async handling.

## Testing the Bugs

1. Open the dashboard at [http://localhost:3000](http://localhost:3000)
2. Click the **"Test Endpoint"** button for each API
3. Observe the error responses in the UI
4. Check your BugStack dashboard for captured errors
5. Watch as BugStack creates PRs with fixes!

### Triggering Specific Bugs

| Endpoint | Trigger Method | Success Rate |
|----------|---------------|--------------|
| `/api/users` | Click "Test Endpoint" | ~20% chance of error |
| `/api/products/1001` | Click "Test Endpoint" | Intermittent NaN issues |
| `/api/checkout` | Click "Test Endpoint" | Async bug always present |

## Project Structure

```
bugboy/
├── app/
│   ├── api/
│   │   ├── users/
│   │   │   └── route.ts        # Bug: .map() on undefined
│   │   ├── products/
│   │   │   └── [id]/
│   │   │       └── route.ts    # Bug: parseInt NaN issues
│   │   └── checkout/
│   │       └── route.ts        # Bug: missing await
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                # Dashboard UI
├── components/
│   └── ErrorCaptureProvider.tsx
├── lib/
│   ├── db.ts                   # Mock database & services
│   └── error-capture.ts        # SDK initialization
├── .env.example
├── package.json
└── README.md
```

## Technology Stack

- **Next.js 14+** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **error-capture-sdk** - BugStack error capture integration

## Expected Behavior After BugStack Fixes

Once BugStack creates and merges the fix PRs:

1. **Users endpoint** will properly handle undefined responses with fallback to empty array
2. **Products endpoint** will validate IDs and return proper 400 errors for invalid inputs
3. **Checkout endpoint** will correctly await payment processing and handle results

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## License


BugStack SDK — Quick Start
1. Install

npm install @bugstack/error-capture-sdk

2. Add environment variables
Create or update .env.local in your project root:


BUGSTACK_API_KEY=your-api-key-here
BUGSTACK_ENDPOINT=https://bugstack-error-service.onrender.com/api/capture

3. Initialize the client
Create lib/bugstack.ts:


import { ErrorCaptureClient } from "@bugstack/error-capture-sdk";

ErrorCaptureClient.init({
  apiKey: process.env.BUGSTACK_API_KEY!,
  projectId: "bugboy",
  endpoint: process.env.BUGSTACK_ENDPOINT,
});

4. Wrap your API routes
In any Next.js App Router API route (e.g. app/api/example/route.ts):


import { NextResponse } from "next/server";
import { withErrorCapture } from "@bugstack/error-capture-sdk";
import "@/lib/bugstack"; // ensures client is initialized

export const GET = withErrorCapture(async (request) => {
  // Your existing handler code here.
  // Any thrown error will be automatically captured and sent to BugStack.
  const data = await fetchSomething();
  return NextResponse.json({ data });
});

5. Test it
To verify the integration, you can temporarily throw an error in a wrapped route:


export const GET = withErrorCapture(async (request) => {
  throw new Error("Test bug for BugStack!");
});
Then hit that endpoint (e.g. curl http://localhost:3000/api/example). The error should appear in your BugStack dashboard.

MIT - This is a demo application for testing BugStack.
