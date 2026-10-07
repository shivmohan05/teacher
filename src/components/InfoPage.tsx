import { ReactNode } from "react";

export default function InfoPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-14 md:px-6">
      <h1 className="font-display text-3xl font-bold text-ink">{title}</h1>
      <div className="prose mt-6 max-w-none text-ink/80 [&>p]:leading-relaxed [&>p]:mb-4 [&>h2]:mt-8 [&>h2]:font-display [&>h2]:text-xl [&>h2]:font-bold [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-1">
        {children}
      </div>
    </section>
  );
}
