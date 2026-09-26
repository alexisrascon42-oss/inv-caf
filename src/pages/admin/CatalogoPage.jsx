import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, ArrowRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useTiendas } from '../../hooks/useTiendas';
import { parseExcelFile, importProducts } from '../../lib/excel';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { cn } from '../../lib/utils';

const STEPS = ['upload', 'map', 'done'];

export default function CatalogoPage() {
  const { tiendas } = useTiendas();
  const [tiendaId, setTiendaId] = useState('');
  const [step, setStep] = useState('upload'); // upload | map | done
  const [parsedData, setParsedData] = useState(null); // { headers, rows }
  const [mapping, setMapping] = useState({ codigoBarras: '', nombreProducto: '', unidad: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    setError('');
    setLoading(true);
    try {
      const data = await parseExcelFile(file);
      setParsedData(data);
      // Auto-map columns by common names
      const auto = { codigoBarras: '', nombreProducto: '', unidad: '' };
      data.headers.forEach((h, i) => {
        const lower = h.toLowerCase();
        if (lower.includes('codigo') || lower.includes('sku') || lower.includes('barras')) auto.codigoBarras = String(i);
        if (lower.includes('nombre') || lower.includes('producto') || lower.includes('descripcion')) auto.nombreProducto = String(i);
        if (lower.includes('unidad') || lower.includes('um') || lower.includes('uom')) auto.unidad = String(i);
      });
      setMapping(auto);
      setStep('map');
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    if (!tiendaId || mapping.codigoBarras === '' || mapping.nombreProducto === '') {
      setError('Selecciona tienda y mapea los campos obligatorios (código y nombre).');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await importProducts(Number(tiendaId), parsedData.rows, {
        codigoBarras: Number(mapping.codigoBarras),
        nombreProducto: Number(mapping.nombreProducto),
        unidad: mapping.unidad !== '' ? Number(mapping.unidad) : null,
      });
      setResult(res);
      setStep('done');
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const reset = () => {
    setStep('upload');
    setParsedData(null);
    setMapping({ codigoBarras: '', nombreProducto: '', unidad: '' });
    setResult(null);
    setError('');
    setTiendaId('');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-xl">
          <Upload className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Importar Catálogo</h1>
          <p className="text-muted-foreground text-sm">Carga productos desde un archivo Excel o CSV</p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {['Subir archivo', 'Mapear columnas', 'Resultado'].map((label, i) => {
          const current = STEPS.indexOf(step);
          return (
            <React.Fragment key={label}>
              <div className={cn('flex items-center gap-1.5 font-medium', i <= current ? 'text-primary' : 'text-muted-foreground')}>
                <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold', i <= current ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                  {i + 1}
                </div>
                {label}
              </div>
              {i < 2 && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
            </React.Fragment>
          );
        })}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Tienda destino</label>
              <select
                className="flex h-11 w-full rounded-xl border border-input bg-transparent px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={tiendaId}
                onChange={e => setTiendaId(e.target.value)}
              >
                <option value="">Seleccione una tienda...</option>
                {tiendas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </CardContent>
          </Card>

          <div
            className={cn(
              'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors',
              dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
            )}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
            {loading ? (
              <Loader2 className="w-10 h-10 mx-auto mb-3 text-primary animate-spin" />
            ) : (
              <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            )}
            <p className="font-semibold mb-1">Arrastra tu archivo aquí</p>
            <p className="text-sm text-muted-foreground">o haz clic para seleccionar (.xlsx, .xls, .csv)</p>
          </div>
        </motion.div>
      )}

      {/* Step 2: Map columns */}
      {step === 'map' && parsedData && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mapeo de columnas</CardTitle>
              <p className="text-sm text-muted-foreground">Archivo: <strong>{parsedData.rows.length}</strong> filas detectadas</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Código de barras / SKU *', key: 'codigoBarras', required: true },
                { label: 'Nombre del producto *', key: 'nombreProducto', required: true },
                { label: 'Unidad de medida (opcional)', key: 'unidad', required: false },
              ].map(({ label, key, required }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-sm font-medium">{label}</label>
                  <select
                    className="flex h-11 w-full rounded-xl border border-input bg-transparent px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={mapping[key]}
                    onChange={e => setMapping(prev => ({ ...prev, [key]: e.target.value }))}
                  >
                    <option value="">{required ? 'Selecciona columna...' : '(No aplica)'}</option>
                    {parsedData.headers.map((h, i) => (
                      <option key={i} value={i}>{`Col ${i + 1}: ${h || '(sin nombre)'}`}</option>
                    ))}
                  </select>
                </div>
              ))}

              {/* Preview */}
              {parsedData.rows.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Vista previa (5 primeras filas)</p>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="text-xs w-full">
                      <thead className="bg-muted">
                        <tr>{parsedData.headers.map((h, i) => <th key={i} className="px-3 py-2 text-left font-medium">{h || `Col ${i+1}`}</th>)}</tr>
                      </thead>
                      <tbody>
                        {parsedData.rows.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-t">
                            {parsedData.headers.map((_, ci) => <td key={ci} className="px-3 py-2 truncate max-w-[120px]">{row[ci] ?? ''}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={reset} className="flex-1">Cancelar</Button>
            <Button onClick={handleImport} disabled={loading || !tiendaId || !mapping.codigoBarras || !mapping.nombreProducto} className="flex-1">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Importar
            </Button>
          </div>
        </motion.div>
      )}

      {/* Step 3: Result */}
      {step === 'done' && result && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <div>
                <h3 className="text-xl font-bold mb-1">¡Importación completada!</h3>
                <p className="text-muted-foreground text-sm">El catálogo ha sido actualizado exitosamente.</p>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[
                  { label: 'Nuevos', value: result.inserted, color: 'text-green-600' },
                  { label: 'Actualizados', value: result.updated, color: 'text-blue-600' },
                  { label: 'Errores', value: result.errors.length, color: 'text-destructive' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-muted/50 rounded-xl p-3">
                    <div className={`text-2xl font-bold ${color}`}>{value}</div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
              {result.errors.length > 0 && (
                <details className="text-left mt-2">
                  <summary className="text-sm text-destructive cursor-pointer">Ver errores ({result.errors.length})</summary>
                  <ul className="mt-2 text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                    {result.errors.map((e, i) => <li key={i}>Fila {e.row}: {e.reason}</li>)}
                  </ul>
                </details>
              )}
            </CardContent>
          </Card>
          <Button onClick={reset} variant="outline" className="w-full">Importar otro archivo</Button>
        </motion.div>
      )}
    </div>
  );
}
