"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CardTitle } from "@/components/ui/card";
import {
  X,
  Sparkles,
  PencilLine,
  Star,
  Loader2,
  Check,
  AlertCircle,
  ChevronDown,
  Trash2,
  Plus,
  Camera,
  Upload,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
type MealType = "breakfast" | "lunch" | "snack" | "dinner";
type InputMethod = "nlp" | "photo" | "favorites" | "manual";

interface ParsedItem {
  name: string;
  quantity: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

interface ParseResult {
  items: ParsedItem[];
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
  };
  confidence: number;
  assumptions: string[];
  cached?: boolean;
  message?: string;
}

interface FavoriteMeal {
  id: number;
  name: string;
  mealType: string | null;
  items: string | null;
  totalCalories: number | null;
  totalProteinG: number | null;
  totalCarbsG: number | null;
  totalFatG: number | null;
  totalFiberG: number | null;
  useCount: number | null;
}

interface FoodLogFormProps {
  date: string;
  mealType: MealType;
  onClose: () => void;
  onSaved: () => void;
}

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};

const TAB_CONFIG: { id: InputMethod; label: string; icon: typeof Sparkles }[] = [
  { id: "nlp", label: "AI Parse", icon: Sparkles },
  { id: "photo", label: "Photo", icon: Camera },
  { id: "favorites", label: "Favorites", icon: Star },
  { id: "manual", label: "Manual", icon: PencilLine },
];

// Editable parsed item for the review step
interface EditableItem {
  key: string;
  name: string;
  quantity: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

export function FoodLogForm({
  date,
  mealType,
  onClose,
  onSaved,
}: FoodLogFormProps) {
  const [method, setMethod] = useState<InputMethod>("nlp");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-bg-card border border-border"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-bg-card border-b border-border px-5 py-4 flex items-center justify-between">
          <div>
            <CardTitle className="mb-0">Log {MEAL_TYPE_LABELS[mealType]}</CardTitle>
            <p className="text-[11px] text-text-muted font-display mt-0.5">
              {date}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Method tabs */}
        <div className="flex border-b border-border">
          {TAB_CONFIG.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setMethod(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-display font-medium transition-all border-b-2",
                  method === tab.id
                    ? "text-accent-teal border-accent-teal"
                    : "text-text-muted border-transparent hover:text-text-secondary hover:border-border-hover"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-5">
          <AnimatePresence mode="wait">
            {method === "nlp" && (
              <NLPInput
                key="nlp"
                date={date}
                mealType={mealType}
                onSaved={onSaved}
              />
            )}
            {method === "photo" && (
              <PhotoInput
                key="photo"
                date={date}
                mealType={mealType}
                onSaved={onSaved}
              />
            )}
            {method === "favorites" && (
              <FavoritesInput
                key="favorites"
                date={date}
                mealType={mealType}
                onSaved={onSaved}
              />
            )}
            {method === "manual" && (
              <ManualInput
                key="manual"
                date={date}
                mealType={mealType}
                onSaved={onSaved}
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

// =============================================================================
// NLP Input Method
// =============================================================================
function NLPInput({
  date,
  mealType,
  onSaved,
}: {
  date: string;
  mealType: MealType;
  onSaved: () => void;
}) {
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Parse with AI
  async function handleParse() {
    if (!text.trim()) return;
    setParsing(true);
    setError(null);
    setParseResult(null);

    try {
      const res = await fetch("/api/nutrition/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to parse food");
        return;
      }

      const result: ParseResult = json.data;
      setParseResult(result);

      // Convert to editable items
      setEditableItems(
        result.items.map((item, i) => ({
          key: `parsed-${i}-${Date.now()}`,
          name: item.name,
          quantity: item.quantity,
          calories: item.calories,
          proteinG: item.protein_g,
          carbsG: item.carbs_g,
          fatG: item.fat_g,
          fiberG: item.fiber_g,
        }))
      );
    } catch {
      setError("Network error - could not reach server");
    } finally {
      setParsing(false);
    }
  }

  // Save all parsed items
  async function handleSave() {
    if (editableItems.length === 0) return;
    setSaving(true);
    setError(null);

    try {
      // Save each item as a separate nutrition log entry
      const promises = editableItems.map((item) =>
        fetch("/api/nutrition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            mealType,
            description: `${item.name} (${item.quantity})`,
            calories: item.calories,
            proteinG: item.proteinG,
            carbsG: item.carbsG,
            fatG: item.fatG,
            fiberG: item.fiberG,
            source: "ai_parsed",
            aiConfidence: parseResult?.confidence ?? null,
          }),
        })
      );

      const results = await Promise.all(promises);
      const allOk = results.every((r) => r.ok);
      if (!allOk) {
        setError("Some items failed to save");
        return;
      }

      onSaved();
    } catch {
      setError("Network error while saving");
    } finally {
      setSaving(false);
    }
  }

  function updateItem(key: string, field: keyof EditableItem, value: string | number) {
    setEditableItems((prev) =>
      prev.map((item) =>
        item.key === key ? { ...item, [field]: value } : item
      )
    );
  }

  function removeItem(key: string) {
    setEditableItems((prev) => prev.filter((item) => item.key !== key));
  }

  const confidenceColor =
    (parseResult?.confidence ?? 0) >= 0.8
      ? "text-accent-green"
      : (parseResult?.confidence ?? 0) >= 0.5
      ? "text-accent-amber"
      : "text-accent-red";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      {/* Text input */}
      {!parseResult && (
        <div className="space-y-3">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='Describe what you ate, e.g. "2 eggs, toast with butter, coffee with cream"'
            className="w-full h-28 resize-none rounded-lg border border-border bg-bg-primary px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal/50 focus:ring-1 focus:ring-accent-teal/20 transition-colors"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleParse();
              }
            }}
          />

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-accent-red-dim px-3 py-2 text-xs text-accent-red">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleParse}
            disabled={!text.trim() || parsing}
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-display text-sm font-semibold transition-all",
              text.trim() && !parsing
                ? "bg-accent-teal text-bg-primary hover:bg-accent-teal/90"
                : "bg-bg-card-hover text-text-muted cursor-not-allowed"
            )}
          >
            {parsing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Parsing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Parse with AI
              </>
            )}
          </button>

          <p className="text-[10px] text-text-muted text-center">
            Press Ctrl+Enter to parse &middot; AI will estimate macros from your description
          </p>
        </div>
      )}

      {/* Parsed results - editable */}
      {parseResult && (
        <div className="space-y-4">
          {/* Confidence badge + assumptions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "font-display text-xs font-semibold",
                  confidenceColor
                )}
              >
                {Math.round((parseResult.confidence ?? 0) * 100)}% confidence
              </span>
              {parseResult.cached && (
                <span className="rounded bg-bg-card-elevated px-1.5 py-0.5 font-display text-[9px] font-semibold uppercase tracking-wider text-text-muted">
                  Cached
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setParseResult(null);
                setEditableItems([]);
              }}
              className="text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              Edit text
            </button>
          </div>

          {/* Assumptions */}
          {parseResult.assumptions.length > 0 && (
            <div className="rounded-lg bg-accent-amber-dim px-3 py-2">
              <p className="font-display text-[10px] font-semibold uppercase tracking-wider text-accent-amber mb-1">
                AI Assumptions
              </p>
              {parseResult.assumptions.map((a, i) => (
                <p key={i} className="text-[11px] text-text-secondary">
                  &bull; {a}
                </p>
              ))}
            </div>
          )}

          {/* Editable items */}
          <div className="space-y-2">
            {editableItems.map((item) => (
              <EditableItemCard
                key={item.key}
                item={item}
                onUpdate={updateItem}
                onRemove={removeItem}
              />
            ))}
          </div>

          {/* Totals summary */}
          {editableItems.length > 0 && (
            <div className="rounded-lg border border-border px-4 py-3">
              <p className="font-display text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2">
                Totals
              </p>
              <div className="flex items-center gap-4 font-display text-xs tabular-nums">
                <span className="text-text-primary font-semibold">
                  {Math.round(
                    editableItems.reduce((s, i) => s + i.calories, 0)
                  )}{" "}
                  cal
                </span>
                <span className="text-accent-teal">
                  {Math.round(
                    editableItems.reduce((s, i) => s + i.proteinG, 0)
                  )}
                  g P
                </span>
                <span className="text-text-muted">
                  {Math.round(
                    editableItems.reduce((s, i) => s + i.carbsG, 0)
                  )}
                  g C
                </span>
                <span className="text-text-muted">
                  {Math.round(
                    editableItems.reduce((s, i) => s + i.fatG, 0)
                  )}
                  g F
                </span>
                <span className="text-text-muted">
                  {Math.round(
                    editableItems.reduce((s, i) => s + i.fiberG, 0)
                  )}
                  g Fiber
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-accent-red-dim px-3 py-2 text-xs text-accent-red">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={editableItems.length === 0 || saving}
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-display text-sm font-semibold transition-all",
              editableItems.length > 0 && !saving
                ? "bg-accent-teal text-bg-primary hover:bg-accent-teal/90"
                : "bg-bg-card-hover text-text-muted cursor-not-allowed"
            )}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save {editableItems.length} item
                {editableItems.length !== 1 ? "s" : ""}
              </>
            )}
          </button>
        </div>
      )}
    </motion.div>
  );
}

// =============================================================================
// Photo Input Method
// =============================================================================
function PhotoInput({
  date,
  mealType,
  onSaved,
}: {
  date: string;
  mealType: MealType;
  onSaved: () => void;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(file: File) {
    // Validate type
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setError("Invalid file type. Please use JPEG, PNG, WebP, or GIF.");
      return;
    }
    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError(`File too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum is 10MB.`);
      return;
    }

    setSelectedFile(file);
    setError(null);
    setParseResult(null);
    setEditableItems([]);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }

  async function handleAnalyze() {
    if (!selectedFile) return;
    setAnalyzing(true);
    setError(null);
    setParseResult(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const res = await fetch("/api/nutrition/photo", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to analyze photo");
        return;
      }

      const result: ParseResult = json.data;
      setParseResult(result);

      // Convert to editable items
      setEditableItems(
        result.items.map((item, i) => ({
          key: `photo-${i}-${Date.now()}`,
          name: item.name,
          quantity: item.quantity,
          calories: item.calories,
          proteinG: item.protein_g,
          carbsG: item.carbs_g,
          fatG: item.fat_g,
          fiberG: item.fiber_g,
        }))
      );
    } catch {
      setError("Network error - could not reach server");
    } finally {
      setAnalyzing(false);
    }
  }

  // Save all parsed items
  async function handleSave() {
    if (editableItems.length === 0) return;
    setSaving(true);
    setError(null);

    try {
      const promises = editableItems.map((item) =>
        fetch("/api/nutrition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            mealType,
            description: `${item.name} (${item.quantity})`,
            calories: item.calories,
            proteinG: item.proteinG,
            carbsG: item.carbsG,
            fatG: item.fatG,
            fiberG: item.fiberG,
            source: "photo",
            aiConfidence: parseResult?.confidence ?? null,
          }),
        })
      );

      const results = await Promise.all(promises);
      const allOk = results.every((r) => r.ok);
      if (!allOk) {
        setError("Some items failed to save");
        return;
      }

      onSaved();
    } catch {
      setError("Network error while saving");
    } finally {
      setSaving(false);
    }
  }

  function updateItem(key: string, field: keyof EditableItem, value: string | number) {
    setEditableItems((prev) =>
      prev.map((item) =>
        item.key === key ? { ...item, [field]: value } : item
      )
    );
  }

  function removeItem(key: string) {
    setEditableItems((prev) => prev.filter((item) => item.key !== key));
  }

  function resetPhoto() {
    setSelectedFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setParseResult(null);
    setEditableItems([]);
    setError(null);
  }

  const confidenceColor =
    (parseResult?.confidence ?? 0) >= 0.8
      ? "text-accent-green"
      : (parseResult?.confidence ?? 0) >= 0.5
      ? "text-accent-amber"
      : "text-accent-red";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleInputChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Upload / Capture phase */}
      {!parseResult && (
        <div className="space-y-3">
          {!selectedFile ? (
            <>
              {/* Drag-and-drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-8 cursor-pointer transition-all",
                  isDragOver
                    ? "border-accent-teal bg-accent-teal/5"
                    : "border-border hover:border-border-hover hover:bg-bg-card-hover"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-12 h-12 rounded-full transition-colors",
                    isDragOver
                      ? "bg-accent-teal/10 text-accent-teal"
                      : "bg-bg-card-hover text-text-muted"
                  )}
                >
                  <Upload className="h-5 w-5" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-text-primary font-medium">
                    {isDragOver ? "Drop your photo here" : "Upload a food photo"}
                  </p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Drag & drop or click to browse &middot; JPEG, PNG, WebP, GIF &middot; Max 10MB
                  </p>
                </div>
              </div>

              {/* Camera capture button */}
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm text-text-secondary font-display font-medium hover:bg-bg-card-hover hover:border-border-hover transition-all"
              >
                <Camera className="h-4 w-4" />
                Take a Photo
              </button>
            </>
          ) : (
            <>
              {/* Image preview */}
              <div className="relative rounded-lg overflow-hidden border border-border bg-bg-primary">
                {preview && (
                  <img
                    src={preview}
                    alt="Food photo preview"
                    className="w-full max-h-52 object-contain mx-auto"
                  />
                )}
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <button
                    onClick={resetPhoto}
                    className="flex items-center justify-center w-7 h-7 rounded-md bg-bg-primary/80 backdrop-blur-sm text-text-muted hover:text-text-primary hover:bg-bg-primary transition-colors"
                    title="Remove photo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="absolute bottom-2 left-2">
                  <span className="inline-flex items-center gap-1 rounded bg-bg-primary/80 backdrop-blur-sm px-2 py-1 text-[10px] text-text-muted font-display">
                    <ImageIcon className="h-3 w-3" />
                    {selectedFile.name}
                  </span>
                </div>
              </div>

              {/* Analyze button */}
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-display text-sm font-semibold transition-all",
                  !analyzing
                    ? "bg-accent-teal text-bg-primary hover:bg-accent-teal/90"
                    : "bg-bg-card-hover text-text-muted cursor-not-allowed"
                )}
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing your meal photo...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Analyze Photo
                  </>
                )}
              </button>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-accent-red-dim px-3 py-2 text-xs text-accent-red">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          <p className="text-[10px] text-text-muted text-center">
            AI Vision will identify foods and estimate macros from your photo
          </p>
        </div>
      )}

      {/* Parsed results - editable (reuses same layout as NLP) */}
      {parseResult && (
        <div className="space-y-4">
          {/* Photo preview thumbnail */}
          {preview && (
            <div className="rounded-lg overflow-hidden border border-border bg-bg-primary">
              <img
                src={preview}
                alt="Analyzed food"
                className="w-full max-h-32 object-contain mx-auto"
              />
            </div>
          )}

          {/* Confidence badge + reset */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "font-display text-xs font-semibold",
                  confidenceColor
                )}
              >
                {Math.round((parseResult.confidence ?? 0) * 100)}% confidence
              </span>
            </div>
            <button
              onClick={resetPhoto}
              className="text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              New photo
            </button>
          </div>

          {/* Assumptions */}
          {parseResult.assumptions.length > 0 && (
            <div className="rounded-lg bg-accent-amber-dim px-3 py-2">
              <p className="font-display text-[10px] font-semibold uppercase tracking-wider text-accent-amber mb-1">
                AI Assumptions
              </p>
              {parseResult.assumptions.map((a, i) => (
                <p key={i} className="text-[11px] text-text-secondary">
                  &bull; {a}
                </p>
              ))}
            </div>
          )}

          {/* Editable items */}
          <div className="space-y-2">
            {editableItems.map((item) => (
              <EditableItemCard
                key={item.key}
                item={item}
                onUpdate={updateItem}
                onRemove={removeItem}
              />
            ))}
          </div>

          {/* Totals summary */}
          {editableItems.length > 0 && (
            <div className="rounded-lg border border-border px-4 py-3">
              <p className="font-display text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2">
                Totals
              </p>
              <div className="flex items-center gap-4 font-display text-xs tabular-nums">
                <span className="text-text-primary font-semibold">
                  {Math.round(
                    editableItems.reduce((s, i) => s + i.calories, 0)
                  )}{" "}
                  cal
                </span>
                <span className="text-accent-teal">
                  {Math.round(
                    editableItems.reduce((s, i) => s + i.proteinG, 0)
                  )}
                  g P
                </span>
                <span className="text-text-muted">
                  {Math.round(
                    editableItems.reduce((s, i) => s + i.carbsG, 0)
                  )}
                  g C
                </span>
                <span className="text-text-muted">
                  {Math.round(
                    editableItems.reduce((s, i) => s + i.fatG, 0)
                  )}
                  g F
                </span>
                <span className="text-text-muted">
                  {Math.round(
                    editableItems.reduce((s, i) => s + i.fiberG, 0)
                  )}
                  g Fiber
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-accent-red-dim px-3 py-2 text-xs text-accent-red">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={editableItems.length === 0 || saving}
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-display text-sm font-semibold transition-all",
              editableItems.length > 0 && !saving
                ? "bg-accent-teal text-bg-primary hover:bg-accent-teal/90"
                : "bg-bg-card-hover text-text-muted cursor-not-allowed"
            )}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save {editableItems.length} item
                {editableItems.length !== 1 ? "s" : ""}
              </>
            )}
          </button>
        </div>
      )}
    </motion.div>
  );
}

// Editable item card with expandable details
function EditableItemCard({
  item,
  onUpdate,
  onRemove,
}: {
  item: EditableItem;
  onUpdate: (key: string, field: keyof EditableItem, value: string | number) => void;
  onRemove: (key: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-bg-primary overflow-hidden">
      {/* Summary row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 flex-1 min-w-0 text-left"
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-text-muted shrink-0 transition-transform",
              expanded && "rotate-180"
            )}
          />
          <span className="text-sm text-text-primary truncate">
            {item.name}
          </span>
          <span className="text-[11px] text-text-muted shrink-0 ml-1">
            ({item.quantity})
          </span>
        </button>
        <span className="font-display text-xs tabular-nums text-text-muted shrink-0">
          {Math.round(item.calories)} cal
        </span>
        <button
          onClick={() => onRemove(item.key)}
          className="shrink-0 text-text-muted hover:text-accent-red transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Expanded edit form */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 border-t border-border space-y-2">
              {/* Name + quantity */}
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="font-display text-[10px] uppercase tracking-wider text-text-muted">
                    Name
                  </span>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => onUpdate(item.key, "name", e.target.value)}
                    className="w-full rounded border border-border bg-bg-card px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-teal/50"
                  />
                </label>
                <label className="space-y-1">
                  <span className="font-display text-[10px] uppercase tracking-wider text-text-muted">
                    Quantity
                  </span>
                  <input
                    type="text"
                    value={item.quantity}
                    onChange={(e) => onUpdate(item.key, "quantity", e.target.value)}
                    className="w-full rounded border border-border bg-bg-card px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-teal/50"
                  />
                </label>
              </div>

              {/* Macros grid */}
              <div className="grid grid-cols-5 gap-2">
                {(
                  [
                    ["calories", "Cal"],
                    ["proteinG", "Protein"],
                    ["carbsG", "Carbs"],
                    ["fatG", "Fat"],
                    ["fiberG", "Fiber"],
                  ] as const
                ).map(([field, label]) => (
                  <label key={field} className="space-y-1">
                    <span className="font-display text-[9px] uppercase tracking-wider text-text-muted">
                      {label}
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={field === "calories" ? 1 : 0.1}
                      value={item[field]}
                      onChange={(e) =>
                        onUpdate(
                          item.key,
                          field,
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full rounded border border-border bg-bg-card px-2 py-1.5 text-xs text-text-primary tabular-nums focus:outline-none focus:border-accent-teal/50"
                    />
                  </label>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// Favorites Input Method
// =============================================================================
function FavoritesInput({
  date,
  mealType,
  onSaved,
}: {
  date: string;
  mealType: MealType;
  onSaved: () => void;
}) {
  const [favorites, setFavorites] = useState<FavoriteMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch favorites
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/nutrition/favorites");
        const json = await res.json();
        if (json.success) {
          setFavorites(json.data);
        }
      } catch {
        setError("Failed to load favorites");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleUseFavorite(fav: FavoriteMeal) {
    setSaving(fav.id);
    setError(null);

    try {
      const res = await fetch("/api/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          mealType,
          description: fav.name,
          calories: fav.totalCalories ?? 0,
          proteinG: fav.totalProteinG ?? 0,
          carbsG: fav.totalCarbsG ?? 0,
          fatG: fav.totalFatG ?? 0,
          fiberG: fav.totalFiberG ?? 0,
          source: "favorite",
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to save");
        return;
      }

      onSaved();
    } catch {
      setError("Network error while saving");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center py-12"
      >
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      {favorites.length === 0 ? (
        <div className="text-center py-8">
          <Star className="mx-auto h-8 w-8 text-text-muted/40 mb-2" />
          <p className="text-sm text-text-muted">No favorite meals saved yet</p>
          <p className="text-[11px] text-text-muted mt-1">
            Log meals to build your favorites library
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {favorites.map((fav) => (
            <button
              key={fav.id}
              onClick={() => handleUseFavorite(fav)}
              disabled={saving !== null}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-left transition-all hover:bg-bg-card-hover hover:border-border-hover",
                saving === fav.id && "opacity-60"
              )}
            >
              <Star className="h-4 w-4 text-accent-amber shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary font-medium truncate">
                  {fav.name}
                </p>
                <div className="flex items-center gap-3 mt-0.5 font-display text-[11px] tabular-nums text-text-muted">
                  <span>{Math.round(fav.totalCalories ?? 0)} cal</span>
                  <span className="text-accent-teal/70">
                    {Math.round(fav.totalProteinG ?? 0)}g P
                  </span>
                  <span>{Math.round(fav.totalCarbsG ?? 0)}g C</span>
                  <span>{Math.round(fav.totalFatG ?? 0)}g F</span>
                </div>
              </div>
              {saving === fav.id ? (
                <Loader2 className="h-4 w-4 animate-spin text-text-muted shrink-0" />
              ) : (
                <Plus className="h-4 w-4 text-text-muted shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 mt-3 rounded-lg bg-accent-red-dim px-3 py-2 text-xs text-accent-red">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}
    </motion.div>
  );
}

// =============================================================================
// Manual Input Method
// =============================================================================
function ManualInput({
  date,
  mealType,
  onSaved,
}: {
  date: string;
  mealType: MealType;
  onSaved: () => void;
}) {
  const [description, setDescription] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!description.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          mealType,
          description: description.trim(),
          calories: parseFloat(calories) || 0,
          proteinG: parseFloat(protein) || 0,
          carbsG: parseFloat(carbs) || 0,
          fatG: parseFloat(fat) || 0,
          fiberG: parseFloat(fiber) || 0,
          source: "manual",
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to save");
        return;
      }

      onSaved();
    } catch {
      setError("Network error while saving");
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-4"
    >
      {/* Description */}
      <label className="block space-y-1.5">
        <span className="font-display text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          Description
        </span>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Grilled chicken breast with rice"
          autoFocus
          className="w-full rounded-lg border border-border bg-bg-primary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal/50 focus:ring-1 focus:ring-accent-teal/20 transition-colors"
        />
      </label>

      {/* Macro inputs - grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MacroInput
          label="Calories"
          value={calories}
          onChange={setCalories}
          unit="kcal"
          step={1}
        />
        <MacroInput
          label="Protein"
          value={protein}
          onChange={setProtein}
          unit="g"
          step={0.1}
          highlight
        />
        <MacroInput
          label="Carbs"
          value={carbs}
          onChange={setCarbs}
          unit="g"
          step={0.1}
        />
        <MacroInput
          label="Fat"
          value={fat}
          onChange={setFat}
          unit="g"
          step={0.1}
        />
        <MacroInput
          label="Fiber"
          value={fiber}
          onChange={setFiber}
          unit="g"
          step={0.1}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-accent-red-dim px-3 py-2 text-xs text-accent-red">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!description.trim() || saving}
        className={cn(
          "w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-display text-sm font-semibold transition-all",
          description.trim() && !saving
            ? "bg-accent-teal text-bg-primary hover:bg-accent-teal/90"
            : "bg-bg-card-hover text-text-muted cursor-not-allowed"
        )}
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Check className="h-4 w-4" />
            Save Entry
          </>
        )}
      </button>
    </motion.div>
  );
}

// Reusable macro number input
function MacroInput({
  label,
  value,
  onChange,
  unit,
  step = 1,
  highlight = false,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  unit: string;
  step?: number;
  highlight?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span
        className={cn(
          "font-display text-[10px] font-semibold uppercase tracking-wider",
          highlight ? "text-accent-teal" : "text-text-muted"
        )}
      >
        {label}
      </span>
      <div className="relative">
        <input
          type="number"
          min={0}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className={cn(
            "w-full rounded-lg border border-border bg-bg-primary px-3 py-2 pr-10 text-sm text-text-primary tabular-nums focus:outline-none focus:border-accent-teal/50 focus:ring-1 focus:ring-accent-teal/20 transition-colors",
            highlight && "border-accent-teal/30"
          )}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-text-muted">
          {unit}
        </span>
      </div>
    </label>
  );
}
