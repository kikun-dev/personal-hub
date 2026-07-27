import type { ResolveOriginalMembersResult } from "@/usecases/resolveOriginalMembers";

/**
 * セットリスト編集における「オリメン反映」操作のライフサイクル（#424）。
 *
 * 反映は Server Action を待つ非同期操作で、待っている間もフォームは編集できる。
 * 処理中表示・通知・リクエスト識別子を別々の state で持つと、楽曲変更・項目削除・
 * 別公演コピー・連打のたびに複数stateの整合を手作業で保つ必要があり、
 * 実際にそこから不具合が出た。
 *
 * そこで1操作を1つの状態遷移として表現し、UIはこの状態から導出するだけにする。
 * React に依存しない純粋な reducer なので、競合シナリオを単体テストで固定できる。
 *
 * 非同期中に許可する操作の契約:
 * - 禁止（UIで無効化する）: 対象項目の 項目削除 / 再実行、
 *   フォーム内に1件でも実行中があるときの 別公演コピー / 保存
 * - 許可: 対象項目の楽曲変更。trackChanged が pending を破棄し、
 *   後から届く応答は requestId 不一致として適用も記録もされない
 *   （Combobox は disabled を持たず、共有部品の変更を避けたため無効化しない）
 * - 上記の禁止操作を迂回する経路（プログラム的な state 変更）に備え、
 *   requestId が一致しない応答は常に捨てる
 */

export type OriginalMemberOperation =
  | { status: "idle" }
  | { status: "pending"; trackId: string; requestId: number }
  | { status: "completed"; trackId: string; result: ResolveOriginalMembersResult }
  | { status: "failed"; trackId: string };

export type OriginalMemberOperationState = Record<number, OriginalMemberOperation>;

export type OriginalMemberOperationEvent =
  | { type: "started"; itemKey: number; trackId: string; requestId: number }
  | {
      type: "resolved";
      itemKey: number;
      requestId: number;
      result: ResolveOriginalMembersResult;
    }
  | { type: "failed"; itemKey: number; requestId: number }
  | { type: "trackChanged"; itemKey: number }
  | { type: "itemRemoved"; itemKey: number }
  // 別公演からのコピーなど、項目そのものを総入れ替えする操作
  | { type: "itemsReplaced" };

export const initialOriginalMemberOperationState: OriginalMemberOperationState = {};

function withoutItem(
  state: OriginalMemberOperationState,
  itemKey: number
): OriginalMemberOperationState {
  if (!(itemKey in state)) return state;
  const next = { ...state };
  delete next[itemKey];
  return next;
}

/**
 * 応答（resolved / failed）は、対象項目が同じ requestId で pending のときだけ受け付ける。
 * 楽曲変更・項目削除・再実行で pending が消えた後の古い応答は、
 * 適用も記録もしない（通知だけが残る状態を作らない）。
 */
export function isCurrentRequest(
  state: OriginalMemberOperationState,
  itemKey: number,
  requestId: number
): boolean {
  const current = state[itemKey];
  return current?.status === "pending" && current.requestId === requestId;
}

export function originalMemberOperationReducer(
  state: OriginalMemberOperationState,
  event: OriginalMemberOperationEvent
): OriginalMemberOperationState {
  switch (event.type) {
    case "started":
      return {
        ...state,
        [event.itemKey]: {
          status: "pending",
          trackId: event.trackId,
          requestId: event.requestId,
        },
      };

    case "resolved": {
      if (!isCurrentRequest(state, event.itemKey, event.requestId)) return state;
      const pending = state[event.itemKey];
      return {
        ...state,
        [event.itemKey]: {
          status: "completed",
          trackId: pending.status === "pending" ? pending.trackId : "",
          result: event.result,
        },
      };
    }

    case "failed": {
      if (!isCurrentRequest(state, event.itemKey, event.requestId)) return state;
      const pending = state[event.itemKey];
      return {
        ...state,
        [event.itemKey]: {
          status: "failed",
          trackId: pending.status === "pending" ? pending.trackId : "",
        },
      };
    }

    // 楽曲が変わったら、その項目の結果は意味を失う。実行中なら応答も捨てる。
    case "trackChanged":
    case "itemRemoved":
      return withoutItem(state, event.itemKey);

    case "itemsReplaced":
      return initialOriginalMemberOperationState;
  }
}

export function isItemPending(
  state: OriginalMemberOperationState,
  itemKey: number
): boolean {
  return state[itemKey]?.status === "pending";
}

/** フォーム内に1件でも実行中があるか。保存・別公演コピーの抑止に使う。 */
export function hasPendingOperation(state: OriginalMemberOperationState): boolean {
  return Object.values(state).some((operation) => operation.status === "pending");
}

/**
 * 項目に表示する結果。実行中と idle では何も出さない。
 * 楽曲変更で状態ごと消えるため、別楽曲の結果が残ることはない。
 */
export function getOperationOutcome(
  state: OriginalMemberOperationState,
  itemKey: number
):
  | { kind: "result"; result: ResolveOriginalMembersResult }
  | { kind: "failed" }
  | null {
  const operation = state[itemKey];
  if (!operation) return null;
  if (operation.status === "completed") {
    return { kind: "result", result: operation.result };
  }
  if (operation.status === "failed") {
    return { kind: "failed" };
  }
  return null;
}
