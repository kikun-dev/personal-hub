import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { Combobox, type ComboboxOption } from "@/components/ui/Combobox";

// jsdom は scrollIntoView を実装していない。ハイライト追従の effect が落ちないようにだけ差し替える。
// スクロール挙動そのものの検証は Playwright 側の責務（#458）。
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const OPTIONS: ComboboxOption[] = [
  { value: "alpha", label: "楽曲アルファ" },
  { value: "beta", label: "楽曲ベータ" },
  { value: "gamma", label: "楽曲ガンマ" },
];

function renderCombobox({
  options = OPTIONS,
  emptyLabel,
  onChange = vi.fn(),
}: {
  options?: ComboboxOption[];
  emptyLabel?: string;
  onChange?: (value: string) => void;
} = {}) {
  // Combobox は制御コンポーネントなので、選択が実際に反映されるようラップする
  function Harness() {
    const [value, setValue] = useState("");
    return (
      <div>
        <Combobox
          value={value}
          onChange={(next) => {
            setValue(next);
            onChange(next);
          }}
          options={options}
          ariaLabel="楽曲"
          emptyLabel={emptyLabel}
        />
        <button type="button">次の項目</button>
      </div>
    );
  }

  render(<Harness />);
  return {
    onChange,
    input: screen.getByRole("combobox", { name: "楽曲" }),
    nextField: screen.getByRole("button", { name: "次の項目" }),
  };
}

describe("Combobox の候補リスト", () => {
  it("候補は role=option として公開され、タブストップにならない", async () => {
    const user = userEvent.setup();
    const { input, nextField } = renderCombobox();

    await user.click(input);

    const options = screen.getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "楽曲アルファ",
      "楽曲ベータ",
      "楽曲ガンマ",
    ]);
    for (const option of options) {
      expect(option).not.toHaveAttribute("tabindex");
    }

    // 候補がタブストップだと Tab が候補数だけ空打ちされる。次の項目へ一度で移ること
    await user.tab();
    expect(nextField).toHaveFocus();
  });

  it("候補が無いときは option を公開しない", async () => {
    const user = userEvent.setup();
    const { input } = renderCombobox();

    await user.type(input, "存在しない曲");

    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText("候補がありません")).toBeInTheDocument();
  });

  it("入力で候補が絞り込まれる", async () => {
    const user = userEvent.setup();
    const { input } = renderCombobox();

    await user.type(input, "ベータ");

    expect(
      screen.getAllByRole("option").map((option) => option.textContent)
    ).toEqual(["楽曲ベータ"]);
  });

  it("aria-autocomplete / aria-expanded / aria-controls が正しく付いている", async () => {
    const user = userEvent.setup();
    const { input } = renderCombobox();

    expect(input).toHaveAttribute("aria-autocomplete", "list");
    expect(input).toHaveAttribute("aria-expanded", "false");

    await user.click(input);

    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(input.getAttribute("aria-controls")).toBe(
      screen.getByRole("listbox").id
    );
  });
});

describe("Combobox のキーボード操作", () => {
  it("ArrowDown / ArrowUp で aria-activedescendant が移動し、aria-selected が現在候補だけに付く", async () => {
    const user = userEvent.setup();
    const { input } = renderCombobox();

    await user.click(input);

    const expectActive = (index: number) => {
      const options = screen.getAllByRole("option");
      expect(input).toHaveAttribute(
        "aria-activedescendant",
        options[index].id
      );
      expect(
        options.map((option) => option.getAttribute("aria-selected"))
      ).toEqual(options.map((_, i) => (i === index ? "true" : "false")));
    };

    expectActive(0);

    await user.keyboard("{ArrowDown}");
    expectActive(1);

    await user.keyboard("{ArrowDown}");
    expectActive(2);

    await user.keyboard("{ArrowUp}");
    expectActive(1);
  });

  it("Enter で確定し onChange が呼ばれ、リストが閉じる", async () => {
    const user = userEvent.setup();
    const { input, onChange } = renderCombobox();

    await user.click(input);
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenCalledExactlyOnceWith("beta");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(input).toHaveValue("楽曲ベータ");
  });

  it("Escape でリストが閉じ、onChange は呼ばれない", async () => {
    const user = userEvent.setup();
    const { input, onChange } = renderCombobox();

    await user.click(input);
    await user.keyboard("{ArrowDown}{Escape}");

    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("Tab でリストが閉じる", async () => {
    const user = userEvent.setup();
    const { input, nextField, onChange } = renderCombobox();

    await user.click(input);
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.tab();

    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(nextField).toHaveFocus();
  });
});

describe("Combobox のマウス操作", () => {
  it("マウスで候補を選ぶと確定する", async () => {
    const user = userEvent.setup();
    const { input, onChange } = renderCombobox({ emptyLabel: "未設定" });

    await user.click(input);

    // emptyLabel を渡すと「未設定」行も候補として先頭に並ぶ
    expect(
      screen.getAllByRole("option").map((option) => option.textContent)
    ).toEqual(["未設定", "楽曲アルファ", "楽曲ベータ", "楽曲ガンマ"]);

    await user.click(screen.getByRole("option", { name: "楽曲ガンマ" }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith("gamma");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(input).toHaveValue("楽曲ガンマ");
  });
});
