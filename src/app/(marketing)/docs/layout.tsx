import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { listPublicDocs } from "@/lib/docs";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const docs = listPublicDocs();

  return (
    <div className="border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12 lg:py-14">
        <DocsSidebar docs={docs} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
