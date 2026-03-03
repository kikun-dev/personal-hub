"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type DeleteTransactionButtonProps = {
  onDelete: () => Promise<{ error?: string }>;
};

export function DeleteTransactionButton({
  onDelete,
}: DeleteTransactionButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
      setIsConfirming(false);
    }
  };

  if (isConfirming) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={() => setIsConfirming(false)}
          disabled={isDeleting}
        >
          キャンセル
        </Button>
        <Button
          variant="danger"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? "削除中..." : "削除する"}
        </Button>
      </div>
    );
  }

  return (
    <Button variant="ghost" onClick={() => setIsConfirming(true)}>
      削除
    </Button>
  );
}
