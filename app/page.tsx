'use client';

import { useState } from 'react';

interface ApiResponse {
  success?: boolean;
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
  method: 'GET' | 'POST';
  body?: object;
}

const endpoints: EndpointConfig[] = [
  {
    id: 'users',
    name: 'List Users',
    description: 'Fetches all users with profile data and activity status',
    endpoint: '/api/users',
    method: 'GET',
  },
  {
    id: 'orders',
    name: 'Get Orders',
    description: 'Retrieves orders with revenue summary and top customer',
    endpoint: '/api/orders?status=cancelled',
    method: 'GET',
  },
  {
    id: 'notifications',
    name: 'Send Notification',
    description: 'Sends a notification to a user via email or push',
    endpoint: '/api/notifications',
    method: 'POST',
    body: {
      userId: 'usr_1a2b3c',
      message: 'Your order has shipped!',
      channel: 'email',
    },
  },
  {
    id: 'products',
    name: 'List Products',
    description: 'Paginated product listing with category and stock info',
    endpoint: '/api/products',
    method: 'GET',
  },
  {
    id: 'analytics',
    name: 'Track Page View',
    description: 'Records a page view for analytics tracking',
    endpoint: '/api/analytics/track',
    method: 'POST',
    body: {
      pageId: '/',
    },
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

  const testAll = async () => {
    for (const config of endpoints) {
      await testEndpoint(config);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  };

  const hasError = (result: { data: ApiResponse | null; error: string | null } | undefined) => {
    if (!result) return false;
    return result.error || (result.data && (result.data.error || result.data.message?.includes('Internal')));
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
                <h1 className="text-xl font-semibold">BugBoy</h1>
                <p className="text-sm text-gray-400">Internal Tools Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={testAll}
                className="px-4 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 transition-colors font-medium text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Test All
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Bar */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-800">
            <div className="text-2xl font-bold text-violet-400">{endpoints.length}</div>
            <div className="text-sm text-gray-400">API Endpoints</div>
          </div>
          <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-800">
            <div className="text-2xl font-bold text-emerald-400">
              {Object.values(results).filter(r => r.data && !r.data.error && !r.data.message?.includes('Internal')).length}
            </div>
            <div className="text-sm text-gray-400">Successful</div>
          </div>
          <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-800">
            <div className="text-2xl font-bold text-red-400">
              {Object.values(results).filter(r => hasError(r)).length}
            </div>
            <div className="text-sm text-gray-400">Errors</div>
          </div>
        </div>

        {/* Endpoint Cards */}
        <div className="grid gap-4">
          {endpoints.map(config => {
            const result = results[config.id];

            return (
              <div
                key={config.id}
                className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-4 border-b border-gray-800">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${
                          config.method === 'GET'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          {config.method}
                        </span>
                        <h2 className="text-base font-semibold">{config.name}</h2>
                      </div>
                      <p className="text-gray-400 text-sm mb-2">{config.description}</p>
                      <code className="text-xs text-gray-500 font-mono bg-gray-800/50 px-2 py-1 rounded">
                        {config.endpoint}
                      </code>
                    </div>
                    <button
                      onClick={() => testEndpoint(config)}
                      disabled={result?.loading}
                      className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center gap-2 shrink-0"
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
                          Test
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Response Panel */}
                {(result?.data || result?.error) && (
                  <div className="p-3 bg-gray-950/50">
                    <div className="flex items-center gap-2 mb-2">
                      {!hasError(result) ? (
                        <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Success
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs text-red-400">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Error
                        </span>
                      )}
                    </div>
                    <pre className="text-xs font-mono text-gray-300 bg-gray-900 rounded-lg p-3 overflow-x-auto max-h-48 overflow-y-auto">
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

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>BugBoy Internal Tools v1.0</p>
        </div>
      </main>
    </div>
  );
}
