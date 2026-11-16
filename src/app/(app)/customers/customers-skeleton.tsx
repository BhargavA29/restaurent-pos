export function CustomersTableRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <tr key={i}>
          <th scope="row" className="px-4 py-3.5 font-medium">
            <span className="skeleton inline-block h-4 w-32 align-middle" />
          </th>
          <td className="px-4 py-3.5">
            <span className="skeleton inline-block h-3.5 w-28 align-middle" />
          </td>
          <td className="px-4 py-3.5 text-right">
            <span className="skeleton inline-block h-4 w-8 align-middle" />
          </td>
          <td className="px-4 py-3.5 text-right">
            <span className="skeleton inline-block h-4 w-14 align-middle" />
          </td>
          <td className="px-4 py-3.5 text-right">
            <span className="skeleton inline-block h-4 w-16 align-middle" />
          </td>
          <td className="px-4 py-3.5 text-right">
            <span className="skeleton inline-block h-3.5 w-28 align-middle" />
          </td>
        </tr>
      ))}
    </>
  );
}

export function CustomersPageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading customers" className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-normal leading-tight">Customers</h1>
        <p className="text-sm text-ink-2">
          Saved from counter orders and cached locally for instant phone lookup
        </p>
      </header>

      <section
        aria-label="Customer summary"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        {["Total customers", "Repeat customers", "Total customer spend"].map((label) => (
          <div key={label} className="rounded-card border border-hairline bg-card p-5">
            <p className="text-sm text-ink-2">{label}</p>
            <div className="skeleton mt-2 h-8 w-24" />
            <div className="skeleton mt-2.5 h-3 w-40" />
          </div>
        ))}
      </section>

      <section className="rounded-card border border-hairline bg-card p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="skeleton h-11 flex-1 rounded-control sm:max-w-sm" />
            <div className="skeleton h-11 w-24 rounded-control" />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="skeleton h-10 w-24 rounded-control" />
            <div className="skeleton h-10 w-28 rounded-control" />
            <div className="skeleton h-10 w-24 rounded-control" />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-control border border-hairline bg-bg">
          <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-hairline text-xs text-ink-3">
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Customer
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  WhatsApp
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Orders
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Avg order
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Total spent
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Last order
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              <CustomersTableRowsSkeleton />
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-hairline pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="skeleton h-3.5 w-32" />
          <div className="flex items-center gap-1.5">
            <div className="skeleton h-10 w-24 rounded-control" />
            <div className="skeleton h-10 w-10 rounded-control" />
            <div className="skeleton h-10 w-20 rounded-control" />
          </div>
        </div>
      </section>
    </div>
  );
}
