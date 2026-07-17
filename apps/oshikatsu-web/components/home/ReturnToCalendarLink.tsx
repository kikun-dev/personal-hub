"use client";

// 「カレンダーへ戻る」導線。hash更新だけではkeyboard focusが画面外のリンクへ
// 残るため（#362 P1指摘）、hashをpushしたうえで#calendar見出しへprogrammaticに
// focusを移す。見出し側はtabIndex={-1}でfocus可能にしておく。
export function ReturnToCalendarLink() {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById("calendar");
    if (target === null) return;
    event.preventDefault();
    window.history.pushState(null, "", "#calendar");
    // focus()のデフォルト挙動が対象を可視位置までスクロールする
    target.focus();
  };

  return (
    <a
      href="#calendar"
      onClick={handleClick}
      className="text-sm text-foreground-secondary hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
    >
      ↓ カレンダーへ戻る
    </a>
  );
}
