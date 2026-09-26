import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSpreadsheet, Plus, Lock, Unlock, Trash2, ChevronDown, ChevronUp, Calendar, KeyRound, Copy } from 'lucide-react';
import { useTiendas } from '../../hooks/useTiendas';
import { useConteos } from '../../hooks/useConteos';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

function ConteoRow({ conteo, onToggleEstado, onDelete }) {
  const estadoAbierto = conteo.estado === 'abierto';
  const fecha = conteo.created_at ? new Date(conteo.created_at).toLocaleDateString('es-MX', { dateStyle: 'medium' }) : '—';

  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3 sm:gap-4">
          <div className={`p-2 rounded-lg ${estadoAbierto ? 'bg-green-500/10' : 'bg-muted'}`}>
            <FileSpreadsheet className={`w-5 h-5 ${estadoAbierto ? 'text-green-600' : 'text-muted-foreground'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{conteo.nombre_sesion}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{fecha}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-primary font-semibold">
              <KeyRound className="w-3.5 h-3.5" /> Código: {conteo.codigo_acceso || 'Sin código'}
              {conteo.codigo_acceso && <button title="Copiar código" onClick={() => navigator.clipboard?.writeText(conteo.codigo_acceso)}><Copy className="w-3.5 h-3.5" /></button>}
            </div>
          </div>
          <Badge variant={estadoAbierto ? 'default' : 'secondary'}>
            {estadoAbierto ? 'Abierto' : 'Cerrado'}
          </Badge>
          <div className="flex gap-1 ml-auto">
            <Button
              size="icon"
              variant="ghost"
              title={estadoAbierto ? 'Cerrar sesión' : 'Reabrir sesión'}
              onClick={() => onToggleEstado(conteo)}
              className={estadoAbierto ? 'text-amber-500 hover:text-amber-600' : 'text-green-500 hover:text-green-600'}
            >
              {estadoAbierto ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(conteo)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TiendaSection({ tienda }) {
  const { conteos, addConteo, updateEstado, deleteConteo } = useConteos(tienda.id);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await addConteo(newName.trim());
    setNewName('');
  };

  const handleToggle = async (conteo) => {
    const next = conteo.estado === 'abierto' ? 'cerrado' : 'abierto';
    await updateEstado(conteo.id, next);
  };

  const handleDelete = async (conteo) => {
    if (window.confirm(`¿Eliminar sesión "${conteo.nombre_sesion}" y todos sus registros?`)) {
      await deleteConteo(conteo.id);
    }
  };

  const abiertos = conteos.filter(c => c.estado === 'abierto').length;

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="bg-primary/10 p-2 rounded-lg">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold">{tienda.nombre}</p>
          <p className="text-xs text-muted-foreground">{conteos.length} sesión(es) · {abiertos} abierta(s)</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t pt-4">
              {/* Add new sesion */}
              <div className="flex gap-2">
                <Input
                  placeholder="Nombre de la sesión (ej. Inventario Septiembre)..."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleAdd} disabled={!newName.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Conteos */}
              <div className="space-y-2">
                <AnimatePresence>
                  {conteos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay sesiones. Crea una nueva arriba.</p>
                  ) : (
                    conteos.map(c => (
                      <ConteoRow key={c.id} conteo={c} onToggleEstado={handleToggle} onDelete={handleDelete} />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default function SesionesPage() {
  const { tiendas } = useTiendas();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-xl">
          <FileSpreadsheet className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Sesiones de Conteo</h1>
          <p className="text-muted-foreground text-sm">Gestiona y controla las sesiones por tienda</p>
        </div>
      </div>

      {tiendas.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No hay tiendas registradas</p>
          <p className="text-sm">Primero crea una tienda en la sección de Tiendas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tiendas.map(tienda => (
            <TiendaSection key={tienda.id} tienda={tienda} />
          ))}
        </div>
      )}
    </div>
  );
}
