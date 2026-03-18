import { Building2, KeyRound, LogOut, Pin, QrCode, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQRScanner } from "../qr-code/useQRScanner";
import {
  type Announcement,
  type Company,
  type Employee,
  addAuditEntry,
  getCompanyAnnouncements,
  getCompanyEmployees,
  toggleAttendance,
} from "../store";

interface Props {
  company: Company;
  t: (k: string) => string;
  onExit: () => void;
}

type ResultState = {
  name: string;
  action: "checkin" | "checkout";
} | null;

export default function KioskMode({ company, t, onExit }: Props) {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<ResultState>(null);
  const [error, setError] = useState("");
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [exitCode, setExitCode] = useState("");
  const [exitError, setExitError] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [pinnedAnnouncements, setPinnedAnnouncements] = useState<
    Announcement[]
  >([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scannedRef = useRef(false);

  const scanner = useQRScanner({ facingMode: "environment" });

  useEffect(() => {
    inputRef.current?.focus();
    const anns = getCompanyAnnouncements(company.id).filter((a) => a.pinned);
    setPinnedAnnouncements(anns);
    return () => {
      if (resultTimer.current) clearTimeout(resultTimer.current);
    };
  }, [company.id]);

  // Handle QR scan result
  useEffect(() => {
    if (scanner.qrResults.length > 0 && showScanner && !scannedRef.current) {
      scannedRef.current = true;
      scanner.stopScanning();
      setShowScanner(false);
      const scanned = scanner.qrResults[0].data.trim();
      scanner.clearResults();
      processCode(scanned);
    }
  });

  function processCode(empCode: string) {
    setError("");
    setResult(null);
    scannedRef.current = false;
    const employees: Employee[] = getCompanyEmployees(company.id);
    const emp = employees.find(
      (e) =>
        e.loginCode === empCode.trim() &&
        e.activeInCompanies?.[company.id] !== false,
    );
    if (!emp) {
      setError(t("kioskInvalidEmployee"));
      setCode("");
      inputRef.current?.focus();
      return;
    }
    const res = toggleAttendance(emp.id, company.id);
    if (!res.ok) {
      setError(res.message);
      setCode("");
      inputRef.current?.focus();
      return;
    }
    const actionType = res.recordType as "checkin" | "checkout";
    addAuditEntry({
      timestamp: Date.now(),
      actorType: "employee",
      actorId: emp.id,
      actorName: emp.fullName,
      companyId: company.id,
      action: actionType,
      details: `${emp.fullName} ${actionType === "checkin" ? t("checkinType") : t("checkoutType")} (kiosk)`,
    });
    setResult({ name: emp.fullName, action: actionType });
    setCode("");
    if (resultTimer.current) clearTimeout(resultTimer.current);
    resultTimer.current = setTimeout(() => {
      setResult(null);
      inputRef.current?.focus();
    }, 3000);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    processCode(code);
  }

  function handleExitAttempt() {
    if (exitCode.trim() === company.loginCode.trim()) {
      onExit();
    } else {
      setExitError(t("invalidCode"));
    }
  }

  function openScanner() {
    scannedRef.current = false;
    setShowScanner(true);
    scanner.startScanning();
  }

  function closeScanner() {
    setShowScanner(false);
    scanner.stopScanning();
    scanner.clearResults();
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Building2 size={20} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-lg">{company.name}</div>
            <div className="text-xs text-muted-foreground">
              {t("kioskMode")}
            </div>
          </div>
        </div>
        <button
          type="button"
          data-ocid="kiosk.open_modal_button"
          onClick={() => setShowExitDialog(true)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-border px-3 py-2 rounded-xl hover:bg-muted transition-colors"
        >
          <LogOut size={14} />
          {t("exitKioskMode")}
        </button>
      </div>

      {/* Pinned announcements */}
      {pinnedAnnouncements.length > 0 && (
        <div className="absolute top-20 left-4 right-4 max-w-md mx-auto space-y-2">
          {pinnedAnnouncements.map((ann) => (
            <div
              key={ann.id}
              className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-2 flex items-start gap-2 text-left"
            >
              <Pin size={12} className="text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-blue-300">
                  {ann.title}
                </div>
                <div className="text-xs text-blue-200/80">{ann.content}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main content */}
      <div className="w-full max-w-md text-center">
        {result ? (
          <div
            data-ocid="kiosk.success_state"
            className={`rounded-3xl p-10 border-2 ${
              result.action === "checkin"
                ? "border-green-500 bg-green-500/10"
                : "border-blue-500 bg-blue-500/10"
            }`}
          >
            <div className="text-6xl mb-4">
              {result.action === "checkin" ? "✅" : "👋"}
            </div>
            <div className="text-2xl font-bold mb-2">{result.name}</div>
            <div
              className={`text-lg font-semibold ${
                result.action === "checkin" ? "text-green-400" : "text-blue-400"
              }`}
            >
              {result.action === "checkin"
                ? t("kioskCheckInSuccess")
                : t("kioskCheckOutSuccess")}
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <div className="text-4xl mb-3">👤</div>
              <h1 className="text-2xl font-bold mb-2">{t("kioskEnterCode")}</h1>
              <p className="text-muted-foreground text-sm">{company.name}</p>
            </div>

            {error && (
              <div
                data-ocid="kiosk.error_state"
                className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                ref={inputRef}
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError("");
                }}
                placeholder={t("employeeCode")}
                maxLength={12}
                data-ocid="kiosk.input"
                className="w-full bg-card border-2 border-border focus:border-blue-500 rounded-2xl px-6 py-5 text-xl text-center font-mono tracking-widest focus:outline-none transition-colors"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
              />
              <button
                type="submit"
                data-ocid="kiosk.primary_button"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold py-5 rounded-2xl transition-colors"
              >
                <KeyRound size={20} className="inline mr-2" />
                {t("checkIn")} / {t("checkOut")}
              </button>
            </form>

            <button
              type="button"
              data-ocid="kiosk.secondary_button"
              onClick={openScanner}
              className="mt-4 w-full flex items-center justify-center gap-2 border border-border hover:bg-muted text-sm font-medium py-3 rounded-2xl transition-colors"
            >
              <QrCode size={16} />
              {t("scanQR")}
            </button>
          </>
        )}
      </div>

      {/* QR Scanner overlay */}
      {showScanner && (
        <div className="fixed inset-0 z-60 bg-black flex flex-col items-center justify-center">
          <div className="absolute top-4 right-4">
            <button
              type="button"
              onClick={closeScanner}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="text-white text-sm mb-4">{t("scanQR")}</div>
          {scanner.error ? (
            <div className="text-red-400 text-sm">{String(scanner.error)}</div>
          ) : (
            // biome-ignore lint/a11y/useMediaCaption: live QR scanner video
            <video
              ref={scanner.videoRef}
              autoPlay
              playsInline
              className="w-full max-w-sm rounded-2xl"
            />
          )}
          <canvas ref={scanner.canvasRef} className="hidden" />
        </div>
      )}

      {/* Exit dialog */}
      {showExitDialog && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-6">
          <div
            data-ocid="kiosk.dialog"
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{t("exitKioskMode")}</h3>
              <button
                type="button"
                onClick={() => {
                  setShowExitDialog(false);
                  setExitCode("");
                  setExitError("");
                }}
                className="p-1 hover:bg-muted rounded-lg"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {t("kioskExitConfirm")}
            </p>
            {exitError && (
              <div className="mb-3 text-red-400 text-sm">{exitError}</div>
            )}
            <input
              type="text"
              value={exitCode}
              onChange={(e) => {
                setExitCode(e.target.value);
                setExitError("");
              }}
              placeholder={t("companyCode")}
              data-ocid="kiosk.input"
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-mono mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="off"
            />
            <div className="flex gap-3">
              <button
                type="button"
                data-ocid="kiosk.confirm_button"
                onClick={handleExitAttempt}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-xl transition-colors"
              >
                {t("exitKioskMode")}
              </button>
              <button
                type="button"
                data-ocid="kiosk.cancel_button"
                onClick={() => {
                  setShowExitDialog(false);
                  setExitCode("");
                  setExitError("");
                }}
                className="flex-1 border border-border text-muted-foreground hover:bg-muted py-2.5 rounded-xl transition-colors"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
