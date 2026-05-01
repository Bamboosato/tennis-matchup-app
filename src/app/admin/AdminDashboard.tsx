"use client";

import {
  Copy,
  KeyRound,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
  AdminAccountView,
  ApiRequestLogRecord,
  ApiScope,
  AuditLogRecord,
} from "@/features/admin/model/types";
import { API_SCOPES } from "@/features/admin/model/types";

type ApiEnvelope<T> = {
  data?: T;
  error?: {
    message: string;
  };
};

type AdminDashboardProps = {
  initialAccounts: AdminAccountView[];
  initialApiRequestLogs: ApiRequestLogRecord[];
  initialAuditLogs: AuditLogRecord[];
  initialAuthenticated: boolean;
  initialLoadError: string | null;
};

const scopeLabels: Record<ApiScope, string> = {
  "matchups:generate": "generate",
  "matchups:replay": "replay",
};

export function AdminDashboard({
  initialAccounts,
  initialApiRequestLogs,
  initialAuditLogs,
  initialAuthenticated,
  initialLoadError,
}: AdminDashboardProps) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [apiRequestLogs, setApiRequestLogs] = useState(initialApiRequestLogs);
  const [auditLogs, setAuditLogs] = useState(initialAuditLogs);
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [contactEmail, setContactEmail] = useState("");
  const [draftAccountName, setDraftAccountName] = useState("");
  const [message, setMessage] = useState<string | null>(initialLoadError);
  const [newKeysByAccountId, setNewKeysByAccountId] = useState<Record<string, string>>({});
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const visibleLogs = useMemo(() => auditLogs.slice(0, 200), [auditLogs]);
  const visibleApiRequestLogs = useMemo(
    () => apiRequestLogs.slice(0, 200),
    [apiRequestLogs],
  );

  async function login() {
    setSubmitting(true);
    setMessage(null);

    try {
      const result = await fetchJson<{ authenticated: boolean }>("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });

      if (result.authenticated) {
        setAuthenticated(true);
        window.location.reload();
        return;
      }

      setMessage("ログインできませんでした。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ログインできませんでした。");
    } finally {
      setSubmitting(false);
    }
  }

  async function logout() {
    await fetchJson("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
    setAccounts([]);
    setApiRequestLogs([]);
    setAuditLogs([]);
  }

  async function createDraftAccount() {
    if (!draftAccountName.trim()) {
      setMessage("アカウント名を入力してください。");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const result = await fetchJson<{ account: AdminAccountView; apiKey: string }>(
        "/api/admin/accounts/draft",
        {
          method: "POST",
          body: JSON.stringify({
            accountName: draftAccountName,
            contactEmail,
          }),
        },
      );

      setAccounts((current) => [result.account, ...current]);
      setNewKeysByAccountId((current) => ({
        ...current,
        [result.account.accountId]: result.apiKey,
      }));
      setDraftAccountName("");
      setContactEmail("");
      setMessage("APIキーを発行しました。登録前に必要な場所へ控えてください。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "アカウントを追加できませんでした。");
    } finally {
      setSubmitting(false);
    }
  }

  async function registerAccount(account: AdminAccountView) {
    await sendAccountUpdate(
      `/api/admin/accounts/${account.accountId}/register`,
      "POST",
      account,
      "アカウントを登録しました。",
    );
  }

  async function updateAccount(account: AdminAccountView) {
    await sendAccountUpdate(
      `/api/admin/accounts/${account.accountId}`,
      "PATCH",
      account,
      "アカウントを更新しました。",
    );
  }

  async function rotateKey(account: AdminAccountView) {
    setSubmitting(true);
    setMessage(null);

    try {
      const result = await fetchJson<{ account: AdminAccountView; apiKey: string }>(
        `/api/admin/accounts/${account.accountId}/rotate-key`,
        { method: "POST" },
      );

      replaceAccount(result.account);
      setNewKeysByAccountId((current) => ({
        ...current,
        [result.account.accountId]: result.apiKey,
      }));
      setMessage("APIキーを再発行しました。新しいキーはこの画面で一度だけ確認できます。");
      await refreshAuditLogs();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "APIキーを再発行できませんでした。");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteAccount(account: AdminAccountView) {
    setSubmitting(true);
    setMessage(null);

    try {
      await fetchJson(`/api/admin/accounts/${account.accountId}`, { method: "DELETE" });
      setAccounts((current) =>
        current.filter((item) => item.accountId !== account.accountId),
      );
      setMessage("アカウントを削除しました。");
      await refreshAuditLogs();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "アカウントを削除できませんでした。");
    } finally {
      setSubmitting(false);
    }
  }

  async function sendAccountUpdate(
    url: string,
    method: "PATCH" | "POST",
    account: AdminAccountView,
    successMessage: string,
  ) {
    setSubmitting(true);
    setMessage(null);

    try {
      const result = await fetchJson<{ account: AdminAccountView }>(url, {
        method,
        body: JSON.stringify({
          contactEmail: account.contactEmail ?? "",
          enabled: account.enabled,
          rateLimit: account.rateLimit,
          scopes: account.scopes,
        }),
      });

      replaceAccount(result.account);
      setNewKeysByAccountId((current) => {
        const next = { ...current };
        delete next[account.accountId];
        return next;
      });
      setMessage(successMessage);
      await refreshAuditLogs();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "アカウントを保存できませんでした。");
    } finally {
      setSubmitting(false);
    }
  }

  async function refreshAuditLogs() {
    const result = await fetchJson<{ logs: AuditLogRecord[] }>("/api/admin/audit-logs");
    setAuditLogs(result.logs);
  }

  async function refreshApiRequestLogs() {
    const result = await fetchJson<{ logs: ApiRequestLogRecord[] }>(
      "/api/admin/api-request-logs",
    );
    setApiRequestLogs(result.logs);
  }

  function replaceAccount(account: AdminAccountView) {
    setAccounts((current) =>
      current.map((item) => (item.accountId === account.accountId ? account : item)),
    );
  }

  function patchAccount(accountId: string, patch: Partial<AdminAccountView>) {
    setAccounts((current) =>
      current.map((account) =>
        account.accountId === accountId ? { ...account, ...patch } : account,
      ),
    );
  }

  function toggleScope(account: AdminAccountView, scope: ApiScope, checked: boolean) {
    const nextScopes = checked
      ? [...new Set([...account.scopes, scope])]
      : account.scopes.filter((item) => item !== scope);

    patchAccount(account.accountId, {
      scopes: nextScopes.length ? nextScopes : account.scopes,
    });
  }

  async function copyKey(accountId: string) {
    const key = newKeysByAccountId[accountId];

    if (!key) {
      return;
    }

    await navigator.clipboard.writeText(key);
    setMessage("APIキーをコピーしました。");
  }

  return (
    <div className="min-h-screen bg-[#f6f1e8] text-[var(--color-ink)]">
      <div className="lg:hidden px-5 py-8">
        <div className="border border-[var(--color-line)] bg-white px-5 py-6">
          <p className="text-lg font-semibold">管理画面はPCからアクセスしてください。</p>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            APIキー管理は横幅の広い画面を前提にしています。
          </p>
        </div>
      </div>

      <div className="hidden min-h-screen px-6 py-6 lg:block">
        <header className="mb-5 flex items-center justify-between border-b border-[var(--color-line)] pb-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
              tennis-matchup-app
            </p>
            <h1 className="mt-2 text-2xl font-semibold">API管理</h1>
          </div>
          {authenticated ? (
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex items-center gap-2 border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-semibold"
            >
              <LogOut size={16} />
              ログアウト
            </button>
          ) : null}
        </header>

        {message ? (
          <div className="mb-4 border border-[rgba(240,106,60,0.28)] bg-white px-4 py-3 text-sm">
            {message}
          </div>
        ) : null}

        {authenticated ? (
          <main className="grid gap-6">
            <section className="border border-[var(--color-line)] bg-white">
              <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
                <h2 className="text-lg font-semibold">アカウント</h2>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={draftAccountName}
                    onChange={(event) => setDraftAccountName(event.target.value)}
                    placeholder="アカウント名"
                    className="h-10 w-56 border border-[var(--color-line)] px-3 text-sm"
                  />
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    placeholder="連絡先メール 任意"
                    className="h-10 w-64 border border-[var(--color-line)] px-3 text-sm"
                  />
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void createDraftAccount()}
                    className="inline-flex h-10 items-center gap-2 bg-[var(--color-accent)] px-4 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    <Plus size={16} />
                    追加
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-[#f8f4ee] text-left">
                    <tr>
                      <th className="w-48 border-b border-[var(--color-line)] px-3 py-3">アカウント</th>
                      <th className="w-56 border-b border-[var(--color-line)] px-3 py-3">APIキー</th>
                      <th className="w-56 border-b border-[var(--color-line)] px-3 py-3">scope</th>
                      <th className="w-32 border-b border-[var(--color-line)] px-3 py-3">rate limit</th>
                      <th className="w-24 border-b border-[var(--color-line)] px-3 py-3">有効</th>
                      <th className="w-72 border-b border-[var(--color-line)] px-3 py-3">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account) => (
                      <tr key={account.accountId} className="align-top">
                        <td className="border-b border-[var(--color-line)] px-3 py-3">
                          <p className="font-semibold">{account.accountName}</p>
                          <input
                            type="email"
                            value={account.contactEmail ?? ""}
                            onChange={(event) =>
                              patchAccount(account.accountId, {
                                contactEmail: event.target.value,
                              })
                            }
                            placeholder="連絡先メール"
                            className="mt-2 h-9 w-full border border-[var(--color-line)] px-2"
                          />
                          <p className="mt-2 text-xs text-[var(--color-muted)]">{account.status}</p>
                        </td>
                        <td className="border-b border-[var(--color-line)] px-3 py-3">
                          <div className="flex items-start gap-2">
                            <code className="block max-w-[220px] break-all bg-[#f8f4ee] px-2 py-1 text-xs">
                              {newKeysByAccountId[account.accountId] ?? account.keyPreview}
                            </code>
                            {newKeysByAccountId[account.accountId] ? (
                              <button
                                type="button"
                                onClick={() => void copyKey(account.accountId)}
                                className="border border-[var(--color-line)] bg-white p-2"
                                title="APIキーをコピー"
                              >
                                <Copy size={14} />
                              </button>
                            ) : null}
                          </div>
                          {newKeysByAccountId[account.accountId] ? (
                            <p className="mt-2 text-xs leading-5 text-[#8f3822]">
                              このキーは登録後に再表示できません。
                            </p>
                          ) : null}
                        </td>
                        <td className="border-b border-[var(--color-line)] px-3 py-3">
                          <div className="grid gap-2">
                            {API_SCOPES.map((scope) => (
                              <label key={scope} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={account.scopes.includes(scope)}
                                  onChange={(event) => toggleScope(account, scope, event.target.checked)}
                                />
                                {scopeLabels[scope]}
                              </label>
                            ))}
                          </div>
                        </td>
                        <td className="border-b border-[var(--color-line)] px-3 py-3">
                          <input
                            type="number"
                            min={1}
                            max={1000}
                            value={account.rateLimit.requests}
                            onChange={(event) =>
                              patchAccount(account.accountId, {
                                rateLimit: {
                                  requests: Number(event.target.value),
                                  windowSeconds: 60,
                                },
                              })
                            }
                            className="h-9 w-20 border border-[var(--color-line)] px-2"
                          />
                          <span className="ml-1 text-xs text-[var(--color-muted)]">/ 分</span>
                        </td>
                        <td className="border-b border-[var(--color-line)] px-3 py-3">
                          <input
                            type="checkbox"
                            checked={account.enabled}
                            onChange={(event) =>
                              patchAccount(account.accountId, {
                                enabled: event.target.checked,
                              })
                            }
                          />
                        </td>
                        <td className="border-b border-[var(--color-line)] px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            {account.status === "draft" ? (
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() => void registerAccount(account)}
                                className="inline-flex items-center gap-1 bg-[var(--color-accent)] px-3 py-2 font-semibold text-white disabled:opacity-60"
                              >
                                <KeyRound size={14} />
                                登録
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() => void updateAccount(account)}
                                className="inline-flex items-center gap-1 border border-[var(--color-line)] bg-white px-3 py-2 font-semibold disabled:opacity-60"
                              >
                                <Save size={14} />
                                更新
                              </button>
                            )}
                            {account.status !== "draft" ? (
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() => void rotateKey(account)}
                                className="inline-flex items-center gap-1 border border-[var(--color-line)] bg-white px-3 py-2 font-semibold disabled:opacity-60"
                              >
                                <RefreshCw size={14} />
                                再発行
                              </button>
                            ) : null}
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => void deleteAccount(account)}
                              className="inline-flex items-center gap-1 border border-[#efc4b7] bg-[#fff1ed] px-3 py-2 font-semibold text-[#8f3822] disabled:opacity-60"
                            >
                              <Trash2 size={14} />
                              削除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!accounts.length ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-muted)]">
                          アカウントはまだありません。
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="border border-[var(--color-line)] bg-white">
              <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
                <h2 className="text-lg font-semibold">API利用ログ</h2>
                <button
                  type="button"
                  onClick={() => void refreshApiRequestLogs()}
                  className="inline-flex items-center gap-2 border border-[var(--color-line)] bg-white px-3 py-2 text-sm font-semibold"
                >
                  <RefreshCw size={14} />
                  更新
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#f8f4ee]">
                    <tr>
                      <th className="border-b border-[var(--color-line)] px-3 py-3">日時</th>
                      <th className="border-b border-[var(--color-line)] px-3 py-3">API</th>
                      <th className="border-b border-[var(--color-line)] px-3 py-3">status</th>
                      <th className="border-b border-[var(--color-line)] px-3 py-3">条件</th>
                      <th className="border-b border-[var(--color-line)] px-3 py-3">seed</th>
                      <th className="border-b border-[var(--color-line)] px-3 py-3">duration</th>
                      <th className="border-b border-[var(--color-line)] px-3 py-3">requestId</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleApiRequestLogs.map((log) => (
                      <tr key={log.requestId}>
                        <td className="border-b border-[var(--color-line)] px-3 py-3">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString("ja-JP") : "-"}
                        </td>
                        <td className="border-b border-[var(--color-line)] px-3 py-3">
                          <p className="font-semibold">{log.method}</p>
                          <p className="text-xs text-[var(--color-muted)]">{log.endpoint}</p>
                        </td>
                        <td className="border-b border-[var(--color-line)] px-3 py-3">
                          {log.status}
                        </td>
                        <td className="border-b border-[var(--color-line)] px-3 py-3">
                          {log.participantCount ?? "-"}人 / {log.courtCount ?? "-"}面 /{" "}
                          {log.roundCount ?? "-"}回
                        </td>
                        <td className="border-b border-[var(--color-line)] px-3 py-3">
                          {log.seed ?? "-"}
                        </td>
                        <td className="border-b border-[var(--color-line)] px-3 py-3">
                          {typeof log.durationMs === "number" ? `${log.durationMs}ms` : "-"}
                        </td>
                        <td className="border-b border-[var(--color-line)] px-3 py-3">
                          <code className="text-xs">{log.requestId}</code>
                        </td>
                      </tr>
                    ))}
                    {!visibleApiRequestLogs.length ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-muted)]">
                          API利用ログはまだありません。
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="border border-[var(--color-line)] bg-white">
              <div className="border-b border-[var(--color-line)] px-4 py-3">
                <h2 className="text-lg font-semibold">監査ログ</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#f8f4ee]">
                    <tr>
                      <th className="border-b border-[var(--color-line)] px-3 py-3">日時</th>
                      <th className="border-b border-[var(--color-line)] px-3 py-3">操作</th>
                      <th className="border-b border-[var(--color-line)] px-3 py-3">対象</th>
                      <th className="border-b border-[var(--color-line)] px-3 py-3">結果</th>
                      <th className="border-b border-[var(--color-line)] px-3 py-3">requestId</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleLogs.map((log) => (
                      <tr key={log.logId}>
                        <td className="border-b border-[var(--color-line)] px-3 py-3">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString("ja-JP") : "-"}
                        </td>
                        <td className="border-b border-[var(--color-line)] px-3 py-3">{log.type}</td>
                        <td className="border-b border-[var(--color-line)] px-3 py-3">
                          {log.accountName ?? log.accountId ?? "-"}
                        </td>
                        <td className="border-b border-[var(--color-line)] px-3 py-3">{log.result}</td>
                        <td className="border-b border-[var(--color-line)] px-3 py-3">
                          <code className="text-xs">{log.requestId}</code>
                        </td>
                      </tr>
                    ))}
                    {!visibleLogs.length ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-muted)]">
                          監査ログはまだありません。
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </main>
        ) : (
          <section className="mx-auto mt-20 max-w-md border border-[var(--color-line)] bg-white px-6 py-6">
            <h2 className="text-xl font-semibold">管理者ログイン</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
              APIキー管理に進むには管理者パスワードを入力してください。
            </p>
            <form
              className="mt-5 grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void login();
              }}
            >
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 border border-[var(--color-line)] px-3"
                autoComplete="current-password"
              />
              <button
                type="submit"
                disabled={submitting}
                className="h-11 bg-[var(--color-accent)] font-semibold text-white disabled:opacity-60"
              >
                ログイン
              </button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}

async function fetchJson<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? "リクエストに失敗しました。");
  }

  return payload.data as T;
}
