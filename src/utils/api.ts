export function jsonResponse(data: any, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

export function errorResponse(message: string, status = 400, details?: any) {
  return jsonResponse(
    {
      success: false,
      error: message,
      ...(details ? { details } : {}),
    },
    status
  );
}

export function successResponse(data: any, status = 200, headers: Record<string, string> = {}) {
  return jsonResponse(
    {
      success: true,
      ...data,
    },
    status,
    headers
  );
}
