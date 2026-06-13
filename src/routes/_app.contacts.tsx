import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, type ContactResponse, type ContactUpdate } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Pencil, Search, Upload, Download } from "lucide-react";
import { toast } from "sonner";
import { getBaseUrl, getToken } from "@/lib/api";

export const Route = createFileRoute("/_app/contacts")({
  component: ContactsPage,
});

function ContactsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["contacts"], queryFn: apiClient.listContacts });
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ContactResponse | null>(null);
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase().trim();
    if (!q) return data;
    return data.filter((c) =>
      [c.email, c.first_name, c.last_name, c.company].filter(Boolean).some((v) =>
        String(v).toLowerCase().includes(q),
      ),
    );
  }, [data, search]);

  const importMut = useMutation({
    mutationFn: (f: File) => apiClient.importContacts(f),
    onSuccess: () => {
      toast.success("Contacts imported");
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Import failed"),
  });

  const downloadTemplate = async () => {
    try {
      const url = `${getBaseUrl()}/contacts/import/template`;
      const token = getToken();
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error("Failed to download template");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "contacts-template.csv";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div>
      <PageHeader
        title="Contacts"
        description="Manage the people you send emails to."
        actions={
          <>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" /> Template
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Import CSV
            </Button>
            <input
              type="file"
              accept=".csv"
              hidden
              ref={fileRef}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importMut.mutate(f);
                e.target.value = "";
              }}
            />
            <Button onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add contact
            </Button>
          </>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search contacts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No contacts found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.email}</TableCell>
                    <TableCell className="text-muted-foreground">{c.company || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ContactDialog open={open} setOpen={setOpen} editing={editing} />
    </div>
  );
}

function ContactDialog({
  open, setOpen, editing,
}: { open: boolean; setOpen: (o: boolean) => void; editing: ContactResponse | null }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<{
    id: string; email: string; first_name: string; last_name: string; company: string;
  }>({ id: "", email: "", first_name: "", last_name: "", company: "" });

  useEffect(() => {
    if (open && editing) {
      setForm({
        id: String(editing.id),
        email: editing.email,
        first_name: editing.first_name ?? "",
        last_name: editing.last_name ?? "",
        company: editing.company ?? "",
      });
    } else if (open) {
      setForm({ id: "", email: "", first_name: "", last_name: "", company: "" });
    }
  }, [open, editing]);

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        const update: ContactUpdate = {
          email: form.email || null,
          first_name: form.first_name || null,
          last_name: form.last_name || null,
          company: form.company || null,
        };
        return apiClient.updateContact(editing.id, update);
      }
      return apiClient.createContact({
        id: Number(form.id),
        email: form.email,
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        company: form.company || null,
      });
    },
    onSuccess: () => {
      toast.success(editing ? "Contact updated" : "Contact added");
      qc.invalidateQueries({ queryKey: ["contacts"] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit contact" : "Add contact"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
          {!editing ? (
            <div className="space-y-2">
              <Label>ID</Label>
              <Input required type="number" value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })} />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>Email</Label>
            <Input required type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>First name</Label>
              <Input value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Last name</Label>
              <Input value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Company</Label>
            <Input value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : editing ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}