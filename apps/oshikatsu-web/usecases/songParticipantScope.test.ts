import { describe, expect, it, vi } from "vitest";
import type { SongRepository } from "@/types/repositories";
import type { CreateSongInput, Song } from "@/types/song";
import { createSong } from "@/usecases/createSong";
import { updateSong } from "@/usecases/updateSong";
import { validateParticipantScope } from "@/usecases/validateParticipantScope";

const GROUP_ID = "11111111-1111-1111-1111-111111111111";
const SINGLE_ID = "22222222-2222-2222-2222-222222222222";
const ALBUM_ID = "33333333-3333-3333-3333-333333333333";
const MEMBER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MEMBER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ALBUM_ONLY_MEMBER = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function makeInput(overrides: Partial<CreateSongInput> = {}): CreateSongInput {
  return {
    title: "テスト楽曲",
    groupId: GROUP_ID,
    label: "",
    generation: "",
    releaseLinks: [{ releaseId: SINGLE_ID, trackNumber: "1" }],
    lyricsPeople: "",
    musicPeople: "",
    arrangementPeople: "",
    choreographyPeople: "",
    participantMemberIds: [],
    formationRows: [],
    centerMemberIds: [],
    mv: { url: "", directorName: "", location: "", publishedOn: "", memo: "" },
    videos: {
      dance_practice: { url: "", publishedOn: "", memo: "" },
      call: { url: "", publishedOn: "", memo: "" },
    },
    costumes: [],
    artistName: "",
    note: "",
    ...overrides,
  };
}

const SAVED_SONG = { id: "song-1" } as Song;

type ScopeResult = Awaited<ReturnType<SongRepository["findFirstReleaseParticipants"]>>;

function makeRepo(options: {
  scope: ScopeResult;
  isCatchall?: boolean;
}): SongRepository {
  return {
    isGroupCatchall: vi.fn(async () => options.isCatchall ?? false),
    findFirstReleaseParticipants: vi.fn(async () => options.scope),
    create: vi.fn(async () => SAVED_SONG),
    update: vi.fn(async () => SAVED_SONG),
  } as unknown as SongRepository;
}

// #427: 許可集合はクライアント由来のリリース情報を信用せず、保存境界でDBから解決する。
// フォームを迂回した入力でも拒否できることをここで固定する。
describe("createSong / updateSong の参加メンバー権威検証", () => {
  it("初出リリースの参加メンバーだけなら保存できる", async () => {
    const repo = makeRepo({
      scope: { firstReleaseId: SINGLE_ID, participantMemberIds: [MEMBER_A, MEMBER_B] },
    });

    const result = await createSong(
      repo,
      makeInput({ participantMemberIds: [MEMBER_A] })
    );

    expect(result.ok).toBe(true);
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  it("初出リリース参加メンバー外を含む入力を拒否する", async () => {
    const repo = makeRepo({
      scope: { firstReleaseId: SINGLE_ID, participantMemberIds: [MEMBER_A, MEMBER_B] },
    });

    const result = await createSong(
      repo,
      makeInput({
        // フォームの候補には出ないアルバム限定メンバーを直接送り込む
        releaseLinks: [
          { releaseId: SINGLE_ID, trackNumber: "1" },
          { releaseId: ALBUM_ID, trackNumber: "5" },
        ],
        participantMemberIds: [MEMBER_A, ALBUM_ONLY_MEMBER],
      })
    );

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.errors).toContainEqual({
      field: "participantMemberIds",
      message: "参加メンバー1人が初出リリースの参加メンバーに含まれていません",
    });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("初出リリース未確定なら参加メンバーの指定を拒否する", async () => {
    const repo = makeRepo({ scope: null });

    const result = await createSong(
      repo,
      makeInput({ participantMemberIds: [MEMBER_A] })
    );

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.errors).toContainEqual({
      field: "participantMemberIds",
      message:
        "参加メンバーはリリース日が設定されたリリースを紐づけてから登録してください",
    });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("初出リリース未確定でも、参加メンバー未指定なら保存できる", async () => {
    const repo = makeRepo({ scope: null });

    const result = await createSong(repo, makeInput({ participantMemberIds: [] }));

    expect(result.ok).toBe(true);
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  it("初出リリースの参加メンバーが未登録（空配列）なら、参加メンバーを指定できない", async () => {
    const repo = makeRepo({
      scope: { firstReleaseId: SINGLE_ID, participantMemberIds: [] },
    });

    const result = await createSong(
      repo,
      makeInput({ participantMemberIds: [MEMBER_A] })
    );

    expect(result.ok).toBe(false);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("その他（catch-all）グループでは許可集合を引かない", async () => {
    const repo = makeRepo({ scope: null, isCatchall: true });

    const result = await createSong(repo, makeInput({ title: "カバー曲" }));

    expect(result.ok).toBe(true);
    expect(repo.findFirstReleaseParticipants).not.toHaveBeenCalled();
  });

  it("updateSong でも同じ検証が働く", async () => {
    const repo = makeRepo({
      scope: { firstReleaseId: SINGLE_ID, participantMemberIds: [MEMBER_A] },
    });

    const result = await updateSong(
      repo,
      "song-1",
      makeInput({ participantMemberIds: [MEMBER_A, ALBUM_ONLY_MEMBER] })
    );

    expect(result.ok).toBe(false);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("updateSong は許可集合内なら保存する", async () => {
    const repo = makeRepo({
      scope: { firstReleaseId: SINGLE_ID, participantMemberIds: [MEMBER_A, MEMBER_B] },
    });

    const result = await updateSong(
      repo,
      "song-1",
      makeInput({ participantMemberIds: [MEMBER_A, MEMBER_B] })
    );

    expect(result.ok).toBe(true);
    expect(repo.update).toHaveBeenCalledTimes(1);
  });

  it("許可集合の解決には紐づくリリースIDをすべて渡す", async () => {
    const repo = makeRepo({
      scope: { firstReleaseId: SINGLE_ID, participantMemberIds: [MEMBER_A] },
    });

    await createSong(
      repo,
      makeInput({
        releaseLinks: [
          { releaseId: ALBUM_ID, trackNumber: "5" },
          { releaseId: SINGLE_ID, trackNumber: "1" },
        ],
        participantMemberIds: [MEMBER_A],
      })
    );

    expect(repo.findFirstReleaseParticipants).toHaveBeenCalledWith([
      ALBUM_ID,
      SINGLE_ID,
    ]);
  });
});

describe("validateParticipantScope", () => {
  it("部分集合を許容し、完全一致は要求しない", () => {
    const errors = validateParticipantScope([MEMBER_A], {
      firstReleaseId: SINGLE_ID,
      participantMemberIds: [MEMBER_A, MEMBER_B],
    });

    expect(errors).toEqual([]);
  });

  it("範囲外の人数をメッセージに含める", () => {
    const errors = validateParticipantScope([MEMBER_A, MEMBER_B], {
      firstReleaseId: SINGLE_ID,
      participantMemberIds: [],
    });

    expect(errors[0].message).toBe(
      "参加メンバー2人が初出リリースの参加メンバーに含まれていません"
    );
  });
});
