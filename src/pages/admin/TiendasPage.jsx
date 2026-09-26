import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { useTiendas } from '../../hooks/useTiendas';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';

export default function TiendasPage() {
  const { tiendas, addTienda, updateTienda, deleteTienda } = useTiendas();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    await addTienda(newName.trim());
    setNewName('');
    setLoading(false);
  };

  const handleEdit = (tienda) => {
    setEditingId(tienda.id);
    setEditingName(tienda.nombre);
  };

  const handleSave = async () => {
    if (!editingName.trim()) return;
    await updateTienda(editingId, editingName.trim());
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar esta tienda? Se perderán todos sus productos y sesiones.')) {
      await deleteTienda(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-xl">
          <Store className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Gestión de Tiendas</h1>
          <p className="text-muted-foreground text-sm">{tiendas.length} tienda{tiendas.length !== 1 ? 's' : ''} registrada{tiendas.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Add new */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Nueva Tienda</p>
          <div className="flex gap-3">
            <Input
              placeholder="Nombre de la tienda..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="flex-1"
            />
            <Button onClick={handleAdd} disabled={!newName.trim() || loading}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <div className="space-y-2">
        <AnimatePresence>
          {tiendas.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 text-muted-foreground"
            >
              <Store className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No hay tiendas registradas</p>
              <p className="text-sm">Agrega una tienda para comenzar</p>
            </motion.div>
          ) : (
            tiendas.map(tienda => (
              <motion.div
                key={tienda.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Store className="w-5 h-5 text-primary" />
                    </div>

                    {editingId === tienda.id ? (
                      <Input
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditingId(null); }}
                        autoFocus
                        className="flex-1"
                      />
                    ) : (
                      <span className="flex-1 font-medium">{tienda.nombre}</span>
                    )}

                    <div className="flex gap-2">
                      {editingId === tienda.id ? (
                        <>
                          <Button size="icon" variant="ghost" onClick={handleSave} className="text-green-500 hover:text-green-600">
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(tienda)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(tienda.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
