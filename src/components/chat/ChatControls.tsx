import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ModelConfig {
  model: string;
  temperature: number;
}

interface ChatControlsProps {
  config: ModelConfig;
  onChange: (config: ModelConfig) => void;
  open: boolean;
  onToggle: () => void;
}

const MODELS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash" },
  { value: "groq/llama-3.1-8b-instant", label: "Llama 3.1 8B" },
  { value: "google/gemini-2.0-flash", label: "Gemini 2.0 Flash" },
];

const ChatControls = ({ config, onChange, open, onToggle }: ChatControlsProps) => {
  return (
    <div className="border-b">
      <div className="max-w-3xl mx-auto px-4 py-1 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="gap-1.5 text-xs text-muted-foreground h-7"
        >
          <Settings2 className="h-3 w-3" />
          {open ? "Hide" : "Model"} settings
        </Button>
      </div>
      {open && (
        <div className="max-w-3xl mx-auto px-4 pb-3 pt-1 space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground w-16 shrink-0">Model</label>
            <Select
              value={config.model}
              onValueChange={(model) => onChange({ ...config, model })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value} className="text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground w-16 shrink-0">
              Temp: {config.temperature.toFixed(1)}
            </label>
            <Slider
              value={[config.temperature]}
              onValueChange={([v]) => onChange({ ...config, temperature: v })}
              min={0}
              max={2}
              step={0.1}
              className="flex-1"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatControls;
