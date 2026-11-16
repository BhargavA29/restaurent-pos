export default function PosLoading() {
  return (
    <div aria-busy="true" aria-label="Loading counter POS">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_23rem] lg:items-start xl:grid-cols-[1fr_25rem]">
        <section className="flex min-w-0 flex-col gap-5">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-normal leading-tight">New order</h1>
              <p className="mt-0.5 text-sm text-ink-2">
                Tap items to build the order, then charge at the counter
              </p>
            </div>

            <div className="skeleton h-11 w-full rounded-control sm:w-64" />
          </header>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {["w-16", "w-24", "w-32", "w-28", "w-28"].map((width, i) => (
              <div
                key={i}
                className={`skeleton h-11 shrink-0 rounded-control ${width}`}
              />
            ))}
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="skeleton h-4 w-36" />
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="flex min-h-20 flex-col justify-between rounded-card border border-hairline bg-card p-3.5"
                >
                  <div className="skeleton h-4 w-28" />
                  <div className="flex items-center justify-between gap-2">
                    <div className="skeleton h-3.5 w-12" />
                    <div className="skeleton h-3.5 w-10" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 9 }, (_, i) => (
              <div
                key={i}
                className="flex min-h-28 flex-col justify-between rounded-card border border-hairline bg-card p-3.5"
              >
                <div className="flex flex-col gap-2">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
                <div className="skeleton h-4 w-14" />
              </div>
            ))}
          </div>
        </section>

        <aside className="hidden rounded-card border border-hairline bg-card p-5 lg:block">
          <div className="flex items-center justify-between">
            <div className="skeleton h-5 w-28" />
            <div className="skeleton h-4 w-12" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="skeleton h-11 rounded-control" />
            <div className="skeleton h-11 rounded-control" />
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            <div className="skeleton h-11 rounded-control" />
            <div className="skeleton h-11 rounded-control" />
          </div>

          <div className="my-5 border-t border-hairline" />

          <div className="flex flex-col gap-3">
            <div className="skeleton h-12 rounded-control" />
            <div className="skeleton h-12 rounded-control" />
          </div>

          <div className="mt-6">
            <div className="skeleton h-12 w-full rounded-control" />
          </div>
        </aside>
      </div>
    </div>
  );
}
