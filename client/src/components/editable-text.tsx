import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Pencil, Check, X } from "lucide-react";

const isDev = import.meta.env.DEV;

export function useSiteContent() {
  return useQuery<Record<string, string>>({
    queryKey: ["/api/site-content"],
  });
}

interface EditableTextProps {
  contentKey: string;
  defaultValue: string;
  as?: "p" | "h1" | "h2" | "h3" | "span";
  className?: string;
  style?: React.CSSProperties;
  "data-testid"?: string;
  children?: React.ReactNode;
  renderContent?: (text: string) => React.ReactNode;
}

export function EditableText({
  contentKey,
  defaultValue,
  as: Tag = "p",
  className,
  style,
  "data-testid": testId,
  renderContent,
}: EditableTextProps) {
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === "admin";
  const canEdit = isAdmin || isDev;
  const { data: siteContent } = useSiteContent();

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentValue = siteContent?.[contentKey] || defaultValue;

  const mutation = useMutation({
    mutationFn: async (value: string) => {
      await apiRequest(`/api/site-content/${contentKey}`, "PUT", { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-content"] });
      setIsEditing(false);
    },
    onError: () => {
      setIsEditing(false);
    },
  });

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editValue.trim() && editValue.trim() !== currentValue) {
      mutation.mutate(editValue.trim());
    } else {
      setIsEditing(false);
    }
  };

  const handleStartEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditValue(currentValue);
    setIsEditing(true);
  };

  if (isEditing && canEdit) {
    return (
      <div className="relative group" style={style}>
        <textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => {
            setEditValue(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSave();
            }
            if (e.key === "Escape") {
              setIsEditing(false);
            }
          }}
          className="w-full bg-white/20 border border-white/40 rounded px-2 py-1 text-inherit resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
          style={{
            ...style,
            fontFamily: style?.fontFamily,
            fontSize: style?.fontSize,
            fontWeight: style?.fontWeight,
            lineHeight: style?.lineHeight,
            color: style?.color,
            minHeight: "1.5em",
          }}
        />
        <div className="absolute -top-8 right-0 flex gap-1 z-50">
          <button
            onClick={handleSave}
            disabled={mutation.isPending}
            className="p-1 rounded bg-green-500 text-white hover:bg-green-600 shadow"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="p-1 rounded bg-red-500 text-white hover:bg-red-600 shadow"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <Tag
      className={`${className || ""} ${canEdit ? "relative group cursor-pointer" : ""}`}
      style={style}
      data-testid={testId}
      onClick={canEdit ? handleStartEdit : undefined}
    >
      {renderContent ? renderContent(currentValue) : currentValue}
      {canEdit && (
        <span className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-purple-600 text-white shadow z-50">
          <Pencil className="h-3 w-3" />
        </span>
      )}
    </Tag>
  );
}
