import { withGeneratedKey } from "@/lib/keyedList";
import type {
  CreateSongCostumeInput,
  CreateSongFormationRowInput,
  CreateSongInput,
  CreateSongReleaseLinkInput,
  CreateSongVideoInput,
  SongVideoType,
} from "@/types/song";
import { formatSongVideoTypeLabel } from "@/types/song";
import type {
  FormCostume,
  FormFormationRow,
  FormReleaseLink,
} from "@/components/admin/song/songFormShared";

/**
 * SongForm.tsx から切り出した、FormValues の生成・相互変換を担う純粋関数群。
 * JSX を持たないため SongForm.tsx からのみ import される（セクション child からは使わない）。
 */

export type FormValues = Omit<CreateSongInput, "releaseLinks" | "formationRows" | "costumes"> & {
  releaseLinks: FormReleaseLink[];
  formationRows: FormFormationRow[];
  costumes: FormCostume[];
};

export function withReleaseKey(link: CreateSongReleaseLinkInput): FormReleaseLink {
  return withGeneratedKey(link);
}

export function withFormationRowKey(row: CreateSongFormationRowInput): FormFormationRow {
  return withGeneratedKey(row);
}

export function withCostumeKey(costume: CreateSongCostumeInput): FormCostume {
  return withGeneratedKey(costume);
}

export function createEmptyVideoInput(): CreateSongVideoInput {
  return {
    url: "",
    publishedOn: "",
    memo: "",
  };
}

export function createEmptyVideos(): Record<SongVideoType, CreateSongVideoInput> {
  return {
    dance_practice: createEmptyVideoInput(),
    call: createEmptyVideoInput(),
  };
}

export function getDefaultValues(): FormValues {
  return {
    title: "",
    groupId: "",
    label: "",
    generation: "",
    releaseLinks: [withReleaseKey({ releaseId: "", trackNumber: "" })],
    lyricsPeople: "",
    musicPeople: "",
    arrangementPeople: "",
    choreographyPeople: "",
    formationRows: [],
    centerMemberIds: [],
    mv: {
      url: "",
      directorName: "",
      location: "",
      publishedOn: "",
      memo: "",
    },
    videos: createEmptyVideos(),
    costumes: [],
    artistName: "",
    note: "",
  };
}

export function toFormValues(input: CreateSongInput): FormValues {
  return {
    ...input,
    releaseLinks: input.releaseLinks.map(withReleaseKey),
    formationRows: input.formationRows.map(withFormationRowKey),
    costumes: input.costumes.map(withCostumeKey),
  };
}

export function normalizeVideosForGroup(
  videos: Record<SongVideoType, CreateSongVideoInput>,
  groupNameJa: string
): Record<SongVideoType, CreateSongVideoInput> {
  return {
    dance_practice: formatSongVideoTypeLabel("dance_practice", groupNameJa)
      ? videos.dance_practice
      : createEmptyVideoInput(),
    call: videos.call,
  };
}

// isCatchallGroup: 選択中グループが「その他」受け皿グループのとき、フォーム上非表示の
// 通常楽曲固有項目（ラベル・期・リリース紐づけ・クレジット・フォーメーション・
// センター・MV・関連動画・衣装）は編集不可のため、古い/意図しない値を送らないよう
// 空の状態に正規化して送信する（誰の歌か/メモのみそのまま送る）。
export function toSubmitValues(
  values: FormValues,
  groupNameJa: string,
  isCatchallGroup: boolean
): CreateSongInput {
  if (isCatchallGroup) {
    return {
      title: values.title,
      groupId: values.groupId,
      label: "",
      generation: "",
      releaseLinks: [],
      lyricsPeople: "",
      musicPeople: "",
      arrangementPeople: "",
      choreographyPeople: "",
      formationRows: [],
      centerMemberIds: [],
      mv: {
        url: "",
        directorName: "",
        location: "",
        publishedOn: "",
        memo: "",
      },
      videos: createEmptyVideos(),
      costumes: [],
      artistName: values.artistName,
      note: values.note,
    };
  }

  return {
    title: values.title,
    groupId: values.groupId,
    label: values.label,
    generation: values.label === "generation" ? values.generation : "",
    releaseLinks: values.releaseLinks.map((link) => ({
      releaseId: link.releaseId,
      trackNumber: link.trackNumber,
    })),
    lyricsPeople: values.lyricsPeople,
    musicPeople: values.musicPeople,
    arrangementPeople: values.arrangementPeople,
    choreographyPeople: values.choreographyPeople,
    formationRows: values.formationRows.map((row) => ({
      memberCount: row.memberCount,
      memberIds: row.memberIds,
    })),
    centerMemberIds: values.centerMemberIds,
    mv: values.mv,
    videos: normalizeVideosForGroup(values.videos, groupNameJa),
    costumes: values.costumes.map((costume) => ({
      stylistName: costume.stylistName,
      imagePath: costume.imagePath,
      note: costume.note,
    })),
    artistName: values.artistName,
    note: values.note,
  };
}

export function hasMvValue(mv: CreateSongInput["mv"]): boolean {
  return Boolean(
    mv.url.trim() ||
      mv.directorName.trim() ||
      mv.location.trim() ||
      mv.publishedOn.trim() ||
      mv.memo.trim()
  );
}

export function hasVideoValue(video: CreateSongVideoInput): boolean {
  return Boolean(
    video.url.trim() ||
      video.publishedOn.trim() ||
      video.memo.trim()
  );
}
