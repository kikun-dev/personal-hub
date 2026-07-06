import type { getSpotFormMasterData } from "@/usecases/readOrbitAdminData";
import type { CreateSpotAppearanceInput } from "@/types/spot";

/**
 * SpotForm とそのセクション child（components/admin/spot/*Section.tsx）で
 * 共有する型。SpotForm.tsx から直接 import すると
 * SpotForm -> セクション -> SpotForm の循環 import になるため、
 * ここへ切り出している（songFormShared.ts と同じ役割）。
 */

// readOrbitAdminData（サーバー専用の usecase）から型だけを取り出す。
// `import type` のためコンパイル時に消去され、クライアントバンドルに
// サーバー専用コードが含まれることはない。
export type SpotFormMasterData = Awaited<ReturnType<typeof getSpotFormMasterData>>;

export type AppearanceField = CreateSpotAppearanceInput & { _key: string };
