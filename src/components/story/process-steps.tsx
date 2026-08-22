export type ProcessStep = { step: number; title: string; body: string };

/**
 * Numbered because the order is genuinely load-bearing: grass split before it
 * is dry loosens in the weave a month later. An `<ol>` says that to a screen
 * reader; the mono index says it to everyone else.
 */
export function ProcessSteps({
  steps,
  className = "",
}: {
  steps: ProcessStep[] | null | undefined;
  className?: string;
}) {
  if (!steps?.length) return null;

  return (
    <ol className={`border-t border-rule ${className}`}>
      {steps.map((step, i) => (
        <li
          key={step.step ?? i}
          className="grid grid-cols-1 gap-x-8 gap-y-2 border-b border-rule py-7 sm:grid-cols-12"
        >
          <p className="spec sm:col-span-2 lg:col-span-1">
            {String(step.step ?? i + 1).padStart(2, "0")}
          </p>
          <div className="sm:col-span-10 lg:col-span-7">
            <h3 className="text-xl leading-snug">{step.title}</h3>
            <p className="mt-2 text-ink-2">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
