/**
 * `_key`（または独自のキーフィールド）で一意識別される配列アイテムに対する
 * 追加・更新・削除の共通ヘルパー。
 *
 * MemberForm / LiveForm / SongForm / ReleaseForm では、フォーム内の繰り返し項目
 * （所属グループ、SNS、公演、休演、セットリスト項目、リリースリンク、フォーメーション列、
 * 衣装、特典映像、収録曲リンクなど）を `_key` 付きの配列として管理しており、
 * 「追加＝末尾に push」「更新＝該当キーの要素だけ差し替え」「削除＝該当キーを filter で除外」
 * という同型の処理が各フォームで繰り返されている。
 *
 * キーの型・フィールド名はフォームごとに異なる
 * （例: MemberForm/SongForm/ReleaseForm は `_key: string`（crypto.randomUUID）、
 * LiveForm は `key: number`（インクリメンタルカウンタ）を使う）ため、
 * ここでは特定のフィールド名を前提にせず `keyOf` セレクタで明示的に指定する形にしている。
 * これによりネストした配列（例: LiveForm の performances[].setlistItems[]）にも
 * 同じヘルパーをそのまま適用できる。
 *
 * React state（setValues 等）は呼び出し側が持ち、ここでは配列の変換のみを担う
 * 純粋関数として提供する。
 */

/** 配列の末尾に要素を追加する（`[...list, item]` の置き換え） */
export function addKeyedItem<T>(list: T[], item: T): T[] {
  return [...list, item];
}

/**
 * `keyOf(item) === targetKey` を満たす要素だけを更新する。
 * `updater` には差分オブジェクト（`Partial<T>` としてマージ）か、
 * 要素全体を受け取って新しい要素を返す関数（ネストした配列の更新など）を渡せる。
 * 該当要素が無い場合は元の配列をそのまま返す。
 */
export function updateKeyedItem<T, K>(
  list: T[],
  keyOf: (item: T) => K,
  targetKey: K,
  updater: Partial<T> | ((item: T) => T)
): T[] {
  return list.map((item) => {
    if (keyOf(item) !== targetKey) return item;
    return typeof updater === "function"
      ? (updater as (item: T) => T)(item)
      : { ...item, ...updater };
  });
}

/** `keyOf(item) === targetKey` を満たす要素を取り除く（`filter` の置き換え） */
export function removeKeyedItem<T, K>(list: T[], keyOf: (item: T) => K, targetKey: K): T[] {
  return list.filter((item) => keyOf(item) !== targetKey);
}

/**
 * `_key: string`（crypto.randomUUID）を付与する。
 * MemberForm/SongForm/ReleaseForm の `withGroupKey` / `withReleaseKey` 等が
 * 個別に実装していたキー生成方法（crypto.randomUUID）を共通化したもの。
 */
export function withGeneratedKey<T extends object>(item: T): T & { _key: string } {
  return { ...item, _key: crypto.randomUUID() };
}
