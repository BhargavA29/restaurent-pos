export default function MenuLoading() {
  return (
    <div aria-busy="true" aria-label="Loading menu" className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-normal leading-tight">Menu</h1>
          <div className="skeleton mt-2 h-4 w-36" />
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="skeleton h-11 w-28 rounded-control" />
          <div className="skeleton h-11 w-32 rounded-control" />
          <div className="skeleton h-11 w-32 rounded-control" />
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="skeleton h-5 w-24" />
          <div className="flex items-center gap-2">
            <div className="skeleton h-9 w-16 rounded-control" />
            <div className="skeleton h-9 w-24 rounded-control" />
          </div>
        </div>

        <ul className="divide-y divide-hairline rounded-card border border-hairline bg-card">
          {Array.from({ length: 6 }, (_, itemIdx) => (
            <li
              key={itemIdx}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-1.5">
                <div className="skeleton h-4 w-44" />
                <div className="skeleton h-3 w-48" />
              </div>
              <div className="flex items-center gap-3">
                <div className="skeleton h-4 w-14" />
                <div className="skeleton h-9 w-20 rounded-control" />
                <div className="skeleton h-9 w-16 rounded-control" />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="skeleton h-5 w-32" />
          <div className="skeleton h-9 w-24 rounded-control" />
        </div>

        <ul className="divide-y divide-hairline rounded-card border border-hairline bg-card">
          {Array.from({ length: 4 }, (_, idx) => (
            <li
              key={idx}
              className="flex items-center justify-between gap-3 px-4 py-4"
            >
              <div className="skeleton h-4 w-36" />
              <div className="flex items-center gap-3">
                <div className="skeleton h-4 w-12" />
                <div className="skeleton h-9 w-20 rounded-control" />
                <div className="skeleton h-9 w-16 rounded-control" />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
