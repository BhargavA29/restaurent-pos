export function DashboardBodySkeleton() {
  const chartHeights = ["38%", "64%", "50%", "82%", "44%", "92%", "58%"];

  return (
    <div aria-busy="true" aria-label="Loading dashboard metrics" className="flex flex-col gap-8">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="rounded-card border border-hairline bg-card p-5">
            <div className="skeleton h-3.5 w-24" />
            <div className="skeleton mt-3 h-8 w-32" />
            <div className="skeleton mt-3 h-3 w-44" />
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr] lg:items-start">
        <div className="rounded-card border border-hairline bg-card p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h2 className="text-base font-medium">7-day revenue</h2>
              <p className="mt-0.5 text-xs text-ink-3">
                Tap any day to inspect its sales and expenses
              </p>
            </div>
            <div className="skeleton h-4 w-20" />
          </div>

          <div className="relative mt-6 h-56">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 bottom-10 flex flex-col justify-between"
            >
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="skeleton h-2.5 w-10" />
                  <span className="h-px flex-1 bg-hairline" />
                </div>
              ))}
            </div>

            <div className="relative flex h-full items-end gap-2 ps-14">
              {chartHeights.map((height, i) => (
                <div
                  key={i}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-2 px-1 pb-1"
                >
                  <div className="flex w-full flex-1 items-end justify-center pt-2">
                    <div
                      style={{ height }}
                      className="skeleton w-full max-w-10 rounded-b-none rounded-t-md"
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="skeleton h-2.5 w-6" />
                    <div className="skeleton h-3 w-5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-card border border-hairline bg-card p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-base font-medium">Top-selling items</h2>
            <div className="skeleton h-3.5 w-6" />
          </div>

          <ul className="mt-4 flex flex-col gap-4">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="skeleton h-3.5 w-36" />
                  <div className="skeleton h-3 w-16" />
                </div>
                <div className="skeleton h-1.5 w-full rounded-full" />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <div className="rounded-card border border-hairline bg-card p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h2 className="text-base font-medium">Daily expense log</h2>
              <p className="mt-0.5 text-xs text-ink-3">
                Cash spent for milk, fries, gas or counter supplies
              </p>
            </div>
            <div className="skeleton h-4 w-16" />
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <div className="skeleton h-11 flex-1 rounded-control" />
            <div className="skeleton h-11 w-full rounded-control sm:w-32" />
            <div className="skeleton h-11 w-full rounded-control sm:w-20" />
          </div>

          <ul className="mt-4 divide-y divide-hairline rounded-control border border-hairline bg-bg">
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-3.5 py-3">
                <div className="flex flex-col gap-1.5">
                  <div className="skeleton h-3.5 w-32" />
                  <div className="skeleton h-2.5 w-16" />
                </div>
                <div className="skeleton h-4 w-14" />
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-card border border-hairline bg-card p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-base font-medium">Bills for the day</h2>
            <div className="skeleton h-3.5 w-6" />
          </div>

          <ul className="mt-4 divide-y divide-hairline rounded-control border border-hairline bg-bg">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-3.5 py-3">
                <div className="flex flex-col gap-1.5">
                  <div className="skeleton h-3.5 w-44" />
                  <div className="skeleton h-2.5 w-28" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="skeleton h-4 w-14" />
                  <div className="skeleton h-10 w-16 rounded-control" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <div className="rounded-card border border-hairline bg-card p-5 md:p-6">
          <h2 className="text-base font-medium">Cash drawer &amp; payment tally</h2>
          <p className="mt-0.5 text-xs text-ink-3">
            Verify UPI, card, and physical cash at closing
          </p>

          <div className="mt-4 divide-y divide-hairline rounded-control border border-hairline bg-bg">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3.5">
                <div className="skeleton h-3.5 w-28" />
                <div className="skeleton h-4 w-16" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-card border border-hairline bg-card p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h2 className="text-base font-medium">Peak hours</h2>
              <p className="mt-0.5 text-xs text-ink-3">
                Rush-hour order volume across the day
              </p>
            </div>
            <div className="skeleton h-5 w-24" />
          </div>

          <ul className="mt-4 flex flex-col gap-3.5">
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <div className="skeleton h-3 w-24" />
                  <div className="skeleton h-3 w-24" />
                </div>
                <div className="skeleton h-1.5 w-full rounded-full" />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-normal leading-tight">Dashboard</h1>
          <div className="skeleton mt-2 h-3.5 w-44" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="skeleton h-11 w-11 rounded-control" />
          <div className="skeleton h-11 w-40 rounded-control" />
          <div className="skeleton h-11 w-11 rounded-control" />
          <div className="skeleton h-11 w-28 rounded-control" />
        </div>
      </header>

      <DashboardBodySkeleton />
    </div>
  );
}
