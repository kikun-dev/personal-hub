import { describe, expect, it, vi } from "vitest";
import type {
  ReleaseParticipantScopeFacts,
  ReleaseRepository,
  TrackParticipantScopeFact,
} from "@/types/repositories";
import type { CreateReleaseInput, Release } from "@/types/release";
import { createRelease } from "./createRelease";
import { deleteRelease } from "./deleteRelease";
import { updateRelease } from "./updateRelease";
import {
  validateReleaseParticipantImpact,
  type ReleaseChange,
} from "./validateReleaseParticipantImpact";

const RELEASE_A = "11111111-1111-4111-8111-111111111111";
const RELEASE_B = "22222222-2222-4222-8222-222222222222";
const TRACK_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TRACK_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_A = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const MEMBER_B = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const GROUP_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

function makeTrackFact(
  overrides: Partial<TrackParticipantScopeFact> = {}
): TrackParticipantScopeFact {
  return {
    trackId: TRACK_A,
    trackTitle: "テスト楽曲A",
    isCatchallGroup: false,
    participantMemberIds: [MEMBER_A],
    releaseLinks: [
      { releaseId: RELEASE_A, releaseDate: "2024-01-01" },
      { releaseId: RELEASE_B, releaseDate: "2024-02-01" },
    ],
    ...overrides,
  };
}

function makeFacts(
  tracks: TrackParticipantScopeFact[],
  releaseParticipants: Record<string, string[]> = {
    [RELEASE_A]: [MEMBER_A],
    [RELEASE_B]: [MEMBER_B],
  }
): ReleaseParticipantScopeFacts {
  return { tracks, releaseParticipants };
}

function validate(
  factOverrides: Partial<TrackParticipantScopeFact>,
  change: ReleaseChange,
  releaseParticipants?: Record<string, string[]>
) {
  return validateReleaseParticipantImpact(
    makeFacts([makeTrackFact(factOverrides)], releaseParticipants),
    change
  );
}

describe("validateReleaseParticipantImpact", () => {
  it("日付変更で許可集合外のリリースへ初出が移る更新を拒否する", () => {
    const errors = validate(
      {},
      {
        kind: "update",
        releaseId: RELEASE_B,
        releaseDate: "2023-12-01",
        trackIds: [TRACK_A],
        participantMemberIds: [MEMBER_B],
      }
    );

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ field: "_form" });
    expect(errors[0].message).toContain("テスト楽曲A");
  });

  it("初出リリースから楽曲参加メンバーを外す更新を拒否する", () => {
    const errors = validate(
      { participantMemberIds: [MEMBER_A, MEMBER_B] },
      {
        kind: "update",
        releaseId: RELEASE_A,
        releaseDate: "2024-01-01",
        trackIds: [TRACK_A],
        participantMemberIds: [MEMBER_A],
      },
      {
        [RELEASE_A]: [MEMBER_A, MEMBER_B],
        [RELEASE_B]: [MEMBER_B],
      }
    );

    expect(errors[0].message).toContain("参加メンバー範囲外");
  });

  it("収録曲追加でより古いリリースが初出になる更新を拒否する", () => {
    const errors = validate(
      {
        releaseLinks: [{ releaseId: RELEASE_A, releaseDate: "2024-01-01" }],
      },
      {
        kind: "update",
        releaseId: RELEASE_B,
        releaseDate: "2023-01-01",
        trackIds: [TRACK_A],
        participantMemberIds: [MEMBER_B],
      }
    );

    expect(errors).toHaveLength(1);
  });

  it("収録曲削除で次のリリースへ初出が移る更新を拒否する", () => {
    const errors = validate(
      {},
      {
        kind: "update",
        releaseId: RELEASE_A,
        releaseDate: "2024-01-01",
        trackIds: [],
        participantMemberIds: [MEMBER_A],
      }
    );

    expect(errors).toHaveLength(1);
  });

  it("初出リリース削除で許可集合外になる場合を拒否する", () => {
    const errors = validate({}, { kind: "delete", releaseId: RELEASE_A });

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("テスト楽曲A");
  });

  it("変更後にリンクが残るが日付付きリリースが無くなる場合を拒否する", () => {
    const errors = validate(
      {
        releaseLinks: [{ releaseId: RELEASE_A, releaseDate: "2024-01-01" }],
      },
      {
        kind: "update",
        releaseId: RELEASE_A,
        releaseDate: null,
        trackIds: [TRACK_A],
        participantMemberIds: [MEMBER_A],
      },
      { [RELEASE_A]: [MEMBER_A] }
    );

    expect(errors[0].message).toContain("初出リリースが未確定");
  });

  it("参加メンバー未登録なら初出未確定でも通す", () => {
    const errors = validate(
      {
        participantMemberIds: [],
        releaseLinks: [{ releaseId: RELEASE_A, releaseDate: null }],
      },
      {
        kind: "update",
        releaseId: RELEASE_A,
        releaseDate: null,
        trackIds: [TRACK_A],
        participantMemberIds: [],
      }
    );

    expect(errors).toEqual([]);
  });

  it("catch-all楽曲は検証対象外にする", () => {
    const errors = validate(
      {
        isCatchallGroup: true,
        releaseLinks: [{ releaseId: RELEASE_A, releaseDate: "2024-01-01" }],
      },
      { kind: "delete", releaseId: RELEASE_A }
    );

    expect(errors).toEqual([]);
  });

  it("リンク0件は参加メンバー未登録でも孤立楽曲エラーにする", () => {
    const errors = validate(
      {
        participantMemberIds: [],
        releaseLinks: [{ releaseId: RELEASE_A, releaseDate: "2024-01-01" }],
      },
      { kind: "delete", releaseId: RELEASE_A }
    );

    expect(errors[0].message).toContain("どのリリースにも紐づかなくなる");
  });

  it("孤立楽曲エラーを初出未確定エラーより優先する", () => {
    const facts = makeFacts([
      makeTrackFact({
        releaseLinks: [{ releaseId: RELEASE_A, releaseDate: "2024-01-01" }],
      }),
      makeTrackFact({
        trackId: TRACK_B,
        trackTitle: "テスト楽曲B",
        releaseLinks: [{ releaseId: RELEASE_A, releaseDate: "2024-01-01" }],
      }),
    ]);

    const errors = validateReleaseParticipantImpact(facts, {
      kind: "update",
      releaseId: RELEASE_A,
      releaseDate: null,
      trackIds: [TRACK_B],
      participantMemberIds: [MEMBER_A],
    });

    expect(errors[0].message).toContain("どのリリースにも紐づかなくなる");
    expect(errors[0].message).not.toContain("初出リリースが未確定");
  });

  it("updateは同日をrelease ID昇順でタイブレークする", () => {
    const errors = validateReleaseParticipantImpact(
      makeFacts(
        [
          makeTrackFact({
            releaseLinks: [
              { releaseId: "a", releaseDate: "2024-01-01" },
              { releaseId: "b", releaseDate: "2024-01-01" },
            ],
          }),
        ],
        { a: [MEMBER_A], b: [] }
      ),
      {
        kind: "update",
        releaseId: "b",
        releaseDate: "2024-01-01",
        trackIds: [TRACK_A],
        participantMemberIds: [],
      }
    );

    expect(errors).toEqual([]);
  });

  it("create時の同日候補がすべて許可集合を満たせば通す", () => {
    const errors = validateReleaseParticipantImpact(
      makeFacts(
        [
          makeTrackFact({
            releaseLinks: [
              { releaseId: RELEASE_A, releaseDate: "2024-01-01" },
              { releaseId: RELEASE_B, releaseDate: "2024-01-01" },
            ],
          }),
        ],
        {
          [RELEASE_A]: [MEMBER_A],
          [RELEASE_B]: [MEMBER_A],
        }
      ),
      {
        kind: "create",
        releaseDate: "2024-01-01",
        trackIds: [TRACK_A],
        participantMemberIds: [MEMBER_A],
      }
    );

    expect(errors).toEqual([]);
  });

  it("create時の同日候補に1件でも許可集合外があれば拒否する", () => {
    const errors = validateReleaseParticipantImpact(
      makeFacts(
        [
          makeTrackFact({
            releaseLinks: [
              { releaseId: RELEASE_A, releaseDate: "2024-01-01" },
              { releaseId: RELEASE_B, releaseDate: "2024-01-01" },
            ],
          }),
        ],
        {
          [RELEASE_A]: [MEMBER_A],
          [RELEASE_B]: [],
        }
      ),
      {
        kind: "create",
        releaseDate: "2024-01-01",
        trackIds: [TRACK_A],
        participantMemberIds: [MEMBER_A],
      }
    );

    expect(errors).toHaveLength(1);
  });
});

function makeInput(overrides: Partial<CreateReleaseInput> = {}): CreateReleaseInput {
  return {
    title: "テストリリース",
    groupId: GROUP_ID,
    releaseType: "single",
    numbering: "1",
    releaseDate: "2024-01-01",
    artworkPath: "",
    artworkPersonName: "",
    participantMemberIds: [MEMBER_A],
    memberPositions: [],
    bonusVideos: [],
    trackLinks: [{ trackId: TRACK_A, trackNumber: "1" }],
    ...overrides,
  };
}

function makeRelease(
  overrides: Partial<Release> = {}
): Release {
  return {
    id: RELEASE_A,
    title: "テストリリース",
    groupId: GROUP_ID,
    groupNameJa: "テストグループ",
    groupColor: "#000000",
    releaseType: "single",
    numbering: 1,
    releaseDate: "2024-01-01",
    artworkPath: null,
    artworkPersonName: null,
    trackCount: 1,
    participantMemberIds: [MEMBER_A],
    participantMemberNames: ["メンバーA"],
    participantMemberGenerations: [null],
    memberPositions: [],
    bonusVideos: [],
    tracks: [
      {
        trackId: TRACK_A,
        trackTitle: "テスト楽曲A",
        trackNumber: 1,
        groupNameJa: "テストグループ",
        label: null,
        generation: null,
        hasMv: false,
        hasDancePracticeVideo: false,
        hasCallVideo: false,
      },
    ],
    ...overrides,
  };
}

function makeRepo(options: {
  facts: ReleaseParticipantScopeFacts;
  existing?: Release | null;
}): ReleaseRepository {
  const saved = makeRelease();
  return {
    findById: vi.fn(async () =>
      options.existing === undefined ? saved : options.existing
    ),
    findTrackParticipantScopeFacts: vi.fn(async () => options.facts),
    create: vi.fn(async () => saved),
    update: vi.fn(async () => saved),
    delete: vi.fn(async () => undefined),
  } as unknown as ReleaseRepository;
}

describe("release UseCaseの参加メンバー影響検証", () => {
  const validFacts = makeFacts([makeTrackFact()]);
  const invalidFacts = makeFacts(
    [makeTrackFact()],
    { [RELEASE_A]: [], [RELEASE_B]: [MEMBER_B] }
  );

  it("createは違反時にmutationを呼ばない", async () => {
    const repo = makeRepo({ facts: invalidFacts });

    const result = await createRelease(repo, makeInput());

    expect(result.ok).toBe(false);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("createは正常時に影響factを取得してmutationを1回呼ぶ", async () => {
    const repo = makeRepo({ facts: validFacts });

    const result = await createRelease(repo, makeInput());

    expect(result.ok).toBe(true);
    expect(repo.findTrackParticipantScopeFacts).toHaveBeenCalledWith([TRACK_A]);
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  it("updateは変更前後のtrackLinksの和集合を検証し、違反時にmutationを呼ばない", async () => {
    const existing = makeRelease();
    const repo = makeRepo({ facts: invalidFacts, existing });

    const result = await updateRelease(
      repo,
      RELEASE_A,
      makeInput({ trackLinks: [{ trackId: TRACK_B, trackNumber: "1" }] })
    );

    expect(result.ok).toBe(false);
    expect(repo.findTrackParticipantScopeFacts).toHaveBeenCalledWith([
      TRACK_A,
      TRACK_B,
    ]);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("updateは正常時にmutationを1回呼ぶ", async () => {
    const repo = makeRepo({ facts: validFacts, existing: makeRelease() });

    const result = await updateRelease(repo, RELEASE_A, makeInput());

    expect(result.ok).toBe(true);
    expect(repo.update).toHaveBeenCalledTimes(1);
  });

  it("deleteは違反時にmutationを呼ばない", async () => {
    const repo = makeRepo({ facts: validFacts, existing: makeRelease() });

    const result = await deleteRelease(repo, RELEASE_A);

    expect(result.ok).toBe(false);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("deleteは正常時に変更前trackLinksを検証し、削除前Releaseを返す", async () => {
    const existing = makeRelease();
    const facts = makeFacts([
      makeTrackFact({
        releaseLinks: [
          { releaseId: RELEASE_A, releaseDate: "2024-01-01" },
          { releaseId: RELEASE_B, releaseDate: "2024-02-01" },
        ],
        participantMemberIds: [MEMBER_B],
      }),
    ]);
    const repo = makeRepo({ facts, existing });

    const result = await deleteRelease(repo, RELEASE_A);

    expect(result).toEqual({ ok: true, data: existing });
    expect(repo.findTrackParticipantScopeFacts).toHaveBeenCalledWith([TRACK_A]);
    expect(repo.delete).toHaveBeenCalledTimes(1);
  });
});
