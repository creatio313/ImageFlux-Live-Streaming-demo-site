"use client";

import Link from "next/link";
import { useState } from "react";
import { readErrorMessage } from "@/lib/error";

type ArchiveDestination = {
  id: string;
  bucket_uri: string;
};

type RawArchiveDestination = {
  id?: string;
  bucket_uri?: string;
};

type CreateArchiveDestinationResponse = {
  archive_destination_id?: string;
  id?: string;
};

type ListArchiveDestinationsResponse = {
  destinations?: RawArchiveDestination[];
};

const apiBaseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

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

export default function ArchiveDestinationsPage() {
  const [token, setToken] = useState("");
  const [items, setItems] = useState<ArchiveDestination[]>([]);
  const [hasLoadedItems, setHasLoadedItems] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    bucketURI: "",
    awsEndPoint: "",
    awsRegion: "",
    awsAccessKeyID: "",
    awsSecretAccessKey: "",
  });

  async function loadArchiveDestinations() {
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
        setItems([]);
        setErrorMessage(await readErrorMessage(response));
        return;
      }

      const data = (await response.json()) as ListArchiveDestinationsResponse;
      setItems(normalizeArchiveDestinations(data));
      setHasLoadedItems(true);
      setSuccessMessage("アーカイブ保存先一覧を取得しました。");
    } catch {
      setItems([]);
      setHasLoadedItems(false);
      setErrorMessage("APIの呼び出しに失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteArchiveDestination(archiveDestinationID: string) {
    const trimmedToken = token.trim();
    if (trimmedToken === "") {
      setSuccessMessage("");
      setErrorMessage("APIトークンを入力してください。");
      return;
    }

    setDeletingId(archiveDestinationID);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `${apiBaseURL}/api/imageflux/archive-destinations`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${trimmedToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            archive_destination_id: archiveDestinationID,
          }),
        },
      );

      if (!response.ok) {
        setErrorMessage(await readErrorMessage(response));
        return;
      }

      setItems((currentItems) =>
        currentItems.filter((item) => item.id !== archiveDestinationID),
      );
      setHasLoadedItems(true);
      setSuccessMessage("アーカイブ保存先を削除しました。");
    } catch {
      setErrorMessage("APIの呼び出しに失敗しました。");
    } finally {
      setDeletingId("");
    }
  }

  function updateCreateForm(
    field:
      | "bucketURI"
      | "awsEndPoint"
      | "awsRegion"
      | "awsAccessKeyID"
      | "awsSecretAccessKey",
    value: string,
  ) {
    setCreateForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function closeCreateModal() {
    if (isCreating) {
      return;
    }
    setIsCreateModalOpen(false);
  }

  async function createArchiveDestination() {
    const trimmedToken = token.trim();
    if (trimmedToken === "") {
      setSuccessMessage("");
      setErrorMessage("APIトークンを入力してください。");
      return;
    }

    const bucketURI = createForm.bucketURI.trim();
    if (bucketURI === "") {
      setSuccessMessage("");
      setErrorMessage("保存先バケット以降のパスを含むURIを入力してください。");
      return;
    }

    setIsCreating(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `${apiBaseURL}/api/imageflux/archive-destinations`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${trimmedToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bucket_uri: bucketURI,
            aws_end_point: createForm.awsEndPoint.trim(),
            aws_region: createForm.awsRegion.trim(),
            aws_access_key_id: createForm.awsAccessKeyID.trim(),
            aws_secret_access_key: createForm.awsSecretAccessKey.trim(),
          }),
        },
      );

      if (!response.ok) {
        setErrorMessage(await readErrorMessage(response));
        return;
      }

      const data = (await response.json()) as CreateArchiveDestinationResponse;
      const archiveDestinationID = data.archive_destination_id ?? data.id ?? "";

      if (archiveDestinationID === "") {
        setErrorMessage("アーカイブ保存先のIDを取得できませんでした。");
        return;
      }

      const newItem = {
        id: archiveDestinationID,
        bucket_uri: bucketURI,
      };

      setItems((currentItems) => [newItem, ...currentItems]);
      setHasLoadedItems(true);
      setSuccessMessage("アーカイブ保存先を作成しました。");
      setIsCreateModalOpen(false);
      setCreateForm({
        bucketURI: "",
        awsEndPoint: "",
        awsRegion: "",
        awsAccessKeyID: "",
        awsSecretAccessKey: "",
      });
    } catch {
      setErrorMessage("APIの呼び出しに失敗しました。");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main>
      <h1>アーカイブ保存先管理</h1>
      <p className="mx-auto">
        APIトークンを使って保存先一覧の取得・追加・削除を行えます。
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
            onClick={loadArchiveDestinations}
            disabled={isLoading}
            className="rounded-md bg-brand px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:text-brand hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {isLoading ? "取得中..." : "一覧を取得"}
          </button>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="rounded-md bg-brand px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:text-brand hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            保存先を追加
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
        <h2>アーカイブ保存先一覧（{items.length}件）</h2>

        {!hasLoadedItems ? (
          <p>
            まだ一覧を取得していません。APIトークンを入力して「一覧を取得」を押してください。
          </p>
        ) : items.length === 0 ? (
          <p>アーカイブ保存先は登録されていません。</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>保存先ID</th>
                <th>バケットURI</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isDeleting = deletingId === item.id;

                return (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.bucket_uri}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => deleteArchiveDestination(item.id)}
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

      {isCreateModalOpen ? (
        <dialog
          open
          aria-labelledby="archive-create-dialog-title"
          onCancel={(event) => {
            event.preventDefault();
            closeCreateModal();
          }}
          className="fixed inset-0 size-auto max-h-none max-w-none overflow-y-auto bg-transparent backdrop:bg-transparent"
        >
          <div className="flex min-h-full items-center justify-center p-4 sm:p-8">
            <div className="w-full max-w-3xl rounded-2xl border border-stone-200 bg-black p-6 text-left shadow-2xl sm:p-8">
              <section className="mb-6 flex items-start justify-between gap-4 border-b border-stone-200 pb-4 text-white">
                <div className="space-y-1">
                  <h2 id="archive-create-dialog-title" className="m-0">
                    アーカイブ保存先を追加
                  </h2>
                  <p className="m-0 text-sm leading-5">
                    必要な接続情報を入力して、新しいアーカイブ保存先を作成します。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={isCreating}
                  className="rounded-lg px-3 py-2 text-sm text-zinc-500 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  閉じる
                </button>
              </section>

              <section>
                <label htmlFor="bucketURI">
                  保存先バケット/コンテナ、および、以降のパス
                </label>
                <span className="text-sm text-gray-500">
                  s3://&lt;my-bucket-name&gt;/&lt;path&gt;/形式
                </span>
                <input
                  id="bucketURI"
                  type="text"
                  value={createForm.bucketURI}
                  onChange={(event) =>
                    updateCreateForm("bucketURI", event.target.value)
                  }
                  placeholder="s3://my-bucket-name/path/"
                />

                <label htmlFor="awsEndPoint">S3エンドポイント</label>
                <input
                  id="awsEndPoint"
                  type="text"
                  value={createForm.awsEndPoint}
                  onChange={(event) =>
                    updateCreateForm("awsEndPoint", event.target.value)
                  }
                  placeholder="s3.isk01.sakurastorage.jp"
                />

                <label htmlFor="awsRegion">リージョン</label>
                <input
                  id="awsRegion"
                  type="text"
                  value={createForm.awsRegion}
                  onChange={(event) =>
                    updateCreateForm("awsRegion", event.target.value)
                  }
                  placeholder="jp-north-1"
                />

                <label htmlFor="awsAccessKeyID">アクセスキーID</label>
                <input
                  id="awsAccessKeyID"
                  type="text"
                  value={createForm.awsAccessKeyID}
                  onChange={(event) =>
                    updateCreateForm("awsAccessKeyID", event.target.value)
                  }
                  placeholder="ACCESS_KEY"
                />

                <label htmlFor="awsSecretAccessKey">
                  シークレットアクセスキー
                </label>
                <input
                  id="awsSecretAccessKey"
                  type="password"
                  value={createForm.awsSecretAccessKey}
                  onChange={(event) =>
                    updateCreateForm("awsSecretAccessKey", event.target.value)
                  }
                  placeholder="SECRET_KEY"
                />
              </section>

              <section className="mt-6 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={createArchiveDestination}
                  disabled={isCreating}
                  className="rounded-md bg-brand px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:text-brand hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreating ? "作成中..." : "作成する"}
                </button>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={isCreating}
                  className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-xs hover:text-white hover:bg-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  キャンセル
                </button>
              </section>
            </div>
          </div>
        </dialog>
      ) : null}
    </main>
  );
}
