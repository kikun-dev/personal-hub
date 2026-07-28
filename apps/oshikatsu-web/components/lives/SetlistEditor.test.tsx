import type { ComponentProps, ReactNode } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SetlistEditor } from "@/components/lives/SetlistEditor";
import type { OriginalMembersActionResult } from "@/app/(authenticated)/lives/[id]/performances/[performanceId]/setlist/edit/actions";
import type { SetlistEditorItemInput } from "@/types/live";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string | { pathname?: string };
  } & Omit<ComponentProps<"a">, "href">) => (
    <a href={typeof href === "string" ? href : (href.pathname ?? "#")} {...props}>
      {children}
    </a>
  ),
  useLinkStatus: () => ({ pending: false }),
}));

const LIVE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PERFORMANCE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const TRACK_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const MEMBER_A_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const MEMBER_B_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const INITIAL_ITEM: SetlistEditorItemInput = {
  itemType: "song",
  trackId: TRACK_ID,
  note: "",
  section: "main",
  performanceStyles: [],
  costumeNote: "",
  members: [],
  formationRows: [],
};

const APPLIED_RESULT: OriginalMembersActionResult = {
  status: "applied",
  members: [{ memberId: MEMBER_B_ID, isCenter: false }],
  formationRows: [],
  exclusions: [],
  isMembershipCheckSkipped: false,
};

type SetlistEditorProps = ComponentProps<typeof SetlistEditor>;

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolvePromise: (value: T) => void = () => undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

function renderEditor({
  onSubmit = async () => ({}),
  resolveOriginalMembers = async () => APPLIED_RESULT,
}: Partial<Pick<SetlistEditorProps, "onSubmit" | "resolveOriginalMembers">> = {}) {
  return render(
    <SetlistEditor
      live={{ id: LIVE_ID, name: "テストライブ" }}
      performanceId={PERFORMANCE_ID}
      performanceLabel="2026-07-29 公演"
      initialItems={[INITIAL_ITEM]}
      roster={[
        { memberId: MEMBER_A_ID, memberNameJa: "メンバーA" },
        { memberId: MEMBER_B_ID, memberNameJa: "メンバーB" },
      ]}
      trackOptions={[{ id: TRACK_ID, title: "テスト楽曲" }]}
      copySources={[]}
      onSubmit={onSubmit}
      resolveOriginalMembers={resolveOriginalMembers}
    />
  );
}

describe("SetlistEditor のオリメン反映", () => {
  it("pending中の操作を抑止し、手動編集後の後着応答を入力にも通知にも反映しない", async () => {
    const user = userEvent.setup();
    const deferred = createDeferred<OriginalMembersActionResult>();
    const resolveOriginalMembers = vi.fn(() => deferred.promise);

    renderEditor({ resolveOriginalMembers });

    await user.click(screen.getByRole("button", { name: "オリメン" }));

    expect(resolveOriginalMembers).toHaveBeenCalledOnce();
    expect(resolveOriginalMembers).toHaveBeenCalledWith(
      TRACK_ID,
      LIVE_ID,
      PERFORMANCE_ID
    );
    expect(screen.getByRole("button", { name: "反映中…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "保存する" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "削除" })).toBeDisabled();

    const memberA = screen.getByRole("checkbox", { name: "メンバーA" });
    await user.click(memberA);

    expect(memberA).toBeChecked();
    expect(screen.getByRole("button", { name: "オリメン" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "保存する" })).toBeEnabled();

    await act(async () => {
      deferred.resolve(APPLIED_RESULT);
      await deferred.promise;
    });

    expect(memberA).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "メンバーB" })).not.toBeChecked();
    expect(screen.queryByText("1人を反映しました。")).not.toBeInTheDocument();
  });

  it("保存中はオリメン反映を開始できない", async () => {
    const user = userEvent.setup();
    const deferred = createDeferred<{ errors?: never[] }>();
    const onSubmit = vi.fn(() => deferred.promise);
    const resolveOriginalMembers = vi.fn(async () => APPLIED_RESULT);

    renderEditor({ onSubmit, resolveOriginalMembers });

    await user.click(screen.getByRole("button", { name: "保存する" }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "保存中..." })).toBeDisabled();
    const originalMembersButton = screen.getByRole("button", { name: "オリメン" });
    expect(originalMembersButton).toBeDisabled();

    await user.click(originalMembersButton);
    expect(resolveOriginalMembers).not.toHaveBeenCalled();

    await act(async () => {
      deferred.resolve({});
      await deferred.promise;
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "保存する" })).toBeEnabled();
    });
  });
});
