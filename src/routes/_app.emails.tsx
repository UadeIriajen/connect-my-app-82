import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, type ScheduleCreate, type ScheduleResponse } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/emails")({
  component: EmailsPage,
});

function toLocalInputValue(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EmailsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["emails"], queryFn: apiClient.listEmails });
  const [editing, setEditing] = useState<ScheduleResponse | null>(null);
  const [open, setOpen] = useState(false);

  const del = useMutation({
    mutationFn: (id: number) => apiClient.deleteEmail(id),
    onSuccess: () => {
      toast.success("Email deleted");
      qc.invalidateQueries({ queryKey: ["emails"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div>
      <PageHeader
        title="Scheduled Emails"
        description="Schedule one-off or recurring email sends."
        actions={
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Schedule email
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : !data || data.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No scheduled emails yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium max-w-[260px] truncate">{e.subject}</TableCell>
                    <TableCell className="text-muted-foreground">{e.recipient_email}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {new Date(e.scheduled_time).toLocaleString()}
                      {e.recurring ? <Badge variant="secondary" className="ml-2">Recurring</Badge> : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={e.status === "Pending" ? "outline" : "secondary"}>{e.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(e); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => del.mutate(e.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EmailDialog open={open} setOpen={setOpen} editing={editing} />
    </div>
  );
}

function EmailDialog({
  open, setOpen, editing,
}: { open: boolean; setOpen: (o: boolean) => void; editing: ScheduleResponse | null }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ScheduleCreate>({
    recipient_email: "",
    subject: "",
    body: "",
    scheduled_time: new Date().toISOString(),
    status: "Pending",
    recurring: false,
    interval: null,
    timezone: "UTC",
  });

  useEffect(() => {
    if (open && editing) {
      setForm({
        recipient_email: editing.recipient_email,
        subject: editing.subject,
        body: editing.body,
        scheduled_time: editing.scheduled_time,
        status: editing.status,
        recurring: editing.recurring ?? false,
        interval: editing.interval ?? null,
        timezone: editing.timezone ?? "UTC",
      });
    }
    if (open && !editing) {
      setForm({
        recipient_email: "", subject: "", body: "",
        scheduled_time: new Date().toISOString(),
        status: "Pending", recurring: false, interval: null, timezone: "UTC",
      });
    }
  }, [open, editing]);

  const reset = () => setForm({
    recipient_email: "", subject: "", body: "",
    scheduled_time: new Date().toISOString(),
    status: "Pending", recurring: false, interval: null, timezone: "UTC",
  });

  const save = useMutation({
    mutationFn: (data: ScheduleCreate) =>
      editing ? apiClient.updateEmail(editing.id, data) : apiClient.createEmail(data),
    onSuccess: () => {
      toast.success(editing ? "Email updated" : "Email scheduled");
      qc.invalidateQueries({ queryKey: ["emails"] });
      setOpen(false);
      reset();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit scheduled email" : "Schedule a new email"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate({
              ...form,
              scheduled_time: new Date(form.scheduled_time).toISOString(),
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Recipient email</Label>
            <Input type="email" required value={form.recipient_email}
              onChange={(e) => setForm({ ...form, recipient_email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input required value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Body</Label>
            <Textarea required rows={5} value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Scheduled time</Label>
              <Input type="datetime-local" required
                value={toLocalInputValue(form.scheduled_time)}
                onChange={(e) => setForm({ ...form, scheduled_time: new Date(e.target.value).toISOString() })} />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input value={form.timezone ?? ""}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>Recurring</Label>
              <p className="text-xs text-muted-foreground">Repeat at a fixed interval (seconds).</p>
            </div>
            <Switch checked={form.recurring ?? false}
              onCheckedChange={(c) => setForm({ ...form, recurring: c })} />
          </div>
          {form.recurring ? (
            <div className="space-y-2">
              <Label>Interval (seconds)</Label>
              <Input type="number" min={1} value={form.interval ?? ""}
                onChange={(e) => setForm({ ...form, interval: e.target.value ? Number(e.target.value) : null })} />
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : editing ? "Update" : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}