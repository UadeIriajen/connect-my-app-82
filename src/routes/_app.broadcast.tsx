import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { apiClient, type BroadcastModel } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";

export const Route = createFileRoute("/_app/broadcast")({
  component: BroadcastPage,
});

function BroadcastPage() {
  const [form, setForm] = useState<BroadcastModel>({
    subject: "", body: "", target_type: "all",
    list_id: null, is_draft: false, recurring: false,
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiClient.sendBroadcast(form);
      toast.success(form.is_draft ? "Draft saved" : "Broadcast sent");
      setForm({ subject: "", body: "", target_type: "all", list_id: null, is_draft: false, recurring: false });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Broadcast"
        description="Send a one-time message to all contacts or a specific list."
      />
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input required value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea required rows={8} value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Target</Label>
                <Select
                  value={form.target_type}
                  onValueChange={(v: "all" | "list") => setForm({ ...form, target_type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All contacts</SelectItem>
                    <SelectItem value="list">Specific list</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.target_type === "list" ? (
                <div className="space-y-2">
                  <Label>List ID</Label>
                  <Input type="number" value={form.list_id ?? ""}
                    onChange={(e) => setForm({ ...form, list_id: e.target.value ? Number(e.target.value) : null })} />
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label>Save as draft</Label>
                <p className="text-xs text-muted-foreground">Don't send yet.</p>
              </div>
              <Switch checked={form.is_draft ?? false}
                onCheckedChange={(c) => setForm({ ...form, is_draft: c })} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label>Recurring</Label>
                <p className="text-xs text-muted-foreground">Repeatable broadcast.</p>
              </div>
              <Switch checked={form.recurring ?? false}
                onCheckedChange={(c) => setForm({ ...form, recurring: c })} />
            </div>

            <Button type="submit" className="w-full" disabled={busy}>
              <Megaphone className="h-4 w-4 mr-2" />
              {busy ? "Sending…" : form.is_draft ? "Save draft" : "Send broadcast"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}