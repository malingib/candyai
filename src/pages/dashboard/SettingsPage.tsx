import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, Upload, Loader2, Plus, X, Palette, MessageCircle, Phone, Globe, Image, Mail, Sliders, Maximize2, Eye, ChevronDown, ChevronRight } from "lucide-react";
import WidgetPreview from "@/components/dashboard/WidgetPreview";
import { motion } from "framer-motion";

interface WidgetConfig {
  border_radius: number;
  font_family: string;
  dark_mode: boolean;
  width: number;
  height: number;
  button_radius: number;
  animations: boolean;
  show_branding: boolean;
  show_avatar: boolean;
  position_x: number;
  position_y: number;
}

const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  border_radius: 16,
  font_family: "system",
  dark_mode: false,
  width: 380,
  height: 580,
  button_radius: 8,
  animations: true,
  show_branding: true,
  show_avatar: true,
  position_x: 24,
  position_y: 24,
};

function parseWidgetConfig(raw: unknown): WidgetConfig {
  if (!raw || typeof raw !== "string") return { ...DEFAULT_WIDGET_CONFIG };
  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_WIDGET_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_WIDGET_CONFIG };
  }
}

const SettingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [businessName, setBusinessName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [callNumber, setCallNumber] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [welcomeMessage, setWelcomeMessage] = useState("Hi! 👋 How can I help you today?");
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [newQuickReply, setNewQuickReply] = useState("");
  const [widgetPosition, setWidgetPosition] = useState<"left" | "right">("right");
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig>({ ...DEFAULT_WIDGET_CONFIG });
  const [smtp, setSmtp] = useState({ host: "", port: 587, username: "", password: "", encryption: "tls", from_email: "" });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoBucket = "widget-assets";

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    general: false,
    dimensions: false,
    appearance: false,
  });

  const toggleSection = (key: string) => setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("business_name, whatsapp_number, call_number, logo_url, primary_color, welcome_message, quick_replies, widget_position, widget_config").eq("user_id", user.id).single().then(({ data }) => {
      if (data) {
        setBusinessName(data.business_name);
        setWhatsappNumber(data.whatsapp_number || "");
        setCallNumber(data.call_number || "");
        setLogoUrl(data.logo_url || "");
        if (data.primary_color) setPrimaryColor(data.primary_color);
        if (data.welcome_message) setWelcomeMessage(data.welcome_message);
        if (data.quick_replies) setQuickReplies(data.quick_replies);
        if (data.widget_position) setWidgetPosition(data.widget_position as "left" | "right");
        if (data.widget_config) setWidgetConfig(parseWidgetConfig(data.widget_config));
      }
    });
    supabase.from("smtp_settings").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setSmtp({ host: data.host, port: data.port, username: data.username, password: data.password, encryption: data.encryption, from_email: data.from_email });
    });
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      business_name: businessName,
      whatsapp_number: whatsappNumber,
      call_number: callNumber,
      logo_url: logoUrl,
      primary_color: primaryColor,
      welcome_message: welcomeMessage,
      quick_replies: quickReplies,
      widget_position: widgetPosition,
      widget_config: JSON.stringify(widgetConfig),
    }).eq("user_id", user.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Profile updated!" });
    setSaving(false);
  };

  const addQuickReply = () => {
    if (!newQuickReply.trim() || quickReplies.length >= 5) return;
    setQuickReplies([...quickReplies, newQuickReply.trim()]);
    setNewQuickReply("");
  };

  const removeQuickReply = (index: number) => {
    setQuickReplies(quickReplies.filter((_, i) => i !== index));
  };

  const handleSaveSmtp = async () => {
    if (!user) return;
    setSaving(true);
    const { data: existing } = await supabase.from("smtp_settings").select("id").eq("user_id", user.id).maybeSingle();
    let error;
    if (existing) ({ error } = await supabase.from("smtp_settings").update(smtp).eq("user_id", user.id));
    else ({ error } = await supabase.from("smtp_settings").insert({ user_id: user.id, ...smtp }));
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "SMTP settings saved!" });
    setSaving(false);
  };

  const handleLogoUpload = async (file?: File) => {
    if (!user || !file) return;
    if (!file.type.startsWith("image/")) { toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: "File too large", description: "Logo must be 5MB or smaller.", variant: "destructive" }); return; }
    setUploadingLogo(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/widget-logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(logoBucket).upload(path, file, { upsert: true });
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); setUploadingLogo(false); return; }
    const { data } = supabase.storage.from(logoBucket).getPublicUrl(path);
    setLogoUrl(data.publicUrl);
    toast({ title: "Logo uploaded", description: "Save profile to apply it to your widget." });
    setUploadingLogo(false);
  };

  const updateConfig = <K extends keyof WidgetConfig>(key: K, value: WidgetConfig[K]) => {
    setWidgetConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-5xl"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="space-y-6 max-w-2xl">
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary via-blue-500 to-primary/50" />
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Globe className="h-3.5 w-3.5" />
                </div>
                Business Profile
              </CardTitle>
              <CardDescription>Your business name shown in the chat widget</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="font-medium">Business Name</Label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="My Business" className="border-border/50 focus:border-primary/50 transition-colors" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="font-medium flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5 text-muted-foreground" /> WhatsApp Number</Label>
                  <Input value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="+254700000000" className="border-border/50 focus:border-primary/50 transition-colors" />
                </div>
                <div className="space-y-2">
                  <Label className="font-medium flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> Call Number</Label>
                  <Input value={callNumber} onChange={(e) => setCallNumber(e.target.value)} placeholder="+254700000000" className="border-border/50 focus:border-primary/50 transition-colors" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-medium">Welcome Message</Label>
                <Input value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} placeholder="Hi! 👋 How can I help you today?" className="border-border/50 focus:border-primary/50 transition-colors" />
              </div>
              <div className="space-y-2">
                <Label className="font-medium flex items-center gap-1.5"><Image className="h-3.5 w-3.5 text-muted-foreground" /> Widget Logo</Label>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e.target.files?.[0])} />
                <div className="flex flex-wrap gap-3 items-center">
                  <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo} className="gap-2">
                    {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploadingLogo ? "Uploading..." : "Upload Logo"}
                  </Button>
                  {logoUrl && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setLogoUrl("")} className="text-destructive hover:text-destructive">
                      Remove
                    </Button>
                  )}
                </div>
                {logoUrl && (
                  <div className="flex items-center gap-3 mt-2">
                    <div className="h-14 w-14 rounded-xl border border-border/50 bg-muted/20 p-1.5 shadow-sm">
                      <img src={logoUrl} alt="Widget logo preview" className="h-full w-full object-contain rounded-lg" />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">Logo uploaded</p>
                      <p>Will appear in your chat widget header</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="font-medium flex items-center gap-1.5"><Palette className="h-3.5 w-3.5 text-muted-foreground" /> Widget Primary Color</Label>
                <div className="flex gap-2 items-center">
                  <div className="relative">
                    <Input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-14 h-10 p-1 cursor-pointer border-border/50" />
                  </div>
                  <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} placeholder="#2563eb" className="flex-1 font-mono border-border/50 focus:border-primary/50 transition-colors" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-medium">Widget Position</Label>
                <Select value={widgetPosition} onValueChange={(v: "left" | "right") => setWidgetPosition(v)}>
                  <SelectTrigger className="border-border/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right">Bottom Right</SelectItem>
                    <SelectItem value="left">Bottom Left</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-medium">Quick Replies (max 5)</Label>
                <div className="flex gap-2">
                  <Input value={newQuickReply} onChange={(e) => setNewQuickReply(e.target.value)} placeholder="e.g. See Pricing" className="border-border/50 focus:border-primary/50 transition-colors" onKeyDown={(e) => e.key === "Enter" && addQuickReply()} />
                  <Button type="button" variant="outline" onClick={addQuickReply} disabled={quickReplies.length >= 5}><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {quickReplies.map((qr, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="group flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-medium border border-primary/20"
                    >
                      {qr}
                      <button onClick={() => removeQuickReply(i)} className="hover:text-destructive transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
              <Button onClick={handleSaveProfile} disabled={saving} className="gap-2 shadow-sm">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Profile
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary via-blue-500 to-primary/50" />
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Sliders className="h-3.5 w-3.5" />
                </div>
                Widget Customization
              </CardTitle>
              <CardDescription>Fine-tune your chat widget appearance and behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              <div className="border border-border/50 rounded-lg overflow-hidden">
                <button type="button" onClick={() => toggleSection("general")} className="flex items-center justify-between w-full px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    General
                  </span>
                  {collapsedSections.general ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                {!collapsedSections.general && (
                  <div className="p-4 space-y-5">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium">Border Radius</Label>
                        <span className="text-sm text-muted-foreground tabular-nums">{widgetConfig.border_radius}px</span>
                      </div>
                      <Slider min={4} max={24} step={1} value={[widgetConfig.border_radius]} onValueChange={([v]) => updateConfig("border_radius", v)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-medium">Font Family</Label>
                      <Select value={widgetConfig.font_family} onValueChange={(v) => updateConfig("font_family", v)}>
                        <SelectTrigger className="border-border/50"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="system">System</SelectItem>
                          <SelectItem value="inter">Inter</SelectItem>
                          <SelectItem value="roboto">Roboto</SelectItem>
                          <SelectItem value="open-sans">Open Sans</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">Animations</Label>
                      <Switch checked={widgetConfig.animations} onCheckedChange={(v) => updateConfig("animations", v)} />
                    </div>
                  </div>
                )}
              </div>

              <div className="border border-border/50 rounded-lg overflow-hidden">
                <button type="button" onClick={() => toggleSection("dimensions")} className="flex items-center justify-between w-full px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <Maximize2 className="h-4 w-4 text-muted-foreground" />
                    Dimensions
                  </span>
                  {collapsedSections.dimensions ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                {!collapsedSections.dimensions && (
                  <div className="p-4 space-y-5">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium">Widget Width</Label>
                        <span className="text-sm text-muted-foreground tabular-nums">{widgetConfig.width}px</span>
                      </div>
                      <Slider min={320} max={480} step={1} value={[widgetConfig.width]} onValueChange={([v]) => updateConfig("width", v)} />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium">Widget Height</Label>
                        <span className="text-sm text-muted-foreground tabular-nums">{widgetConfig.height}px</span>
                      </div>
                      <Slider min={400} max={700} step={1} value={[widgetConfig.height]} onValueChange={([v]) => updateConfig("height", v)} />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium">Position Offset X</Label>
                        <span className="text-sm text-muted-foreground tabular-nums">{widgetConfig.position_x}px</span>
                      </div>
                      <Slider min={0} max={48} step={1} value={[widgetConfig.position_x]} onValueChange={([v]) => updateConfig("position_x", v)} />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium">Position Offset Y</Label>
                        <span className="text-sm text-muted-foreground tabular-nums">{widgetConfig.position_y}px</span>
                      </div>
                      <Slider min={0} max={48} step={1} value={[widgetConfig.position_y]} onValueChange={([v]) => updateConfig("position_y", v)} />
                    </div>
                  </div>
                )}
              </div>

              <div className="border border-border/50 rounded-lg overflow-hidden">
                <button type="button" onClick={() => toggleSection("appearance")} className="flex items-center justify-between w-full px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    Appearance
                  </span>
                  {collapsedSections.appearance ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                {!collapsedSections.appearance && (
                  <div className="p-4 space-y-5">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">Dark Mode</Label>
                      <Switch checked={widgetConfig.dark_mode} onCheckedChange={(v) => updateConfig("dark_mode", v)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">Show Branding</Label>
                      <Switch checked={widgetConfig.show_branding} onCheckedChange={(v) => updateConfig("show_branding", v)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">Show Avatar</Label>
                      <Switch checked={widgetConfig.show_avatar} onCheckedChange={(v) => updateConfig("show_avatar", v)} />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium">Button Border Radius</Label>
                        <span className="text-sm text-muted-foreground tabular-nums">{widgetConfig.button_radius}px</span>
                      </div>
                      <Slider min={4} max={16} step={1} value={[widgetConfig.button_radius]} onValueChange={([v]) => updateConfig("button_radius", v)} />
                    </div>
                  </div>
                )}
              </div>

              <Button onClick={handleSaveProfile} disabled={saving} className="gap-2 shadow-sm w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Profile
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary via-blue-500 to-primary/50" />
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Mail className="h-3.5 w-3.5" />
                </div>
                SMTP Email Settings
              </CardTitle>
              <CardDescription>Configure email notifications when leads are captured</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="font-medium">SMTP Host</Label>
                  <Input value={smtp.host} onChange={(e) => setSmtp({ ...smtp, host: e.target.value })} placeholder="smtp.gmail.com" className="border-border/50 focus:border-primary/50 transition-colors" />
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">Port</Label>
                  <Input type="number" value={smtp.port} onChange={(e) => setSmtp({ ...smtp, port: parseInt(e.target.value) || 587 })} className="border-border/50 focus:border-primary/50 transition-colors" />
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">Username</Label>
                  <Input value={smtp.username} onChange={(e) => setSmtp({ ...smtp, username: e.target.value })} placeholder="you@gmail.com" className="border-border/50 focus:border-primary/50 transition-colors" />
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">Password</Label>
                  <Input type="password" value={smtp.password} onChange={(e) => setSmtp({ ...smtp, password: e.target.value })} className="border-border/50 focus:border-primary/50 transition-colors" />
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">From Email</Label>
                  <Input value={smtp.from_email} onChange={(e) => setSmtp({ ...smtp, from_email: e.target.value })} placeholder="noreply@mybusiness.com" className="border-border/50 focus:border-primary/50 transition-colors" />
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">Encryption</Label>
                  <Select value={smtp.encryption} onValueChange={(v) => setSmtp({ ...smtp, encryption: v })}>
                    <SelectTrigger className="border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tls">TLS</SelectItem>
                      <SelectItem value="ssl">SSL</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSaveSmtp} disabled={saving} className="gap-2 shadow-sm">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save SMTP Settings
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-6 self-start">
          <div className="text-sm font-semibold mb-3 text-foreground flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Live Preview
          </div>
          <WidgetPreview
            businessName={businessName}
            welcomeMessage={welcomeMessage}
            primaryColor={primaryColor}
            whatsappNumber={whatsappNumber}
            callNumber={callNumber}
            logoUrl={logoUrl || "/logo.png"}
            quickReplies={quickReplies}
            widgetPosition={widgetPosition}
            widgetConfig={widgetConfig}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default SettingsPage;
