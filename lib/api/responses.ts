import { NextResponse } from "next/server";
import type { ApiResponse, ApiWarning, GameEventDTO } from "@/lib/api/types";

export type ApiSuccessOptions = {
  events?: GameEventDTO[];
  warnings?: ApiWarning[];
  clientMutationId?: string;
  serverVersion?: number;
};

export type ApiErrorOptions = {
  details?: unknown;
  clientMutationId?: string;
  serverVersion?: number;
  warnings?: ApiWarning[];
};

export function createApiSuccess<T>(data: T, options: ApiSuccessOptions = {}): ApiResponse<T> {
  return {
    ok: true,
    data,
    events: options.events,
    warnings: options.warnings,
    clientMutationId: options.clientMutationId,
    serverVersion: options.serverVersion,
  };
}

export function createApiError<T>(code: string, message: string, options: ApiErrorOptions = {}): ApiResponse<T> {
  return {
    ok: false,
    warnings: options.warnings,
    error: {
      code,
      message,
      details: options.details,
    },
    clientMutationId: options.clientMutationId,
    serverVersion: options.serverVersion,
  };
}

export function jsonApiSuccess<T>(data: T, options: ApiSuccessOptions & { status?: number } = {}) {
  return NextResponse.json(createApiSuccess(data, options), { status: options.status ?? 200 });
}

export function jsonApiError<T>(
  code: string,
  message: string,
  options: ApiErrorOptions & { status?: number } = {},
) {
  return NextResponse.json(createApiError<T>(code, message, options), { status: options.status ?? 400 });
}
