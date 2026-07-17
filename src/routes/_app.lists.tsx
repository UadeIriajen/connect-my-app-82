import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  apiClient,
  type ContactListResponse,
  type ContactResponse,
} from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Users, Check, X, Search } from "lucide-react";

export const Route = createFileRoute("/_app/lists")({
  component: ListsPage,
});

function ListsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<ContactListResponse | null>(null);
  const [open, setOpen] = useState(false);

  const { data: lists, isLoading } = useQuery({
    queryKey: ["lists"],
    queryFn: apiClient.listLists,
  });

  const { data: contacts } = useQuery({
    queryKey: ["contacts"],
    queryFn: apiClient.listContacts,
  });

  const { data: members } = useQuery({
    queryKey: ["lists", selectedId, "members"],
    queryFn: () => apiClient.listMembers(selectedId!),
    enabled: selectedId !== null,
  });

  const filtered = useMemo(() => {
    if (!lists) return [];
    const q = search.toLowerCase().trim();
    if (!q) return lists;
    return lists.filter((l) =>
      [l.name, l.description].filter(Boolean).some((v) =>
        String(v).toLowerCase().includes(q),
      ),
    );
  }, [lists, search]);

  const selected = useMemo(
    () => lists?.find((l) => l.id === selectedId) || null,
    [lists, selectedId],
  );

  const memberContactIds = useMemo(
    () => new Set((members ?? []).map((m) => m.contact_id)),
    [members],
  );

  const availableContacts = useMemo(
    () => (contacts ?? []).filter((c) => !memberContactIds.has(c.id)),
    [contacts, memberContactIds],
  );

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiClient.deleteList(id),
    onSuccess: () => {
      toast.success("List deleted");
      qc.invalidateQueries({ queryKey: ["lists"] });
      if (selectedId) setSelectedId(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div>
      <PageHeader
        title="Lists"
        description="Group contacts into segments for targeted broadcasts."
        actions={
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> New list
          </Button>
        }
      />

      <Tabs value={selectedId ? "members" : "lists"} className="space-y-4">
        <TabsList>
          <TabsTrigger value="lists" onClick={() => setSelectedId(null)}>
            Lists
          </TabsTrigger>
          <TabsTrigger value="members" disabled={!selected}>
            Members
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lists" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search lists…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <p className="p-6 text-sm text-muted-foreground">Loading…</p>
              ) : filtered.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">No lists yet. Create one to get started.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead className="text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((l) => (
                      <TableRow
                        key={l.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedId(l.id)}
                      >
                        <TableCell className="font-medium">{l.name}</TableCell>
                        <TableCell className="text-muted-foreground">{l.description || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            <Users className="h-3 w-3 mr-1" />
                            {l.member_count ?? 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); setEditing(l); setOpen(true); }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={(e) => { e.stopPropagation(); deleteMut.mutate(l.id); }}
                            disabled={deleteMut.isPending}
                          >
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
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          {selected ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selected.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selected.description || "No description"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <AddContactPopover
                    listId={selected.id}
                    contacts={availableContacts}
                  />
                  <Button variant="outline" onClick={() => setSelectedId(null)}>
                    Back to lists
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  {!members ? (
                    <p className="p-6 text-sm text-muted-foreground">Loading members…</p>
                  ) : members.length === 0 ? (
                    <p className="p-6 text-sm text-muted-foreground">No contacts in this list yet.</p>
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
                        {members.map((m) => (
                          <TableRow key={m.contact_id}>
                            <TableCell className="font-medium">
                              {[m.contact.first_name, m.contact.last_name].filter(Boolean).join(" ") || "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{m.contact.email}</TableCell>
                            <TableCell className="text-muted-foreground">{m.contact.company || "—"}</TableCell>
                            <TableCell className="text-right">
                              <RemoveButton listId={selected.id} contactId={m.contact_id} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a list to manage its members.</p>
          )}
        </TabsContent>
      </Tabs>

      <ListDialog open={open} setOpen={setOpen} editing={editing} />
    </div>
  );
}

function ListDialog({
  open, setOpen, editing,
}: { open: boolean; setOpen: (o: boolean) => void; editing: ContactListResponse | null }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        return apiClient.updateList(editing.id, { name, description: description || null });
      }
      return apiClient.createList({ name, description: description || null });
    },
    onSuccess: () => {
      toast.success(editing ? "List updated" : "List created");
      qc.invalidateQueries({ queryKey: ["lists"] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  useState(() => {
    if (open && editing) {
      setName(editing.name);
      setDescription(editing.description ?? "");
    } else if (open) {
      setName("");
      setDescription("");
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit list" : "Create list"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              required
              value={name}
              placeholder="e.g. Newsletter subscribers"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              placeholder="Optional note about this segment"
              onChange={(e) => setDescription(e.target.value)}
            />
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

function AddContactPopover({
  listId, contacts,
}: { listId: number; contacts: ContactResponse[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const add = useMutation({
    mutationFn: (contactId: number) => apiClient.addContactToList(listId, contactId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lists", listId, "members"] });
      qc.invalidateQueries({ queryKey: ["lists"] });
      toast.success("Contact added");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return contacts.slice(0, 50);
    return contacts.filter((c) =>
      [c.email, c.first_name, c.last_name, c.company].filter(Boolean).some((v) =>
        String(v).toLowerCase().includes(q),
      ),
    ).slice(0, 50);
  }, [contacts, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" /> Add contact
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <Command>
          <CommandInput
            placeholder="Search contacts…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No contacts found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((c) => (
                <CommandItem
                  key={c.id}
                  onSelect={() => { add.mutate(c.id); setOpen(false); }}
                  className="flex justify-between"
                >
                  <span className="truncate">
                    {[c.first_name, c.last_name].filter(Boolean).join(" ") || c.email}
                  </span>
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function RemoveButton({ listId, contactId }: { listId: number; contactId: number }) {
  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: () => apiClient.removeContactFromList(listId, contactId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lists", listId, "members"] });
      qc.invalidateQueries({ queryKey: ["lists"] });
      toast.success("Contact removed");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove.mutate()}>
      {remove.isPending ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
    </Button>
  );
}
