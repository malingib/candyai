import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, Upload, Loader2 } from "lucide-react";
import WidgetPreview from "@/components/dashboard/WidgetPreview";

const SettingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [businessName, setBusinessName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [callNumber, setCallNumber] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [welcomeMessage, setWelcomeMessage] = useState("Hi! 👋 How can I help you today?");
  const [smtp, setSmtp] = useState({ host: "", port: 587, username: "", password: "", encryption: "tls", from_email: "" });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoBucket = "widget-assets";

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("business_name, whatsapp_number, call_number, logo_url, primary_color, welcome_message").eq("user_id", user.id).single().then(({ data }) => {
      if (data) {
        setBusinessName(data.business_name);
        setWhatsappNumber(data.whatsapp_number || "");
        setCallNumber(data.call_number || "");
        setLogoUrl(data.logo_url || "");
        if (data.primary_color) setPrimaryColor(data.primary_color);
        if (data.welcome_message) setWelcomeMessage(data.welcome_message);
      }
    });
    supabase.from("smtp_settings").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setSmtp({ host: data.host, port: data.port, username: data.username, password: data.password, encryption: data.encryption, from_email: data.from_email });
    });
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ business_name: businessName, whatsapp_number: whatsappNumber, call_number: callNumber, logo_url: logoUrl, primary_color: primaryColor, welcome_message: welcomeMessage }).eq("user_id", user.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Profile updated!" });
    setSaving(false);
  };

  const handleSaveSmtp = async () => {
    if (!user) return;
    setSaving(true);
    const { data: existing } = await supabase.from("smtp_settings").select("id").eq("user_id", user.id).maybeSingle();
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

  const handleLogoUpload = async (file?: File) => {
    if (!user || !file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be 5MB or smaller.", variant: "destructive" });
      return;
    }

    setUploadingLogo(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/widget-logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(logoBucket).upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploadingLogo(false);
      return;
    }
    const { data } = supabase.storage.from(logoBucket).getPublicUrl(path);
    setLogoUrl(data.publicUrl);
    toast({ title: "Logo uploaded", description: "Save profile to apply it to your widget." });
    setUploadingLogo(false);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>WhatsApp Number</Label>
              <Input value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="+254700000000" />
            </div>
            <div className="space-y-2">
              <Label>Call Number</Label>
              <Input value={callNumber} onChange={(e) => setCallNumber(e.target.value)} placeholder="+254700000000" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Welcome Message</Label>
            <Input value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} placeholder="Hi! 👋 How can I help you today?" />
          </div>
          <div className="space-y-2">
            <Label>Widget Logo</Label>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleLogoUpload(e.target.files?.[0])}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                className="gap-2"
              >
                {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploadingLogo ? "Uploading..." : "Upload Logo"}
              </Button>
              {logoUrl && (
                <Button type="button" variant="ghost" onClick={() => setLogoUrl("")}>
                  Remove
                </Button>
              )}
            </div>
            {logoUrl && (
              <div className="h-12 w-12 rounded-md border bg-muted/30 p-1">
                <img src={logoUrl} alt="Widget logo preview" className="h-full w-full object-contain" />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Widget Primary Color</Label>
            <div className="flex gap-2 items-center">
              <Input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-16 h-10 p-1" />
              <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} placeholder="#2563eb" className="flex-1" />
            </div>
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

        <div className="lg:sticky lg:top-6 self-start">
          <div className="text-sm font-medium mb-2 text-muted-foreground">Live Preview</div>
          <WidgetPreview
            businessName={businessName}
            welcomeMessage={welcomeMessage}
            primaryColor={primaryColor}
            whatsappNumber={whatsappNumber}
            callNumber={callNumber}
            logoUrl={logoUrl || "/logo.png"}
          />
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
