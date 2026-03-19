import { Upload, X } from "lucide-react";
import { useRef, useState } from "react";

interface ParsedRow {
  name: string;
  department: string;
  shift: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (rows: ParsedRow[]) => void;
  t: (k: string) => string;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  // skip header row
  return lines
    .slice(1)
    .map((line) => {
      const parts = line.split(",").map((p) => p.trim());
      return {
        name: parts[0] || "",
        department: parts[1] || "",
        shift: parts[2] || "",
      };
    })
    .filter((r) => r.name);
}

export default function CSVImportModal({ open, onClose, onImport, t }: Props) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setRows([]);
    setError("");
    setStep("upload");
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      setError(t("csvInvalidFile"));
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        setError(t("csvNoData"));
        return;
      }
      setError("");
      setRows(parsed);
      setStep("preview");
    };
    reader.readAsText(file);
  }

  function handleImport() {
    onImport(rows);
    reset();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        data-ocid="csvimport.modal"
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-lg">{t("csvImportTitle")}</h2>
          <button
            type="button"
            data-ocid="csvimport.close_button"
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === "upload" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                <Upload size={28} className="text-blue-400" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {t("csvImportDesc")}
              </p>
              <p className="text-xs text-muted-foreground font-mono bg-muted px-3 py-1.5 rounded-lg">
                ad,departman,vardiya
              </p>
              <label
                data-ocid="csvimport.upload_button"
                className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
              >
                {t("csvImportBtn")}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFile}
                />
              </label>
              {error && (
                <p
                  data-ocid="csvimport.error_state"
                  className="text-sm text-red-400"
                >
                  {error}
                </p>
              )}
            </div>
          )}

          {step === "preview" && (
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                {rows.length} {t("csvImportPreview")}
              </p>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted text-left">
                      <th className="px-3 py-2 font-medium text-xs">
                        {t("csvColName")}
                      </th>
                      <th className="px-3 py-2 font-medium text-xs">
                        {t("csvColDept")}
                      </th>
                      <th className="px-3 py-2 font-medium text-xs">
                        {t("csvColShift")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr
                        key={`${row.name}-${i}`}
                        data-ocid={`csvimport.item.${i + 1}`}
                        className="border-t border-border"
                      >
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {row.department || "-"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {row.shift || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <button
            type="button"
            data-ocid="csvimport.cancel_button"
            onClick={handleClose}
            className="text-sm text-muted-foreground hover:text-foreground px-4 py-2 rounded-xl hover:bg-muted transition-colors"
          >
            {t("cancel")}
          </button>
          {step === "preview" && (
            <button
              type="button"
              data-ocid="csvimport.confirm_button"
              onClick={handleImport}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors"
            >
              {t("csvImport")} ({rows.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
