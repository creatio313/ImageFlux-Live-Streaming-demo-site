"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

const hlsConfig = {
  manifestLoadingTimeOut: 3000,
  manifestLoadingMaxRetry: 10,
  manifestLoadingMaxRetryTimeout: 3000,
  levelLoadingTimeOut: 3000,
  levelLoadingMaxRetry: 10,
  levelLoadingMaxRetryTimeout: 3000,
  fragLoadingTimeOut: 3000,
  fragLoadingMaxRetry: 10,
  fragLoadingMaxRetryTimeout: 3000,
  liveBackBufferLength: 0,
};

export default function HLSPlayerPage() {
  const [playlistURL, setPlaylistURL] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState(
    "まだ再生していません。.m3u8のURLを入力してください。",
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<import("hls.js").default | null>(null);

  async function startPlayback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedURL = playlistURL.trim();
    if (trimmedURL === "") {
      setErrorMessage(".m3u8のURLを入力してください。");
      return;
    }

    const videoElement = videoRef.current;
    if (videoElement === null) {
      setErrorMessage("video要素の初期化に失敗しました。");
      return;
    }

    setErrorMessage("");
    setStatusMessage("再生準備中です...");

    if (hlsRef.current !== null) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    videoElement.pause();
    videoElement.removeAttribute("src");
    videoElement.load();

    const { default: Hls } = await import("hls.js");

    if (Hls.isSupported()) {
      const hls = new Hls(hlsConfig);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setStatusMessage("再生を開始します。");
        void videoElement.play();
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setErrorMessage(`HLS再生エラー: ${data.type}`);
          setStatusMessage("再生に失敗しました。");
        }
      });

      hls.loadSource(trimmedURL);
      hls.attachMedia(videoElement);
      return;
    }

    if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
      videoElement.src = trimmedURL;
      videoElement.addEventListener(
        "loadedmetadata",
        () => {
          setStatusMessage("再生を開始します。");
          void videoElement.play();
        },
        { once: true },
      );
      return;
    }

    setErrorMessage("このブラウザはHLS再生に対応していません。");
    setStatusMessage("再生できませんでした。");
  }

  useEffect(() => {
    return () => {
      if (hlsRef.current !== null) {
        hlsRef.current.destroy();
      }
      hlsRef.current = null;
    };
  }, []);

  return (
    <main>
      <h1>HLS配信視聴</h1>
      <p className="mx-auto">
        .m3u8のURLを入力して、hls.js でライブ配信を視聴できます。
      </p>

      <section>
        <form onSubmit={startPlayback} className="flex flex-col gap-4">
          <label htmlFor="playlist-url">.m3u8のURL</label>
          <input
            id="playlist-url"
            type="url"
            value={playlistURL}
            onChange={(event) => setPlaylistURL(event.target.value)}
            placeholder="https://example.com/live/playlist.m3u8"
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-md bg-brand px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:text-brand hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              再生する
            </button>
            <Link
              href="/"
              className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-xs hover:text-white hover:bg-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              トップへ戻る
            </Link>
          </div>
        </form>

        <p className="mt-4 text-sm text-gray-300">{statusMessage}</p>
        {errorMessage !== "" ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}
      </section>

      <section>
        <h2>プレイヤー</h2>
        <video
          ref={videoRef}
          controls
          playsInline
          className="aspect-video w-full rounded-xl bg-black"
        />
      </section>
    </main>
  );
}
