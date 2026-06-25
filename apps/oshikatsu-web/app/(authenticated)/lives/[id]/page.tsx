import { notFound } from "next/navigation";
import { LiveDetail } from "@/components/lives/LiveDetail";
import { getLiveDetailPageData } from "@/usecases/readOrbitData";

type LiveDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function LiveDetailPage({ params }: LiveDetailPageProps) {
  const { id } = await params;
  const live = await getLiveDetailPageData(id);

  if (!live) {
    notFound();
  }

  return <LiveDetail live={live} />;
}
