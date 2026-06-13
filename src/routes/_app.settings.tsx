import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { apiClient, getBaseUrl, setBaseUrl } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setUrl(getBaseUrl()); }, []);

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" description="Account and API configuration." />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Signed in as {user?.username} ({user?.email})</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API base URL</CardTitle>
          <CardDescription>
            Where your FastAPI backend is running. Defaults to <code>http://127.0.0.1:8000</code>.
            Note: browsers can only reach <code>127.0.0.1</code> when this frontend is opened on the same machine.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label>Base URL</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://127.0.0.1:8000" />
          <Button onClick={() => {
            setBaseUrl(url);
            toast.success("Saved. Reload the page if requests still fail.");
          }}>Save</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await apiClient.changePassword(oldPwd, newPwd);
                toast.success("Password changed");
                setOldPwd(""); setNewPwd("");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed");
              } finally { setBusy(false); }
            }}
          >
            <div className="space-y-2">
              <Label>Current password</Label>
              <Input type="password" required value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>New password</Label>
              <Input type="password" required value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy}>{busy ? "Updating…" : "Update password"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}