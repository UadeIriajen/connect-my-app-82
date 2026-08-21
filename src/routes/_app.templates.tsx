import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, type TemplateCreate, type TemplateResponse } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/templates")({
  component: TemplatesPage,
});

function TemplatesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateResponse | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: apiClient.listTemplates,
  });

  const del = useMutation({
    mutationFn: (id: number) => apiClient.deleteTemplate(id),
    onSuccess: () => {
      toast.success("Template deleted");
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const visible = (data ?? []).filter((t) => !t.is_deleted);

  return (
    <div>
      <PageHeader
        title="Message Templates"
        description="Reusable templates with variables like {'{first_name}'}."
        actions={
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> New template
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No templates yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((t) => (
            <Card key={t.id} className="flex flex-col">
              <CardContent className="pt-6 flex-1">
                <p className="font-medium">{t.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{t.subject}</p>
                <p className="text-xs text-muted-foreground mt-3 line-clamp-4 whitespace-pre-wrap">
                  {t.body}
                </p>
              </CardContent>
              <div className="flex justify-end gap-1 border-t p-2">
                <Button size="icon" variant="ghost" onClick={() => { setEditing(t); setOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => del.mutate(t.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <TemplateDialog open={open} setOpen={setOpen} editing={editing} />
    </div>
  );
}

function TemplateDialog({
  open, setOpen, editing,
}: { open: boolean; setOpen: (o: boolean) => void; editing: TemplateResponse | null }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<TemplateCreate>({ title: "", subject: "", body: "" });

  useEffect(() => {
    if (!open) return;
    setForm(
      editing
        ? { title: editing.title, subject: editing.subject, body: editing.body }
        : { title: "", subject: "", body: "" },
    );
  }, [open, editing]);

  const save = useMutation({
    mutationFn: (data: TemplateCreate) =>
      editing ? apiClient.updateTemplate(editing.id, data) : apiClient.createTemplate(data),
    onSuccess: () => {
      toast.success(editing ? "Template updated" : "Template created");
      qc.invalidateQueries({ queryKey: ["templates"] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit template" : "New template"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => { e.preventDefault(); save.mutate(form); }}
        >
          <div className="space-y-2">
            <Label>Title</Label>
            <Input required value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input required value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Body</Label>
            <Textarea required rows={6} value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
