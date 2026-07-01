import type { SupabaseClient } from "@personal-hub/supabase";
import type {
  Release,
  CreateReleaseInput,
  ReleaseTrack,
  ReleaseType,
  ReleaseListItem,
  ReleaseOption,
  SelectionTier,
  MemberSelectionPosition,
} from "@/types/release";
import type { ReleaseRepository } from "@/types/repositories";
import { RepositoryError } from "@/types/errors";
import { compareByGenerationThenName } from "@/lib/memberOrder";
import {
  SAKURAZAKA_EIGHT_FRONT_ROW_COUNT,
  getManualFrontSpecialSelectionLabel,
  isSakurazakaEightEra,
} from "@/lib/selectionPositionRules";
import { isSongLabel, isSongVideoType, type SongLabel } from "@/types/song";

type ReleaseGroupRow =
  | {
      name_ja: string;
      color: string;
    }
  | Array<{
      name_ja: string;
      color: string;
    }>;

type ReleasePersonRow =
  | {
      display_name: string;
    }
  | Array<{
      display_name: string;
    }>;

type ReleaseBonusVideoRow = {
  id: string;
  edition: string;
  title: string;
  description: string | null;
  sort_order: number;
};

type ReleaseMemberGroupRow = {
  group_id: string;
  generation: string | null;
};

type ReleaseMemberNameRow =
  | {
      name_ja: string;
      name_kana: string;
      orbit_member_groups: ReleaseMemberGroupRow[] | null;
    }
  | Array<{
      name_ja: string;
      name_kana: string;
      orbit_member_groups: ReleaseMemberGroupRow[] | null;
    }>;

type ReleaseMemberRow = {
  member_id: string;
  orbit_members: ReleaseMemberNameRow;
};

type ReleaseMemberPositionRow = {
  member_id: string;
  is_front_special: boolean;
  is_hiatus: boolean;
};

type TrackMvRow = {
  id: string;
};

type TrackVideoRow = {
  video_type: string;
};

type ReleaseTrackRel = {
  id: string;
  title: string;
  label: string | null;
  generation: string | null;
  orbit_groups: ReleaseGroupRow;
  orbit_track_mvs?: TrackMvRow | TrackMvRow[] | null;
  orbit_track_videos?: TrackVideoRow[] | null;
};

type ReleaseTrackRow = {
  track_number: number;
  orbit_tracks?: ReleaseTrackRel | ReleaseTrackRel[] | null;
};

type ReleaseRow = {
  id: string;
  title: string;
  group_id: string;
  release_type: ReleaseType;
  numbering: number | null;
  release_date: string | null;
  artwork_path: string | null;
  orbit_people?: ReleasePersonRow | null;
  orbit_groups: ReleaseGroupRow;
  orbit_release_bonus_videos?: ReleaseBonusVideoRow[];
  orbit_release_members?: ReleaseMemberRow[];
  orbit_release_member_positions?: ReleaseMemberPositionRow[];
  orbit_release_tracks?: ReleaseTrackRow[];
};

type ReleaseListRow = {
  id: string;
  title: string;
  group_id: string;
  release_type: ReleaseType;
  numbering: number | null;
  release_date: string | null;
  orbit_groups: ReleaseGroupRow;
  orbit_release_tracks?: Array<{ track_number: number }>;
};

type ReleaseOptionMemberRow = {
  member_id: string;
  orbit_members:
    | {
        name_ja: string;
        name_kana: string;
        orbit_member_groups: ReleaseMemberGroupRow[] | null;
      }
    | {
        name_ja: string;
        name_kana: string;
        orbit_member_groups: ReleaseMemberGroupRow[] | null;
      }[]
    | null;
};

type ReleaseOptionRow = {
  id: string;
  title: string;
  release_type: ReleaseType;
  group_id: string;
  orbit_release_members?: ReleaseOptionMemberRow[];
};

const RELEASE_LIST_SELECT = `
  id,
  title,
  group_id,
  release_type,
  numbering,
  release_date,
  artwork_path,
  orbit_people(display_name),
  orbit_groups(name_ja, color),
  orbit_release_members(member_id, orbit_members(name_ja, name_kana, orbit_member_groups(group_id, generation))),
  orbit_release_tracks(track_number)
`;

const RELEASE_DETAIL_SELECT = `
  id,
  title,
  group_id,
  release_type,
  numbering,
  release_date,
  artwork_path,
  orbit_people(display_name),
  orbit_groups(name_ja, color),
  orbit_release_bonus_videos(id, edition, title, description, sort_order),
  orbit_release_members(member_id, orbit_members(name_ja, name_kana, orbit_member_groups(group_id, generation))),
  orbit_release_member_positions(member_id, is_front_special, is_hiatus),
  orbit_release_tracks(
    track_number,
    orbit_tracks(
      id,
      title,
      label,
      generation,
      orbit_groups(name_ja, color),
      orbit_track_mvs(id),
      orbit_track_videos(video_type)
    )
  )
`;

const RELEASE_PUBLIC_LIST_SELECT = `
  id,
  title,
  group_id,
  release_type,
  numbering,
  release_date,
  orbit_groups(name_ja, color),
  orbit_release_tracks(track_number)
`;

const RELEASE_OPTION_SELECT = `
  id,
  title,
  release_type,
  group_id,
  orbit_release_members(member_id, orbit_members(name_ja, name_kana, orbit_member_groups(group_id, generation)))
`;

function hasMv(mvRel: TrackMvRow | TrackMvRow[] | null | undefined): boolean {
  if (!mvRel) return false;
  return Array.isArray(mvRel) ? mvRel.length > 0 : true;
}

function hasTrackVideoType(
  videos: TrackVideoRow[] | null | undefined,
  type: "dance_practice" | "call"
): boolean {
  return (videos ?? []).some(
    (video) => isSongVideoType(video.video_type) && video.video_type === type
  );
}

function mapToRelease(row: ReleaseRow): Release {
  const artworkPerson = row.orbit_people
    ? Array.isArray(row.orbit_people)
      ? row.orbit_people[0]
      : row.orbit_people
    : null;
  const group = Array.isArray(row.orbit_groups)
    ? row.orbit_groups[0]
    : row.orbit_groups;

  const participants = (row.orbit_release_members ?? [])
    .map((member) => {
      const orbitMember = Array.isArray(member.orbit_members)
        ? member.orbit_members[0]
        : member.orbit_members;
      // リリースのグループでの期を採用（無ければ null）
      const membership = (orbitMember?.orbit_member_groups ?? []).find(
        (mg) => mg.group_id === row.group_id
      );
      return {
        memberId: member.member_id,
        memberNameJa: orbitMember?.name_ja ?? "",
        memberNameKana: orbitMember?.name_kana ?? "",
        generation: membership?.generation ?? null,
      };
    })
    .sort((a, b) =>
      compareByGenerationThenName(
        { generation: a.generation, nameKana: a.memberNameKana },
        { generation: b.generation, nameKana: b.memberNameKana }
      )
    );

  return {
    id: row.id,
    title: row.title,
    groupId: row.group_id,
    groupNameJa: group?.name_ja ?? "",
    groupColor: group?.color ?? "#6B7280",
    releaseType: row.release_type,
    numbering: row.numbering,
    releaseDate: row.release_date,
    artworkPath: row.artwork_path,
    artworkPersonName: artworkPerson?.display_name ?? null,
    trackCount: row.orbit_release_tracks?.length ?? 0,
    participantMemberIds: participants.map((member) => member.memberId),
    participantMemberNames: participants.map((member) => member.memberNameJa),
    participantMemberGenerations: participants.map((member) => member.generation),
    memberPositions: (row.orbit_release_member_positions ?? []).map((position) => ({
      memberId: position.member_id,
      isFrontSpecial: position.is_front_special,
      isHiatus: position.is_hiatus,
    })),
    bonusVideos: (row.orbit_release_bonus_videos ?? [])
      .map((bonus) => ({
        id: bonus.id,
        edition: bonus.edition,
        title: bonus.title,
        description: bonus.description,
        sortOrder: bonus.sort_order,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
    tracks: (row.orbit_release_tracks ?? [])
      .map((item) => {
        const track = Array.isArray(item.orbit_tracks)
          ? item.orbit_tracks[0]
          : item.orbit_tracks;
        if (!track) return null;
        const trackGroup = Array.isArray(track.orbit_groups)
          ? track.orbit_groups[0]
          : track.orbit_groups;
        return {
          trackId: track.id,
          trackTitle: track.title,
          trackNumber: item.track_number,
          groupNameJa: trackGroup?.name_ja ?? "",
          label: isSongLabel(track.label ?? "") ? (track.label as SongLabel) : null,
          generation: track.generation,
          hasMv: hasMv(track.orbit_track_mvs),
          hasDancePracticeVideo: hasTrackVideoType(
            track.orbit_track_videos,
            "dance_practice"
          ),
          hasCallVideo: hasTrackVideoType(track.orbit_track_videos, "call"),
        };
      })
      .filter((item): item is ReleaseTrack => Boolean(item))
      .sort((a, b) => a.trackNumber - b.trackNumber),
  };
}

function mapToReleaseListItem(row: ReleaseListRow): ReleaseListItem {
  const group = Array.isArray(row.orbit_groups)
    ? row.orbit_groups[0]
    : row.orbit_groups;

  return {
    id: row.id,
    title: row.title,
    groupId: row.group_id,
    groupNameJa: group?.name_ja ?? "",
    groupColor: group?.color ?? "#6B7280",
    releaseType: row.release_type,
    numbering: row.numbering,
    releaseDate: row.release_date,
    trackCount: row.orbit_release_tracks?.length ?? 0,
  };
}

function mapToReleaseOption(row: ReleaseOptionRow): ReleaseOption {
  const participants = (row.orbit_release_members ?? []).map((member) => {
    const orbitMember = Array.isArray(member.orbit_members)
      ? member.orbit_members[0]
      : member.orbit_members;
    // リリースのグループでの期を採用（無ければ null）
    const membership = (orbitMember?.orbit_member_groups ?? []).find(
      (mg) => mg.group_id === row.group_id
    );

    return {
      memberId: member.member_id,
      memberNameJa: orbitMember?.name_ja ?? "",
      memberNameKana: orbitMember?.name_kana ?? "",
      generation: membership?.generation ?? null,
    };
  });

  return {
    id: row.id,
    title: row.title,
    releaseType: row.release_type,
    participantMemberIds: participants.map((member) => member.memberId),
    participantMemberNames: participants.map((member) => member.memberNameJa),
    participantMemberKanas: participants.map((member) => member.memberNameKana),
    participantMemberGenerations: participants.map((member) => member.generation),
  };
}

function toTrackLinkRpcInput(
  trackLinks: CreateReleaseInput["trackLinks"]
): Array<{
  trackId: string;
  trackNumber: number;
}> {
  return trackLinks.map((trackLink) => ({
    trackId: trackLink.trackId,
    trackNumber: Number(trackLink.trackNumber),
  }));
}

// 楽曲ラベル → 導出tier。配列の並び順がそのまま導出の優先順位（上ほど優先）。
// 表題(title)と選抜(senbatsu)はどちらも「選抜」。表題を先に評価する。
const LABEL_DERIVATION: ReadonlyArray<{ label: string; tier: SelectionTier }> = [
  { label: "title", tier: "senbatsu" },
  { label: "senbatsu", tier: "senbatsu" },
  { label: "under", tier: "under" },
  { label: "generation", tier: "generation" },
];

function labelDerivation(label: string | null | undefined) {
  return LABEL_DERIVATION.find((entry) => entry.label === label);
}

type FormationPlacement = { rowNumber: number; isCenter: boolean };

type RepresentativeTrack = {
  trackId: string;
  trackNumber: number;
  label: string;
  tier: SelectionTier;
  priority: number;
};

type DerivedSelection = {
  tier: SelectionTier;
  rowNumber: number | null;
  isCenter: boolean;
  isFrontSpecial: boolean;
};

type RankedDerivedSelection = DerivedSelection & {
  priority: number;
  trackNumber: number;
};

function isBetterDerivedCandidate(
  candidate: RankedDerivedSelection,
  current: RankedDerivedSelection | null
): boolean {
  return (
    !current ||
    candidate.priority < current.priority ||
    (candidate.priority === current.priority &&
      candidate.trackNumber < current.trackNumber)
  );
}

function toSakurazakaEightCandidate(
  rep: RepresentativeTrack,
  placement: FormationPlacement
): RankedDerivedSelection | null {
  if (rep.tier !== "senbatsu") return null;

  // 表題曲の 1・2列目=櫻エイト、3列目以降=接頭辞なしの「◯列目」（どちらも選抜のまま）。
  // 表題曲に居ないメンバーは別途 BACKS として補完する。
  const isFrontSpecial =
    placement.rowNumber <= SAKURAZAKA_EIGHT_FRONT_ROW_COUNT;
  return {
    priority: rep.priority,
    trackNumber: rep.trackNumber,
    tier: "senbatsu",
    rowNumber: placement.rowNumber,
    isCenter: placement.isCenter,
    isFrontSpecial,
  };
}

function toNormalDerivedCandidate(
  rep: RepresentativeTrack,
  placement: FormationPlacement
): RankedDerivedSelection {
  return {
    priority: rep.priority,
    trackNumber: rep.trackNumber,
    tier: rep.tier,
    rowNumber: placement.rowNumber,
    isCenter: placement.isCenter,
    isFrontSpecial: false,
  };
}

function canApplyManualFrontSpecial(groupNameJa: string): boolean {
  return getManualFrontSpecialSelectionLabel(groupNameJa) !== null;
}

// overlay（福神・休業中）の保存入力。いずれかが立つメンバーのみ送る。
function toMemberPositionRpcInput(
  positions: CreateReleaseInput["memberPositions"]
): Array<{
  memberId: string;
  isFrontSpecial: boolean;
  isHiatus: boolean;
}> {
  return positions
    .filter((position) => position.isFrontSpecial || position.isHiatus)
    .map((position) => ({
      memberId: position.memberId,
      isFrontSpecial: position.isFrontSpecial,
      isHiatus: position.isHiatus,
    }));
}

function toNumbering(
  releaseType: CreateReleaseInput["releaseType"],
  numbering: string
): number | null {
  if (releaseType !== "single" && releaseType !== "album") {
    return null;
  }

  return Number(numbering);
}

function toBonusVideoRpcInput(
  bonusVideos: CreateReleaseInput["bonusVideos"]
): Array<{
  edition: string;
  title: string;
  description: string | null;
}> {
  return bonusVideos.map((bonus) => ({
    edition: bonus.edition.trim(),
    title: bonus.title.trim(),
    description: bonus.description.trim() || null,
  }));
}

export function createReleaseRepository(
  supabase: SupabaseClient
): ReleaseRepository {
  return {
    async findAll(filters) {
      let query = supabase
        .from("orbit_releases")
        .select(RELEASE_LIST_SELECT)
        .order("release_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (filters?.groupId) {
        query = query.eq("group_id", filters.groupId);
      }
      if (filters?.releaseType) {
        query = query.eq("release_type", filters.releaseType);
      }

      const { data, error } = await query;
      if (error) {
        throw new RepositoryError("リリース一覧の取得に失敗しました", error);
      }

      return (data as ReleaseRow[]).map(mapToRelease);
    },

    async findPublicList(filters) {
      let query = supabase
        .from("orbit_releases")
        .select(RELEASE_PUBLIC_LIST_SELECT)
        .order("release_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (filters?.groupId) {
        query = query.eq("group_id", filters.groupId);
      }
      if (filters?.releaseType) {
        query = query.eq("release_type", filters.releaseType);
      }

      const { data, error } = await query;
      if (error) {
        throw new RepositoryError("公開向けリリース一覧の取得に失敗しました", error);
      }

      return (data as ReleaseListRow[]).map(mapToReleaseListItem);
    },

    async findOptions() {
      const { data, error } = await supabase
        .from("orbit_releases")
        .select(RELEASE_OPTION_SELECT)
        .order("release_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) {
        throw new RepositoryError("リリース候補の取得に失敗しました", error);
      }

      return ((data as ReleaseOptionRow[] | null) ?? []).map(mapToReleaseOption);
    },

    async findCalendarItems() {
      const { data, error } = await supabase
        .from("orbit_releases")
        .select("id, title, release_date")
        .not("release_date", "is", null);

      if (error) {
        throw new RepositoryError("カレンダー用リリースの取得に失敗しました", error);
      }

      type Row = { id: string; title: string; release_date: string };

      return ((data as Row[] | null) ?? []).map((row) => ({
        releaseId: row.id,
        title: row.title,
        date: row.release_date,
      }));
    },

    async findById(id) {
      const { data, error } = await supabase
        .from("orbit_releases")
        .select(RELEASE_DETAIL_SELECT)
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116" || error.code === "22P02") {
          return null;
        }
        throw new RepositoryError("リリースの取得に失敗しました", error);
      }

      return mapToRelease(data as ReleaseRow);
    },

    async findSelectionPositionsByMemberId(memberId) {
      const fail = (cause: unknown) =>
        new RepositoryError("選抜ポジションの取得に失敗しました", cause);
      const unique = (values: string[]) => Array.from(new Set(values));

      // 1) メンバーのフォーメーション所属（track別の列・センター）を解決
      const { data: fmMembers, error: fmErr } = await supabase
        .from("orbit_track_formation_members")
        .select("formation_row_id, is_center")
        .eq("member_id", memberId);
      if (fmErr) throw fail(fmErr);
      const memberRows =
        (fmMembers as Array<{ formation_row_id: string; is_center: boolean }>) ?? [];

      const rowInfo = new Map<string, { rowNumber: number; formationId: string }>();
      const rowIds = unique(memberRows.map((r) => r.formation_row_id));
      if (rowIds.length > 0) {
        const { data: rows, error: rowsErr } = await supabase
          .from("orbit_track_formation_rows")
          .select("id, row_number, formation_id")
          .in("id", rowIds);
        if (rowsErr) throw fail(rowsErr);
        for (const r of (rows as Array<{
          id: string;
          row_number: number;
          formation_id: string;
        }>) ?? []) {
          rowInfo.set(r.id, { rowNumber: r.row_number, formationId: r.formation_id });
        }
      }

      const trackByFormation = new Map<string, string>();
      const formationIds = unique(
        Array.from(rowInfo.values()).map((v) => v.formationId)
      );
      if (formationIds.length > 0) {
        const { data: formations, error: fErr } = await supabase
          .from("orbit_track_formations")
          .select("id, track_id")
          .in("id", formationIds);
        if (fErr) throw fail(fErr);
        for (const f of (formations as Array<{ id: string; track_id: string }>) ?? []) {
          trackByFormation.set(f.id, f.track_id);
        }
      }

      // track_id -> { 列, センター }（メンバーは1トラックにつき1行）
      const formationByTrack = new Map<string, FormationPlacement>();
      for (const mr of memberRows) {
        const info = rowInfo.get(mr.formation_row_id);
        if (!info) continue;
        const trackId = trackByFormation.get(info.formationId);
        if (!trackId) continue;
        formationByTrack.set(trackId, {
          rowNumber: info.rowNumber,
          isCenter: mr.is_center,
        });
      }

      // 2) 各トラックの label を取り、選抜対象（表題/アンダー/期別）に絞る
      const labelByTrack = new Map<string, string>();
      const trackIds = Array.from(formationByTrack.keys());
      if (trackIds.length > 0) {
        const { data: tracks, error: tErr } = await supabase
          .from("orbit_tracks")
          .select("id, label")
          .in("id", trackIds);
        if (tErr) throw fail(tErr);
        for (const t of (tracks as Array<{ id: string; label: string | null }>) ?? []) {
          if (t.label && labelDerivation(t.label)) {
            labelByTrack.set(t.id, t.label);
          }
        }
      }

      // 3) メンバーが選抜対象トラックで関わる候補リリースを集める
      let candidateReleaseIds: string[] = [];
      const labeledMemberTrackIds = Array.from(labelByTrack.keys());
      if (labeledMemberTrackIds.length > 0) {
        const { data: rt, error: rtErr } = await supabase
          .from("orbit_release_tracks")
          .select("release_id")
          .in("track_id", labeledMemberTrackIds);
        if (rtErr) throw fail(rtErr);
        candidateReleaseIds = ((rt as Array<{ release_id: string }>) ?? []).map(
          (x) => x.release_id
        );
      }

      // 3.5) メンバーが参加（出演）するリリース（櫻エイト期のBACKS判定に使う）
      const { data: pm, error: pmErr } = await supabase
        .from("orbit_release_members")
        .select("release_id")
        .eq("member_id", memberId);
      if (pmErr) throw fail(pmErr);
      const participationReleaseIds = (
        (pm as Array<{ release_id: string }>) ?? []
      ).map((x) => x.release_id);

      // 4) overlay（福神・休業中）
      const { data: overlayData, error: ovErr } = await supabase
        .from("orbit_release_member_positions")
        .select("release_id, is_front_special, is_hiatus")
        .eq("member_id", memberId);
      if (ovErr) throw fail(ovErr);
      const overlayByRelease = new Map<
        string,
        { isFrontSpecial: boolean; isHiatus: boolean }
      >();
      for (const o of (overlayData as Array<{
        release_id: string;
        is_front_special: boolean;
        is_hiatus: boolean;
      }>) ?? []) {
        overlayByRelease.set(o.release_id, {
          isFrontSpecial: o.is_front_special,
          isHiatus: o.is_hiatus,
        });
      }

      // 5) 候補シングルの情報（overlayのみのリリースも補完）
      const releaseIds = unique([
        ...candidateReleaseIds,
        ...overlayByRelease.keys(),
        ...participationReleaseIds,
      ]);
      const releaseInfo = new Map<
        string,
        {
          title: string;
          numbering: number | null;
          groupId: string;
          groupNameJa: string;
        }
      >();
      if (releaseIds.length > 0) {
        const { data: releases, error: relErr } = await supabase
          .from("orbit_releases")
          .select("id, title, numbering, release_type, group_id, orbit_groups(name_ja)")
          .in("id", releaseIds)
          .eq("release_type", "single");
        if (relErr) throw fail(relErr);
        for (const r of (releases as Array<{
          id: string;
          title: string;
          numbering: number | null;
          group_id: string;
          orbit_groups: { name_ja: string } | { name_ja: string }[] | null;
        }>) ?? []) {
          const group = Array.isArray(r.orbit_groups)
            ? r.orbit_groups[0]
            : r.orbit_groups;
          releaseInfo.set(r.id, {
            title: r.title,
            numbering: r.numbering,
            groupId: r.group_id,
            groupNameJa: group?.name_ja ?? "",
          });
        }
      }
      const singleReleaseIds = Array.from(releaseInfo.keys());
      // 代表トラック算出は「メンバーが選抜対象トラックに居るシングル」に限定（重いクエリ抑制）
      const formationCandidateSingleIds = unique(
        candidateReleaseIds.filter((id) => releaseInfo.has(id))
      );

      // 6) 候補シングルの全トラックから、グループごとの代表トラック（最小track_number）を求める。
      // グループキー = ラベル。ただし期別曲は期(generation)ごとに別グループとして潰さない。
      const repByRelease = new Map<string, Map<string, RepresentativeTrack>>();
      if (formationCandidateSingleIds.length > 0) {
        const { data: allRt, error: allRtErr } = await supabase
          .from("orbit_release_tracks")
          .select("track_id, track_number, release_id")
          .in("release_id", formationCandidateSingleIds);
        if (allRtErr) throw fail(allRtErr);
        const allLinks =
          (allRt as Array<{
            track_id: string;
            track_number: number;
            release_id: string;
          }>) ?? [];

        const labelInfoByTrack = new Map<
          string,
          { label: string; generation: string | null }
        >();
        const allTrackIds = unique(allLinks.map((l) => l.track_id));
        if (allTrackIds.length > 0) {
          const { data: tracks2, error: t2Err } = await supabase
            .from("orbit_tracks")
            .select("id, label, generation")
            .in("id", allTrackIds);
          if (t2Err) throw fail(t2Err);
          for (const t of (tracks2 as Array<{
            id: string;
            label: string | null;
            generation: string | null;
          }>) ?? []) {
            if (t.label && labelDerivation(t.label)) {
              labelInfoByTrack.set(t.id, {
                label: t.label,
                generation: t.generation ?? null,
              });
            }
          }
        }

        for (const link of allLinks) {
          const info = labelInfoByTrack.get(link.track_id);
          if (!info) continue;
          const entry = labelDerivation(info.label);
          if (!entry) continue;
          const priority = LABEL_DERIVATION.findIndex(
            (e) => e.label === info.label
          );
          // 期別曲は期ごとに別グループ（別期の曲を潰さない）
          const groupKey =
            info.label === "generation"
              ? `generation:${info.generation ?? ""}`
              : info.label;

          let byGroup = repByRelease.get(link.release_id);
          if (!byGroup) {
            byGroup = new Map();
            repByRelease.set(link.release_id, byGroup);
          }
          const current = byGroup.get(groupKey);
          if (!current || link.track_number < current.trackNumber) {
            byGroup.set(groupKey, {
              trackId: link.track_id,
              trackNumber: link.track_number,
              label: info.label,
              tier: entry.tier,
              priority,
            });
          }
        }
      }

      // 7) リリースごとに、代表トラックにメンバーが居るグループのうち最優先のtierを採用
      const derived = new Map<string, DerivedSelection>();
      for (const releaseId of formationCandidateSingleIds) {
        const byGroup = repByRelease.get(releaseId);
        const release = releaseInfo.get(releaseId);
        if (!byGroup) continue;
        const usesSakurazakaEightRule =
          release != null &&
          isSakurazakaEightEra(release.groupNameJa, release.numbering);
        let best: RankedDerivedSelection | null = null;
        for (const rep of byGroup.values()) {
          const fm = formationByTrack.get(rep.trackId);
          if (!fm) continue; // 代表トラックにメンバーが居ない → 不該当
          // 櫻エイト期は表題曲(label=title)を櫻エイトルールで、期別(label=generation)は
          // 通常どおり「◯期生」で導出する（例: 櫻坂5thの3期生曲は3期生として活動）。
          // 選抜カップリング/BACKS曲等は列を使わず、後段で「BACKS」補完に回す。
          const candidate = usesSakurazakaEightRule
            ? rep.label === "title"
              ? toSakurazakaEightCandidate(rep, fm)
              : rep.label === "generation"
                ? toNormalDerivedCandidate(rep, fm)
                : null
            : toNormalDerivedCandidate(rep, fm);
          if (candidate && isBetterDerivedCandidate(candidate, best)) {
            best = candidate;
          }
        }
        if (best) {
          derived.set(releaseId, {
            tier: best.tier,
            rowNumber: best.rowNumber,
            isCenter: best.isCenter,
            isFrontSpecial: best.isFrontSpecial,
          });
        }
      }

      // 7.5) 櫻エイト期: 表題曲に居ない参加メンバーは BACKS（アンダー・列なし）として補完
      const participationReleaseIdSet = new Set(participationReleaseIds);
      for (const releaseId of singleReleaseIds) {
        if (derived.has(releaseId)) continue;
        if (!participationReleaseIdSet.has(releaseId)) continue;
        const release = releaseInfo.get(releaseId);
        if (!release) continue;
        if (!isSakurazakaEightEra(release.groupNameJa, release.numbering)) {
          continue;
        }
        derived.set(releaseId, {
          tier: "under",
          rowNumber: null,
          isCenter: false,
          isFrontSpecial: false,
        });
      }

      // 8) 組み立て（overlay反映・休業中は上書き／休業中のみのリリースも表示）
      const result: MemberSelectionPosition[] = [];
      for (const releaseId of unique([
        ...derived.keys(),
        ...overlayByRelease.keys(),
      ])) {
        const info = releaseInfo.get(releaseId);
        if (!info) continue;
        const overlay = overlayByRelease.get(releaseId);
        const base = derived.get(releaseId);

        if (overlay?.isHiatus) {
          result.push({
            releaseId,
            releaseTitle: info.title,
            numbering: info.numbering,
            groupId: info.groupId,
            groupNameJa: info.groupNameJa,
            tier: "hiatus",
            rowNumber: null,
            isCenter: false,
            isFrontSpecial: false,
          });
          continue;
        }
        if (!base) continue; // 導出が無く休業中でもない（福神のみ等）はスキップ
        result.push({
          releaseId,
          releaseTitle: info.title,
          numbering: info.numbering,
          groupId: info.groupId,
          groupNameJa: info.groupNameJa,
          tier: base.tier,
          rowNumber: base.rowNumber,
          isCenter: base.isCenter,
          // 福神は overlay、櫻エイトは初期櫻坂ルールの導出結果として反映する。
          isFrontSpecial:
            base.tier === "senbatsu" &&
            (base.isFrontSpecial ||
              (canApplyManualFrontSpecial(info.groupNameJa) &&
                (overlay?.isFrontSpecial ?? false))),
        });
      }

      return result.sort((a, b) => (a.numbering ?? 0) - (b.numbering ?? 0));
    },

    async create(input) {
      const numbering = toNumbering(input.releaseType, input.numbering);

      const { data: releaseId, error: rpcError } = await supabase.rpc("create_release_with_relations", {
        p_title: input.title.trim(),
        p_group_id: input.groupId,
        p_release_type: input.releaseType,
        p_numbering: numbering,
        p_release_date: input.releaseDate || null,
        p_artwork_path: input.artworkPath || null,
        p_artwork_person_name: input.artworkPersonName.trim() || null,
        p_bonus_videos: toBonusVideoRpcInput(input.bonusVideos),
        p_member_ids: input.participantMemberIds,
        p_track_links: toTrackLinkRpcInput(input.trackLinks),
      });

      if (rpcError) {
        throw new RepositoryError("リリースの作成に失敗しました", rpcError);
      }

      if (typeof releaseId !== "string") {
        throw new RepositoryError("作成したリリースIDの取得に失敗しました", null);
      }

      const { error: positionsError } = await supabase.rpc(
        "set_release_member_positions",
        {
          p_release_id: releaseId,
          p_positions: toMemberPositionRpcInput(input.memberPositions),
        }
      );
      if (positionsError) {
        throw new RepositoryError("選抜ポジションの保存に失敗しました", positionsError);
      }

      const created = await this.findById(releaseId);
      if (!created) {
        throw new RepositoryError("作成したリリースの取得に失敗しました", null);
      }
      return created;
    },

    async update(id, input) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new RepositoryError("更新対象のリリースが見つかりません", null);
      }

      const numbering = toNumbering(input.releaseType, input.numbering);

      const { error: rpcError } = await supabase.rpc("update_release_with_relations", {
        p_release_id: id,
        p_title: input.title.trim(),
        p_group_id: input.groupId,
        p_release_type: input.releaseType,
        p_numbering: numbering,
        p_release_date: input.releaseDate || null,
        p_artwork_path: input.artworkPath || null,
        p_artwork_person_name: input.artworkPersonName.trim() || null,
        p_bonus_videos: toBonusVideoRpcInput(input.bonusVideos),
        p_member_ids: input.participantMemberIds,
        p_track_links: toTrackLinkRpcInput(input.trackLinks),
      });

      if (rpcError) {
        throw new RepositoryError("リリースの更新に失敗しました", rpcError);
      }

      const { error: positionsError } = await supabase.rpc(
        "set_release_member_positions",
        {
          p_release_id: id,
          p_positions: toMemberPositionRpcInput(input.memberPositions),
        }
      );
      if (positionsError) {
        throw new RepositoryError("選抜ポジションの保存に失敗しました", positionsError);
      }

      const updated = await this.findById(id);
      if (!updated) {
        throw new RepositoryError("更新後のリリース取得に失敗しました", null);
      }
      return updated;
    },

    async delete(id) {
      const { error } = await supabase
        .from("orbit_releases")
        .delete()
        .eq("id", id);

      if (error) {
        throw new RepositoryError("リリースの削除に失敗しました", error);
      }
    },
  };
}
