import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useState as _u } from "@tanstack/react-query";
import { useState, useEffect } from "react";
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

// Templates are created/updated/deleted; the API doesn't expose a list endpoint,
// so we keep a local cache of templates created in this browser session.
const LS_KEY = "templates_cache";

function loadCache(): TemplateResponse[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}
function saveCache(items: TemplateResponse[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

function TemplatesPage() {
  const [items, setItems] = useState<TemplateResponse[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateResponse | null>(null);

  useEffect(() => { setItems(loadCache()); }, []);

  const upsert = (t: TemplateResponse) => {
    const next = items.some((i) => i.id === t.id)
      ? items.map((i) => (i.id === t.id ? t : i))
      : [t, ...items];
    setItems(next);
    saveCache(next);
  };
  const remove = (id: number) => {
    const next = items.filter((i) => i.id !== id);
    setItems(next);
    saveCache(next);
  };

  const visible = items.filter((i) => !i.is_deleted);

  return (
    <div>
      <PageHeader
        title="Message Templates"
        description="Reusable templates with variables like {first_name}."
        actions={
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> New template
          </Button>
        }
      />

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="mt-3 font-medium">No templates yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first reusable message template.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((t) => (
            <Card key={t.id}>
              <CardContent className="pt-6 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.subject}</p>
                  </div>
                  <div className="flex">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(t); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={async () => {
                      try {
                        await apiClient.deleteTemplate(t.id);
                        remove(t.id);
                        toast.success("Deleted");
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Failed");
                      }
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">{t.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TemplateDialog
        open={open}
        setOpen={setOpen}
        editing={editing}
        onSaved={(t) => upsert(t)}
      />
    </div>
  );
}

function TemplateDialog({
  open, setOpen, editing, onSaved,
}: {
  open: boolean; setOpen: (o: boolean) => void;
  editing: TemplateResponse | null;
  onSaved: (t: TemplateResponse) => void;
}) {
  const [form, setForm] = useState<TemplateCreate>({ title: "", subject: "", body: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && editing) setForm({ title: editing.title, subject: editing.subject, body: editing.body });
    else if (open) setForm({ title: "", subject: "", body: "" });
  }, [open, editing]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = editing
        ? await apiClient.updateTemplate(editing.id, form)
        : await apiClient.createTemplate(form);
      onSaved(res);
      toast.success(editing ? "Template updated" : "Template created");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit template" : "New template"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input required value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Welcome Onboarding" />
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input required value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Welcome, {first_name}!" />
          </div>
          <div className="space-y-2">
            <Label>Body</Label>
            <Textarea required rows={8} value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Hi {first_name}, …" />
            <p className="text-xs text-muted-foreground">Use tags like {"{first_name}"} or {"{email}"}.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}