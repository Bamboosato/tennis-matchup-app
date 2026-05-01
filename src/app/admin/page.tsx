import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/server/admin-session";
import { listAccountViews } from "@/features/admin/application/accounts";
import { listApiRequestLogs } from "@/features/admin/application/apiRequestLog";
import { listAuditLogs } from "@/features/admin/application/auditLog";
import type {
  AdminAccountView,
  ApiRequestLogRecord,
  AuditLogRecord,
} from "@/features/admin/model/types";
import { AdminDashboard } from "./AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const authenticated = verifyAdminSessionCookie(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  let loadError: string | null = null;
  let accounts: AdminAccountView[] = [];
  let apiRequestLogs: ApiRequestLogRecord[] = [];
  let auditLogs: AuditLogRecord[] = [];

  if (authenticated) {
    try {
      [accounts, auditLogs, apiRequestLogs] = await Promise.all([
        listAccountViews(),
        listAuditLogs(),
        listApiRequestLogs(),
      ]);
    } catch {
      loadError = "管理データを取得できませんでした。Firebase/Vercel設定を確認してください。";
    }
  }

  return (
    <AdminDashboard
      initialAccounts={accounts}
      initialApiRequestLogs={apiRequestLogs}
      initialAuditLogs={auditLogs}
      initialAuthenticated={authenticated}
      initialLoadError={loadError}
    />
  );
}
