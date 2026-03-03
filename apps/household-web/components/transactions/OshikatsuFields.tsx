import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { OSHIKATSU_ACTIVITY_TYPES } from "@/lib/constants";

type OshikatsuFieldsProps = {
  groupName: string | null;
  activityType: string | null;
  onGroupNameChange: (value: string | null) => void;
  onActivityTypeChange: (value: string | null) => void;
  errors?: {
    groupName?: string;
    activityType?: string;
  };
};

export function OshikatsuFields({
  groupName,
  activityType,
  onGroupNameChange,
  onActivityTypeChange,
  errors,
}: OshikatsuFieldsProps) {
  return (
    <div className="space-y-4 rounded-lg border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-800 dark:bg-purple-950/30">
      <p className="text-xs font-medium text-purple-700 dark:text-purple-300">
        推し活情報
      </p>

      <Input
        id="groupName"
        label="推しグループ名"
        type="text"
        placeholder="例: 乃木坂46"
        value={groupName ?? ""}
        onChange={(e) => onGroupNameChange(e.target.value || null)}
        error={errors?.groupName}
      />

      <Select
        id="activityType"
        label="活動タイプ"
        placeholder="選択してください"
        options={OSHIKATSU_ACTIVITY_TYPES.map((type) => ({
          value: type,
          label: type,
        }))}
        value={activityType ?? ""}
        onChange={(e) => onActivityTypeChange(e.target.value || null)}
        error={errors?.activityType}
      />
    </div>
  );
}
