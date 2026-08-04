// 実体は components/ui/interactionStyles.ts（"use client" を持たない
// server-safe module）へ移した（#482）。既存の import path と `focusRingClass`
// という名前の契約は維持するため、ここは re-export のみを行う。
export { focusRingClass } from "@/components/ui/interactionStyles";
