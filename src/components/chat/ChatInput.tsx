import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Paperclip, X, Image, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChatInputProps {
  onSend: (message: string, attachments: string[]) => void;
  isLoading: boolean;
  userId: string;
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_MESSAGE_LENGTH = 4000;
const ALLOWED_MIME_PREFIXES = ["image/", "text/"];
const ALLOWED_MIME_EXACT = [
  "application/pdf",
  "application/json",
  "application/xml",
  "application/zip",
];

const isAllowedMime = (mime: string) =>
  ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p)) || ALLOWED_MIME_EXACT.includes(mime);

const sanitizeFileSegment = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9._-]/g, "-").slice(0, 80);

const ChatInput = ({ onSend, isLoading, userId }: ChatInputProps) => {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles).slice(0, MAX_FILES);
    const valid = arr.filter((f) => f.size <= MAX_FILE_SIZE && isAllowedMime(f.type));
    if (valid.length < arr.length) {
      toast.error("Some files were rejected (type/size). Max 20MB each.");
    }
    setFiles((prev) => [...prev, ...valid].slice(0, MAX_FILES));
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }, []);

  const uploadFiles = async (): Promise<string[]> => {
    if (files.length === 0) return [];
    setUploading(true);
    const urls: string[] = [];
    for (const file of files) {
      const ext = sanitizeFileSegment(file.name.split(".").pop() || "bin");
      const safeBase = sanitizeFileSegment(file.name.replace(/\.[^.]+$/, "")) || "file";
      const nonce = Math.random().toString(36).slice(2, 10);
      const path = `${sanitizeFileSegment(userId)}/${Date.now()}-${nonce}-${safeBase}.${ext}`;
      const { error } = await supabase.storage.from("chat-uploads").upload(path, file);
      if (error) {
        console.error("Upload error:", error);
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }
      const { data: urlData } = supabase.storage.from("chat-uploads").getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }
    setUploading(false);
    return urls;
  };

  const handleSend = async () => {
    const cleanInput = input.replace(/\s+/g, " ").trim().slice(0, MAX_MESSAGE_LENGTH);
    if ((!cleanInput && files.length === 0) || isLoading || uploading) return;
    const attachments = await uploadFiles();
    onSend(cleanInput, attachments);
    setInput("");
    setFiles([]);
  };

  return (
    <div
      className={`border-t p-4 transition-colors ${isDragOver ? "bg-accent/5 border-accent" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="max-w-3xl mx-auto space-y-2">
        {/* File previews */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((f, i) => {
              const isImage = f.type.startsWith("image/");
              return (
                <div key={i} className="relative group bg-muted rounded-lg p-2 flex items-center gap-2 text-xs">
                  {isImage ? (
                    <img src={URL.createObjectURL(f)} alt={f.name} className="h-10 w-10 rounded object-cover" />
                  ) : (
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="truncate max-w-[100px]">{f.name}</span>
                  <button onClick={() => removeFile(i)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Input row */}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={isDragOver ? "Drop files here…" : "Type your message…"}
            disabled={isLoading || uploading}
            className="flex-1"
            maxLength={MAX_MESSAGE_LENGTH}
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || uploading || (!input.trim() && files.length === 0)}
            size="icon"
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {isDragOver && (
          <div className="text-center text-xs text-accent font-medium py-1">
            <Image className="h-4 w-4 inline mr-1" /> Drop files to attach
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInput;
