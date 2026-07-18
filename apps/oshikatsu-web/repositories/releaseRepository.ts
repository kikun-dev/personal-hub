import type { TypedSupabaseClient } from "@personal-hub/supabase";
import type { SelectionTier, MemberSelectionPosition } from "@/types/release";
import type { ReleaseRepository } from "@/types/repositories";
import type { OrbitReadClient } from "@/types/orbitReadClient";
import { RepositoryError } from "@/types/errors";
import { asWritableClient } from "@/lib/asWritableClient";
import {
  SAKURAZAKA_EIGHT_FRONT_ROW_COUNT,
  getManualFrontSpecialSelectionLabel,
  isSakurazakaEightEra,
} from "@/lib/selectionPositionRules";
import {
  RELEASE_LIST_SELECT,
  RELEASE_DETAIL_SELECT,
  RELEASE_PUBLIC_LIST_SELECT,
  RELEASE_OPTION_SELECT,
  mapToRelease,
  mapToReleaseListItem,
  mapToReleaseOption,
  toTrackLinkRpcInput,
  toMemberPositionRpcInput,
  toNumbering,
  toBonusVideoRpcInput,
} from "./releaseMapper";
import { buildCalendarDateRangeFilter } from "./calendarDateRanges";

const RELEASE_CALENDAR_SELECT = "id, title, release_date" as const;

// findSelectionPositionsByMemberId 内のアドホックなクエリ用 select 定数
const FORMATION_MEMBER_SELECT = "formation_row_id, is_center" as const;
const FORMATION_ROW_SELECT = "id, row_number, formation_id" as const;
const FORMATION_TRACK_SELECT = "id, track_id" as const;
const TRACK_LABEL_SELECT = "id, label" as const;
const RELEASE_ID_SELECT = "release_id" as const;
const RELEASE_MEMBER_POSITION_SELECT = "release_id, is_front_special, is_hiatus" as const;
const SINGLE_RELEASE_INFO_SELECT =
  "id, title, numbering, release_type, group_id, orbit_groups(name_ja)" as const;
const RELEASE_TRACK_LINK_SELECT = "track_id, track_number, release_id" as const;
const TRACK_LABEL_GENERATION_SELECT = "id, label, generation" as const;

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

export function createReleaseRepository(
  supabase: OrbitReadClient
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

      return data.map(mapToRelease);
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

      return data.map(mapToReleaseListItem);
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

      return data.map(mapToReleaseOption);
    },

    async findCalendarItems() {
      const { data, error } = await supabase
        .from("orbit_releases")
        .select(RELEASE_CALENDAR_SELECT)
        .not("release_date", "is", null);

      if (error) {
        throw new RepositoryError("カレンダー用リリースの取得に失敗しました", error);
      }

      return data.map((row) => ({
        releaseId: row.id,
        title: row.title,
        // release_date は .not(..., "is", null) で非null行のみに絞っているが、生成型は
        // 列自体のnull許容（string | null）をそのまま反映するため、クエリによる絞り込みを
        // 反映した cast として残す。
        date: row.release_date as string,
      }));
    },

    async findCalendarItemsInRanges(ranges) {
      if (ranges.length === 0) return [];

      const { data, error } = await supabase
        .from("orbit_releases")
        .select(RELEASE_CALENDAR_SELECT)
        .not("release_date", "is", null)
        .or(buildCalendarDateRangeFilter("release_date", ranges));

      if (error) {
        throw new RepositoryError("カレンダー用リリースの取得に失敗しました", error);
      }

      return data.map((row) => ({
        releaseId: row.id,
        title: row.title,
        date: row.release_date as string,
      }));
    },

    async findCalendarItemsOnThisDay(month, day) {
      const { data, error } = await supabase.rpc(
        "find_orbit_releases_on_this_day",
        { target_month: month, target_day: day }
      );

      if (error) {
        throw new RepositoryError("過去のリリースの取得に失敗しました", error);
      }

      return data.map((row) => ({
        releaseId: row.release_id,
        title: row.title,
        date: row.date,
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

      return mapToRelease(data);
    },

    async findSelectionPositionsByMemberId(memberId) {
      const fail = (cause: unknown) =>
        new RepositoryError("選抜ポジションの取得に失敗しました", cause);
      const unique = (values: string[]) => Array.from(new Set(values));

      // 1) メンバーのフォーメーション所属（track別の列・センター）を解決
      const { data: fmMembers, error: fmErr } = await supabase
        .from("orbit_track_formation_members")
        .select(FORMATION_MEMBER_SELECT)
        .eq("member_id", memberId);
      if (fmErr) throw fail(fmErr);
      const memberRows = fmMembers;

      const rowInfo = new Map<string, { rowNumber: number; formationId: string }>();
      const rowIds = unique(memberRows.map((r) => r.formation_row_id));
      if (rowIds.length > 0) {
        const { data: rows, error: rowsErr } = await supabase
          .from("orbit_track_formation_rows")
          .select(FORMATION_ROW_SELECT)
          .in("id", rowIds);
        if (rowsErr) throw fail(rowsErr);
        for (const r of rows) {
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
          .select(FORMATION_TRACK_SELECT)
          .in("id", formationIds);
        if (fErr) throw fail(fErr);
        for (const f of formations) {
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
          .select(TRACK_LABEL_SELECT)
          .in("id", trackIds);
        if (tErr) throw fail(tErr);
        for (const t of tracks) {
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
          .select(RELEASE_ID_SELECT)
          .in("track_id", labeledMemberTrackIds);
        if (rtErr) throw fail(rtErr);
        candidateReleaseIds = rt.map((x) => x.release_id);
      }

      // 3.5) メンバーが参加（出演）するリリース（櫻エイト期のBACKS判定に使う）
      const { data: pm, error: pmErr } = await supabase
        .from("orbit_release_members")
        .select(RELEASE_ID_SELECT)
        .eq("member_id", memberId);
      if (pmErr) throw fail(pmErr);
      const participationReleaseIds = pm.map((x) => x.release_id);

      // 4) overlay（福神・休業中）
      const { data: overlayData, error: ovErr } = await supabase
        .from("orbit_release_member_positions")
        .select(RELEASE_MEMBER_POSITION_SELECT)
        .eq("member_id", memberId);
      if (ovErr) throw fail(ovErr);
      const overlayByRelease = new Map<
        string,
        { isFrontSpecial: boolean; isHiatus: boolean }
      >();
      for (const o of overlayData) {
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
          .select(SINGLE_RELEASE_INFO_SELECT)
          .in("id", releaseIds)
          .eq("release_type", "single");
        if (relErr) throw fail(relErr);
        for (const r of releases) {
          releaseInfo.set(r.id, {
            title: r.title,
            numbering: r.numbering,
            groupId: r.group_id,
            groupNameJa: r.orbit_groups.name_ja,
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
          .select(RELEASE_TRACK_LINK_SELECT)
          .in("release_id", formationCandidateSingleIds);
        if (allRtErr) throw fail(allRtErr);
        const allLinks = allRt;

        const labelInfoByTrack = new Map<
          string,
          { label: string; generation: string | null }
        >();
        const allTrackIds = unique(allLinks.map((l) => l.track_id));
        if (allTrackIds.length > 0) {
          const { data: tracks2, error: t2Err } = await supabase
            .from("orbit_tracks")
            .select(TRACK_LABEL_GENERATION_SELECT)
            .in("id", allTrackIds);
          if (t2Err) throw fail(t2Err);
          for (const t of tracks2) {
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

      // 生成型上 create_release_with_relations の p_artwork_path / p_release_date /
      // p_numbering は non-null な string/number になっているが、これは PostgREST の RPC
      // スカラー引数の型生成が NULL 許容を反映しない既知の制約であり、関数自体は null を
      // 受け付ける（未入力時は null で送る想定）。ペイロード側の誤りではないため、ここでは
      // TypedSupabaseClient にせず asWritableClient の返り値（未typed）のまま呼び出す。
      const writable = asWritableClient(supabase);
      const { data: releaseId, error: rpcError } = await writable.rpc("create_release_with_relations", {
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

      // set_release_member_positions は p_release_id（非null文字列）/ p_positions（Json）
      // とも実ペイロードと不一致が無いため、typed client で呼び出す。
      const positionsClient: TypedSupabaseClient = asWritableClient(supabase);
      const { error: positionsError } = await positionsClient.rpc(
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

      // update_release_with_relations も create 同様、p_artwork_path / p_release_date /
      // p_numbering の NULL 許容が生成型に反映されない既知の制約があるため未typedのまま
      // 呼び出す。
      const writable = asWritableClient(supabase);
      const { error: rpcError } = await writable.rpc("update_release_with_relations", {
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

      const positionsClient: TypedSupabaseClient = asWritableClient(supabase);
      const { error: positionsError } = await positionsClient.rpc(
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
      const writable = asWritableClient(supabase);
      const { error } = await writable
        .from("orbit_releases")
        .delete()
        .eq("id", id);

      if (error) {
        throw new RepositoryError("リリースの削除に失敗しました", error);
      }
    },
  };
}
