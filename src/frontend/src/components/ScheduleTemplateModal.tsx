import { BookTemplate, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

export interface ScheduleTemplate {
  id: string;
  name: string;
  assignments: { employeeId: string; day: number; shiftId: string }[];
  createdAt: string;
}

function storageKey(companyId: string) {
  return `sf_schedule_templates_${companyId}`;
}

function loadTemplates(companyId: string): ScheduleTemplate[] {
  try {
    const raw = localStorage.getItem(storageKey(companyId));
    if (!raw) return [];
    return JSON.parse(raw) as ScheduleTemplate[];
  } catch {
    return [];
  }
}

function saveTemplates(companyId: string, list: ScheduleTemplate[]): void {
  try {
    localStorage.setItem(storageKey(companyId), JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function saveScheduleTemplate(
  companyId: string,
  name: string,
  assignments: ScheduleTemplate["assignments"],
): void {
  const list = loadTemplates(companyId);
  list.unshift({
    id: `tpl_${Date.now()}`,
    name,
    assignments,
    createdAt: new Date().toISOString(),
  });
  saveTemplates(companyId, list);
}

export function getScheduleTemplates(companyId: string): ScheduleTemplate[] {
  return loadTemplates(companyId);
}

export function deleteScheduleTemplate(companyId: string, id: string): void {
  const list = loadTemplates(companyId).filter((t) => t.id !== id);
  saveTemplates(companyId, list);
}

interface SaveModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  t: (k: string) => string;
}

export function SaveTemplateModal({
  open,
  onClose,
  onSave,
  t,
}: SaveModalProps) {
  const [name, setName] = useState("");

  if (!open) return null;

  function handleSave() {
    if (!name.trim()) return;
    onSave(name.trim());
    setName("");
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        data-ocid="savetemplate.modal"
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-base">{t("saveTemplateTitle")}</h2>
          <button
            type="button"
            data-ocid="savetemplate.close_button"
            onClick={() => {
              setName("");
              onClose();
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4">
          <label
            htmlFor="template-name-input"
            className="text-sm text-muted-foreground mb-1.5 block"
          >
            {t("templateName")}
          </label>
          <input
            id="template-name-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder={t("templateName")}
            data-ocid="savetemplate.input"
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
        <div className="px-5 pb-4 flex justify-end gap-3">
          <button
            type="button"
            data-ocid="savetemplate.cancel_button"
            onClick={() => {
              setName("");
              onClose();
            }}
            className="text-sm text-muted-foreground hover:text-foreground px-4 py-2 rounded-xl hover:bg-muted transition-colors"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            data-ocid="savetemplate.confirm_button"
            disabled={!name.trim()}
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            {t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ApplyModalProps {
  open: boolean;
  companyId: string;
  onClose: () => void;
  onApply: (template: ScheduleTemplate) => void;
  t: (k: string) => string;
}

export function ApplyTemplateModal({
  open,
  companyId,
  onClose,
  onApply,
  t,
}: ApplyModalProps) {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);

  if (!open) return null;

  // load lazily when opened
  const list =
    templates.length === 0 ? getScheduleTemplates(companyId) : templates;

  function handleDelete(id: string) {
    deleteScheduleTemplate(companyId, id);
    setTemplates(getScheduleTemplates(companyId));
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        data-ocid="applytemplate.modal"
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-base">{t("applyTemplateTitle")}</h2>
          <button
            type="button"
            data-ocid="applytemplate.close_button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {list.length === 0 ? (
            <div
              data-ocid="applytemplate.empty_state"
              className="flex flex-col items-center gap-3 py-10 text-muted-foreground"
            >
              <BookTemplate size={28} className="opacity-40" />
              <p className="text-sm">{t("noTemplates")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {list.map((tpl, idx) => (
                <div
                  key={tpl.id}
                  data-ocid={`applytemplate.item.${idx + 1}`}
                  className="flex items-center justify-between bg-muted/40 rounded-xl px-4 py-3 border border-border"
                >
                  <div>
                    <div className="font-medium text-sm">{tpl.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {tpl.assignments.length}{" "}
                      {t("assignments") || "assignments"} &bull;{" "}
                      {new Date(tpl.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      data-ocid={`applytemplate.confirm_button.${idx + 1}`}
                      onClick={() => {
                        onApply(tpl);
                        onClose();
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {t("apply")}
                    </button>
                    <button
                      type="button"
                      data-ocid={`applytemplate.delete_button.${idx + 1}`}
                      onClick={() => handleDelete(tpl.id)}
                      className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="px-5 pb-4 flex justify-end border-t border-border pt-4">
          <button
            type="button"
            data-ocid="applytemplate.cancel_button"
            onClick={onClose}
            className="text-sm text-muted-foreground hover:text-foreground px-4 py-2 rounded-xl hover:bg-muted transition-colors"
          >
            {t("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
