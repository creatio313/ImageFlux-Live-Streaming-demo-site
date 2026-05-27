"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { readErrorMessage } from "@/lib/error";
import { toOptionalNumber } from "@/lib/number";
import {
  copyToClipboardWithMessage,
  resetResultModal,
} from "@/lib/result-modal";

type CreateWebRTCToHLSChannelResponse = {
  channel_id: string;
  sora_url: string;
};

type ArchiveDestination = {
  id: string;
  bucket_uri: string;
};

type RawArchiveDestination = {
  id?: string;
  bucket_uri?: string;
};

type ListArchiveDestinationsResponse = {
  destinations?: RawArchiveDestination[];
};

type HLSProfileForm = {
  id: number;
  width: string;
  height: string;
  fps: string;
  videoBPS: string;
  codec: string;
  audioBPS: string;
};

const apiBaseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

function createDefaultProfile(id: number): HLSProfileForm {
  return {
    id,
    width: "1280",
    height: "720",
    fps: "30",
    videoBPS: "4000000",
    codec: "h264_high",
    audioBPS: "160000",
  };
}

function normalizeArchiveDestinations(data: ListArchiveDestinationsResponse) {
  if (Array.isArray(data.destinations)) {
    return data.destinations
      .map((item) => {
        const archiveDestinationID = item.id ?? "";
        const bucketURI = item.bucket_uri ?? "";

        if (archiveDestinationID === "" || bucketURI === "") {
          return null;
        }

        return {
          id: archiveDestinationID,
          bucket_uri: bucketURI,
        };
      })
      .filter((item): item is ArchiveDestination => item !== null);
  }

  return [];
}

export default function WebRTCToHLSPage() {
  const [token, setToken] = useState("");
  const [form, setForm] = useState({
    archiveDestinationID: "",
    encryptKeyURI: "",
    authWebhookURL: "",
    eventWebhookURL: "",
  });
  const [profiles, setProfiles] = useState<HLSProfileForm[]>([
    createDefaultProfile(1),
  ]);
  const [nextProfileID, setNextProfileID] = useState(2);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [archiveDestinations, setArchiveDestinations] = useState<
    ArchiveDestination[]
  >([]);
  const [isLoadingArchiveDestinations, setIsLoadingArchiveDestinations] =
    useState(false);
  const [createdChannel, setCreatedChannel] =
    useState<CreateWebRTCToHLSChannelResponse | null>(null);

  function updateForm(
    field:
      | "archiveDestinationID"
      | "encryptKeyURI"
      | "authWebhookURL"
      | "eventWebhookURL",
    value: string,
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function updateProfile(
    profileID: number,
    field: "width" | "height" | "fps" | "videoBPS" | "codec" | "audioBPS",
    value: string,
  ) {
    setProfiles((currentProfiles) =>
      currentProfiles.map((profile) =>
        profile.id === profileID ? { ...profile, [field]: value } : profile,
      ),
    );
  }

  function addProfile() {
    setProfiles((currentProfiles) => [
      ...currentProfiles,
      createDefaultProfile(nextProfileID),
    ]);
    setNextProfileID((currentID) => currentID + 1);
  }

  function removeProfile(profileID: number) {
    setProfiles((currentProfiles) => {
      if (currentProfiles.length === 1) {
        return currentProfiles;
      }

      return currentProfiles.filter((profile) => profile.id !== profileID);
    });
  }

  async function loadArchiveDestinations() {
    const trimmedToken = token.trim();
    if (trimmedToken === "") {
      setSuccessMessage("");
      setErrorMessage("APIトークンを入力してください。");
      return;
    }

    setIsLoadingArchiveDestinations(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `${apiBaseURL}/api/imageflux/archive-destinations`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${trimmedToken}`,
          },
        },
      );

      if (!response.ok) {
        setErrorMessage(await readErrorMessage(response));
        return;
      }

      const data = (await response.json()) as ListArchiveDestinationsResponse;
      setArchiveDestinations(normalizeArchiveDestinations(data));
      setSuccessMessage("アーカイブ保存先一覧を取得しました。");
    } catch {
      setErrorMessage(
        "APIサーバへ接続できませんでした。起動状態とCORS設定を確認してください。",
      );
    } finally {
      setIsLoadingArchiveDestinations(false);
    }
  }

  async function createWebRTCToHLSChannel() {
    const trimmedToken = token.trim();
    if (trimmedToken === "") {
      setSuccessMessage("");
      setErrorMessage("APIトークンを入力してください。");
      return;
    }

    if (profiles.length === 0) {
      setSuccessMessage("");
      setErrorMessage("HLS設定を1件以上追加してください。");
      return;
    }

    const hls = profiles.map((profile, index) => {
      const width = toOptionalNumber(profile.width);
      const height = toOptionalNumber(profile.height);
      const fps = toOptionalNumber(profile.fps);
      const videoBPS = toOptionalNumber(profile.videoBPS);
      const audioBPS = toOptionalNumber(profile.audioBPS);

      if (
        width === undefined ||
        height === undefined ||
        fps === undefined ||
        videoBPS === undefined
      ) {
        throw new Error(
          `HLS設定${index + 1}の数値項目を正しく入力してください。`,
        );
      }

      return {
        video: {
          width,
          height,
          fps,
          bps: videoBPS,
          codec: profile.codec,
        },
        audio: audioBPS !== undefined ? { bps: audioBPS } : undefined,
        archive:
          form.archiveDestinationID !== ""
            ? { archive_destination_id: form.archiveDestinationID }
            : undefined,
      };
    });

    if (hls.length === 0) {
      setSuccessMessage("");
      setErrorMessage("HLS設定を1件以上追加してください。");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");
    setCopyMessage("");
    setCreatedChannel(null);

    const payload: {
      hls: typeof hls;
      encrypt_key_uri?: string;
      auth_webhook_url?: string;
      event_webhook_url?: string;
    } = {
      hls,
    };

    const trimmedEncryptKeyURI = form.encryptKeyURI.trim();
    if (trimmedEncryptKeyURI !== "") {
      payload.encrypt_key_uri = trimmedEncryptKeyURI;
    }

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
        `${apiBaseURL}/api/imageflux/channels/webrtc-to-hls`,
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

      const data = (await response.json()) as CreateWebRTCToHLSChannelResponse;
      setCreatedChannel(data);
      setSuccessMessage("WebRTC to HLS チャンネルを作成しました。");
    } catch (error) {
      if (error instanceof Error && error.message !== "") {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("APIの呼び出しに失敗しました。");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main>
      <h1>WebRTC to HLS</h1>
      <p className="mx-auto">
        APIトークンと変換設定を入力して、WebRTC to HLSチャンネルを作成できます。
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
        <h2>HLS動画・音声変換設定</h2>
        <div className="space-y-4">
          {profiles.map((profile, index) => (
            <section key={profile.id}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="m-0 text-base">HLS設定 {index + 1}</h3>
                <button
                  type="button"
                  onClick={() => removeProfile(profile.id)}
                  disabled={profiles.length === 1}
                  className="rounded-md border border-stone-300 px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  削除
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor={`width-${profile.id}`}>画面幅（px）</label>
                  <input
                    id={`width-${profile.id}`}
                    type="number"
                    value={profile.width}
                    onChange={(event) =>
                      updateProfile(profile.id, "width", event.target.value)
                    }
                  />
                </div>
                <div>
                  <label htmlFor={`height-${profile.id}`}>画面高（px）</label>
                  <input
                    id={`height-${profile.id}`}
                    type="number"
                    value={profile.height}
                    onChange={(event) =>
                      updateProfile(profile.id, "height", event.target.value)
                    }
                  />
                </div>
                <div>
                  <label htmlFor={`fps-${profile.id}`}>
                    フレームレート（fps）
                  </label>
                  <input
                    id={`fps-${profile.id}`}
                    type="number"
                    value={profile.fps}
                    onChange={(event) =>
                      updateProfile(profile.id, "fps", event.target.value)
                    }
                  />
                </div>
                <div>
                  <label htmlFor={`videoBPS-${profile.id}`}>
                    動画ビットレート（bps）
                  </label>
                  <input
                    id={`videoBPS-${profile.id}`}
                    type="number"
                    value={profile.videoBPS}
                    onChange={(event) =>
                      updateProfile(profile.id, "videoBPS", event.target.value)
                    }
                  />
                </div>
                <div>
                  <label htmlFor={`audioBPS-${profile.id}`}>
                    音声ビットレート（bps）
                  </label>
                  <input
                    id={`audioBPS-${profile.id}`}
                    type="number"
                    value={profile.audioBPS}
                    onChange={(event) =>
                      updateProfile(profile.id, "audioBPS", event.target.value)
                    }
                  />
                </div>
                <div>
                  <label htmlFor={`codec-${profile.id}`}>動画コーデック</label>
                  <select
                    id={`codec-${profile.id}`}
                    value={profile.codec}
                    onChange={(event) =>
                      updateProfile(profile.id, "codec", event.target.value)
                    }
                  >
                    <option value="h264_high">h264_high</option>
                    <option value="h264_main">h264_main</option>
                    <option value="h264_baseline">h264_baseline</option>
                  </select>
                </div>
              </div>
            </section>
          ))}

          <button
            type="button"
            onClick={addProfile}
            className="rounded-md border border-stone-300 px-3 py-2 text-sm"
          >
            HLS設定を追加
          </button>
        </div>
      </section>
      <section>
        <h2>その他の設定（任意）</h2>
        <label htmlFor="archiveDestinationID">アーカイブ保存先ID</label>
        <button
          className="rounded-md bg-brand px-1.5 py-0.5 text-xs font-semibold text-white shadow-xs hover:text-brand hover:bg-accent focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-brand"
          type="button"
          onClick={loadArchiveDestinations}
          disabled={isLoadingArchiveDestinations}
        >
          {isLoadingArchiveDestinations ? "一覧取得中..." : "一覧更新"}
        </button>
        <select
          id="archiveDestinationID"
          value={form.archiveDestinationID}
          onChange={(event) =>
            updateForm("archiveDestinationID", event.target.value)
          }
        >
          <option value="">選択しない（任意）</option>
          {archiveDestinations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.id} ({item.bucket_uri})
            </option>
          ))}
        </select>
        <label htmlFor="encryptKeyURI">会員認証APIのURL（任意）</label>
        <input
          id="encryptKeyURI"
          type="url"
          value={form.encryptKeyURI}
          onChange={(event) => updateForm("encryptKeyURI", event.target.value)}
          placeholder="https://example.com/api/encrypt_key_uri"
        />
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
            onClick={createWebRTCToHLSChannel}
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
          aria-labelledby="webrtc-to-hls-result-dialog-title"
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
                <section className="flex flex-wrap gap-3">
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
