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
 *   フォーム内に1件でも実行中があるときの 別公演コピー / 保存。
 *   逆向きも同様で、保存中は反映を開始できない（保存は開始時点の入力を
 *   ペイロード化するため、後から反映しても保存されずに失われる）
 * - 許可（進行中の操作をキャンセルする扱い）: 対象項目の楽曲変更と、
 *   披露メンバー・センター・フォーメーションの手動編集。
 *   ユーザーの手動編集を優先し、後から届く応答は requestId 不一致で破棄する。
 *   Server Action は読み取りだけなので、通信が残っても副作用はない
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
  // 披露メンバー・センター・フォーメーションの手動編集。
  // 応答が上書きしうる入力なので、進行中の操作をキャンセルする。
  | { type: "inputChanged"; itemKey: number }
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

    // 楽曲変更・手動編集・項目削除はいずれも、その項目の結果を意味のないものにする。
    // 実行中なら操作ごと破棄し、後から届く応答は requestId 不一致で捨てられる。
    case "trackChanged":
    case "inputChanged":
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
