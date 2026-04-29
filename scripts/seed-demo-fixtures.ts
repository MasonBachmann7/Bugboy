// Resets BugBoy fixtures to a known state before triggering demo errors.
// Currently this only ensures the limited-edition product (prod_005)
// has stock = 5 so the orders-race trigger can race against it.
//
// The hosted demo doesn't have a writable persistence layer, so this
// script hits a maintenance endpoint when present and otherwise just
// no-ops with a log message — the in-memory mock resets each time the
// process boots.

const TARGET = process.env.DEMO_TARGET_URL ?? 'http://localhost:3000';
const RACE_PRODUCT_ID = 'prod_005';
const RACE_STOCK = 5;

async function main() {
  const url = `${TARGET}/api/admin/fixtures/reset`;
  console.log(`[seed] resetting fixtures via ${url}`);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: RACE_PRODUCT_ID, stock: RACE_STOCK }),
    });
    if (!res.ok) {
      console.warn(
        `[seed] reset endpoint returned ${res.status} — relying on in-memory boot state`
      );
      return;
    }
    console.log(`[seed] reset ok: ${RACE_PRODUCT_ID} stock = ${RACE_STOCK}`);
  } catch (err) {
    console.warn(
      `[seed] reset endpoint unreachable (${(err as Error).message}); ` +
        'relying on in-memory boot state'
    );
  }
}

main();

export {};
