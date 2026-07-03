import type { LiveType } from "@/types/live";

export const ATTENDED_TYPE_VALUES = ["onsite", "live_viewing", "streaming"] as const;

export type AttendedType = (typeof ATTENDED_TYPE_VALUES)[number];

export const ATTENDED_TYPE_LABELS: Record<AttendedType, string> = {
  onsite: "現地",
  live_viewing: "ライブビューイング",
  streaming: "配信",
};

export function isAttendedType(value: string): value is AttendedType {
  return (ATTENDED_TYPE_VALUES as readonly string[]).includes(value);
}

// ユーザー別データ（ADR 0009）。user_id は含めない: 常にサーバー側の auth.uid() 由来で
// 扱うため、ドメイン型・入力型のいずれにも持たせない（クライアント入力を信用しない）。
export type LiveAttendance = {
  id: string;
  performanceId: string;
  attendedType: AttendedType;
  seatNote: string | null;
  note: string | null;
};

export type UpsertAttendanceInput = {
  performanceId: string;
  attendedType: AttendedType | "";
  seatNote: string;
  note: string;
};

// セットリストカウント（#249）用read model。参加記録 × 公演 × セトリの登録曲
// （item_type='song' かつ track_id 非null）を1行=1遭遇として展開したもの。
// 未登録曲（テキスト曲）は Non-goals のため対象外（repository 側でフィルタ済み）。
// 1公演で同じ曲を複数回披露していれば、その回数分このリストに複数件並ぶ。
export type SongEncounter = {
  trackId: string;
  attendedType: AttendedType;
  performanceId: string;
  performanceDate: string | null;
  liveId: string;
  liveName: string;
};

// マイページ（#247）の一覧用read model。参加記録 + 公演 + ライブ + 会場を
// 1件のエントリに合成したもの。LiveAttendance 同様 user_id は持たない
// （RLSで本人分のみに絞られる、ADR 0009）。
export type MyAttendanceEntry = {
  id: string;
  attendedType: AttendedType;
  seatNote: string | null;
  note: string | null;
  performanceId: string;
  performanceDate: string | null;
  startsAt: string | null;
  liveId: string;
  liveName: string;
  liveType: LiveType;
  venueName: string | null;
  venuePrefecture: string | null;
  // 出演グループ（#248の集計用）。対バン・フェスは複数件になる。
  // color は orbit_groups.color（生成型上 NOT NULL）をそのまま持つ。
  groups: Array<{ id: string; nameJa: string; color: string }>;
};
