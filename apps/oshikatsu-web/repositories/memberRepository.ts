import type { SupabaseClient } from "@personal-hub/supabase";
import type { MemberWithGroups, MemberGroup } from "@/types/member";
import type { MemberRepository } from "@/types/repositories";
import { RepositoryError } from "@/types/errors";

type MemberGroupRow = {
  id: string;
  group_id: string;
  generation: string | null;
  joined_at: string | null;
  graduated_at: string | null;
  orbit_groups: {
    name_ja: string;
    color: string;
  };
};

type MemberRow = {
  id: string;
  name_ja: string;
  name_kana: string;
  name_en: string | null;
  date_of_birth: string | null;
  blood_type: string | null;
  height_cm: number | null;
  hometown: string | null;
  image_url: string | null;
  blog_url: string | null;
  orbit_member_groups: MemberGroupRow[];
};

function mapToMemberGroup(row: MemberGroupRow): MemberGroup {
  return {
    id: row.id,
    groupId: row.group_id,
    groupNameJa: row.orbit_groups.name_ja,
    groupColor: row.orbit_groups.color,
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
    bloodType: row.blood_type,
    heightCm: row.height_cm,
    hometown: row.hometown,
    imageUrl: row.image_url,
    blogUrl: row.blog_url,
    groups: (row.orbit_member_groups ?? []).map(mapToMemberGroup),
  };
}

const MEMBER_SELECT = `
  *,
  orbit_member_groups(
    id,
    group_id,
    generation,
    joined_at,
    graduated_at,
    orbit_groups(name_ja, color)
  )
`;

export function createMemberRepository(
  supabase: SupabaseClient
): MemberRepository {
  return {
    async findAll(filters) {
      let query = supabase
        .from("orbit_members")
        .select(MEMBER_SELECT)
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

    async findById(id) {
      const { data, error } = await supabase
        .from("orbit_members")
        .select(MEMBER_SELECT)
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
          blood_type: input.bloodType || null,
          height_cm: input.heightCm ? Number(input.heightCm) : null,
          hometown: input.hometown || null,
          image_url: input.imageUrl || null,
          blog_url: input.blogUrl || null,
        })
        .select("id")
        .single();

      if (memberError) {
        throw new RepositoryError("メンバーの作成に失敗しました", memberError);
      }

      if (input.groups.length > 0) {
        const groupRows = input.groups.map((g) => ({
          member_id: member.id,
          group_id: g.groupId,
          generation: g.generation || null,
          joined_at: g.joinedAt || null,
          graduated_at: g.graduatedAt || null,
        }));

        const { error: groupError } = await supabase
          .from("orbit_member_groups")
          .insert(groupRows);

        if (groupError) {
          // 補償処理: グループ登録失敗時は作成したメンバーを削除
          await supabase.from("orbit_members").delete().eq("id", member.id);
          throw new RepositoryError("メンバーのグループ登録に失敗しました", groupError);
        }
      }

      const created = await this.findById(member.id);
      if (!created) {
        throw new RepositoryError("作成したメンバーの取得に失敗しました", null);
      }
      return created;
    },

    async update(id, input) {
      const { error: memberError } = await supabase
        .from("orbit_members")
        .update({
          name_ja: input.nameJa,
          name_kana: input.nameKana,
          name_en: input.nameEn || null,
          date_of_birth: input.dateOfBirth || null,
          blood_type: input.bloodType || null,
          height_cm: input.heightCm ? Number(input.heightCm) : null,
          hometown: input.hometown || null,
          image_url: input.imageUrl || null,
          blog_url: input.blogUrl || null,
        })
        .eq("id", id);

      if (memberError) {
        throw new RepositoryError("メンバーの更新に失敗しました", memberError);
      }

      // グループ関連: 全削除→再挿入
      const { error: deleteError } = await supabase
        .from("orbit_member_groups")
        .delete()
        .eq("member_id", id);

      if (deleteError) {
        throw new RepositoryError("メンバーのグループ更新に失敗しました", deleteError);
      }

      if (input.groups.length > 0) {
        const groupRows = input.groups.map((g) => ({
          member_id: id,
          group_id: g.groupId,
          generation: g.generation || null,
          joined_at: g.joinedAt || null,
          graduated_at: g.graduatedAt || null,
        }));

        const { error: groupError } = await supabase
          .from("orbit_member_groups")
          .insert(groupRows);

        if (groupError) {
          throw new RepositoryError("メンバーのグループ登録に失敗しました", groupError);
        }
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
      // RPC で ID のみ取得 → 詳細データは通常の select で取得（2往復）
      // 理由: RPC に結合型を持たせるとメンテが困難。データ量は数百件程度のため問題なし
      const { data: ids, error: rpcError } = await supabase
        .rpc("find_birthday_member_ids_by_month", { target_month: month });

      if (rpcError) {
        throw new RepositoryError("誕生日メンバーの取得に失敗しました", rpcError);
      }

      if (!ids || ids.length === 0) return [];

      const { data, error } = await supabase
        .from("orbit_members")
        .select(MEMBER_SELECT)
        .in("id", ids)
        .order("date_of_birth");

      if (error) {
        throw new RepositoryError("誕生日メンバーの取得に失敗しました", error);
      }

      return (data as MemberRow[]).map(mapToMemberWithGroups);
    },

    async findBirthdaysByDate(month, day) {
      const { data: ids, error: rpcError } = await supabase
        .rpc("find_birthday_member_ids_by_date", {
          target_month: month,
          target_day: day,
        });

      if (rpcError) {
        throw new RepositoryError("誕生日メンバーの取得に失敗しました", rpcError);
      }

      if (!ids || ids.length === 0) return [];

      const { data, error } = await supabase
        .from("orbit_members")
        .select(MEMBER_SELECT)
        .in("id", ids)
        .order("name_kana");

      if (error) {
        throw new RepositoryError("誕生日メンバーの取得に失敗しました", error);
      }

      return (data as MemberRow[]).map(mapToMemberWithGroups);
    },
  };
}
