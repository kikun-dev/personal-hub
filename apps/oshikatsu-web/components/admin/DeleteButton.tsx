"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type DeleteButtonProps = {
  label?: string;
  confirmMessage?: string;
  onDelete: () => Promise<{ error?: string }>;
};

export function DeleteButton({
  label = "削除",
  confirmMessage = "本当に削除しますか？",
  onDelete,
}: DeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string>();

  const handleDelete = async () => {
    if (!window.confirm(confirmMessage)) return;

    setIsDeleting(true);
    setError(undefined);

    try {
      const result = await onDelete();
      if (result.error) {
        setError(result.error);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <Button
        variant="danger"
        onClick={handleDelete}
        disabled={isDeleting}
      >
        {isDeleting ? "削除中..." : label}
      </Button>
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
