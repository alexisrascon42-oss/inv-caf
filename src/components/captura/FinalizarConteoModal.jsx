import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  CheckCircle2, 
  FileSpreadsheet, 
  Layers, 
  Store, 
  User, 
  Download, 
  Loader2, 
  X, 
  PackageCheck,
  MapPin,
  Calendar
} from 'lucide-react';
import { Button } from '../ui/Button';
import { exportConsolidatedExcel } from '../../lib/excel';

export function FinalizarConteoModal({ isOpen, onClose, session, registros, onFinishSession }) {
  const [step, setStep] = useState('confirm'); // 'confirm' | 'sending' | 'success'
  const [downloadExcel, setDownloadExcel] = useState(true);
  const [exportedFile, setExportedFile] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // Calculate summary metrics
  const summary = useMemo(() => {
    const totalPzas = registros.reduce((acc, curr) => acc + (Number(curr.cantidad) || 0), 0);
    const distinctProds = new Set(registros.map(r => r.producto_id || r.nombre_temporal)).size;
    
    // Group by area
    const areasMap = {};
    registros.forEach(r => {
      const areaName = r.area || 'Sin Área';
      areasMap[areaName] = (areasMap[areaName] || 0) + (Number(r.cantidad) || 0);
    });

    const areaList = Object.entries(areasMap).map(([nombre, total]) => ({
      nombre,
      total
    })).sort((a, b) => b.total - a.total);

    return {
      totalPzas,
      distinctProds,
      totalRegistros: registros.length,
      areaList
    };
  }, [registros]);

  const handleSendConteo = async () => {
    setStep('sending');
    try {
      // Los registros ya quedaron guardados en Supabase al capturarlos.
      // Download Excel if checked
      if (downloadExcel && session?.conteoId) {
        try {
          const fileName = await exportConsolidatedExcel(session.conteoId);
          setExportedFile(fileName);
        } catch (excelErr) {
          console.warn("Excel download skipped or failed:", excelErr);
        }
      }

      // Small delay for smooth feedback
      setTimeout(() => {
        setStep('success');
      }, 700);

    } catch (err) {
      console.error("Error al finalizar conteo:", err);
      alert("Hubo un error al enviar el conteo. Por favor intenta de nuevo.");
      setStep('confirm');
    }
  };

  const handleManualExport = async () => {
    if (!session?.conteoId) return;
    setIsExporting(true);
    try {
      const fileName = await exportConsolidatedExcel(session.conteoId);
      setExportedFile(fileName);
    } catch (e) {
      alert("Error al generar Excel: " + e.message);
    }
    setIsExporting(false);
  };

  const handleClose = () => {
    setStep('confirm');
    setExportedFile(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-lg bg-card border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Step 1: Confirm / Review */}
        {step === 'confirm' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Enviar y Finalizar Conteo</h3>
                  <p className="text-xs text-muted-foreground">Verifica el resumen antes de procesar</p>
                </div>
              </div>
              <button 
                onClick={handleClose}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Session Context Info */}
              <div className="bg-muted/40 rounded-2xl p-4 space-y-2 border border-border/50 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-primary" /> Tienda:
                  </span>
                  <span className="font-semibold text-foreground">{session?.tiendaNombre || 'Tienda Activa'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" /> Sesión:
                  </span>
                  <span className="font-semibold text-foreground">{session?.conteoNombre || 'Sesión en curso'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-500" /> Operador:
                  </span>
                  <span className="font-semibold text-foreground">{session?.operador}</span>
                </div>
              </div>

              {/* Big KPI Totals */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                    Total Piezas
                  </span>
                  <span className="text-3xl font-extrabold text-foreground tracking-tight">
                    {summary.totalPzas}
                  </span>
                  <span className="text-xs text-muted-foreground block mt-0.5">unidades contadas</span>
                </div>

                <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 text-center">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider block mb-1">
                    Artículos
                  </span>
                  <span className="text-3xl font-extrabold text-foreground tracking-tight">
                    {summary.distinctProds}
                  </span>
                  <span className="text-xs text-muted-foreground block mt-0.5">SKUs distintos</span>
                </div>
              </div>

              {/* Desglose por áreas */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  Desglose por Áreas ({summary.areaList.length})
                </span>

                {summary.areaList.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2 text-center">
                    No se han registrado piezas en esta sesión aún.
                  </p>
                ) : (
                  <div className="bg-card border rounded-2xl divide-y overflow-hidden shadow-2xs">
                    {summary.areaList.map(a => (
                      <div key={a.nombre} className="px-4 py-2.5 flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{a.nombre}</span>
                        <span className="font-bold text-primary font-mono">{a.total} pzas</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Opción para descargar Excel */}
              <label className="flex items-center gap-3 p-3 bg-muted/30 border rounded-2xl cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="checkbox"
                  checked={downloadExcel}
                  onChange={(e) => setDownloadExcel(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                />
                <div className="text-xs">
                  <span className="font-semibold text-foreground block">Descargar reporte Excel consolidado (.xlsx)</span>
                  <span className="text-muted-foreground">Genera el archivo con resumen por área y desglose total</span>
                </div>
              </label>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t bg-muted/20 flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleClose} 
                className="flex-1 rounded-xl h-12"
              >
                Seguir Contando
              </Button>
              <Button 
                onClick={handleSendConteo} 
                disabled={summary.totalPzas === 0}
                className="flex-1 rounded-xl h-12 font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Confirmar y Enviar
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Sending Animation */}
        {step === 'sending' && (
          <div className="p-12 text-center space-y-4 my-auto">
            <Loader2 className="w-12 h-12 mx-auto text-emerald-600 animate-spin" />
            <h3 className="text-lg font-bold text-foreground">Procesando envío del conteo...</h3>
            <p className="text-sm text-muted-foreground">Guardando registros y consolidando información del inventario.</p>
          </div>
        )}

        {/* Step 3: Success Screen */}
        {step === 'success' && (
          <div className="p-6 text-center space-y-5 my-auto">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15 }}
              className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center shadow-lg"
            >
              <CheckCircle2 className="w-10 h-10" />
            </motion.div>

            <div>
              <h3 className="text-2xl font-extrabold text-foreground">¡Conteo Enviado con Éxito!</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Se han consolidado y enviado satisfactoriamente <strong className="text-foreground">{summary.totalPzas} piezas</strong> correspondientes a <strong className="text-foreground">{summary.distinctProds} artículos</strong>.
              </p>
            </div>

            {/* Excel Download button if needed again */}
            <div className="pt-2">
              <Button
                variant="outline"
                onClick={handleManualExport}
                disabled={isExporting}
                className="w-full rounded-xl h-11 border-dashed border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-medium text-xs flex items-center justify-center gap-2"
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {exportedFile ? `Descargar de nuevo (${exportedFile})` : 'Descargar Reporte Excel (.xlsx)'}
              </Button>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                onClick={() => {
                  handleClose();
                  if (onFinishSession) onFinishSession();
                }}
                className="w-full rounded-xl h-12 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
              >
                Finalizar y Salir
              </Button>
              <Button
                variant="ghost"
                onClick={handleClose}
                className="w-full rounded-xl text-xs text-muted-foreground hover:text-foreground"
              >
                Permanecer en la sesión
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
