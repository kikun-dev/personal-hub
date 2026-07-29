type FormErrorBannerProps = {
  message?: string;
};

/** フォーム全体エラー（errors._form）の表示バナー。管理フォーム共通の見た目。 */
export function FormErrorBanner({ message }: FormErrorBannerProps) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="rounded-lg border border-border-subtle bg-surface-subtle px-4 py-3 text-sm text-danger-text"
    >
      {message}
    </p>
  );
}
