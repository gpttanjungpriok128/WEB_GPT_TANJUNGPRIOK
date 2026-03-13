import { buildOrderProgress, ORDER_STATUS_LABEL } from "../utils/storeOrderStatus";

function StoreOrderProgress({ status = "new", shippingMethod = "" }) {
  const steps = buildOrderProgress(status, shippingMethod);
  const isCancelled = status === "cancelled";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
          Progres Pesanan
        </p>
        <p className={`text-xs font-semibold ${isCancelled ? "text-rose-500" : "text-brand-600 dark:text-brand-300"}`}>
          {ORDER_STATUS_LABEL[status] || status}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {steps.map((step, index) => {
          const isDone = step.state === "done";
          const isCurrent = step.state === "current";

          return (
            <div
              key={step.key}
              className={`rounded-2xl border p-3 transition ${
                isCurrent
                  ? "border-primary bg-primary/10"
                  : isDone
                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-900/10"
                    : "border-brand-200 bg-white/70 dark:border-brand-700 dark:bg-brand-900/30"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    isCurrent
                      ? "bg-primary text-white"
                      : isDone
                        ? "bg-emerald-500 text-white"
                        : "bg-brand-200 text-brand-700 dark:bg-brand-700 dark:text-brand-200"
                  }`}
                >
                  {isDone ? "✓" : index + 1}
                </div>
                <p className="text-sm font-semibold text-brand-900 dark:text-white">
                  {step.title}
                </p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-brand-600 dark:text-brand-400">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>

      {isCancelled && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900/70 dark:bg-rose-900/20 dark:text-rose-300">
          Pesanan dibatalkan. Jika ini tidak sesuai, hubungi admin GTshirt.
        </p>
      )}
    </div>
  );
}

export default StoreOrderProgress;
