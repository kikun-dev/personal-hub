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
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const result = await onDelete();
      if (result.error) {
        setError(result.error);
        setIsConfirming(false);
      }
    } finally {
      setIsDeleting(false);
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
    <div>
      {error && (
        <p className="mb-1 text-xs text-red-500">{error}</p>
      )}
      <Button variant="ghost" onClick={() => setIsConfirming(true)}>
        削除
      </Button>
    </div>
  );
}
