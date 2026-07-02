import { withGeneratedKey } from "@/lib/keyedList";
import type {
  CreateReleaseBonusVideoInput,
  CreateReleaseInput,
  CreateReleaseTrackLinkInput,
} from "@/types/release";
import type { FormBonusVideo, FormTrackLink } from "@/components/admin/release/releaseFormShared";

/**
 * ReleaseForm.tsx から切り出した、FormValues の生成・相互変換を担う純粋関数群。
 * JSX を持たないため ReleaseForm.tsx からのみ import される（セクション child からは使わない）。
 */

export type FormValues = Omit<CreateReleaseInput, "bonusVideos" | "trackLinks"> & {
  bonusVideos: FormBonusVideo[];
  trackLinks: FormTrackLink[];
};

export function withBonusKey(input: CreateReleaseBonusVideoInput): FormBonusVideo {
  return withGeneratedKey(input);
}

export function withTrackKey(input: CreateReleaseTrackLinkInput): FormTrackLink {
  return withGeneratedKey(input);
}

export function getDefaultValues(): FormValues {
  return {
    title: "",
    groupId: "",
    releaseType: "",
    numbering: "",
    releaseDate: "",
    artworkPath: "",
    artworkPersonName: "",
    participantMemberIds: [],
    memberPositions: [],
    bonusVideos: [],
    trackLinks: [],
  };
}

export function toFormValues(input: CreateReleaseInput): FormValues {
  return {
    ...input,
    bonusVideos: input.bonusVideos.map(withBonusKey),
    trackLinks: input.trackLinks.map(withTrackKey),
  };
}

export function toSubmitValues(
  input: FormValues,
  supportsFrontSpecial: boolean
): CreateReleaseInput {
  return {
    title: input.title,
    groupId: input.groupId,
    releaseType: input.releaseType,
    numbering: input.numbering,
    releaseDate: input.releaseDate,
    artworkPath: input.artworkPath,
    artworkPersonName: input.artworkPersonName,
    participantMemberIds: input.participantMemberIds,
    // 選抜ポジションはシングルのみ・参加メンバーに限定して保存する
    memberPositions:
      input.releaseType === "single"
        ? input.memberPositions
            .filter((position) =>
              input.participantMemberIds.includes(position.memberId)
            )
            .map((position) => ({
              memberId: position.memberId,
              // グループが福神/櫻エイト非対応なら front_special をクリア
              isFrontSpecial: supportsFrontSpecial
                ? position.isFrontSpecial
                : false,
              isHiatus: position.isHiatus,
            }))
            // 福神/休業中いずれかが立つメンバーのみ保持（overlay）
            .filter((position) => position.isFrontSpecial || position.isHiatus)
        : [],
    bonusVideos: input.bonusVideos.map((bonus) => ({
      edition: bonus.edition,
      title: bonus.title,
      description: bonus.description,
    })),
    trackLinks: input.trackLinks.map((trackLink) => ({
      trackId: trackLink.trackId,
      trackNumber: trackLink.trackNumber,
    })),
  };
}
