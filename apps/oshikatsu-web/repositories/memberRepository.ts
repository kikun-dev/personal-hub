import type { SupabaseClient } from "@personal-hub/supabase";
import type {
  BirthdayMember,
  MemberGroup,
  MemberListItem,
  MemberOption,
  MemberWithGroups,
} from "@/types/member";
import type { MemberRepository } from "@/types/repositories";
import { RepositoryError } from "@/types/errors";
import type { SnsType } from "@/lib/constants";

type MemberGroupRow = {
  id: string;
  group_id: string;
  generation: string | null;
  joined_at: string | null;
  graduated_at: string | null;
  orbit_groups:
    | {
        name_ja: string;
        color: string;
      }
    | Array<{
        name_ja: string;
        color: string;
      }>;
};

type MemberSnsRow = {
  id: string;
  sns_type: string;
  display_name: string;
  url: string;
  hashtag: string | null;
  sort_order: number;
};

type MemberRow = {
  id: string;
  name_ja: string;
  name_kana: string;
  name_en: string | null;
  date_of_birth: string | null;
  zodiac: string | null;
  blood_type: string | null;
  call_name: string | null;
  penlight_color_1: string | null;
  penlight_color_2: string | null;
  height_cm: number | null;
  hometown: string | null;
  memo: string | null;
  image_url: string | null;
  blog_url: string | null;
  blog_hashtag: string | null;
  talk_app_name: string | null;
  talk_app_url: string | null;
  talk_app_hashtag: string | null;
  orbit_member_groups: MemberGroupRow[];
  orbit_member_sns?: MemberSnsRow[];
};

type BirthdayMemberRow = {
  id: string;
  name_ja: string;
  date_of_birth: string;
  group_names: string[] | null;
};

type MemberOptionGroupRow = {
  group_id: string;
  graduated_at: string | null;
  orbit_groups:
    | {
        name_ja: string;
      }
    | Array<{
        name_ja: string;
      }>;
};

type MemberOptionRow = {
  id: string;
  name_ja: string;
  orbit_member_groups: MemberOptionGroupRow[];
};

type MemberFilterGroupRow = {
  group_id: string;
  generation: string | null;
  graduated_at: string | null;
};

type MemberListRow = {
  id: string;
  name_ja: string;
  name_kana: string;
  image_url: string | null;
  orbit_member_groups: MemberGroupRow[];
  member_filter_groups?: MemberFilterGroupRow[];
};

type MemberGroupRpcInput = {
  group_id: string;
  generation: string | null;
  joined_at: string | null;
  graduated_at: string | null;
};

type MemberSnsRpcInput = {
  sns_type: string;
  display_name: string;
  url: string;
  hashtag: string | null;
  sort_order: number;
};

function toMemberGroupRpcInput(
  groups: { groupId: string; generation: string; joinedAt: string; graduatedAt: string }[]
): MemberGroupRpcInput[] {
  return groups.map((group) => ({
    group_id: group.groupId,
    generation: group.generation || null,
    joined_at: group.joinedAt || null,
    graduated_at: group.graduatedAt || null,
  }));
}

function toMemberSnsRpcInput(
  snsList: { snsType: string; displayName: string; url: string; hashtag: string }[]
): MemberSnsRpcInput[] {
  return snsList.map((sns, index) => ({
    sns_type: sns.snsType,
    display_name: sns.displayName,
    url: sns.url,
    hashtag: sns.hashtag || null,
    sort_order: index,
  }));
}

function mapToMemberGroup(row: MemberGroupRow): MemberGroup {
  const orbitGroup = Array.isArray(row.orbit_groups)
    ? row.orbit_groups[0]
    : row.orbit_groups;

  return {
    id: row.id,
    groupId: row.group_id,
    groupNameJa: orbitGroup?.name_ja ?? "",
    groupColor: orbitGroup?.color ?? "#6B7280",
    generation: row.generation,
    joinedAt: row.joined_at,
    graduatedAt: row.graduated_at,
  };
}

function mapToMemberWithGroups(row: MemberRow): MemberWithGroups {
  return {
    id: row.id,
    nameJa: row.name_ja,
    nameKana: row.name_kana,
    nameEn: row.name_en,
    dateOfBirth: row.date_of_birth,
    zodiac: row.zodiac,
    bloodType: row.blood_type,
    callName: row.call_name,
    penlightColor1: row.penlight_color_1,
    penlightColor2: row.penlight_color_2,
    heightCm: row.height_cm,
    hometown: row.hometown,
    memo: row.memo,
    imageUrl: row.image_url,
    blogUrl: row.blog_url,
    blogHashtag: row.blog_hashtag,
    talkAppName: row.talk_app_name,
    talkAppUrl: row.talk_app_url,
    talkAppHashtag: row.talk_app_hashtag,
    groups: (row.orbit_member_groups ?? []).map(mapToMemberGroup),
    sns: (row.orbit_member_sns ?? [])
      .map((sns) => ({
        id: sns.id,
        snsType: sns.sns_type as SnsType,
        displayName: sns.display_name,
        url: sns.url,
        hashtag: sns.hashtag ?? "",
        sortOrder: sns.sort_order,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

function filterDisplayGroups(
  groups: MemberGroup[],
  filters?: {
    groupId?: string;
  }
): MemberGroup[] {
  if (!filters?.groupId) {
    return groups;
  }

  return groups.filter((group) => group.groupId === filters.groupId);
}

function matchesMemberStatus(
  groups: MemberGroup[],
  status: "active" | "graduated" | "all" | undefined
): boolean {
  if (status === "active") {
    return groups.some((group) => group.graduatedAt === null);
  }

  if (status === "graduated") {
    return groups.length > 0 && groups.every((group) => group.graduatedAt !== null);
  }

  return true;
}

function mapToMemberListItem(
  row: MemberListRow,
  filters?: {
    groupId?: string;
  }
): MemberListItem {
  const groups = filterDisplayGroups(
    (row.orbit_member_groups ?? []).map(mapToMemberGroup),
    filters
  );

  return {
    id: row.id,
    imageUrl: row.image_url,
    nameJa: row.name_ja,
    nameKana: row.name_kana,
    groups,
  };
}

function mapToBirthdayMember(row: BirthdayMemberRow): BirthdayMember {
  return {
    id: row.id,
    nameJa: row.name_ja,
    dateOfBirth: row.date_of_birth,
    groupNames: row.group_names ?? [],
  };
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function mapToMemberOption(row: MemberOptionRow): MemberOption {
  const groups = row.orbit_member_groups ?? [];
  const groupIds = uniqueStrings(groups.map((group) => group.group_id));
  const groupNames = uniqueStrings(
    groups.map((group) => {
      const orbitGroup = Array.isArray(group.orbit_groups)
        ? group.orbit_groups[0]
        : group.orbit_groups;
      return orbitGroup?.name_ja ?? "";
    }).filter(Boolean)
  );

  return {
    id: row.id,
    nameJa: row.name_ja,
    groupIds,
    groupNames,
    isActive: groups.some((group) => group.graduated_at === null),
  };
}

const MEMBER_BASE_SELECT = `
  id,
  name_ja,
  name_kana,
  name_en,
  date_of_birth,
  zodiac,
  blood_type,
  call_name,
  penlight_color_1,
  penlight_color_2,
  height_cm,
  hometown,
  memo,
  image_url,
  blog_url,
  blog_hashtag,
  talk_app_name,
  talk_app_url,
  talk_app_hashtag
`;

const MEMBER_GROUPS_SELECT = `
  orbit_member_groups(
    id,
    group_id,
    generation,
    joined_at,
    graduated_at,
    orbit_groups(name_ja, color)
  )
`;

const MEMBER_SNS_SELECT = `
  orbit_member_sns(
    id,
    sns_type,
    display_name,
    url,
    hashtag,
    sort_order
  )
`;

const MEMBER_LIST_SELECT = `
  ${MEMBER_BASE_SELECT},
  ${MEMBER_GROUPS_SELECT}
`;

const MEMBER_DETAIL_SELECT = `
  ${MEMBER_BASE_SELECT},
  ${MEMBER_GROUPS_SELECT},
  ${MEMBER_SNS_SELECT}
`;

const MEMBER_PUBLIC_LIST_SELECT = `
  id,
  name_ja,
  name_kana,
  image_url,
  ${MEMBER_GROUPS_SELECT},
  member_filter_groups:orbit_member_groups!inner(
    group_id,
    generation,
    graduated_at
  )
`;

const MEMBER_OPTION_SELECT = `
  id,
  name_ja,
  orbit_member_groups(
    group_id,
    graduated_at,
    orbit_groups(name_ja)
  )
`;

export function createMemberRepository(
  supabase: SupabaseClient
): MemberRepository {
  async function replaceMemberGroups(
    memberId: string,
    inputGroups: { groupId: string; generation: string; joinedAt: string; graduatedAt: string }[]
  ): Promise<void> {
    const { error: deleteError } = await supabase
      .from("orbit_member_groups")
      .delete()
      .eq("member_id", memberId);

    if (deleteError) {
      throw new RepositoryError("メンバーのグループ更新に失敗しました", deleteError);
    }

    if (inputGroups.length === 0) return;

    const groupRows = inputGroups.map((g) => ({
      member_id: memberId,
      group_id: g.groupId,
      generation: g.generation || null,
      joined_at: g.joinedAt || null,
      graduated_at: g.graduatedAt || null,
    }));

    const { error: insertError } = await supabase
      .from("orbit_member_groups")
      .insert(groupRows);

    if (insertError) {
      throw new RepositoryError("メンバーのグループ登録に失敗しました", insertError);
    }
  }

  async function replaceMemberSns(
    memberId: string,
    inputSns: { snsType: string; displayName: string; url: string; hashtag: string }[]
  ): Promise<void> {
    const { error: deleteError } = await supabase
      .from("orbit_member_sns")
      .delete()
      .eq("member_id", memberId);

    if (deleteError) {
      throw new RepositoryError("SNS情報の更新に失敗しました", deleteError);
    }

    if (inputSns.length === 0) return;

    const snsRows = inputSns.map((sns, index) => ({
      member_id: memberId,
      sns_type: sns.snsType,
      display_name: sns.displayName,
      url: sns.url,
      hashtag: sns.hashtag || null,
      sort_order: index,
    }));

    const { error: insertError } = await supabase
      .from("orbit_member_sns")
      .insert(snsRows);

    if (insertError) {
      throw new RepositoryError("SNS情報の登録に失敗しました", insertError);
    }
  }

  return {
    async findAll(filters) {
      let query = supabase
        .from("orbit_members")
        .select(MEMBER_LIST_SELECT)
        .order("name_kana");

      if (filters?.groupId) {
        query = query.filter(
          "orbit_member_groups.group_id",
          "eq",
          filters.groupId
        );
      }

      const { data, error } = await query;

      if (error) {
        throw new RepositoryError("メンバーの取得に失敗しました", error);
      }

      let members = (data as MemberRow[]).map(mapToMemberWithGroups);

      // グループフィルタの場合、そのグループに属するメンバーのみ
      if (filters?.groupId) {
        members = members.filter((m) => m.groups.length > 0);
      }

      // ステータスフィルタ
      if (filters?.status === "active") {
        members = members.filter((m) =>
          m.groups.some((g) => g.graduatedAt === null)
        );
      } else if (filters?.status === "graduated") {
        members = members.filter((m) =>
          m.groups.every((g) => g.graduatedAt !== null)
        );
      }

      // 期生フィルタ
      if (filters?.generation) {
        members = members.filter((m) =>
          m.groups.some((g) => g.generation === filters.generation)
        );
      }

      return members;
    },

    async findPublicList(filters) {
      let query = supabase
        .from("orbit_members")
        .select(MEMBER_PUBLIC_LIST_SELECT)
        .order("name_kana");

      if (filters?.groupId) {
        query = query.eq("member_filter_groups.group_id", filters.groupId);
      }

      if (filters?.status === "active") {
        query = query.is("member_filter_groups.graduated_at", null);
      }

      if (filters?.generation) {
        query = query.eq("member_filter_groups.generation", filters.generation);
      }

      const { data, error } = await query;

      if (error) {
        throw new RepositoryError("公開向けメンバー一覧の取得に失敗しました", error);
      }

      let members = (data as MemberListRow[]).map((row) =>
        mapToMemberListItem(row, {
          groupId: filters?.groupId,
        })
      );

      if (filters?.groupId) {
        members = members.filter((member) => member.groups.length > 0);
      }

      if (filters?.status) {
        members = members.filter((member) =>
          matchesMemberStatus(member.groups, filters.status)
        );
      }

      return members;
    },

    async findOptions() {
      const { data, error } = await supabase
        .from("orbit_members")
        .select(MEMBER_OPTION_SELECT)
        .order("name_kana");

      if (error) {
        throw new RepositoryError("メンバー候補の取得に失敗しました", error);
      }

      return ((data as MemberOptionRow[] | null) ?? []).map(mapToMemberOption);
    },

    async findById(id) {
      const { data, error } = await supabase
        .from("orbit_members")
        .select(MEMBER_DETAIL_SELECT)
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116" || error.code === "22P02") {
          return null;
        }
        throw new RepositoryError("メンバーの取得に失敗しました", error);
      }
      return mapToMemberWithGroups(data as MemberRow);
    },

    async create(input) {
      const { data: member, error: memberError } = await supabase
        .from("orbit_members")
        .insert({
          name_ja: input.nameJa,
          name_kana: input.nameKana,
          name_en: input.nameEn || null,
          date_of_birth: input.dateOfBirth || null,
          zodiac: input.zodiac || null,
          blood_type: input.bloodType || null,
          call_name: input.callName || null,
          penlight_color_1: input.penlightColor1 || null,
          penlight_color_2: input.penlightColor2 || null,
          height_cm: input.heightCm ? Number(input.heightCm) : null,
          hometown: input.hometown || null,
          memo: input.memo || null,
          image_url: input.imageUrl || null,
          blog_url: input.blogUrl || null,
          blog_hashtag: input.blogHashtag || null,
          talk_app_name: input.talkAppName || null,
          talk_app_url: input.talkAppUrl || null,
          talk_app_hashtag: input.talkAppHashtag || null,
        })
        .select("id")
        .single();

      if (memberError) {
        throw new RepositoryError("メンバーの作成に失敗しました", memberError);
      }

      try {
        await replaceMemberGroups(member.id, input.groups);
        await replaceMemberSns(member.id, input.sns);
      } catch (e) {
        await supabase.from("orbit_members").delete().eq("id", member.id);
        if (e instanceof RepositoryError) {
          throw e;
        }
        throw new RepositoryError("メンバーの関連情報登録に失敗しました", e);
      }

      const created = await this.findById(member.id);
      if (!created) {
        throw new RepositoryError("作成したメンバーの取得に失敗しました", null);
      }
      return created;
    },

    async update(id, input) {
      const { error: rpcError } = await supabase.rpc("update_member_with_relations", {
        p_member_id: id,
        p_name_ja: input.nameJa,
        p_name_kana: input.nameKana,
        p_name_en: input.nameEn || null,
        p_date_of_birth: input.dateOfBirth || null,
        p_zodiac: input.zodiac || null,
        p_blood_type: input.bloodType || null,
        p_call_name: input.callName || null,
        p_penlight_color_1: input.penlightColor1 || null,
        p_penlight_color_2: input.penlightColor2 || null,
        p_height_cm: input.heightCm ? Number(input.heightCm) : null,
        p_hometown: input.hometown || null,
        p_memo: input.memo || null,
        p_image_url: input.imageUrl || null,
        p_blog_url: input.blogUrl || null,
        p_blog_hashtag: input.blogHashtag || null,
        p_talk_app_name: input.talkAppName || null,
        p_talk_app_url: input.talkAppUrl || null,
        p_talk_app_hashtag: input.talkAppHashtag || null,
        p_groups: toMemberGroupRpcInput(input.groups),
        p_sns: toMemberSnsRpcInput(input.sns),
      });

      if (rpcError) {
        throw new RepositoryError("メンバーの更新に失敗しました", rpcError);
      }

      const updated = await this.findById(id);
      if (!updated) {
        throw new RepositoryError("更新したメンバーの取得に失敗しました", null);
      }
      return updated;
    },

    async delete(id) {
      const { error } = await supabase
        .from("orbit_members")
        .delete()
        .eq("id", id);

      if (error) {
        throw new RepositoryError("メンバーの削除に失敗しました", error);
      }
    },

    async findBirthdaysByMonth(month) {
      const { data, error } = await supabase.rpc("find_orbit_birthdays_by_month", {
        target_month: month,
      });

      if (error) {
        throw new RepositoryError("誕生日メンバーの取得に失敗しました", error);
      }

      return ((data as BirthdayMemberRow[] | null) ?? []).map(mapToBirthdayMember);
    },

    async findBirthdaysByDate(month, day) {
      const { data, error } = await supabase.rpc("find_orbit_birthdays_by_date", {
          target_month: month,
          target_day: day,
        });

      if (error) {
        throw new RepositoryError("誕生日メンバーの取得に失敗しました", error);
      }

      return ((data as BirthdayMemberRow[] | null) ?? []).map(mapToBirthdayMember);
    },
  };
}
