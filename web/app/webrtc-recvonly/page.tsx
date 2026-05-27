"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type ConnectionStatus = "未接続" | "接続中" | "切断中";

type SoraRecvOnlyConnection = {
  on: (kind: string, callback: (...args: unknown[]) => void) => void;
  connect: () => Promise<MediaStream | void>;
  disconnect: () => Promise<void>;
};

function stopMediaStream(stream: MediaStream | null) {
  if (stream === null) {
    return;
  }

  stream.getTracks().forEach((track) => {
    track.stop();
  });
}

function WebRTCReceiveOnlyPageContent() {
  const searchParams = useSearchParams();
  const channelID = searchParams.get("channelId")?.trim() ?? "";
  const soraURL = searchParams.get("soraUrl")?.trim() ?? "";

  const [status, setStatus] = useState<ConnectionStatus>("未接続");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [hasActiveConnection, setHasActiveConnection] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [logMessages, setLogMessages] = useState<string[]>([]);

  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const connectionRef = useRef<SoraRecvOnlyConnection | null>(null);

  function appendLog(message: string) {
    setLogMessages((currentMessages) => {
      const timestamp = new Date().toLocaleTimeString("ja-JP", {
        hour12: false,
      });
      return [`${timestamp} ${message}`, ...currentMessages].slice(0, 20);
    });
  }

  function resetStream() {
    stopMediaStream(remoteStreamRef.current);
    remoteStreamRef.current = null;

    if (remoteVideoRef.current !== null) {
      remoteVideoRef.current.srcObject = null;
    }
  }

  async function disconnectFromChannel() {
    if (connectionRef.current === null) {
      resetStream();
      setStatus("未接続");
      setHasActiveConnection(false);
      return;
    }

    setIsDisconnecting(true);
    setErrorMessage("");
    setStatus("切断中");

    try {
      await connectionRef.current.disconnect();
      appendLog("視聴を切断しました。");
    } catch {
      setErrorMessage("切断に失敗しました。ブラウザを再読み込みしてください。");
      appendLog("切断に失敗しました。");
    } finally {
      connectionRef.current = null;
      resetStream();
      setStatus("未接続");
      setHasActiveConnection(false);
      setIsDisconnecting(false);
      setIsConnecting(false);
    }
  }

  async function connectToChannel() {
    if (channelID === "" || soraURL === "") {
      setErrorMessage("channel_id または sora_url が不足しています。");
      return;
    }

    setIsConnecting(true);
    setErrorMessage("");
    setStatus("接続中");
    appendLog("視聴接続を開始します。");

    try {
      const { default: Sora } = await import("sora-js-sdk");
      const connection = Sora.connection(soraURL, true);
      const recvonly = connection.recvonly(channelID) as SoraRecvOnlyConnection;
      const remoteStream = new MediaStream();

      remoteStreamRef.current = remoteStream;
      if (remoteVideoRef.current !== null) {
        remoteVideoRef.current.srcObject = remoteStream;
      }

      recvonly.on("connected", () => {
        setStatus("接続中");
        appendLog("recvonly 接続が確立しました。");
      });

      recvonly.on("disconnect", (event) => {
        const closeEvent = event as { code?: number; reason?: string };
        appendLog(
          `切断イベントを受信しました。code=${closeEvent.code ?? "-"} reason=${closeEvent.reason ?? ""}`,
        );
        connectionRef.current = null;
        resetStream();
        setStatus("未接続");
        setHasActiveConnection(false);
        setIsConnecting(false);
        setIsDisconnecting(false);
      });

      recvonly.on("track", (event) => {
        const trackEvent = event as RTCTrackEvent;
        const currentRemoteStream = remoteStreamRef.current;
        if (currentRemoteStream === null) {
          return;
        }

        if (!currentRemoteStream.getTracks().includes(trackEvent.track)) {
          currentRemoteStream.addTrack(trackEvent.track);
        }

        if (remoteVideoRef.current !== null) {
          remoteVideoRef.current.srcObject = currentRemoteStream;
        }

        appendLog(`${trackEvent.track.kind} トラックを受信しました。`);
      });

      recvonly.on("removetrack", (event) => {
        const removeTrackEvent = event as MediaStreamTrackEvent;
        const currentRemoteStream = remoteStreamRef.current;
        if (currentRemoteStream === null) {
          return;
        }

        currentRemoteStream.removeTrack(removeTrackEvent.track);
        appendLog(`${removeTrackEvent.track.kind} トラックが切断されました。`);
      });

      connectionRef.current = recvonly;
      setHasActiveConnection(true);
      await recvonly.connect();
      appendLog("視聴接続処理が完了しました。");
    } catch {
      connectionRef.current = null;
      resetStream();
      setStatus("未接続");
      setHasActiveConnection(false);
      setErrorMessage(
        "視聴接続に失敗しました。チャンネル情報とブラウザ状態を確認してください。",
      );
      appendLog("接続に失敗しました。");
    } finally {
      setIsConnecting(false);
    }
  }

  useEffect(() => {
    const remoteVideoElement = remoteVideoRef.current;

    return () => {
      if (connectionRef.current !== null) {
        void connectionRef.current.disconnect();
      }
      connectionRef.current = null;
      stopMediaStream(remoteStreamRef.current);
      remoteStreamRef.current = null;
      if (remoteVideoElement !== null) {
        remoteVideoElement.srcObject = null;
      }
    };
  }, []);

  return (
    <main>
      <h1>WebRTC 視聴（β）</h1>
      <p className="mx-auto">
        作成済みの WebRTC チャンネルへ視聴専用で接続します。
      </p>

      <section>
        <h2>接続情報</h2>
        <table>
          <thead>
            <tr>
              <th>項目</th>
              <th>値</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>channel_id</td>
              <td>{channelID || "未指定"}</td>
            </tr>
            <tr>
              <td>sora_url</td>
              <td>{soraURL || "未指定"}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={connectToChannel}
            disabled={isConnecting || isDisconnecting || hasActiveConnection}
            className="rounded-md bg-brand px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:text-brand hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isConnecting ? "接続中..." : "接続する"}
          </button>
          <button
            type="button"
            onClick={disconnectFromChannel}
            disabled={isConnecting || isDisconnecting || !hasActiveConnection}
            className="rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDisconnecting ? "切断中..." : "切断する"}
          </button>
          <Link
            href="/webrtc"
            className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-xs hover:text-white hover:bg-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            WebRTC 作成へ戻る
          </Link>
        </div>

        <p className="mt-4 text-sm text-gray-300">状態: {status}</p>

        {errorMessage !== "" ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}
      </section>

      <section>
        <h2>リモート映像</h2>
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="aspect-video w-full rounded-xl bg-black object-cover"
        />
      </section>

      <section>
        <h2>接続ログ</h2>
        {logMessages.length === 0 ? (
          <p className="text-sm text-gray-300">まだログはありません。</p>
        ) : (
          <ul className="space-y-2">
            {logMessages.map((message, index) => (
              <li
                key={`${message}-${index}`}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-gray-300"
              >
                {message}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default function WebRTCReceiveOnlyPage() {
  return (
    <Suspense
      fallback={
        <main>
          <h1>読み込み中...</h1>
        </main>
      }
    >
      <WebRTCReceiveOnlyPageContent />
    </Suspense>
  );
}
