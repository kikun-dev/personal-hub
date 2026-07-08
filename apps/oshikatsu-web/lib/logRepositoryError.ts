import { RepositoryError } from "@/types/errors";

type RepositoryErrorLog = {
  message: string;
  cause?: {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  };
};

function toErrorRecord(cause: unknown): RepositoryErrorLog["cause"] {
  if (!cause || typeof cause !== "object") {
    return undefined;
  }

  const record = cause as Record<string, unknown>;
  return {
    code: typeof record.code === "string" ? record.code : undefined,
    message: typeof record.message === "string" ? record.message : undefined,
    details: typeof record.details === "string" ? record.details : undefined,
    hint: typeof record.hint === "string" ? record.hint : undefined,
  };
}

export function toRepositoryErrorLog(error: RepositoryError): RepositoryErrorLog {
  return {
    message: error.message,
    cause: toErrorRecord(error.cause),
  };
}
