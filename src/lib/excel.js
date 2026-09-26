import * as XLSX from 'xlsx';
import { requireSupabase } from './supabase';

/**
 * Parse an Excel (.xlsx/.csv) file and extract product data.
 * Returns an array of objects with detected columns.
 */
export async function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          reject(new Error('El archivo debe tener al menos una fila de encabezados y una de datos.'));
          return;
        }

        const headers = jsonData[0].map(h => String(h || '').trim());
        const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''));

        resolve({ headers, rows });
      } catch (err) {
        reject(new Error('No se pudo leer el archivo Excel: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Import products into database from parsed Excel data with column mapping.
 * @param {number} tiendaId - Store ID
 * @param {Array} rows - Row data from parsed Excel
 * @param {Object} mapping - { codigoBarras: colIndex, nombreProducto: colIndex, unidad: colIndex|null }
 */
export async function importProducts(tiendaId, rows, mapping) {
  const products = [];
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const codigoBarras = String(row[mapping.codigoBarras] || '').trim();
    const nombreProducto = String(row[mapping.nombreProducto] || '').trim();
    const unidad = mapping.unidad !== null && mapping.unidad !== undefined
      ? String(row[mapping.unidad] || 'pieza').trim()
      : 'pieza';

    if (!codigoBarras || !nombreProducto) {
      errors.push({ row: i + 2, reason: 'Código o nombre vacío' });
      continue;
    }

    products.push({
      tienda_id: tiendaId,
      codigo_barras: codigoBarras,
      nombre_producto: nombreProducto,
      unidad: unidad || 'pieza',
    });
  }

  const client = requireSupabase();
  let inserted = 0;
  let updated = 0;

  for (const product of products) {
    const { data: existing, error: findError } = await client
      .from('productos')
      .select('id')
      .eq('tienda_id', product.tienda_id)
      .eq('codigo_barras', product.codigo_barras)
      .maybeSingle();
    if (findError) throw findError;

    if (existing) {
      const { error } = await client.from('productos').update({
        nombre_producto: product.nombre_producto,
        unidad: product.unidad,
      }).eq('id', existing.id);
      if (error) throw error;
      updated++;
    } else {
      const { error } = await client.from('productos').insert(product);
      if (error) throw error;
      inserted++;
    }
  }

  return { inserted, updated, errors, total: products.length };
}

/**
 * Export consolidated Excel report for a counting session.
 * Generates dynamic columns per Area + Total General.
 */
export async function exportConsolidatedExcel(conteoId) {
  const client = requireSupabase();
  // Fetch all records for this session
  const [{ data: registros, error: registrosError }, { data: registrosNoCatalogados, error: noCatalogadosError }] = await Promise.all([
    client.from('registros_detalle').select('*, productos(*)').eq('conteo_id', conteoId),
    client.from('productos_no_catalogados').select('*').eq('conteo_id', conteoId)
  ]);
  if (registrosError) throw registrosError;
  if (noCatalogadosError) throw noCatalogadosError;

  // Get unique areas
  const areasSet = new Set();
  registros.forEach(r => areasSet.add(r.area));
  registrosNoCatalogados.forEach(r => areasSet.add(r.area));
  const areas = Array.from(areasSet).sort();

  // Build product map: { producto_id: { codigo, nombre, unidad, areas: { area: cantidad } } }
  const productMap = {};

  for (const reg of registros || []) {
    const product = reg.productos;
    if (!product) continue;

    const key = reg.producto_id;
    if (!productMap[key]) {
      productMap[key] = {
        codigo: product.codigo_barras,
        nombre: product.nombre_producto,
        unidad: product.unidad,
        areas: {},
      };
    }
    const areaKey = reg.area;
    productMap[key].areas[areaKey] = (productMap[key].areas[areaKey] || 0) + Number(reg.cantidad);
  }

  // Add non-cataloged products
  for (const reg of registrosNoCatalogados || []) {
    const key = `nc_${reg.id}`;
    if (!productMap[key]) {
      productMap[key] = {
        codigo: '(Sin catálogo)',
        nombre: reg.nombre_temporal,
        unidad: 'pieza',
        areas: {},
      };
    }
    const areaKey = reg.area;
    productMap[key].areas[areaKey] = (productMap[key].areas[areaKey] || 0) + Number(reg.cantidad);
  }

  // Build worksheet data
  const headers = ['Código / SKU', 'Producto', 'Unidad', ...areas, 'TOTAL GENERAL'];
  const wsData = [headers];

  for (const product of Object.values(productMap)) {
    const row = [product.codigo, product.nombre, product.unidad];
    let total = 0;
    for (const area of areas) {
      const qty = product.areas[area] || 0;
      row.push(qty);
      total += qty;
    }
    row.push(total);
    wsData.push(row);
  }

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Sheet 1: Resumen Consolidado
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, // Código
    { wch: 35 }, // Producto
    { wch: 10 }, // Unidad
    ...areas.map(() => ({ wch: 18 })),
    { wch: 18 }, // Total
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Resumen Consolidado');

  // Sheet 2: Desglose Detallado
  const detailHeaders = ['Producto', 'Operador', 'Área', 'Cantidad'];
  const detailData = [detailHeaders];

  for (const reg of registros || []) {
    const product = reg.productos;
    detailData.push([
      product ? product.nombre_producto : 'Desconocido',
      reg.operador_nombre,
      reg.area,
      Number(reg.cantidad),
    ]);
  }

  for (const reg of registrosNoCatalogados) {
    detailData.push([
      `[No catalogado] ${reg.nombre_temporal}`,
      reg.operador_nombre,
      reg.area,
      Number(reg.cantidad),
    ]);
  }

  const wsDetail = XLSX.utils.aoa_to_sheet(detailData);
  wsDetail['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Desglose Detallado');

  // Generate and download
  const fileName = `inventario_consolidado_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);

  return fileName;
}
