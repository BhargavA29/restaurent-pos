export function LiveOrdersGridSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading live orders" className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
      {["In-Progress", "Ready"].map((title) => (
        <section key={title} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="skeleton h-5 w-28" />
            <div className="skeleton h-5 w-8 rounded-full" />
          </div>

          <div className="flex flex-col gap-4">
            {Array.from({ length: 2 }, (_, i) => (
              <div
                key={i}
                className="flex flex-col gap-4 rounded-card border border-hairline bg-card p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-2">
                    <div className="skeleton h-7 w-16" />
                    <div className="skeleton h-3.5 w-36" />
                  </div>
                  <div className="skeleton h-6 w-20 rounded-full" />
                </div>

                <div className="rounded-control border border-hairline bg-bg p-3.5">
                  <div className="flex flex-col gap-2">
                    <div className="skeleton h-4 w-48" />
                    <div className="skeleton h-4 w-40" />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="skeleton h-4 w-28" />
                  <div className="skeleton h-10 w-28 rounded-control" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function LiveOrdersLoading() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-normal leading-tight">Live orders</h1>
          <p className="mt-1 text-sm text-ink-2">
            Track orders from kitchen preparation through pickup and delivery
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="skeleton h-11 w-56 rounded-control" />
          <div className="skeleton h-11 w-24 rounded-control" />
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {["w-24", "w-28", "w-24", "w-32"].map((width, i) => (
          <div key={i} className={`skeleton h-11 rounded-control ${width}`} />
        ))}
      </div>

      <LiveOrdersGridSkeleton />
    </div>
  );
}
