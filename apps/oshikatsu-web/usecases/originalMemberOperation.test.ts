import { describe, expect, it } from "vitest";
import type { ResolveOriginalMembersResult } from "@/usecases/resolveOriginalMembers";
import {
  getOperationOutcome,
  hasPendingOperation,
  initialOriginalMemberOperationState,
  isItemPending,
  originalMemberOperationReducer as reduce,
  type OriginalMemberOperationEvent,
  type OriginalMemberOperationState,
} from "@/usecases/originalMemberOperation";

const TRACK_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TRACK_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ITEM = 1;
const OTHER_ITEM = 2;

const APPLIED: ResolveOriginalMembersResult = {
  status: "applied",
  members: [{ memberId: "m1", isCenter: false }],
  formationRows: [],
  exclusions: [],
  isMembershipCheckSkipped: false,
};

const BLOCKED: ResolveOriginalMembersResult = {
  status: "blocked",
  reason: "no-roster",
};

function run(
  events: OriginalMemberOperationEvent[],
  initial: OriginalMemberOperationState = initialOriginalMemberOperationState
): OriginalMemberOperationState {
  return events.reduce(reduce, initial);
}

describe("originalMemberOperation の基本遷移", () => {
  it("started で pending になる", () => {
    const state = run([
      { type: "started", itemKey: ITEM, trackId: TRACK_A, requestId: 1 },
    ]);

    expect(isItemPending(state, ITEM)).toBe(true);
    expect(getOperationOutcome(state, ITEM)).toBeNull();
  });

  it("resolved で completed になり、結果を取り出せる", () => {
    const state = run([
      { type: "started", itemKey: ITEM, trackId: TRACK_A, requestId: 1 },
      { type: "resolved", itemKey: ITEM, requestId: 1, result: APPLIED },
    ]);

    expect(isItemPending(state, ITEM)).toBe(false);
    expect(getOperationOutcome(state, ITEM)).toEqual({
      kind: "result",
      result: APPLIED,
    });
  });

  it("failed で failed になり、業務上の通知は出さない", () => {
    const state = run([
      { type: "started", itemKey: ITEM, trackId: TRACK_A, requestId: 1 },
      { type: "failed", itemKey: ITEM, requestId: 1 },
    ]);

    expect(isItemPending(state, ITEM)).toBe(false);
    expect(getOperationOutcome(state, ITEM)).toEqual({ kind: "failed" });
  });

  it("blocked 応答も completed として保持する（既存入力は呼び出し側が変更しない）", () => {
    const state = run([
      { type: "started", itemKey: ITEM, trackId: TRACK_A, requestId: 1 },
      { type: "resolved", itemKey: ITEM, requestId: 1, result: BLOCKED },
    ]);

    expect(getOperationOutcome(state, ITEM)).toEqual({
      kind: "result",
      result: BLOCKED,
    });
  });
});

// レビューで実際に見つかった競合。通知だけが残る状態を作らないことを固定する。
describe("originalMemberOperation の競合", () => {
  it("楽曲Aで実行→Bへ変更→Aの応答: 適用も通知もしない", () => {
    const state = run([
      { type: "started", itemKey: ITEM, trackId: TRACK_A, requestId: 1 },
      { type: "trackChanged", itemKey: ITEM },
      { type: "resolved", itemKey: ITEM, requestId: 1, result: APPLIED },
    ]);

    expect(state[ITEM]).toBeUndefined();
    expect(getOperationOutcome(state, ITEM)).toBeNull();
    expect(isItemPending(state, ITEM)).toBe(false);
  });

  it("楽曲を元へ戻しても、古い応答の通知は復活しない", () => {
    const state = run([
      { type: "started", itemKey: ITEM, trackId: TRACK_A, requestId: 1 },
      { type: "trackChanged", itemKey: ITEM },
      { type: "resolved", itemKey: ITEM, requestId: 1, result: APPLIED },
      { type: "trackChanged", itemKey: ITEM },
    ]);

    expect(getOperationOutcome(state, ITEM)).toBeNull();
  });

  it("実行→項目削除→応答: state も通知も残らない", () => {
    const state = run([
      { type: "started", itemKey: ITEM, trackId: TRACK_A, requestId: 1 },
      { type: "itemRemoved", itemKey: ITEM },
      { type: "resolved", itemKey: ITEM, requestId: 1, result: APPLIED },
    ]);

    expect(state[ITEM]).toBeUndefined();
    expect(hasPendingOperation(state)).toBe(false);
  });

  it("別公演コピーで全項目の操作状態を破棄する", () => {
    const state = run([
      { type: "started", itemKey: ITEM, trackId: TRACK_A, requestId: 1 },
      { type: "started", itemKey: OTHER_ITEM, trackId: TRACK_B, requestId: 2 },
      { type: "itemsReplaced" },
    ]);

    expect(state).toEqual({});
    expect(hasPendingOperation(state)).toBe(false);
  });

  it("コピー後に届いた古い応答を受け付けない", () => {
    const state = run([
      { type: "started", itemKey: ITEM, trackId: TRACK_A, requestId: 1 },
      { type: "itemsReplaced" },
      { type: "resolved", itemKey: ITEM, requestId: 1, result: APPLIED },
    ]);

    expect(state[ITEM]).toBeUndefined();
  });

  it("2回実行して応答順が逆になっても、最新リクエストだけを採用する", () => {
    const state = run([
      { type: "started", itemKey: ITEM, trackId: TRACK_A, requestId: 1 },
      { type: "started", itemKey: ITEM, trackId: TRACK_A, requestId: 2 },
      { type: "resolved", itemKey: ITEM, requestId: 2, result: APPLIED },
      { type: "resolved", itemKey: ITEM, requestId: 1, result: BLOCKED },
    ]);

    expect(getOperationOutcome(state, ITEM)).toEqual({
      kind: "result",
      result: APPLIED,
    });
  });

  it("古い応答で loading が解除されない", () => {
    const state = run([
      { type: "started", itemKey: ITEM, trackId: TRACK_A, requestId: 1 },
      { type: "started", itemKey: ITEM, trackId: TRACK_A, requestId: 2 },
      { type: "resolved", itemKey: ITEM, requestId: 1, result: APPLIED },
    ]);

    expect(isItemPending(state, ITEM)).toBe(true);
    expect(getOperationOutcome(state, ITEM)).toBeNull();
  });

  it("古い失敗応答も受け付けない", () => {
    const state = run([
      { type: "started", itemKey: ITEM, trackId: TRACK_A, requestId: 1 },
      { type: "started", itemKey: ITEM, trackId: TRACK_A, requestId: 2 },
      { type: "failed", itemKey: ITEM, requestId: 1 },
    ]);

    expect(isItemPending(state, ITEM)).toBe(true);
  });

  it("他項目の操作へ影響しない", () => {
    const state = run([
      { type: "started", itemKey: ITEM, trackId: TRACK_A, requestId: 1 },
      { type: "started", itemKey: OTHER_ITEM, trackId: TRACK_B, requestId: 2 },
      { type: "trackChanged", itemKey: ITEM },
    ]);

    expect(state[ITEM]).toBeUndefined();
    expect(isItemPending(state, OTHER_ITEM)).toBe(true);
  });
});

describe("hasPendingOperation", () => {
  it("実行中が1件でもあれば true", () => {
    const state = run([
      { type: "started", itemKey: ITEM, trackId: TRACK_A, requestId: 1 },
    ]);

    expect(hasPendingOperation(state)).toBe(true);
  });

  it("完了済みだけなら false（保存・コピーを抑止しない）", () => {
    const state = run([
      { type: "started", itemKey: ITEM, trackId: TRACK_A, requestId: 1 },
      { type: "resolved", itemKey: ITEM, requestId: 1, result: APPLIED },
    ]);

    expect(hasPendingOperation(state)).toBe(false);
  });

  it("初期状態は false", () => {
    expect(hasPendingOperation(initialOriginalMemberOperationState)).toBe(false);
  });
});

// 反映中に披露メンバーやフォーメーションを手動編集した場合、
// 後着の応答が手動編集を上書きしないことを固定する。
describe("originalMemberOperation の手動編集によるキャンセル", () => {
  it("実行 → 手動編集 → applied応答: 適用も通知もしない", () => {
    const state = run([
      { type: "started", itemKey: ITEM, trackId: TRACK_A, requestId: 1 },
      { type: "inputChanged", itemKey: ITEM },
      { type: "resolved", itemKey: ITEM, requestId: 1, result: APPLIED },
    ]);

    expect(state[ITEM]).toBeUndefined();
    expect(getOperationOutcome(state, ITEM)).toBeNull();
    expect(isItemPending(state, ITEM)).toBe(false);
  });

  it("実行 → 手動編集 → failed応答: failed通知も残さない", () => {
    const state = run([
      { type: "started", itemKey: ITEM, trackId: TRACK_A, requestId: 1 },
      { type: "inputChanged", itemKey: ITEM },
      { type: "failed", itemKey: ITEM, requestId: 1 },
    ]);

    expect(state[ITEM]).toBeUndefined();
    expect(getOperationOutcome(state, ITEM)).toBeNull();
  });

  it("手動編集は他項目の操作へ影響しない", () => {
    const state = run([
      { type: "started", itemKey: ITEM, trackId: TRACK_A, requestId: 1 },
      { type: "started", itemKey: OTHER_ITEM, trackId: TRACK_B, requestId: 2 },
      { type: "inputChanged", itemKey: ITEM },
    ]);

    expect(state[ITEM]).toBeUndefined();
    expect(isItemPending(state, OTHER_ITEM)).toBe(true);
  });
});
