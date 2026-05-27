"use client";

import Link from "next/link";
import { useState } from "react";
import { readErrorMessage } from "@/lib/error";

type RawChannel = {
  channel_id?: string;
  id?: string;
};

type ListChannelsResponse = {
  channel_ids?: string[];
  channels?: RawChannel[];
};

type RawPlaylist = {
  playlist_url?: string;
};

type ListPlaylistURLsResponse = {
  hls?: RawPlaylist[];
  playlist_urls?: string[];
};

const apiBaseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

function normalizeChannelIDs(data: ListChannelsResponse) {
  if (Array.isArray(data.channel_ids)) {
    return data.channel_ids
      .map((item) => item.trim())
      .filter((item) => item !== "");
  }

  if (Array.isArray(data.channels)) {
    return data.channels
      .map((item) => (item.channel_id ?? item.id ?? "").trim())
      .filter((item) => item !== "");
  }
  return [];
}

function normalizePlaylistURLs(data: ListPlaylistURLsResponse) {
  if (Array.isArray(data.hls)) {
    return data.hls
      .map((item) => (item.playlist_url ?? "").trim())
      .filter((item) => item !== "");
  }

  if (Array.isArray(data.playlist_urls)) {
    return data.playlist_urls
      .map((item) => item.trim())
      .filter((item) => item !== "");
  }

  return [];
}

export default function ChannelsPage() {
  const [token, setToken] = useState("");
  const [channelIDs, setChannelIDs] = useState<string[]>([]);
  const [hasLoadedChannels, setHasLoadedChannels] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [deletingID, setDeletingID] = useState("");
  const [loadingPlaylistID, setLoadingPlaylistID] = useState("");
  const [playlistURLsByChannelID, setPlaylistURLsByChannelID] = useState<
    Record<string, string[]>
  >({});
  const [playlistLoadedByChannelID, setPlaylistLoadedByChannelID] = useState<
    Record<string, boolean>
  >({});
  const [playlistErrorByChannelID, setPlaylistErrorByChannelID] = useState<
    Record<string, string>
  >({});

  async function fetchChannels(trimmedToken: string) {
    const response = await fetch(`${apiBaseURL}/api/imageflux/channels`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${trimmedToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    const data = (await response.json()) as ListChannelsResponse;
    return normalizeChannelIDs(data);
  }

  async function loadChannels() {
    const trimmedToken = token.trim();
    if (trimmedToken === "") {
      setSuccessMessage("");
      setErrorMessage("APIトークンを入力してください。");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      setChannelIDs(await fetchChannels(trimmedToken));
      setHasLoadedChannels(true);
      setPlaylistURLsByChannelID({});
      setPlaylistLoadedByChannelID({});
      setPlaylistErrorByChannelID({});
      setSuccessMessage("チャンネル一覧を取得しました。");
    } catch (error) {
      setChannelIDs([]);
      setHasLoadedChannels(false);
      if (error instanceof Error && error.message !== "") {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("APIの呼び出しに失敗しました。");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteChannel(channelID: string) {
    const trimmedToken = token.trim();
    if (trimmedToken === "") {
      setSuccessMessage("");
      setErrorMessage("APIトークンを入力してください。");
      return;
    }

    setDeletingID(channelID);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`${apiBaseURL}/api/imageflux/channels`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${trimmedToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel_id: channelID,
        }),
      });

      if (!response.ok) {
        setErrorMessage(await readErrorMessage(response));
        return;
      }

      setChannelIDs(await fetchChannels(trimmedToken));
      setHasLoadedChannels(true);
      setPlaylistURLsByChannelID({});
      setPlaylistLoadedByChannelID({});
      setPlaylistErrorByChannelID({});
      setSuccessMessage("チャンネルを削除しました。");
    } catch (error) {
      if (error instanceof Error && error.message !== "") {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("APIの呼び出しに失敗しました。");
      }
    } finally {
      setDeletingID("");
    }
  }

  async function loadPlaylistURLs(channelID: string) {
    const trimmedToken = token.trim();
    if (trimmedToken === "") {
      setSuccessMessage("");
      setErrorMessage("APIトークンを入力してください。");
      return;
    }

    setLoadingPlaylistID(channelID);
    setErrorMessage("");
    setSuccessMessage("");
    setPlaylistErrorByChannelID((current) => ({
      ...current,
      [channelID]: "",
    }));

    try {
      const response = await fetch(
        `${apiBaseURL}/api/imageflux/channels/playlist-urls`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${trimmedToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            channel_id: channelID,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await readErrorMessage(response);
        setPlaylistErrorByChannelID((current) => ({
          ...current,
          [channelID]: errorText,
        }));
        return;
      }

      const data = (await response.json()) as ListPlaylistURLsResponse;
      setPlaylistURLsByChannelID((current) => ({
        ...current,
        [channelID]: normalizePlaylistURLs(data),
      }));
      setPlaylistLoadedByChannelID((current) => ({
        ...current,
        [channelID]: true,
      }));
      setSuccessMessage("HLSプレイリストを取得しました。");
    } catch {
      setPlaylistErrorByChannelID((current) => ({
        ...current,
        [channelID]: "APIの呼び出しに失敗しました。",
      }));
    } finally {
      setLoadingPlaylistID("");
    }
  }

  return (
    <main>
      <h1>チャンネル管理</h1>
      <p className="mx-auto">
        APIトークンを使ってチャンネル一覧を取得し、不要なチャンネルを削除できます。
      </p>

      <section>
        <label htmlFor="api-token">APIトークン</label>
        <input
          id="api-token"
          type="password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="エンコード済みトークンを入力"
        />

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadChannels}
            disabled={isLoading}
            className="rounded-md bg-brand px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:text-brand hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {isLoading ? "取得中..." : "一覧を取得"}
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

      <section>
        <h2>チャンネル一覧（{channelIDs.length}件）</h2>

        {!hasLoadedChannels ? (
          <p>
            まだ一覧を取得していません。APIトークンを入力して「一覧を取得」を押してください。
          </p>
        ) : channelIDs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center text-stone-600">
            チャンネルは登録されていません。
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>チャンネルID</th>
                <th>HLSプレイリスト</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {channelIDs.map((channelID) => {
                const isDeleting = deletingID === channelID;
                const isLoadingPlaylist = loadingPlaylistID === channelID;
                const hasLoadedPlaylist =
                  playlistLoadedByChannelID[channelID] === true;
                const playlistURLs = playlistURLsByChannelID[channelID] ?? [];
                const playlistError = playlistErrorByChannelID[channelID] ?? "";

                return (
                  <tr key={channelID}>
                    <td>{channelID}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => loadPlaylistURLs(channelID)}
                        disabled={isDeleting || isLoading || isLoadingPlaylist}
                        className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-xs hover:text-white hover:bg-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      >
                        {isLoadingPlaylist ? "取得中..." : "プレイリスト取得"}
                      </button>

                      {playlistError !== "" ? <p>{playlistError}</p> : null}

                      {hasLoadedPlaylist && playlistURLs.length === 0 ? (
                        <p>プレイリストは見つかりませんでした。</p>
                      ) : null}

                      {playlistURLs.length > 0 ? (
                        <ul>
                          {playlistURLs.map((playlistURL, index) => (
                            <li key={`${channelID}-${playlistURL}-${index}`}>
                              <a
                                href={playlistURL}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {playlistURL}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => deleteChannel(channelID)}
                        disabled={isDeleting || isLoading}
                        className="rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isDeleting ? "削除中..." : "削除"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
