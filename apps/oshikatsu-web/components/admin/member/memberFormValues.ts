import { withInitialKey } from "@/lib/keyedList";
import type {
  CreateMemberGroupInput,
  CreateMemberInput,
  CreateMemberSnsInput,
} from "@/types/member";

/**
 * MemberForm.tsx から切り出した、FormValues の生成・相互変換を担う純粋関数群。
 * JSX を持たないため MemberForm.tsx からのみ import される。
 *
 * 切り出しの意図（#443）: 初期行のキー生成は SSR / hydration の双方で走るため、
 * 同じ入力から常に同じ値になることを DB データの有無に依存せず単体テストで固定する。
 */

export type GroupWithKey = CreateMemberGroupInput & { _key: string };
export type SnsWithKey = CreateMemberSnsInput & { _key: string };

export type FormValues = Omit<CreateMemberInput, "groups" | "sns"> & {
  groups: GroupWithKey[];
  sns: SnsWithKey[];
};

export function getDefaultGroup(): CreateMemberGroupInput {
  return { groupId: "", generation: "", joinedAt: "", graduatedAt: "" };
}

export function getDefaultSns(): CreateMemberSnsInput {
  return { snsType: "x", displayName: "", url: "", hashtag: "" };
}

export function getDefaultValues(): FormValues {
  return {
    nameJa: "",
    nameKana: "",
    nameEn: "",
    dateOfBirth: "",
    bloodType: "",
    callName: "",
    penlightColor1: "",
    penlightColor2: "",
    heightCm: "",
    hometown: "",
    memo: "",
    imageUrl: "",
    blogUrl: "",
    blogHashtag: "",
    talkAppName: "",
    talkAppUrl: "",
    talkAppHashtag: "",
    // 初期行は SSR / hydration で同一のキーにする（#443）
    groups: [withInitialKey(getDefaultGroup(), 0, "group")],
    sns: [],
  };
}

export function toFormValues(input: CreateMemberInput): FormValues {
  return {
    ...input,
    // 初期行は SSR / hydration で同一のキーにする（#443）
    groups: input.groups.map((group, index) => withInitialKey(group, index, "group")),
    sns: input.sns.map((sns, index) => withInitialKey(sns, index, "sns")),
  };
}

export function toSubmitValues(values: FormValues): CreateMemberInput {
  return {
    ...values,
    groups: values.groups.map((group) => ({
      groupId: group.groupId,
      generation: group.generation,
      joinedAt: group.joinedAt,
      graduatedAt: group.graduatedAt,
    })),
    sns: values.sns.map((sns) => ({
      snsType: sns.snsType,
      displayName: sns.displayName,
      url: sns.url,
      hashtag: sns.hashtag,
    })),
  };
}
