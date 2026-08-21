import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { apiClient, type CampaignStep } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Workflow } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/campaigns")({
  component: CampaignsPage,
});

const emptyStep = (step: number): CampaignStep => ({
  step,
  subject: "",
  body: "",
  wait_days: step === 1 ? 0 : 3,
  condition: null,
});

function CampaignsPage() {
  const [campaignId, setCampaignId] = useState("1");
  const [recipient, setRecipient] = useState("");
  const [steps, setSteps] = useState<CampaignStep[]>([emptyStep(1)]);

  const create = useMutation({
    mutationFn: () =>
      apiClient.createSequence({
        campaign_id: Number(campaignId),
        recipient_email: recipient,
        steps: steps.map((s, i) => ({ ...s, step: i + 1 })),
      }),
    onSuccess: (res) =>
      toast.success(`Sequence created — ${res.steps_created} step(s) scheduled`),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const update = (i: number, patch: Partial<CampaignStep>) =>
    setSteps(steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Drip Campaigns"
        description="Build a multi-step sequence that sends automatically over time."
        actions={
          <Button
            onClick={() => setSteps([...steps, emptyStep(steps.length + 1)])}
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" /> Add step
          </Button>
        }
      />

      <form
        className="space-y-6"
        onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Workflow className="h-4 w-4" /> Sequence details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Campaign ID</Label>
              <Input type="number" min={1} required value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Recipient email</Label>
              <Input type="email" required value={recipient}
                onChange={(e) => setRecipient(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {steps.map((s, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Step {i + 1}</CardTitle>
              {steps.length > 1 ? (
                <Button type="button" size="icon" variant="ghost"
                  onClick={() => setSteps(steps.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input required value={s.subject}
                    onChange={(e) => update(i, { subject: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Wait days before sending</Label>
                  <Input type="number" min={0} value={s.wait_days ?? 0}
                    onChange={(e) => update(i, { wait_days: Number(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea required rows={4} value={s.body}
                  onChange={(e) => update(i, { body: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Condition (optional)</Label>
                <Input placeholder="e.g. if_not_opened" value={s.condition ?? ""}
                  onChange={(e) => update(i, { condition: e.target.value || null })} />
              </div>
            </CardContent>
          </Card>
        ))}

        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create sequence"}
        </Button>
      </form>
    </div>
  );
}
