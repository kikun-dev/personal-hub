type FormErrorBannerProps = {
  message?: string;
};

/** フォーム全体エラー（errors._form）の表示バナー。管理フォーム共通の見た目。 */
export function FormErrorBanner({ message }: FormErrorBannerProps) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400"
    >
      {message}
    </p>
  );
}
