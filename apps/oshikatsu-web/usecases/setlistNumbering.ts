import type { SetlistItem, SetlistSection } from "@/types/live";

// #261: セクションごとの番号プレフィックス。本編は番号のみ、アンコール以降は
// プレフィックス付き（EN1, WEN1, TEN1, ...）。
const SECTION_NUMBER_PREFIX: Record<SetlistSection, string> = {
  main: "",
  encore: "EN",
  double_encore: "WEN",
  triple_encore: "TEN",
};

export type NumberedSetlistItem = {
  item: SetlistItem;
  // 楽曲（item_type === "song"）のみ番号を持つ。非楽曲は null
  numberLabel: string | null;
};

export type SetlistSectionGroup = {
  section: SetlistSection;
  items: NumberedSetlistItem[];
};

/**
 * セトリ表示用の番号ラベルを算出する純粋関数（#261。#262 の簡素表示でも共用）。
 *
 * - 楽曲（item_type === "song"）のみ番号を持つ。セクション（本編/EN/WEN/TEN）ごとに
 *   1から数え直す。非楽曲（MC等）は番号を持たない（null）
 * - 表示: 本編 = "1","2",… / encore = "EN1",… / double_encore = "WEN1",… /
 *   triple_encore = "TEN1",…
 * - 並び順は入力（position順を想定）をそのまま信頼し、並べ替えは行わない。
 *   番号のカウントだけをセクション単位で行う
 */
export function numberSetlistItems(
  items: readonly SetlistItem[]
): NumberedSetlistItem[] {
  const counters: Record<SetlistSection, number> = {
    main: 0,
    encore: 0,
    double_encore: 0,
    triple_encore: 0,
  };

  return items.map((item) => {
    if (item.itemType !== "song") {
      return { item, numberLabel: null };
    }

    counters[item.section] += 1;
    return {
      item,
      numberLabel: `${SECTION_NUMBER_PREFIX[item.section]}${counters[item.section]}`,
    };
  });
}

/**
 * 番号付きアイテム列を、セクションが切り替わるタイミングで区切ってグルーピングする
 * （見出し表示用）。
 *
 * - 並び順（position順）は変えず、直前と同じセクションが続く間は同じグループに積む
 * - セクション見出しの要否（encore以降が存在する場合のみ見出しを出す等）は呼び出し側の
 *   責務とし、ここでは常にグループ化した結果を返すのみ
 */
export function groupBySection(
  numberedItems: readonly NumberedSetlistItem[]
): SetlistSectionGroup[] {
  const groups: SetlistSectionGroup[] = [];

  for (const numbered of numberedItems) {
    const section = numbered.item.section;
    const currentGroup = groups[groups.length - 1];
    if (currentGroup && currentGroup.section === section) {
      currentGroup.items.push(numbered);
    } else {
      groups.push({ section, items: [numbered] });
    }
  }

  return groups;
}
