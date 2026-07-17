"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// #363: fallback carousel（最大18枚）でAttendanceControl（form/state/effect持ち）を
// 全card常時mountすると59 focus targetになるため、展開中の最大1公演だけmountする。
// 展開状態はこのcontextで共有し、server component構成（LiveDetail）は崩さない。

type AttendanceExpansionContextValue = {
  activePerformanceId: string | null;
  editingPerformanceId: string | null;
  toggle: (performanceId: string) => void;
  setEditing: (performanceId: string, isEditing: boolean) => void;
};

const AttendanceExpansionContext =
  createContext<AttendanceExpansionContextValue | null>(null);

const DISCARD_CONFIRM_MESSAGE = "編集中の参戦記録を破棄しますか？";

export function AttendanceExpansionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [activePerformanceId, setActivePerformanceId] = useState<
    string | null
  >(null);
  const [editingPerformanceId, setEditingPerformanceId] = useState<
    string | null
  >(null);

  // AttendanceControlは展開中card（activePerformanceId）にしかmountされないため、
  // editingPerformanceIdはnull、またはactivePerformanceIdと同値のいずれかにしかならない。
  const toggle = useCallback(
    (performanceId: string) => {
      const isEditingActiveCard =
        editingPerformanceId !== null &&
        editingPerformanceId === activePerformanceId;
      // 編集中の状態から「別cardへ切り替える」「自身をcollapseする」場合のみ確認する。
      // 未編集のまま別cardへ切り替える/collapseする通常操作では確認しない。
      if (isEditingActiveCard) {
        if (!window.confirm(DISCARD_CONFIRM_MESSAGE)) return;
        setEditingPerformanceId(null);
      }
      setActivePerformanceId((current) =>
        current === performanceId ? null : performanceId
      );
    },
    [activePerformanceId, editingPerformanceId]
  );

  const setEditing = useCallback(
    (performanceId: string, isEditing: boolean) => {
      setEditingPerformanceId((current) => {
        if (isEditing) return performanceId;
        return current === performanceId ? null : current;
      });
    },
    []
  );

  const value = useMemo(
    () => ({ activePerformanceId, editingPerformanceId, toggle, setEditing }),
    [activePerformanceId, editingPerformanceId, toggle, setEditing]
  );

  return (
    <AttendanceExpansionContext.Provider value={value}>
      {children}
    </AttendanceExpansionContext.Provider>
  );
}

export function useAttendanceExpansion(performanceId: string) {
  const context = useContext(AttendanceExpansionContext);
  if (context === null) {
    throw new Error(
      "useAttendanceExpansion は AttendanceExpansionProvider の内側でのみ使用できます。"
    );
  }

  const { activePerformanceId, toggle, setEditing } = context;
  const isActive = activePerformanceId === performanceId;

  const toggleThis = useCallback(
    () => toggle(performanceId),
    [toggle, performanceId]
  );
  const notifyEditing = useCallback(
    (isEditing: boolean) => setEditing(performanceId, isEditing),
    [setEditing, performanceId]
  );

  return { isActive, toggle: toggleThis, notifyEditing };
}
