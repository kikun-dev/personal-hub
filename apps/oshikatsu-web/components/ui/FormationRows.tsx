export type FormationRowMemberData = {
  memberId: string;
  memberNameJa: string;
  isCenter: boolean;
};

export type FormationRowData = {
  rowNumber: number;
  members: FormationRowMemberData[];
};

type FormationRowsProps = {
  rows: FormationRowData[];
  // 楽曲詳細(FormationDisplay)は text-sm、セトリ(SetlistFormationDisplay)は
  // text-xs で使われているため、呼び出し側で出し分ける
  size?: "sm" | "xs";
};

const SIZE_CLASSES: Record<
  NonNullable<FormationRowsProps["size"]>,
  { text: string; rowGap: string }
> = {
  sm: { text: "text-sm", rowGap: "space-y-3" },
  xs: { text: "text-xs", rowGap: "space-y-2" },
};

// 楽曲詳細(songs/FormationDisplay)とセトリ(lives/SetlistFormationDisplay)で共通の
// フォーメーション描画（#282）。センター判定・列番号などのドメイン差異は呼び出し側で
// 「1メンバー = { 表示名, isCenter }」に正規化してから渡してもらう。
//
// 狭幅端末での折り返し崩れ対策として、各段は折り返さず中央寄せの横並び（案D）にし、
// あふれる段だけ外側のスクロールコンテナ（overflow-x-auto）で横スクロールさせる。
// 各段は min-w-max で自身の内容幅を最低幅として持つため、狭い段はコンテナ幅いっぱいに
// 広がって中央寄せのまま収まり、広い段だけがその幅分だけコンテナからはみ出して
// 横スクロール可能になる。
export function FormationRows({ rows, size = "sm" }: FormationRowsProps) {
  if (rows.length === 0) {
    return null;
  }

  // 1列目(最前列)を最下段、最終列を最上段に積むため、列番号の降順で描画する
  const orderedRows = [...rows].sort((a, b) => b.rowNumber - a.rowNumber);
  const { text: textClass, rowGap } = SIZE_CLASSES[size];

  return (
    <div className="relative">
      <div className={`overflow-x-auto ${rowGap}`}>
        {orderedRows.map((row) => (
          <div
            key={row.rowNumber}
            className={`flex min-w-max justify-center whitespace-nowrap ${textClass} text-foreground`}
          >
            {row.members.map((member, index) => (
              <span key={`${row.rowNumber}-${member.memberId}`} className="shrink-0">
                {index > 0 && " ・ "}
                {member.isCenter ? (
                  <span className="font-bold text-amber-600">
                    ★{member.memberNameJa}
                  </span>
                ) : (
                  member.memberNameJa
                )}
              </span>
            ))}
          </div>
        ))}
      </div>
      {/* 横スクロール可能なことを示す右端フェード。常時表示だが、段が中央寄せで
          収まっている（=スクロール不要な）場合は右端の余白にしか重ならないため
          視覚的な邪魔にはならない */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}
