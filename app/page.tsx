'use client';

import { useState } from 'react';

interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
  [key: string]: unknown;
}

interface EndpointConfig {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PATCH';
  body?: object;
  expectedBug: string;
}

const endpoints: EndpointConfig[] = [
  {
    id: 'users',
    name: 'List Users',
    description: 'Fetches all users with role-based filtering and activity status',
    endpoint: '/api/users',
    method: 'GET',
    expectedBug: 'TypeError: Cannot read properties of undefined (reading \'map\')',
  },
  {
    id: 'product',
    name: 'Get Product',
    description: 'Retrieves product details by ID with optional inventory status',
    endpoint: '/api/products/1001?inventory=true',
    method: 'GET',
    expectedBug: 'NaN comparison causing unexpected 404 responses',
  },
  {
    id: 'checkout',
    name: 'Process Checkout',
    description: 'Processes a complete checkout flow with payment and inventory',
    endpoint: '/api/checkout',
    method: 'POST',
    body: {
      customerId: 'usr_1a2b3c',
      items: [
        { productId: 1001, quantity: 2 },
        { productId: 1003, quantity: 1 },
      ],
      paymentMethod: 'card',
      shippingAddress: {
        line1: '123 Main St',
        city: 'San Francisco',
        postalCode: '94102',
        country: 'US',
      },
    },
    expectedBug: 'Unhandled promise rejection - missing await on payment processing',
  },
];

export default function Dashboard() {
  const [results, setResults] = useState<Record<string, { loading: boolean; data: ApiResponse | null; error: string | null }>>({});

  const testEndpoint = async (config: EndpointConfig) => {
    setResults(prev => ({
      ...prev,
      [config.id]: { loading: true, data: null, error: null },
    }));

    try {
      const options: RequestInit = {
        method: config.method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (config.body) {
        options.body = JSON.stringify(config.body);
      }

      const response = await fetch(config.endpoint, options);
      const data: ApiResponse = await response.json();

      setResults(prev => ({
        ...prev,
        [config.id]: { loading: false, data, error: null },
      }));
    } catch (err) {
      setResults(prev => ({
        ...prev,
        [config.id]: {
          loading: false,
          data: null,
          error: err instanceof Error ? err.message : 'Request failed',
        },
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <span className="text-xl font-bold">B</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold">BugBoy Demo</h1>
                <p className="text-sm text-gray-400">BugStack Test Application</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Demo Mode
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Info Banner */}
        <div className="mb-8 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-medium text-blue-300">About This Demo</h3>
              <p className="text-sm text-gray-300 mt-1">
                This application contains intentional bugs to demonstrate BugStack&apos;s automatic error detection and PR creation.
                Click the test buttons below to trigger errors that will be captured by the error-capture-sdk.
              </p>
            </div>
          </div>
        </div>

        {/* Endpoint Cards */}
        <div className="grid gap-6">
          {endpoints.map(config => {
            const result = results[config.id];

            return (
              <div
                key={config.id}
                className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-6 border-b border-gray-800">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${
                          config.method === 'GET'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : config.method === 'POST'
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {config.method}
                        </span>
                        <h2 className="text-lg font-semibold">{config.name}</h2>
                      </div>
                      <p className="text-gray-400 text-sm mb-3">{config.description}</p>
                      <code className="text-sm text-gray-500 font-mono bg-gray-800/50 px-2 py-1 rounded">
                        {config.endpoint}
                      </code>
                    </div>
                    <button
                      onClick={() => testEndpoint(config)}
                      disabled={result?.loading}
                      className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center gap-2"
                    >
                      {result?.loading ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Testing...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Test Endpoint
                        </>
                      )}
                    </button>
                  </div>

                  {/* Expected Bug Info */}
                  <div className="mt-4 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <span className="text-xs text-red-300 font-medium">Expected Bug:</span>
                        <p className="text-sm text-red-200/80 font-mono mt-0.5">{config.expectedBug}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Response Panel */}
                {(result?.data || result?.error) && (
                  <div className="p-4 bg-gray-950/50">
                    <div className="flex items-center gap-2 mb-2">
                      {result.data?.success ? (
                        <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Success
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-sm text-red-400">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          {result.error ? 'Error' : 'Failed'}
                        </span>
                      )}
                    </div>
                    <pre className="text-xs font-mono text-gray-300 bg-gray-900 rounded-lg p-4 overflow-x-auto max-h-64 overflow-y-auto">
                      {result.error
                        ? result.error
                        : JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>
            Powered by{' '}
            <span className="text-violet-400 font-medium">error-capture-sdk</span>
            {' '}• Errors are automatically captured and sent to BugStack
          </p>
        </div>
      </main>
    </div>
  );
}
