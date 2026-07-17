import { describe, expect, it } from "vitest";
import { formatDate, formatYen } from "@/lib/formatters";

describe("formatYen", () => {
  it("3桁区切りのカンマを付けて¥記号付きで表示する", () => {
    expect(formatYen(1234567)).toBe("¥1,234,567");
    expect(formatYen(0)).toBe("¥0");
  });
});

describe("formatDate", () => {
  it("YYYY-MM-DD形式の日付を「M/D」形式に変換する", () => {
    expect(formatDate("2024-05-01")).toBe("5/1");
    expect(formatDate("2024-12-31")).toBe("12/31");
  });
});
