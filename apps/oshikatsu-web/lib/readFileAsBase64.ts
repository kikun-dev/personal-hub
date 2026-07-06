/**
 * ブラウザの `File` を base64 文字列（data URL の `,` 以降）に変換する。
 * MemberForm / ReleaseForm / SpotForm で逐語コピーされていた実装を共通化（Issue #298）。
 * クライアント（FileReader が使える環境）専用のユーティリティ。
 */
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("invalid_file_reader_result"));
        return;
      }
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("invalid_base64_data"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("file_read_failed"));
    reader.readAsDataURL(file);
  });
}
