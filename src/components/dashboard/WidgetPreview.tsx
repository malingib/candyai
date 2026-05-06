import { useMemo } from "react";

interface WidgetPreviewProps {
  businessName: string;
  welcomeMessage: string;
  primaryColor: string;
  whatsappNumber?: string;
  callNumber?: string;
  logoUrl?: string;
}

const WidgetPreview = ({
  businessName,
  welcomeMessage,
  primaryColor,
  whatsappNumber,
  callNumber,
  logoUrl = "/logo.png",
}: WidgetPreviewProps) => {
  const safeColor = useMemo(() => {
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(primaryColor) ? primaryColor : "#2563eb";
  }, [primaryColor]);

  return (
    <div
      className="rounded-2xl shadow-xl border bg-card overflow-hidden flex flex-col w-full max-w-[320px] mx-auto"
      style={{ height: 460 }}
    >
      <div
        className="px-4 py-3 flex items-center gap-3 text-white"
        style={{ backgroundColor: safeColor }}
      >
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
          <img src={logoUrl} alt="" className="w-6 h-6 object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{businessName || "Your Business"}</div>
          <div className="text-[11px] opacity-85 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success" style={{ backgroundColor: "#34d399" }} /> Online
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-muted/30 space-y-3">
        <div className="flex gap-2 items-start">
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
            <img src={logoUrl} alt="" className="w-5 h-5 object-contain" />
          </div>
          <div className="max-w-[75%] px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-card border text-sm">
            {welcomeMessage || "Hi! 👋 How can I help you today?"}
          </div>
        </div>
      </div>

      <div className="px-3 py-2 border-t bg-card flex gap-2 flex-wrap">
        <button
          type="button"
          className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border text-xs font-medium"
          style={{ color: safeColor, borderColor: safeColor }}
        >
          Talk to us
        </button>
        {whatsappNumber && (
          <button
            type="button"
            className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border text-xs font-medium"
            style={{ color: "#25D366", borderColor: "#25D366" }}
          >
            WhatsApp
          </button>
        )}
        {callNumber && (
          <button
            type="button"
            className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border border-border text-xs font-medium text-foreground"
          >
            Call
          </button>
        )}
      </div>

      <div className="px-3 py-2 border-t bg-card flex gap-2">
        <div className="flex-1 border rounded-lg px-3 py-2 text-xs text-muted-foreground">
          Type a message...
        </div>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white"
          style={{ backgroundColor: safeColor }}
        >
          ➤
        </div>
      </div>
    </div>
  );
};

export default WidgetPreview;
