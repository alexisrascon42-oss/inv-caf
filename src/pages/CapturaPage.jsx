import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  PackageCheck, 
  Layers, 
  TrendingUp, 
  LogOut, 
  Store, 
  Search,
  Send
} from 'lucide-react';
import { SearchBar } from '../components/captura/SearchBar';
import { AreaChips } from '../components/captura/AreaChips';
import { CalculatorInput } from '../components/captura/CalculatorInput';
import { CalculatorKeypad } from '../components/captura/CalculatorKeypad';
import { ProductCard } from '../components/captura/ProductCard';
import { UndoToast } from '../components/captura/UndoToast';
import { FinalizarConteoModal } from '../components/captura/FinalizarConteoModal';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useProductos } from '../hooks/useProductos';
import { useRegistros } from '../hooks/useRegistros';
import { evaluateExpression } from '../lib/calculator';
import { requireSupabase } from '../lib/supabase';

export default function CapturaPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  
  useEffect(() => {
    const saved = localStorage.getItem('inv_session');
    if (saved) {
      try {
        setSession(JSON.parse(saved));
      } catch (e) {
        setSession(null);
      }
    }
  }, []);

  const { productos } = useProductos(session?.tiendaId);
  const { 
    registros, 
    addRegistro, 
    addRegistroNoCatalogado, 
    deleteRegistro 
  } = useRegistros(session?.conteoId);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isCustomCaptura, setIsCustomCaptura] = useState(false);
  const [cantidadInput, setCantidadInput] = useState('');
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  
  const [areas, setAreas] = useState([]);
  const [activeArea, setActiveArea] = useState('');

  const [lastAction, setLastAction] = useState(null); // { id, item, isNoCatalogado }

  // Load areas for the store
  useEffect(() => {
    if (session?.tiendaId) {
      requireSupabase().from('areas').select('*').eq('tienda_id', session.tiendaId).order('nombre').then(({ data, error }) => {
        if (error) throw error;
        const res = data || [];
        if (res.length === 0 && session.area) {
          const initialArea = { tienda_id: session.tiendaId, nombre: session.area };
          requireSupabase().from('areas').insert(initialArea).select().single().then(({ data: created, error: insertError }) => {
            if (insertError) throw insertError;
            setAreas([created]);
            setActiveArea(session.area);
          });
        } else {
          setAreas(res);
          setActiveArea(session.area || res[0]?.nombre || '');
        }
      }).catch(console.error);
    }
  }, [session]);

  const handleAddArea = async () => {
    const name = window.prompt("Nombre de la nueva área:");
    if (name && name.trim()) {
      const area = { tienda_id: session.tiendaId, nombre: name.trim() };
      const { data, error } = await requireSupabase().from('areas').insert(area).select().single();
      if (error) throw error;
      setAreas([...areas, data]);
      setActiveArea(data.nombre);
    }
  };

  // KPIs calculation
  const stats = useMemo(() => {
    const areaRegistros = registros.filter(r => r.area === activeArea);
    const piezasArea = areaRegistros.reduce((acc, curr) => acc + (Number(curr.cantidad) || 0), 0);
    const distinctProds = new Set(areaRegistros.map(r => r.producto_id || r.nombre_temporal)).size;
    const totalSesion = registros.reduce((acc, curr) => acc + (Number(curr.cantidad) || 0), 0);
    
    return {
      piezasArea,
      distinctProds,
      totalSesion
    };
  }, [registros, activeArea]);

  // Display all products by default, or filter when searching
  const displayedProducts = useMemo(() => {
    if (!searchQuery) return productos;
    const query = searchQuery.toLowerCase().trim();
    return productos.filter(p => {
      const matchName = p.nombre_producto?.toLowerCase().includes(query);
      const matchCode = p.codigo_barras?.toLowerCase().includes(query);
      return matchName || matchCode;
    });
  }, [productos, searchQuery]);

  const handleCapture = async (cantidadTotal) => {
    if (!activeArea || !session) return;
    
    let id;
    let isNoCatalogado = false;
    let itemData = { cantidad: cantidadTotal, area: activeArea };

    if (selectedProduct) {
      id = await addRegistro(selectedProduct.id, session.operador, activeArea, cantidadTotal);
      itemData.nombre_producto = selectedProduct.nombre_producto;
    } else if (searchQuery) {
      id = await addRegistroNoCatalogado(searchQuery, session.operador, activeArea, cantidadTotal);
      itemData.nombre_producto = `(No catalogado) ${searchQuery}`;
      isNoCatalogado = true;
    } else {
      return;
    }

    setLastAction({ id, item: itemData, isNoCatalogado });
    
    // Reset state
    setSelectedProduct(null);
    setIsCustomCaptura(false);
    setSearchQuery('');
    setCantidadInput('');
  };

  const handleUndo = async () => {
    if (lastAction) {
      await deleteRegistro(lastAction.id, lastAction.isNoCatalogado);
      setLastAction(null);
    }
  };

  const handleExitSession = () => {
    if (window.confirm("¿Deseas salir o cambiar de sesión?")) {
      navigate('/setup');
    }
  };

  // If no session found in localStorage
  if (!session) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-primary/10 p-4 rounded-3xl mb-4">
          <Store className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">No hay sesión activa</h2>
        <p className="text-muted-foreground text-sm max-w-sm mb-6">
          Selecciona una tienda, sesión de conteo y área para comenzar a registrar productos.
        </p>
        <Button size="lg" className="w-full max-w-xs" onClick={() => navigate('/setup')}>
          Configurar Sesión
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-background">
      {/* 1. Header / Sesión Activa */}
      <div className="bg-card border-b px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="bg-primary/10 p-2 rounded-xl text-primary shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm truncate text-foreground">
                {session.tiendaNombre || 'Tienda Activa'}
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {session.conteoNombre || 'Sesión en curso'} • Op: <strong className="text-foreground font-medium">{session.operador}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowFinalizarModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-3 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Enviar Conteo</span>
          </Button>

          <button 
            onClick={handleExitSession}
            title="Cambiar sesión / Salir"
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Área Activa y Barra de Búsqueda */}
      <div className="p-4 border-b bg-card/90 backdrop-blur-xl sticky top-0 z-10 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Área de conteo
          </span>
          <span className="text-xs text-primary font-medium">
            {areas.length} áreas registradas
          </span>
        </div>
        
        <AreaChips 
          areas={areas} 
          selectedArea={activeArea} 
          onSelect={setActiveArea} 
          onAdd={handleAddArea} 
        />

        <div className="pt-1">
          <SearchBar 
            onSearch={setSearchQuery} 
            placeholder="Buscar por nombre o SKU..." 
          />
        </div>
      </div>

      {/* 3. Contenido Principal */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 pb-32">
        <UndoToast 
          show={!!lastAction} 
          item={lastAction?.item} 
          onUndo={handleUndo} 
          onDismiss={() => setLastAction(null)} 
        />

        {/* KPI Cards del Área */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-card border border-border/80 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-medium uppercase tracking-wider truncate">En {activeArea}</span>
              <PackageCheck className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="text-2xl font-bold tracking-tight text-foreground">{stats.piezasArea}</span>
              <span className="text-[11px] text-muted-foreground ml-1">pzas</span>
            </div>
          </div>

          <div className="bg-card border border-border/80 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-medium uppercase tracking-wider truncate">Artículos</span>
              <Layers className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <span className="text-2xl font-bold tracking-tight text-foreground">{stats.distinctProds}</span>
              <span className="text-[11px] text-muted-foreground ml-1">ítems</span>
            </div>
          </div>

          <div className="bg-card border border-border/80 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-medium uppercase tracking-wider truncate">Total Global</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <span className="text-2xl font-bold tracking-tight text-foreground">{stats.totalSesion}</span>
              <span className="text-[11px] text-muted-foreground ml-1">total</span>
            </div>
          </div>
        </div>

        {/* Sección de Catálogo de Productos Completo */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-primary" />
              {searchQuery 
                ? `Resultados (${displayedProducts.length})` 
                : `Catálogo de Productos (${displayedProducts.length})`}
            </h3>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-xs text-primary font-medium hover:underline"
              >
                Ver todo el catálogo
              </button>
            )}
          </div>

          {productos.length === 0 ? (
            <div className="border border-dashed rounded-2xl p-8 text-center bg-muted/20">
              <Package className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="font-semibold text-sm text-foreground">Catálogo vacío</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                No hay productos en esta tienda. Puedes importar un catálogo desde el panel de Administrador.
              </p>
            </div>
          ) : displayedProducts.length === 0 && searchQuery ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 border border-dashed border-primary/50 bg-primary/5 rounded-2xl text-center space-y-3"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Producto no encontrado</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No existe un producto con el SKU o nombre "{searchQuery}".
                </p>
              </div>
              <Button 
                className="w-full rounded-xl" 
                onClick={() => {
                  setIsCustomCaptura(true);
                  setCantidadInput('');
                }}
              >
                Registrar "{searchQuery}" como no catalogado
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-2.5">
              {displayedProducts.map(p => (
                <ProductCard 
                  key={p.id} 
                  product={p} 
                  selected={selectedProduct?.id === p.id}
                  onClick={(prod) => {
                    setSelectedProduct(prod);
                    setIsCustomCaptura(false);
                    setCantidadInput('');
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Calculator Bottom Sheet (Captura de Cantidad) */}
      <AnimatePresence>
        {(selectedProduct || isCustomCaptura) && (
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-16 left-0 right-0 bg-card border-t p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] rounded-t-3xl z-40 max-h-[85vh] overflow-y-auto no-scrollbar"
          >
            <div className="max-w-md mx-auto space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-md">
                      {selectedProduct ? 'Capturando' : 'No Catalogado'}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      en {activeArea}
                    </span>
                  </div>
                  <h3 className="text-base font-bold truncate text-foreground">
                    {selectedProduct ? selectedProduct.nombre_producto : searchQuery}
                  </h3>
                  {selectedProduct && (
                    <p className="text-xs font-mono text-muted-foreground">
                      SKU: {selectedProduct.codigo_barras} • {selectedProduct.unidad}
                    </p>
                  )}
                </div>

                <button 
                  onClick={() => {
                    setSelectedProduct(null);
                    setIsCustomCaptura(false);
                    setCantidadInput('');
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground font-medium p-1"
                >
                  Cancelar
                </button>
              </div>
              
              <div className="flex space-x-3 items-end pt-1">
                <div className="flex-1">
                  <CalculatorInput 
                    value={cantidadInput} 
                    onChange={setCantidadInput} 
                    onEnter={handleCapture} 
                  />
                </div>
                <Button 
                  size="lg" 
                  className="h-14 px-8 rounded-xl shrink-0 font-bold text-base shadow-md" 
                  onClick={() => {
                    const res = evaluateExpression(cantidadInput);
                    if (res !== null && res > 0) handleCapture(res);
                  }}
                  disabled={!cantidadInput || evaluateExpression(cantidadInput) <= 0}
                >
                  Confirmar
                </Button>
              </div>

              {/* Calculadora táctil para multiplicaciones, sumas, restas y divisiones */}
              <CalculatorKeypad 
                value={cantidadInput} 
                onChange={setCantidadInput} 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Modal para Enviar y Finalizar Conteo */}
      <FinalizarConteoModal
        isOpen={showFinalizarModal}
        onClose={() => setShowFinalizarModal(false)}
        session={session}
        registros={registros}
        onFinishSession={() => {
          localStorage.removeItem('inv_session');
          navigate('/');
        }}
      />
    </div>
  );
}
