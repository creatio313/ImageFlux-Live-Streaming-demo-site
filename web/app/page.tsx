import Link from "next/link";

export default function Home() {
  const createChannelMenuItems = [
    { href: "/webrtc-to-hls", label: "WebRTC to HLS" },
    { href: "/webrtc", label: "WebRTC" },
    { href: "/rtmp-to-hls", label: "RTMP to HLS" },
    { href: "/hls-player", label: "HLS配信視聴" },
  ];
  const managementMenuItems = [
    { href: "/channels", label: "チャンネル管理" },
    { href: "/archive-destinations", label: "アーカイブ保存先管理" },
  ];

  return (
    <main className="mx-auto mt-16 p-8 rounded-2xl bg-gray-900 shadow-sm">
      <h1>ImageFlux Live Streaming簡易デモサイト</h1>
      <h2>チャンネル作成</h2>
      <nav className="grid grid-cols-2 gap-2">
        {createChannelMenuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md bg-brand px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:text-brand hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <h2>管理機能</h2>
      <nav className="grid grid-cols-2 gap-2">
        {managementMenuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md bg-brand px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:text-brand hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
