import { Badge } from "./Badge";

type GroupBadgeProps = {
  groupName: string;
  groupColor: string;
  generation?: string | null;
};

export function GroupBadge({ groupName, groupColor, generation }: GroupBadgeProps) {
  const label = generation ? `${groupName} ${generation}期生` : groupName;
  return <Badge label={label} color={groupColor} />;
}
