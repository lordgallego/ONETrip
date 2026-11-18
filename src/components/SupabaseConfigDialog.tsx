import { useState } from "react";
import { Database, ExternalLink, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  setSupabaseConfig, clearSupabaseConfig,
  isSupabaseConfigured, supabaseConfigSource, currentSupabaseUrl,
} from "@/lib/supabase";

interface Props {
  trigger?: React.ReactNode;
}

const SupabaseConfigDialog = ({ trigger }: Props) => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [saving, setSaving] = useState(false);

  const onSave = () => {
    const trimmedUrl = url.trim();
    const trimmedKey = anonKey.trim();

    if (!trimmedUrl || !trimmedKey) {
      toast.error("Both URL and anon key are required");
      return;
    }
    try {
      const u = new URL(trimmedUrl);
      if (!u.hostname.endsWith("supabase.co") && !u.hostname.endsWith("supabase.in") && u.hostname !== "localhost") {
        toast.error("URL doesn't look like a Supabase project URL");
        return;
      }
    } catch {
      toast.error("Invalid URL");
      return;
    }
    if (trimmedKey.startsWith("sb_secret_") || trimmedKey.startsWith("service_role")) {
      toast.error("Use the publishable / anon key — never the service-role key");
      return;
    }
    if (!trimmedKey.startsWith("eyJ") && !trimmedKey.startsWith("sb_publishable_")) {
      toast.error("Key should start with 'eyJ' (legacy anon JWT) or 'sb_publishable_' (new publishable key)");
      return;
    }

    setSaving(true);
    toast.success("Connecting to your Supabase project — reloading…");
    setTimeout(() => setSupabaseConfig(trimmedUrl, trimmedKey), 400);
  };

  const onClear = () => {
    if (!confirm("Clear stored Supabase config? You'll be signed out.")) return;
    clearSupabaseConfig();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2">
            <Database className="h-3.5 w-3.5" /> Configure Database
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Database className="h-5 w-5 text-[#1D5944] dark:text-[#A9CDBE]" /> Connect Your Supabase Project
          </DialogTitle>
          <DialogDescription>
            Enter the URL and anon (public) key from your Supabase project. These are stored in your browser only.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium">Current connection</span>
              <Badge
                variant="outline"
                className={
                  isSupabaseConfigured
                    ? "border-[#A9CDBE] bg-[#A9CDBE]/25 text-[#1A4D3B] dark:text-[#A9CDBE]"
                    : ""
                }
              >
                {isSupabaseConfigured ? "Connected" : "Not configured"}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Source:</span>
              <code className="text-[11px]">{supabaseConfigSource}</code>
            </div>
            {isSupabaseConfigured && (
              <div className="text-muted-foreground truncate">
                URL: <code className="text-[11px]">{currentSupabaseUrl}</code>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sb-url">Supabase URL</Label>
            <Input
              id="sb-url"
              placeholder="https://xxxxxxxxxxxxxx.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sb-key">Publishable / Anon key</Label>
            <Input
              id="sb-key"
              placeholder="sb_publishable_… or eyJhbGciOi…"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              type="password"
            />
            <p className="text-[11px] text-muted-foreground">
              Either the new <code>sb_publishable_</code> key or the legacy <code>eyJ…</code> anon JWT — never the service-role / secret key. Find both in
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="ml-1 underline inline-flex items-center gap-0.5"
              >
                Supabase Dashboard <ExternalLink className="h-3 w-3" />
              </a>
              {" "}→ Project Settings → API.
            </p>
          </div>

          <div className="rounded-lg border border-[#F2B53A]/55 bg-[#F2B53A]/15 dark:bg-[#F2B53A]/10 p-3 text-[11px] text-[#7A4F00] dark:text-[#F2B53A]">
            <p className="font-semibold mb-0.5">Don't forget to set up the schema:</p>
            <p className="opacity-90">
              In Supabase → SQL Editor, run <code>supabase/schema.sql</code> (and optionally <code>seed.sql</code>) from this repo, then enable Google in Authentication → Providers.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2">
          <Button
            variant="ghost"
            onClick={onClear}
            disabled={saving || !isSupabaseConfigured}
            className="text-destructive"
          >
            Clear stored config
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={onSave} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : "Save & Reload"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SupabaseConfigDialog;
