import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useTiendas } from '../../hooks/useTiendas';
import { useConteos } from '../../hooks/useConteos';
import { exportConsolidatedExcel } from '../../lib/excel';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

function ExportPanel({ tienda }) {
  const { conteos } = useConteos(tienda.id);
  const [selectedConteoId, setSelectedConteoId] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastFile, setLastFile] = useState('');
  const [error, setError] = useState('');

  const handleExport = async () => {
    if (!selectedConteoId) return;
    setLoading(true);
    setError('');
    setLastFile('');
    try {
      const fileName = await exportConsolidatedExcel(Number(selectedConteoId));
      setLastFile(fileName);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  if (conteos.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold">{tienda.nombre}</p>
            <p className="text-xs text-muted-foreground">{conteos.length} sesión(es)</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Sesión a exportar</label>
          <select
            className="flex h-11 w-full rounded-xl border border-input bg-transparent px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={selectedConteoId}
            onChange={e => { setSelectedConteoId(e.target.value); setLastFile(''); setError(''); }}
          >
            <option value="">Selecciona una sesión...</option>
            {conteos.map(c => (
              <option key={c.id} value={c.id}>
                {c.nombre_sesion} — {c.estado === 'abierto' ? '🟢 Abierto' : '🔒 Cerrado'}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {lastFile && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
            <CheckCircle className="w-4 h-4 shrink-0" />
            Archivo descargado: <span className="font-mono font-medium">{lastFile}</span>
          </div>
        )}

        <Button
          className="w-full"
          onClick={handleExport}
          disabled={!selectedConteoId || loading}
        >
          {loading
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generando...</>
            : <><Download className="w-4 h-4 mr-2" />Exportar Excel Consolidado</>
          }
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Genera un .xlsx con hoja de Resumen Consolidado y Desglose Detallado
        </p>
      </CardContent>
    </Card>
  );
}

export default function ExportarPage() {
  const { tiendas } = useTiendas();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-xl">
          <Download className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Exportar Reportes</h1>
          <p className="text-muted-foreground text-sm">Descarga el inventario consolidado en Excel</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">¿Qué contiene el reporte?</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Resumen consolidado: Total por producto y área</li>
            <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Desglose detallado: Cada registro con operador, área y cantidad</li>
            <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Productos no catalogados marcados</li>
          </ul>
        </CardContent>
      </Card>

      {tiendas.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Download className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No hay tiendas registradas</p>
          <p className="text-sm">Primero crea tiendas y sesiones de conteo</p>
        </div>
      ) : (
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {tiendas.map(tienda => (
            <ExportPanel key={tienda.id} tienda={tienda} />
          ))}
        </motion.div>
      )}
    </div>
  );
}
