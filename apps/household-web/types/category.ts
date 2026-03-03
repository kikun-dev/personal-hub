export type Category = {
  id: string;
  name: string;
  type: "income" | "expense";
  sortOrder: number;
  isDefault: boolean;
};
