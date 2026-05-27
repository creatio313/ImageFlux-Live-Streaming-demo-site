export async function readErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    if (typeof data.error === "string" && data.error !== "") {
      return data.error;
    }
  } catch {
    // JSON以外の応答はHTTPステータス文言にフォールバックする。
  }

  return `リクエストに失敗しました (${response.status})`;
}
