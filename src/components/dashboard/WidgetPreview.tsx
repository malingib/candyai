import { useMemo } from "react";

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

interface WidgetPreviewProps {
  businessName: string;
  welcomeMessage: string;
  primaryColor: string;
  whatsappNumber?: string;
  callNumber?: string;
  logoUrl?: string;
  quickReplies?: string[];
  widgetPosition?: "left" | "right";
  widgetConfig?: WidgetConfig;
}

const FONT_MAP: Record<string, string> = {
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  inter: "'Inter', sans-serif",
  roboto: "'Roboto', sans-serif",
  "open-sans": "'Open Sans', sans-serif",
};

const WidgetPreview = ({
  businessName,
  welcomeMessage,
  primaryColor,
  whatsappNumber,
  callNumber,
  logoUrl = "/logo.png",
  quickReplies = [],
  widgetPosition = "right",
  widgetConfig: config = {
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
  },
}: WidgetPreviewProps) => {
  const safeColor = useMemo(() => {
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(primaryColor) ? primaryColor : "#2563eb";
  }, [primaryColor]);

  const fontFamily = FONT_MAP[config.font_family] || FONT_MAP.system;

  return (
    <div
      className="relative rounded-2xl bg-card overflow-hidden flex flex-col mx-auto"
      style={{
        width: config.width,
        height: config.height,
        fontFamily,
        borderRadius: config.border_radius,
        boxShadow: config.dark_mode
          ? "0 4px 6px -1px rgba(0,0,0,0.3), 0 10px 32px -4px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)"
          : "0 4px 6px -1px rgba(0,0,0,0.1), 0 10px 32px -4px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)",
        backgroundColor: config.dark_mode ? "#1f2937" : undefined,
        color: config.dark_mode ? "#f3f4f6" : undefined,
      }}
    >
      <div
        className="px-4 py-3.5 flex items-center gap-3 text-white"
        style={{ backgroundColor: safeColor }}
      >
        {config.show_avatar && (
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center overflow-hidden ring-2 ring-white/20" style={{ borderRadius: config.border_radius > 12 ? "9999px" : config.border_radius }}>
            <img src={logoUrl} alt="" className="w-6 h-6 object-contain" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{businessName || "Your Business"}</div>
          <div className="text-[11px] opacity-85 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#34d399" }} />
            Online
          </div>
        </div>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-white/30" />
          <div className="w-2 h-2 rounded-full bg-white/30" />
          <div className="w-2 h-2 rounded-full bg-white/30" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ backgroundColor: config.dark_mode ? "#111827" : "#f9fafb" }}>
        <div className="flex gap-2.5 items-start">
          {config.show_avatar && (
            <div className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden shrink-0 ring-1" style={{ backgroundColor: config.dark_mode ? "#374151" : "#e5e7eb", borderColor: config.dark_mode ? "#4b5563" : "#e5e7eb", borderRadius: config.border_radius > 12 ? "9999px" : config.border_radius }}>
              <img src={logoUrl} alt="" className="w-5 h-5 object-contain" />
            </div>
          )}
          <div
            className="max-w-[80%] px-3.5 py-2.5 shadow-sm text-sm"
            style={{
              borderRadius: config.border_radius,
              borderBottomLeftRadius: 4,
              backgroundColor: config.dark_mode ? "#374151" : "#fff",
              border: `1px solid ${config.dark_mode ? "#4b5563" : `${safeColor}15`}`,
              color: config.dark_mode ? "#f3f4f6" : undefined,
            }}
          >
            {welcomeMessage || "Hi! 👋 How can I help you today?"}
          </div>
        </div>

        {quickReplies.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-start pt-1" style={{ marginLeft: config.show_avatar ? 36 : 0 }}>
            {quickReplies.map((reply, i) => (
              <div
                key={i}
                className="px-3 py-1.5 rounded-full border text-[11px] font-medium shadow-sm cursor-default transition-all"
                style={{
                  borderRadius: config.button_radius > 8 ? "9999px" : config.button_radius,
                  borderColor: safeColor,
                  color: safeColor,
                  backgroundColor: `${safeColor}08`,
                }}
              >
                {reply}
              </div>
            ))}
          </div>
        )}

        {config.animations && (
          <div className="flex gap-2.5 items-start">
            {config.show_avatar && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden shrink-0 ring-1" style={{ backgroundColor: config.dark_mode ? "#374151" : "#e5e7eb", borderColor: config.dark_mode ? "#4b5563" : "#e5e7eb", borderRadius: config.border_radius > 12 ? "9999px" : config.border_radius }}>
                <img src={logoUrl} alt="" className="w-5 h-5 object-contain" />
              </div>
            )}
            <div
              className="px-3.5 py-3 shadow-sm text-sm flex gap-1.5"
              style={{
                borderRadius: config.border_radius,
                borderBottomLeftRadius: 4,
                backgroundColor: config.dark_mode ? "#374151" : "#fff",
                border: `1px solid ${config.dark_mode ? "#4b5563" : "#e5e7eb"}`,
              }}
            >
              <span className="w-2 h-2 rounded-full opacity-60" style={{ backgroundColor: config.dark_mode ? "#9ca3af" : "#9ca3af" }} />
              <span className="w-2 h-2 rounded-full opacity-60" style={{ backgroundColor: config.dark_mode ? "#9ca3af" : "#9ca3af" }} />
              <span className="w-2 h-2 rounded-full opacity-60" style={{ backgroundColor: config.dark_mode ? "#9ca3af" : "#9ca3af" }} />
            </div>
          </div>
        )}
      </div>

      <div className="px-3 py-2.5 border-t flex gap-2" style={{ backgroundColor: config.dark_mode ? "#1f2937" : "#fff", borderColor: config.dark_mode ? "#374151" : "#e5e7eb" }}>
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 border text-xs font-medium transition-all"
          style={{ color: safeColor, borderColor: `${safeColor}40`, backgroundColor: `${safeColor}05`, borderRadius: config.button_radius }}
        >
          Talk to us
        </button>
        {whatsappNumber && (
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 border text-xs font-medium transition-all"
            style={{ color: "#25D366", borderColor: "#25D36640", backgroundColor: "#25D36605", borderRadius: config.button_radius }}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </button>
        )}
        {callNumber && (
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 border text-xs font-medium transition-all"
            style={{ borderRadius: config.button_radius, borderColor: config.dark_mode ? "#4b5563" : "#e5e7eb", color: config.dark_mode ? "#f3f4f6" : undefined }}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
            </svg>
            Call
          </button>
        )}
      </div>

      <div className="px-3 py-2.5 border-t flex gap-2 items-center" style={{ backgroundColor: config.dark_mode ? "#1f2937" : "#fff", borderColor: config.dark_mode ? "#374151" : "#e5e7eb" }}>
        <div
          className="flex-1 px-3 py-2 text-xs"
          style={{
            border: `1px solid ${config.dark_mode ? "#4b5563" : "#d1d5db"}`,
            borderRadius: config.border_radius,
            color: config.dark_mode ? "#9ca3af" : "#9ca3af",
            backgroundColor: config.dark_mode ? "#374151" : "#f9fafb",
          }}
        >
          Type a message...
        </div>
        <div
          className="w-9 h-9 flex items-center justify-center text-white shadow-sm"
          style={{ backgroundColor: safeColor, borderRadius: config.button_radius }}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13" />
            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </div>
      </div>

      {config.show_branding && (
        <div className="text-center text-[10px] py-1.5" style={{ color: config.dark_mode ? "#6b7280" : "#9ca3af", backgroundColor: config.dark_mode ? "#1f2937" : "#fff" }}>
          Powered by CandyAI
        </div>
      )}
    </div>
  );
};

export default WidgetPreview;
