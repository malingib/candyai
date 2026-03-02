import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

const SettingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [businessName, setBusinessName] = useState("");
  const [smtp, setSmtp] = useState({ host: "", port: 587, username: "", password: "", encryption: "tls", from_email: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("business_name").eq("user_id", user.id).single().then(({ data }) => {
      if (data) setBusinessName(data.business_name);
    });
    supabase.from("smtp_settings").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (data) setSmtp({ host: data.host, port: data.port, username: data.username, password: data.password, encryption: data.encryption, from_email: data.from_email });
    });
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ business_name: businessName }).eq("user_id", user.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Profile updated!" });
    setSaving(false);
  };

  const handleSaveSmtp = async () => {
    if (!user) return;
    setSaving(true);
    const { data: existing } = await supabase.from("smtp_settings").select("id").eq("user_id", user.id).single();
    let error;
    if (existing) {
      ({ error } = await supabase.from("smtp_settings").update(smtp).eq("user_id", user.id));
    } else {
      ({ error } = await supabase.from("smtp_settings").insert({ user_id: user.id, ...smtp }));
    }
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "SMTP settings saved!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business Profile</CardTitle>
          <CardDescription>Your business name shown in the chat widget</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Business Name</Label>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="My Business" />
          </div>
          <Button onClick={handleSaveProfile} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
            <Save className="h-4 w-4" /> Save
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">SMTP Email Settings</CardTitle>
          <CardDescription>Configure email notifications when leads are captured</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>SMTP Host</Label>
              <Input value={smtp.host} onChange={(e) => setSmtp({ ...smtp, host: e.target.value })} placeholder="smtp.gmail.com" />
            </div>
            <div className="space-y-2">
              <Label>Port</Label>
              <Input type="number" value={smtp.port} onChange={(e) => setSmtp({ ...smtp, port: parseInt(e.target.value) || 587 })} />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={smtp.username} onChange={(e) => setSmtp({ ...smtp, username: e.target.value })} placeholder="you@gmail.com" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={smtp.password} onChange={(e) => setSmtp({ ...smtp, password: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>From Email</Label>
              <Input value={smtp.from_email} onChange={(e) => setSmtp({ ...smtp, from_email: e.target.value })} placeholder="noreply@mybusiness.com" />
            </div>
            <div className="space-y-2">
              <Label>Encryption</Label>
              <Select value={smtp.encryption} onValueChange={(v) => setSmtp({ ...smtp, encryption: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tls">TLS</SelectItem>
                  <SelectItem value="ssl">SSL</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSaveSmtp} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
            <Save className="h-4 w-4" /> Save SMTP Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
