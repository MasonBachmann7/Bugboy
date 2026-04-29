// Trigger the BugBoy demo errors so bugstack captures them.
//
// Usage:
//   pnpm run demo:errors -- --bug=1
//   pnpm run demo:errors -- --bug=all
//
// Reads DEMO_TARGET_URL (default http://localhost:3000). Each bug logs
// route, status, and whether the expected error fired. Exits non-zero
// if any non-rejection bug returned a 2xx (the rejection-only bug is
// special-cased because the route returns 200 by design).

const TARGET = process.env.DEMO_TARGET_URL ?? 'http://localhost:3000';

type BugId = 1 | 2 | 3 | 4 | 5;

interface BugResult {
  bug: BugId;
  route: string;
  status: number | 'multi';
  fired: boolean;
  detail?: string;
}

async function bug1(): Promise<BugResult> {
  const route = '/api/admin/metrics';
  const res = await fetch(`${TARGET}${route}`);
  const body = await res.text();
  return {
    bug: 1,
    route,
    status: res.status,
    fired: res.status >= 500,
    detail: body.slice(0, 240),
  };
}

async function bug2(): Promise<BugResult> {
  const route = 'POST /api/orders (×10 concurrent)';
  const requests = Array.from({ length: 10 }, () =>
    fetch(`${TARGET}/api/orders`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        productId: 'prod_005',
        quantity: 5,
        userId: 'usr_1a2b3c',
      }),
    })
  );
  const results = await Promise.all(requests);
  const statuses = results.map(r => r.status);
  const violations = statuses.filter(s => s >= 500).length;
  return {
    bug: 2,
    route,
    status: 'multi',
    fired: violations > 0,
    detail: `statuses=[${statuses.join(',')}] violations=${violations}/10`,
  };
}

async function bug3(): Promise<BugResult> {
  const route = '/api/users/usr_7g8h9i';
  const res = await fetch(`${TARGET}${route}`);
  const body = await res.text();
  return {
    bug: 3,
    route,
    status: res.status,
    fired: res.status >= 500,
    detail: body.slice(0, 240),
  };
}

async function bug4(): Promise<BugResult> {
  // Bug #4 returns 200 by design — the failure surfaces as an unhandled
  // promise rejection caught by bugstack at the process level.
  const route = '/api/notifications';
  const res = await fetch(`${TARGET}${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId: 'usr_1a2b3c', message: 'screenshot trigger' }),
  });
  const body = await res.text();
  return {
    bug: 4,
    route,
    status: res.status,
    fired: res.status === 200, // expected — rejection is unhandled, request returns
    detail: `${body.slice(0, 240)} (rejection fires async after response)`,
  };
}

async function bug5(): Promise<BugResult> {
  const route = '/api/products?id=does_not_exist';
  const res = await fetch(`${TARGET}${route}`);
  const body = await res.text();
  return {
    bug: 5,
    route,
    status: res.status,
    fired: res.status >= 500,
    detail: body.slice(0, 240),
  };
}

const bugs: Record<BugId, () => Promise<BugResult>> = {
  1: bug1,
  2: bug2,
  3: bug3,
  4: bug4,
  5: bug5,
};

function parseArgs(): { selected: BugId[] } {
  const arg = process.argv.find(a => a.startsWith('--bug='));
  const value = arg?.split('=')[1] ?? 'all';
  if (value === 'all') return { selected: [5, 4, 3, 2, 1] };
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) {
    throw new Error(`Invalid --bug value "${value}". Use 1-5 or "all".`);
  }
  return { selected: [n as BugId] };
}

async function main() {
  const { selected } = parseArgs();
  console.log(`[trigger] target=${TARGET} bugs=[${selected.join(',')}]`);

  const results: BugResult[] = [];
  for (const id of selected) {
    console.log(`[trigger] bug #${id}...`);
    try {
      const r = await bugs[id]();
      results.push(r);
      console.log(
        `  route=${r.route} status=${r.status} fired=${r.fired}` +
          (r.detail ? `\n  detail: ${r.detail}` : '')
      );
    } catch (err) {
      const r: BugResult = {
        bug: id,
        route: '(network error)',
        status: 0,
        fired: false,
        detail: (err as Error).message,
      };
      results.push(r);
      console.error(`  ${r.detail}`);
    }
  }

  const failed = results.filter(r => !r.fired);
  if (failed.length > 0) {
    console.error(
      `[trigger] ${failed.length} bug(s) did not fire: ${failed
        .map(r => `#${r.bug}`)
        .join(', ')}`
    );
    process.exit(1);
  }
  console.log(`[trigger] all ${results.length} bug(s) fired as expected`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

export {};
