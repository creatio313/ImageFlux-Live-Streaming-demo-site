import type { Dispatch, SetStateAction } from "react";

export function resetResultModal<T>(
  setResult: Dispatch<SetStateAction<T | null>>,
  setCopyMessage: Dispatch<SetStateAction<string>>,
) {
  setResult(null);
  setCopyMessage("");
}

export async function copyToClipboardWithMessage(
  label: string,
  value: string,
  setCopyMessage: Dispatch<SetStateAction<string>>,
) {
  if (value === "") {
    setCopyMessage(`${label} は空のためコピーできません。`);
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    setCopyMessage(`${label} をコピーしました。`);
  } catch {
    setCopyMessage(`${label} のコピーに失敗しました。`);
  }
}
