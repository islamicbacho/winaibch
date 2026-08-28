import { notFound } from "next/navigation";
import { loadDocData, DOC_TYPE_LABELS, type DocType } from "@/lib/doc-data";
import PrintControls from "../../print-controls";
import { G1Doc, G11Doc, G2Doc } from "../../docs";

export default async function PrintDocPage({
  params,
  searchParams,
}: PageProps<"/print/[docType]/[id]">) {
  const { docType, id } = await params;
  const sp = await searchParams;
  const auto = sp?.autoprint === "1";

  const incidentId = Number(id);
  if (!(docType in DOC_TYPE_LABELS) || !Number.isInteger(incidentId) || incidentId <= 0) {
    notFound();
  }

  const loaded = await loadDocData(incidentId);
  if (!loaded) notFound();

  if (docType === "g1" && !loaded.summonExists) notFound();
  if (docType === "g11" && !loaded.agreementExists) notFound();
  if (docType === "g2" && !loaded.correctionExists) notFound();

  const data = loaded.data;

  return (
    <div className="min-h-screen bg-neutral-800 py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-[210mm] px-4 print:max-w-none print:px-0">
        <p className="no-print mb-4 text-center text-sm font-semibold text-white/80">
          {DOC_TYPE_LABELS[docType as DocType]} — {data.studentName}
        </p>
        <div className="doc-page mx-auto w-full bg-white p-10 shadow-2xl print:p-0 print:shadow-none">
          {docType === "g1" && <G1Doc data={data} />}
          {docType === "g11" && <G11Doc data={data} />}
          {docType === "g2" && <G2Doc data={data} />}
        </div>
      </div>
      <PrintControls auto={auto} docType={docType as DocType} incidentId={incidentId} />
    </div>
  );
}
