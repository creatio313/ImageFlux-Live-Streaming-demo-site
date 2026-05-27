"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { readErrorMessage } from "@/lib/error";
import {
  copyToClipboardWithMessage,
  resetResultModal,
} from "@/lib/result-modal";

type CreateWebRTCChannelResponse = {
  channel_id: string;
  sora_url: string;
};

const apiBaseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export default function WebRTCPage() {
  const [token, setToken] = useState("");
  const [form, setForm] = useState({
    authWebhookURL: "",
    eventWebhookURL: "",
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdChannel, setCreatedChannel] =
    useState<CreateWebRTCChannelResponse | null>(null);

  function updateForm(
    field: "authWebhookURL" | "eventWebhookURL",
    value: string,
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function createWebRTCChannel() {
    const trimmedToken = token.trim();
    if (trimmedToken === "") {
      setSuccessMessage("");
      setErrorMessage("APIトークンを入力してください。");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");
    setCopyMessage("");
    setCreatedChannel(null);

    const payload: {
      auth_webhook_url?: string;
      event_webhook_url?: string;
    } = {};

    const trimmedAuthWebhookURL = form.authWebhookURL.trim();
    if (trimmedAuthWebhookURL !== "") {
      payload.auth_webhook_url = trimmedAuthWebhookURL;
    }

    const trimmedEventWebhookURL = form.eventWebhookURL.trim();
    if (trimmedEventWebhookURL !== "") {
      payload.event_webhook_url = trimmedEventWebhookURL;
    }

    try {
      const response = await fetch(
        `${apiBaseURL}/api/imageflux/channels/webrtc`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${trimmedToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        setErrorMessage(await readErrorMessage(response));
        return;
      }

      const data = (await response.json()) as CreateWebRTCChannelResponse;
      setCreatedChannel(data);
      setSuccessMessage("WebRTC チャンネルを作成しました。");
    } catch {
      setErrorMessage("APIの呼び出しに失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main>
      <h1>WebRTC</h1>
      <p className="mx-auto">
        APIトークンと任意設定を入力して、WebRTCチャンネルを作成できます。
      </p>
      <section>
        <label htmlFor="api-token">APIトークン</label>
        <input
          id="api-token"
          placeholder="エンコード済みトークンを入力"
          type="password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
        />
      </section>
      <section>
        <h2>設定</h2>
        <label htmlFor="authWebhookURL">認証Webhookを送信するURL（任意）</label>
        <input
          id="authWebhookURL"
          type="url"
          value={form.authWebhookURL}
          onChange={(event) => updateForm("authWebhookURL", event.target.value)}
          placeholder="https://example.com/api/auth_webhook_url"
        />
        <label htmlFor="eventWebhookURL">
          イベントWebhookを送信するURL（任意）
        </label>
        <input
          id="eventWebhookURL"
          type="url"
          value={form.eventWebhookURL}
          onChange={(event) =>
            updateForm("eventWebhookURL", event.target.value)
          }
          placeholder="https://example.com/api/event_webhook_url"
        />
      </section>
      <section>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={createWebRTCChannel}
            disabled={isSubmitting}
            className="rounded-md bg-brand px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:text-brand hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {isSubmitting ? "作成中..." : "チャンネルを作成"}
          </button>
          <Link
            href="/"
            className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-xs hover:text-white hover:bg-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            トップへ戻る
          </Link>
        </div>

        {errorMessage !== "" ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {successMessage !== "" ? (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </p>
        ) : null}
      </section>

      {createdChannel !== null ? (
        <dialog
          open
          aria-labelledby="webrtc-result-dialog-title"
          onCancel={(event) => {
            event.preventDefault();
            resetResultModal(setCreatedChannel, setCopyMessage);
          }}
          className="fixed inset-0 size-auto max-h-none max-w-none overflow-y-auto bg-transparent backdrop:bg-transparent"
        >
          <div className="flex min-h-full items-center justify-center p-4 sm:p-8">
            <div className="w-full max-w-3xl rounded-2xl border border-stone-200 bg-black p-6 text-left shadow-2xl sm:p-8">
              <section className="mb-6 flex items-start justify-between gap-4 border-b border-stone-200 pb-4 text-white">
                <div className="space-y-1">
                  <h2 className="m-0">チャンネル作成結果</h2>
                  <p className="m-0 text-sm leading-5">
                    作成されたチャンネル情報です。各項目は個別にコピーできます。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    resetResultModal(setCreatedChannel, setCopyMessage)
                  }
                  className="rounded-lg px-3 py-2 text-sm text-zinc-500 transition hover:bg-zinc-100"
                >
                  閉じる
                </button>
              </section>
              <section>
                <table>
                  <thead>
                    <tr>
                      <th className="border border-zinc-300 bg-zinc-50 px-4 py-2 text-left text-sm font-medium text-zinc-700">
                        項目
                      </th>
                      <th className="border border-zinc-300 bg-zinc-50 px-4 py-2 text-left text-sm font-medium text-zinc-700">
                        値
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>チャンネルID</td>
                      <td>
                        <span>{createdChannel.channel_id || "-"}</span>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboardWithMessage(
                              "チャンネルID",
                              createdChannel.channel_id,
                              setCopyMessage,
                            )
                          }
                          className="rounded-md p-1 transition bg-stone-100 hover:bg-stone-600"
                          aria-label="チャンネルIDをコピー"
                          title="チャンネルIDをコピー"
                        >
                          <Image
                            className="copy_button"
                            src="/copy-svgrepo-com.svg"
                            alt="コピー"
                            width={16}
                            height={16}
                          />
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td>SoraシグナリングURL</td>
                      <td>
                        <span>{createdChannel.sora_url || "-"}</span>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboardWithMessage(
                              "SoraシグナリングURL",
                              createdChannel.sora_url,
                              setCopyMessage,
                            )
                          }
                          className="rounded-md p-1 transition bg-stone-100 hover:bg-stone-600"
                          aria-label="SoraシグナリングURLをコピー"
                          title="SoraシグナリングURLをコピー"
                        >
                          <Image
                            className="copy_button"
                            src="/copy-svgrepo-com.svg"
                            alt="コピー"
                            width={16}
                            height={16}
                          />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </section>
              {copyMessage !== "" ? (
                <p className="mt-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                  {copyMessage}
                </p>
              ) : null}

              {createdChannel.channel_id !== "" &&
              createdChannel.sora_url !== "" ? (
                <section className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={`/webrtc-connect?channelId=${encodeURIComponent(createdChannel.channel_id)}&soraUrl=${encodeURIComponent(createdChannel.sora_url)}`}
                    className="rounded-md bg-brand px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:text-brand hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    双方向接続ページへ進む
                  </Link>
                  <Link
                    href={`/webrtc-sendonly?channelId=${encodeURIComponent(createdChannel.channel_id)}&soraUrl=${encodeURIComponent(createdChannel.sora_url)}`}
                    className="rounded-md bg-brand px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:text-brand hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    片方向配信ページへ進む
                  </Link>
                  <Link
                    href={`/webrtc-recvonly?channelId=${encodeURIComponent(createdChannel.channel_id)}&soraUrl=${encodeURIComponent(createdChannel.sora_url)}`}
                    className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-xs hover:text-white hover:bg-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    視聴ページへ進む
                  </Link>
                </section>
              ) : null}
            </div>
          </div>
        </dialog>
      ) : null}
    </main>
  );
}
