export function OrdersTableRowsSkeleton({
  rows = 6,
  showCustomerColumn = true,
}: {
  rows?: number;
  showCustomerColumn?: boolean;
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <tr key={i}>
          <th scope="row" className="px-4 py-3.5 font-medium">
            <span className="skeleton inline-block h-4 w-10 align-middle" />
          </th>
          <td className="px-4 py-3.5">
            <span className="skeleton inline-block h-3.5 w-28 align-middle" />
          </td>
          {showCustomerColumn ? (
            <td className="px-4 py-3.5">
              <span className="skeleton inline-block h-4 w-28 align-middle" />
            </td>
          ) : null}
          <td className="px-4 py-3.5">
            <span className="skeleton inline-block h-4 w-48 align-middle" />
          </td>
          <td className="px-4 py-3.5">
            <span className="skeleton inline-block h-3.5 w-24 align-middle" />
          </td>
          <td className="px-4 py-3.5 text-right">
            <span className="skeleton inline-block h-4 w-16 align-middle" />
          </td>
          <td className="px-4 py-3.5">
            <span className="skeleton inline-block h-8 w-28 rounded-control align-middle" />
          </td>
          <td className="px-4 py-3.5 text-right">
            <span className="skeleton inline-block h-8 w-14 rounded-control align-middle" />
          </td>
        </tr>
      ))}
    </>
  );
}

export function OrdersPageSkeleton({
  title = "Orders",
  subtitle = "Filter, sort, and update status across all counter bills",
  showCustomerColumn = true,
}: {
  title?: string;
  subtitle?: string;
  showCustomerColumn?: boolean;
}) {
  return (
    <div aria-busy="true" aria-label={`Loading ${title.toLowerCase()}`} className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-normal leading-tight">{title}</h1>
          <p className="mt-1 text-sm text-ink-2">{subtitle}</p>
        </div>
        <div className="skeleton h-11 w-32 rounded-control" />
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {["Orders", "Total value", "In-Progress / Ready", "Delivered"].map((label) => (
          <div key={label} className="rounded-card border border-hairline bg-card p-5">
            <p className="text-sm text-ink-2">{label}</p>
            <div className="skeleton mt-2 h-8 w-24" />
            <div className="skeleton mt-2.5 h-3 w-32" />
          </div>
        ))}
      </section>

      <section className="rounded-card border border-hairline bg-card p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="skeleton h-10 w-20 rounded-control" />
          <div className="skeleton h-10 w-20 rounded-control" />
          <div className="skeleton h-10 w-24 rounded-control" />
          <div className="skeleton h-10 w-28 rounded-control" />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <div className="skeleton h-11 flex-1 rounded-control sm:min-w-56" />
          <div className="skeleton h-11 w-32 rounded-control" />
          <div className="skeleton h-11 w-32 rounded-control" />
          <div className="skeleton h-11 w-32 rounded-control" />
          <div className="skeleton h-11 w-24 rounded-control" />
        </div>

        <div className="mt-4 overflow-x-auto rounded-control border border-hairline bg-bg">
          <table className="w-full min-w-[54rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-hairline text-xs text-ink-3">
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Bill
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Date &amp; time
                </th>
                {showCustomerColumn ? (
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Customer
                  </th>
                ) : null}
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Items
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Type
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Total
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Bill
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              <OrdersTableRowsSkeleton showCustomerColumn={showCustomerColumn} />
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
