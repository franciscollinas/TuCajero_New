import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

import { prisma } from './prisma';

const BCRYPT_ROUNDS = 12;

function generateDefaultPassword(): string {
  return randomBytes(16).toString('hex');
}

// 100 realistic Colombian pharmacy products
const PRODUCTS = [
  // === ANTIBIÓTICOS (10) ===
  { code: 'AMX500', barcode: '7701000000001', name: 'Amoxicilina 500 mg', category: 'Antibióticos', categoryColor: '#DC2626', price: 18500, cost: 12000, stock: 45, minStock: 10, criticalStock: 5, expiryDate: '2027-06-15', location: 'Estante A-1', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 20 },
  { code: 'AMP500', barcode: '7701000000002', name: 'Ampicilina 500 mg', category: 'Antibióticos', categoryColor: '#DC2626', price: 22000, cost: 14500, stock: 30, minStock: 8, criticalStock: 4, expiryDate: '2027-03-20', location: 'Estante A-1', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 15 },
  { code: 'AZI500', barcode: '7701000000003', name: 'Azitromicina 500 mg', category: 'Antibióticos', categoryColor: '#DC2626', price: 35000, cost: 23000, stock: 25, minStock: 5, criticalStock: 3, expiryDate: '2027-09-10', location: 'Estante A-2', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 10 },
  { code: 'CEF500', barcode: '7701000000004', name: 'Cefalexina 500 mg', category: 'Antibióticos', categoryColor: '#DC2626', price: 15000, cost: 9500, stock: 50, minStock: 10, criticalStock: 5, expiryDate: '2027-12-01', location: 'Estante A-2', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 20 },
  { code: 'CIP500', barcode: '7701000000005', name: 'Ciprofloxacino 500 mg', category: 'Antibióticos', categoryColor: '#DC2626', price: 12000, cost: 7500, stock: 40, minStock: 10, criticalStock: 5, expiryDate: '2027-08-15', location: 'Estante A-3', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 15 },
  { code: 'CLX500', barcode: '7701000000006', name: 'Clindamicina 300 mg', category: 'Antibióticos', categoryColor: '#DC2626', price: 28000, cost: 18000, stock: 20, minStock: 5, criticalStock: 3, expiryDate: '2027-05-20', location: 'Estante A-3', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 10 },
  { code: 'DOX100', barcode: '7701000000007', name: 'Doxiciclina 100 mg', category: 'Antibióticos', categoryColor: '#DC2626', price: 16000, cost: 10000, stock: 35, minStock: 8, criticalStock: 4, expiryDate: '2027-11-30', location: 'Estante A-4', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 15 },
  { code: 'ERY500', barcode: '7701000000008', name: 'Eritromicina 500 mg', category: 'Antibióticos', categoryColor: '#DC2626', price: 14000, cost: 9000, stock: 28, minStock: 8, criticalStock: 4, expiryDate: '2027-07-25', location: 'Estante A-4', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 12 },
  { code: 'LEV500', barcode: '7701000000009', name: 'Levofloxacino 500 mg', category: 'Antibióticos', categoryColor: '#DC2626', price: 32000, cost: 21000, stock: 18, minStock: 5, criticalStock: 3, expiryDate: '2027-10-15', location: 'Estante A-5', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 8 },
  { code: 'MET500', barcode: '7701000000010', name: 'Metronidazol 500 mg', category: 'Antibióticos', categoryColor: '#DC2626', price: 8500, cost: 5000, stock: 60, minStock: 15, criticalStock: 8, expiryDate: '2028-01-10', location: 'Estante A-5', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 25 },

  // === ANALGÉSICOS (10) ===
  { code: 'IBU400', barcode: '7701000000011', name: 'Ibuprofeno 400 mg', category: 'Analgésicos', categoryColor: '#2563EB', price: 12500, cost: 8300, stock: 80, minStock: 20, criticalStock: 10, expiryDate: '2027-12-15', location: 'Estante B-1', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 30 },
  { code: 'ACE500', barcode: '7701000000012', name: 'Acetaminofén 500 mg', category: 'Analgésicos', categoryColor: '#2563EB', price: 9800, cost: 6100, stock: 100, minStock: 25, criticalStock: 12, expiryDate: '2028-03-20', location: 'Estante B-1', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 40 },
  { code: 'DIC50', barcode: '7701000000013', name: 'Diclofenaco 50 mg', category: 'Analgésicos', categoryColor: '#2563EB', price: 11000, cost: 7000, stock: 55, minStock: 12, criticalStock: 6, expiryDate: '2027-09-30', location: 'Estante B-2', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 20 },
  { code: 'NAP500', barcode: '7701000000014', name: 'Naproxeno 500 mg', category: 'Analgésicos', categoryColor: '#2563EB', price: 15500, cost: 10000, stock: 40, minStock: 10, criticalStock: 5, expiryDate: '2027-11-15', location: 'Estante B-2', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 15 },
  { code: 'KET100', barcode: '7701000000015', name: 'Ketorolaco 10 mg', category: 'Analgésicos', categoryColor: '#2563EB', price: 8000, cost: 5000, stock: 70, minStock: 15, criticalStock: 8, expiryDate: '2027-08-25', location: 'Estante B-3', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 25 },
  { code: 'IND25', barcode: '7701000000016', name: 'Indometacina 25 mg', category: 'Analgésicos', categoryColor: '#2563EB', price: 13000, cost: 8500, stock: 30, minStock: 8, criticalStock: 4, expiryDate: '2027-06-10', location: 'Estante B-3', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 12 },
  { code: 'PIR1G', barcode: '7701000000017', name: 'Piroxicam 20 mg', category: 'Analgésicos', categoryColor: '#2563EB', price: 17000, cost: 11000, stock: 25, minStock: 6, criticalStock: 3, expiryDate: '2027-10-20', location: 'Estante B-4', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 10 },
  { code: 'TRM50', barcode: '7701000000018', name: 'Tramadol 50 mg', category: 'Analgésicos', categoryColor: '#2563EB', price: 25000, cost: 16000, stock: 20, minStock: 5, criticalStock: 3, expiryDate: '2027-07-15', location: 'Estante B-4', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 8 },
  { code: 'MEL15', barcode: '7701000000019', name: 'Meloxicam 15 mg', category: 'Analgésicos', categoryColor: '#2563EB', price: 14500, cost: 9500, stock: 35, minStock: 8, criticalStock: 4, expiryDate: '2028-02-28', location: 'Estante B-5', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 15 },
  { code: 'CEX500', barcode: '7701000000020', name: 'Celecoxib 200 mg', category: 'Analgésicos', categoryColor: '#2563EB', price: 45000, cost: 30000, stock: 15, minStock: 5, criticalStock: 2, expiryDate: '2028-01-15', location: 'Estante B-5', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 8 },

  // === VITAMINAS (10) ===
  { code: 'VTC1G', barcode: '7701000000021', name: 'Vitamina C 1000 mg', category: 'Vitaminas', categoryColor: '#16A34A', price: 21400, cost: 15400, stock: 50, minStock: 15, criticalStock: 8, expiryDate: '2028-06-10', location: 'Estante C-1', unitType: 'Frasco', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 20 },
  { code: 'VTD1000', barcode: '7701000000022', name: 'Vitamina D3 1000 UI', category: 'Vitaminas', categoryColor: '#16A34A', price: 28000, cost: 18000, stock: 40, minStock: 10, criticalStock: 5, expiryDate: '2028-08-15', location: 'Estante C-1', unitType: 'Frasco', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 15 },
  { code: 'VTE400', barcode: '7701000000023', name: 'Vitamina E 400 UI', category: 'Vitaminas', categoryColor: '#16A34A', price: 32000, cost: 21000, stock: 35, minStock: 8, criticalStock: 4, expiryDate: '2028-04-20', location: 'Estante C-2', unitType: 'Frasco', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 12 },
  { code: 'VTB100', barcode: '7701000000024', name: 'Vitamina B12 500 mcg', category: 'Vitaminas', categoryColor: '#16A34A', price: 18500, cost: 12000, stock: 45, minStock: 12, criticalStock: 6, expiryDate: '2028-03-10', location: 'Estante C-2', unitType: 'Frasco', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 18 },
  { code: 'ACF400', barcode: '7701000000025', name: 'Ácido Fólico 400 mcg', category: 'Vitaminas', categoryColor: '#16A34A', price: 12000, cost: 7500, stock: 60, minStock: 15, criticalStock: 8, expiryDate: '2028-07-25', location: 'Estante C-3', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 25 },
  { code: 'ZNC50', barcode: '7701000000026', name: 'Zinc 50 mg', category: 'Vitaminas', categoryColor: '#16A34A', price: 15000, cost: 9500, stock: 55, minStock: 12, criticalStock: 6, expiryDate: '2028-05-15', location: 'Estante C-3', unitType: 'Frasco', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 20 },
  { code: 'HRO500', barcode: '7701000000027', name: 'Hierro 50 mg', category: 'Vitaminas', categoryColor: '#16A34A', price: 9500, cost: 6000, stock: 70, minStock: 18, criticalStock: 9, expiryDate: '2028-02-28', location: 'Estante C-4', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 30 },
  { code: 'CAL600', barcode: '7701000000028', name: 'Calcio 600 mg + Vit D', category: 'Vitaminas', categoryColor: '#16A34A', price: 24000, cost: 15500, stock: 38, minStock: 10, criticalStock: 5, expiryDate: '2028-09-10', location: 'Estante C-4', unitType: 'Frasco', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 15 },
  { code: 'OMG3', barcode: '7701000000029', name: 'Omega 3 1000 mg', category: 'Vitaminas', categoryColor: '#16A34A', price: 38000, cost: 25000, stock: 28, minStock: 8, criticalStock: 4, expiryDate: '2028-01-20', location: 'Estante C-5', unitType: 'Frasco', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 12 },
  { code: 'MULV', barcode: '7701000000030', name: 'Multivitamínico Completo', category: 'Vitaminas', categoryColor: '#16A34A', price: 42000, cost: 28000, stock: 32, minStock: 8, criticalStock: 4, expiryDate: '2028-11-15', location: 'Estante C-5', unitType: 'Frasco', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 12 },

  // === ANTIGRIPALES (8) ===
  { code: 'DCL12', barcode: '7701000000031', name: 'Decrefen 12 horas', category: 'Antigripales', categoryColor: '#F59E0B', price: 16500, cost: 10500, stock: 45, minStock: 12, criticalStock: 6, expiryDate: '2027-10-15', location: 'Estante D-1', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 18 },
  { code: 'COR12', barcode: '7701000000032', name: 'Coryban D 12 horas', category: 'Antigripales', categoryColor: '#F59E0B', price: 14000, cost: 9000, stock: 50, minStock: 12, criticalStock: 6, expiryDate: '2027-11-20', location: 'Estante D-1', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 20 },
  { code: 'TAB12', barcode: '7701000000033', name: 'Tablet 12 horas', category: 'Antigripales', categoryColor: '#F59E0B', price: 15500, cost: 10000, stock: 40, minStock: 10, criticalStock: 5, expiryDate: '2027-09-30', location: 'Estante D-2', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 15 },
  { code: 'GRI12', barcode: '7701000000034', name: 'GripaDay Noche', category: 'Antigripales', categoryColor: '#F59E0B', price: 13000, cost: 8500, stock: 35, minStock: 10, criticalStock: 5, expiryDate: '2027-12-10', location: 'Estante D-2', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 15 },
  { code: 'ANT12', barcode: '7701000000035', name: 'Antigripal Noche', category: 'Antigripales', categoryColor: '#F59E0B', price: 11500, cost: 7500, stock: 55, minStock: 15, criticalStock: 8, expiryDate: '2028-02-15', location: 'Estante D-3', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 22 },
  { code: 'FLU12', barcode: '7701000000036', name: 'Fluimucil 600 mg', category: 'Antigripales', categoryColor: '#F59E0B', price: 22000, cost: 14000, stock: 30, minStock: 8, criticalStock: 4, expiryDate: '2027-08-20', location: 'Estante D-3', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 12 },
  { code: 'MUC500', barcode: '7701000000037', name: 'Mucosolvan 30 mg', category: 'Antigripales', categoryColor: '#F59E0B', price: 19500, cost: 12500, stock: 38, minStock: 10, criticalStock: 5, expiryDate: '2027-11-30', location: 'Estante D-4', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 15 },
  { code: 'BEN15', barcode: '7701000000038', name: 'Benadryl Jarabe 120 ml', category: 'Antigripales', categoryColor: '#F59E0B', price: 17000, cost: 11000, stock: 42, minStock: 12, criticalStock: 6, expiryDate: '2027-10-25', location: 'Estante D-4', unitType: 'Frasco', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 18 },

  // === ANTIÁCIDOS (7) ===
  { code: 'OMP20', barcode: '7701000000039', name: 'Omeprazol 20 mg', category: 'Antiácidos', categoryColor: '#8B5CF6', price: 8500, cost: 5500, stock: 90, minStock: 20, criticalStock: 10, expiryDate: '2028-04-15', location: 'Estante E-1', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 35 },
  { code: 'PNT40', barcode: '7701000000040', name: 'Pantoprazol 40 mg', category: 'Antiácidos', categoryColor: '#8B5CF6', price: 18000, cost: 11500, stock: 45, minStock: 12, criticalStock: 6, expiryDate: '2028-01-20', location: 'Estante E-1', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 18 },
  { code: 'RAN150', barcode: '7701000000041', name: 'Ranitidina 150 mg', category: 'Antiácidos', categoryColor: '#8B5CF6', price: 6500, cost: 4000, stock: 70, minStock: 18, criticalStock: 9, expiryDate: '2027-09-10', location: 'Estante E-2', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 28 },
  { code: 'FAM20', barcode: '7701000000042', name: 'Famotidina 20 mg', category: 'Antiácidos', categoryColor: '#8B5CF6', price: 9500, cost: 6000, stock: 55, minStock: 15, criticalStock: 8, expiryDate: '2027-12-30', location: 'Estante E-2', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 22 },
  { code: 'SUC1G', barcode: '7701000000043', name: 'Sucralfato 1 g', category: 'Antiácidos', categoryColor: '#8B5CF6', price: 11000, cost: 7000, stock: 40, minStock: 10, criticalStock: 5, expiryDate: '2028-03-15', location: 'Estante E-3', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 15 },
  { code: 'ALM500', barcode: '7701000000044', name: 'Almax Suspension 250 ml', category: 'Antiácidos', categoryColor: '#8B5CF6', price: 14500, cost: 9500, stock: 35, minStock: 10, criticalStock: 5, expiryDate: '2027-11-20', location: 'Estante E-3', unitType: 'Frasco', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 15 },
  { code: 'MLO15', barcode: '7701000000045', name: 'Metoclopramida 10 mg', category: 'Antiácidos', categoryColor: '#8B5CF6', price: 5500, cost: 3500, stock: 80, minStock: 20, criticalStock: 10, expiryDate: '2028-06-10', location: 'Estante E-4', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 30 },

  // === ANTIALÉRGICOS (7) ===
  { code: 'LOR10', barcode: '7701000000046', name: 'Loratadina 10 mg', category: 'Antialérgicos', categoryColor: '#EC4899', price: 7500, cost: 4500, stock: 85, minStock: 20, criticalStock: 10, expiryDate: '2028-05-20', location: 'Estante F-1', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 35 },
  { code: 'CET10', barcode: '7701000000047', name: 'Cetirizina 10 mg', category: 'Antialérgicos', categoryColor: '#EC4899', price: 8500, cost: 5500, stock: 75, minStock: 18, criticalStock: 9, expiryDate: '2028-07-15', location: 'Estante F-1', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 30 },
  { code: 'FEX180', barcode: '7701000000048', name: 'Fexofenadina 180 mg', category: 'Antialérgicos', categoryColor: '#EC4899', price: 22000, cost: 14000, stock: 35, minStock: 10, criticalStock: 5, expiryDate: '2028-02-28', location: 'Estante F-2', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 15 },
  { code: 'LEV5', barcode: '7701000000049', name: 'Levocetirizina 5 mg', category: 'Antialérgicos', categoryColor: '#EC4899', price: 18000, cost: 11500, stock: 40, minStock: 10, criticalStock: 5, expiryDate: '2028-04-10', location: 'Estante F-2', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 15 },
  { code: 'DES5', barcode: '7701000000050', name: 'Desloratadina 5 mg', category: 'Antialérgicos', categoryColor: '#EC4899', price: 16500, cost: 10500, stock: 45, minStock: 12, criticalStock: 6, expiryDate: '2028-08-25', location: 'Estante F-3', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 18 },
  { code: 'MON10', barcode: '7701000000051', name: 'Montelukast 10 mg', category: 'Antialérgicos', categoryColor: '#EC4899', price: 28000, cost: 18000, stock: 25, minStock: 8, criticalStock: 4, expiryDate: '2028-01-15', location: 'Estante F-3', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 10 },
  { code: 'PRE50', barcode: '7701000000052', name: 'Prednisolona 5 mg', category: 'Antialérgicos', categoryColor: '#EC4899', price: 6500, cost: 4000, stock: 65, minStock: 15, criticalStock: 8, expiryDate: '2027-11-30', location: 'Estante F-4', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 25 },

  // === ANTIHIPERTENSIVOS (8) ===
  { code: 'LOS50', barcode: '7701000000053', name: 'Losartán 50 mg', category: 'Antihipertensivos', categoryColor: '#6366F1', price: 14500, cost: 9500, stock: 60, minStock: 15, criticalStock: 8, expiryDate: '2028-09-15', location: 'Estante G-1', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 25 },
  { code: 'ENL10', barcode: '7701000000054', name: 'Enalapril 10 mg', category: 'Antihipertensivos', categoryColor: '#6366F1', price: 8500, cost: 5500, stock: 70, minStock: 18, criticalStock: 9, expiryDate: '2028-06-20', location: 'Estante G-1', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 28 },
  { code: 'AML5', barcode: '7701000000055', name: 'Amlodipino 5 mg', category: 'Antihipertensivos', categoryColor: '#6366F1', price: 11000, cost: 7000, stock: 55, minStock: 15, criticalStock: 8, expiryDate: '2028-04-10', location: 'Estante G-2', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 22 },
  { code: 'CAR50', barcode: '7701000000056', name: 'Captopril 25 mg', category: 'Antihipertensivos', categoryColor: '#6366F1', price: 6500, cost: 4000, stock: 80, minStock: 20, criticalStock: 10, expiryDate: '2028-07-30', location: 'Estante G-2', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 30 },
  { code: 'HCT25', barcode: '7701000000057', name: 'Hidroclorotiazida 25 mg', category: 'Antihipertensivos', categoryColor: '#6366F1', price: 5500, cost: 3500, stock: 90, minStock: 20, criticalStock: 10, expiryDate: '2028-10-15', location: 'Estante G-3', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 35 },
  { code: 'ATN50', barcode: '7701000000058', name: 'Atenolol 50 mg', category: 'Antihipertensivos', categoryColor: '#6366F1', price: 7500, cost: 4500, stock: 65, minStock: 18, criticalStock: 9, expiryDate: '2028-03-20', location: 'Estante G-3', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 25 },
  { code: 'PRO10', barcode: '7701000000059', name: 'Propranolol 40 mg', category: 'Antihipertensivos', categoryColor: '#6366F1', price: 6000, cost: 3800, stock: 75, minStock: 18, criticalStock: 9, expiryDate: '2028-05-25', location: 'Estante G-4', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 30 },
  { code: 'VAL80', barcode: '7701000000060', name: 'Valsartán 80 mg', category: 'Antihipertensivos', categoryColor: '#6366F1', price: 18500, cost: 12000, stock: 40, minStock: 10, criticalStock: 5, expiryDate: '2028-08-10', location: 'Estante G-4', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 15 },

  // === ANTIDIABÉTICOS (7) ===
  { code: 'MET850', barcode: '7701000000061', name: 'Metformina 850 mg', category: 'Antidiabéticos', categoryColor: '#14B8A6', price: 9500, cost: 6000, stock: 80, minStock: 20, criticalStock: 10, expiryDate: '2028-11-15', location: 'Estante H-1', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 30 },
  { code: 'GLI5', barcode: '7701000000062', name: 'Glibenclamida 5 mg', category: 'Antidiabéticos', categoryColor: '#14B8A6', price: 6500, cost: 4000, stock: 70, minStock: 18, criticalStock: 9, expiryDate: '2028-07-20', location: 'Estante H-1', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 28 },
  { code: 'GLI80', barcode: '7701000000063', name: 'Gliclazida 80 mg', category: 'Antidiabéticos', categoryColor: '#14B8A6', price: 12000, cost: 7500, stock: 50, minStock: 12, criticalStock: 6, expiryDate: '2028-09-10', location: 'Estante H-2', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 20 },
  { code: 'SIT100', barcode: '7701000000064', name: 'Sitagliptina 100 mg', category: 'Antidiabéticos', categoryColor: '#14B8A6', price: 85000, cost: 55000, stock: 15, minStock: 5, criticalStock: 3, expiryDate: '2028-12-20', location: 'Estante H-2', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 8 },
  { code: 'EMA1000', barcode: '7701000000065', name: 'Empagliflozina 25 mg', category: 'Antidiabéticos', categoryColor: '#14B8A6', price: 120000, cost: 78000, stock: 12, minStock: 4, criticalStock: 2, expiryDate: '2029-01-15', location: 'Estante H-3', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 6 },
  { code: 'INS100', barcode: '7701000000066', name: 'Insulina NPH 100 UI', category: 'Antidiabéticos', categoryColor: '#14B8A6', price: 45000, cost: 30000, stock: 20, minStock: 8, criticalStock: 4, expiryDate: '2027-06-30', location: 'Nevera', unitType: 'Frasco', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 10 },
  { code: 'INSR', barcode: '7701000000067', name: 'Insulina Regular 100 UI', category: 'Antidiabéticos', categoryColor: '#14B8A6', price: 42000, cost: 28000, stock: 22, minStock: 8, criticalStock: 4, expiryDate: '2027-07-15', location: 'Nevera', unitType: 'Frasco', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 10 },

  // === BEBIDAS (10) ===
  { code: 'POW1L', barcode: '7702000000068', name: 'Powerade 1L', category: 'Bebidas', categoryColor: '#F97316', price: 4500, cost: 3000, stock: 120, minStock: 30, criticalStock: 15, expiryDate: '2027-04-15', location: 'Nevera', unitType: 'Botella', conversionFactor: 1, taxRate: 0.19, suggestedPurchaseQty: 50 },
  { code: 'GAT500', barcode: '7702000000069', name: 'Gatorade 500 ml', category: 'Bebidas', categoryColor: '#F97316', price: 3500, cost: 2300, stock: 150, minStock: 40, criticalStock: 20, expiryDate: '2027-05-20', location: 'Nevera', unitType: 'Botella', conversionFactor: 1, taxRate: 0.19, suggestedPurchaseQty: 60 },
  { code: 'AGU600', barcode: '7702000000070', name: 'Agua Cristal 600 ml', category: 'Bebidas', categoryColor: '#F97316', price: 1500, cost: 800, stock: 200, minStock: 50, criticalStock: 25, expiryDate: '2028-12-31', location: 'Estante J-1', unitType: 'Botella', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 80 },
  { code: 'COC600', barcode: '7702000000071', name: 'Coca-Cola 600 ml', category: 'Bebidas', categoryColor: '#F97316', price: 3000, cost: 2000, stock: 100, minStock: 30, criticalStock: 15, expiryDate: '2027-06-30', location: 'Estante J-1', unitType: 'Botella', conversionFactor: 1, taxRate: 0.19, suggestedPurchaseQty: 40 },
  { code: 'SPR600', barcode: '7702000000072', name: 'Sprite 600 ml', category: 'Bebidas', categoryColor: '#F97316', price: 3000, cost: 2000, stock: 90, minStock: 25, criticalStock: 12, expiryDate: '2027-07-15', location: 'Estante J-2', unitType: 'Botella', conversionFactor: 1, taxRate: 0.19, suggestedPurchaseQty: 35 },
  { code: 'MAN600', barcode: '7702000000073', name: 'Manzana Postobón 600 ml', category: 'Bebidas', categoryColor: '#F97316', price: 2800, cost: 1800, stock: 85, minStock: 25, criticalStock: 12, expiryDate: '2027-08-20', location: 'Estante J-2', unitType: 'Botella', conversionFactor: 1, taxRate: 0.19, suggestedPurchaseQty: 35 },
  { code: 'COL600', barcode: '7702000000074', name: 'Colombiana 600 ml', category: 'Bebidas', categoryColor: '#F97316', price: 2800, cost: 1800, stock: 80, minStock: 25, criticalStock: 12, expiryDate: '2027-09-10', location: 'Estante J-3', unitType: 'Botella', conversionFactor: 1, taxRate: 0.19, suggestedPurchaseQty: 30 },
  { code: 'COST', barcode: '7702000000075', name: 'Costeñita 350 ml', category: 'Bebidas', categoryColor: '#F97316', price: 2500, cost: 1600, stock: 95, minStock: 30, criticalStock: 15, expiryDate: '2027-10-15', location: 'Estante J-3', unitType: 'Botella', conversionFactor: 1, taxRate: 0.19, suggestedPurchaseQty: 40 },
  { code: 'TROP', barcode: '7702000000076', name: 'Tropicana 330 ml', category: 'Bebidas', categoryColor: '#F97316', price: 4000, cost: 2600, stock: 70, minStock: 20, criticalStock: 10, expiryDate: '2027-11-20', location: 'Nevera', unitType: 'Botella', conversionFactor: 1, taxRate: 0.19, suggestedPurchaseQty: 28 },
  { code: 'ALOE', barcode: '7702000000077', name: 'Aloe Vera Drink 500 ml', category: 'Bebidas', categoryColor: '#F97316', price: 5500, cost: 3500, stock: 60, minStock: 15, criticalStock: 8, expiryDate: '2027-12-30', location: 'Estante J-4', unitType: 'Botella', conversionFactor: 1, taxRate: 0.19, suggestedPurchaseQty: 25 },

  // === DULCES COLOMBIANOS (8) ===
  { code: 'JET', barcode: '7703000000078', name: 'Jet Chocolate 40 g', category: 'Dulces', categoryColor: '#A855F7', price: 2500, cost: 1500, stock: 150, minStock: 40, criticalStock: 20, expiryDate: '2027-08-15', location: 'Mostrador', unitType: 'Unidad', conversionFactor: 1, taxRate: 0.19, suggestedPurchaseQty: 60 },
  { code: 'CRI', barcode: '7703000000079', name: 'Crispetas Dulces 100 g', category: 'Dulces', categoryColor: '#A855F7', price: 3000, cost: 1800, stock: 100, minStock: 30, criticalStock: 15, expiryDate: '2027-09-20', location: 'Mostrador', unitType: 'Bolsa', conversionFactor: 1, taxRate: 0.19, suggestedPurchaseQty: 40 },
  { code: 'BOMB', barcode: '7703000000080', name: 'Bombones Surtidos 200 g', category: 'Dulces', categoryColor: '#A855F7', price: 6500, cost: 4000, stock: 60, minStock: 15, criticalStock: 8, expiryDate: '2027-10-30', location: 'Mostrador', unitType: 'Caja', conversionFactor: 1, taxRate: 0.19, suggestedPurchaseQty: 25 },
  { code: 'CHIC', barcode: '7703000000081', name: 'Chicles Trident 10 u', category: 'Dulces', categoryColor: '#A855F7', price: 2000, cost: 1200, stock: 200, minStock: 50, criticalStock: 25, expiryDate: '2028-03-15', location: 'Mostrador', unitType: 'Caja', conversionFactor: 1, taxRate: 0.19, suggestedPurchaseQty: 80 },
  { code: 'GOMA', barcode: '7703000000082', name: 'Gomitas Haribo 100 g', category: 'Dulces', categoryColor: '#A855F7', price: 5000, cost: 3200, stock: 80, minStock: 20, criticalStock: 10, expiryDate: '2027-12-20', location: 'Mostrador', unitType: 'Bolsa', conversionFactor: 1, taxRate: 0.19, suggestedPurchaseQty: 30 },
  { code: 'BISQ', barcode: '7703000000083', name: 'Bisquets Cri Cri 150 g', category: 'Dulces', categoryColor: '#A855F7', price: 3500, cost: 2200, stock: 90, minStock: 25, criticalStock: 12, expiryDate: '2027-11-10', location: 'Estante K-1', unitType: 'Paquete', conversionFactor: 1, taxRate: 0.19, suggestedPurchaseQty: 35 },
  { code: 'TOST', barcode: '7703000000084', name: 'Tostadas de Maíz 100 g', category: 'Dulces', categoryColor: '#A855F7', price: 2800, cost: 1700, stock: 75, minStock: 20, criticalStock: 10, expiryDate: '2027-10-25', location: 'Estante K-1', unitType: 'Paquete', conversionFactor: 1, taxRate: 0.19, suggestedPurchaseQty: 30 },
  { code: 'CHOC', barcode: '7703000000085', name: 'Chocolate Jet 100 g', category: 'Dulces', categoryColor: '#A855F7', price: 4500, cost: 2800, stock: 85, minStock: 25, criticalStock: 12, expiryDate: '2028-01-15', location: 'Estante K-2', unitType: 'Barra', conversionFactor: 1, taxRate: 0.19, suggestedPurchaseQty: 35 },

  // === CUIDADO PERSONAL (7) ===
  { code: 'ALC70', barcode: '7701000000086', name: 'Alcohol Antiséptico 70% 500 ml', category: 'Cuidado Personal', categoryColor: '#D97706', price: 7600, cost: 4300, stock: 60, minStock: 15, criticalStock: 8, expiryDate: '2027-06-15', location: 'Estante L-1', unitType: 'Botella', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 25 },
  { code: 'JAB', barcode: '7701000000087', name: 'Jabón Antiséptico 250 ml', category: 'Cuidado Personal', categoryColor: '#D97706', price: 8500, cost: 5500, stock: 45, minStock: 12, criticalStock: 6, expiryDate: '2028-03-20', location: 'Estante L-1', unitType: 'Frasco', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 18 },
  { code: 'CREM', barcode: '7701000000088', name: 'Crema Hidratante 200 ml', category: 'Cuidado Personal', categoryColor: '#D97706', price: 18000, cost: 11500, stock: 35, minStock: 10, criticalStock: 5, expiryDate: '2028-09-10', location: 'Estante L-2', unitType: 'Tubo', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 15 },
  { code: 'PROT', barcode: '7701000000089', name: 'Protector Solar SPF 50', category: 'Cuidado Personal', categoryColor: '#D97706', price: 35000, cost: 22000, stock: 25, minStock: 8, criticalStock: 4, expiryDate: '2028-06-30', location: 'Estante L-2', unitType: 'Tubo', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 10 },
  { code: 'REPE', barcode: '7701000000090', name: 'Repelente de Insectos 200 ml', category: 'Cuidado Personal', categoryColor: '#D97706', price: 12500, cost: 8000, stock: 40, minStock: 12, criticalStock: 6, expiryDate: '2028-04-15', location: 'Estante L-3', unitType: 'Frasco', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 15 },
  { code: 'COND', barcode: '7701000000091', name: 'Condones x3 Unidades', category: 'Cuidado Personal', categoryColor: '#D97706', price: 8000, cost: 5000, stock: 100, minStock: 25, criticalStock: 12, expiryDate: '2029-06-30', location: 'Mostrador', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 40 },
  { code: 'LUB', barcode: '7701000000092', name: 'Lubricante Íntimo 50 ml', category: 'Cuidado Personal', categoryColor: '#D97706', price: 15000, cost: 9500, stock: 30, minStock: 8, criticalStock: 4, expiryDate: '2029-03-15', location: 'Mostrador', unitType: 'Tubo', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 12 },

  // === DISPOSITIVOS MÉDICOS (8) ===
  { code: 'TERM', barcode: '7701000000093', name: 'Termómetro Digital', category: 'Dispositivos Médicos', categoryColor: '#7C3AED', price: 28900, cost: 20400, stock: 25, minStock: 8, criticalStock: 4, expiryDate: null, location: 'Mostrador', unitType: 'Unidad', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 10 },
  { code: 'JER10', barcode: '7701000000094', name: 'Jeringa 10 ml Estéril', category: 'Dispositivos Médicos', categoryColor: '#7C3AED', price: 14500, cost: 9200, stock: 50, minStock: 15, criticalStock: 8, expiryDate: '2028-02-03', location: 'Estante M-1', unitType: 'Paquete', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 20 },
  { code: 'VEND', barcode: '7701000000095', name: 'Venda Elástica 10 cm', category: 'Dispositivos Médicos', categoryColor: '#7C3AED', price: 6500, cost: 4000, stock: 40, minStock: 12, criticalStock: 6, expiryDate: null, location: 'Estante M-1', unitType: 'Unidad', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 15 },
  { code: 'GASA', barcode: '7701000000096', name: 'Gasas Estériles x10', category: 'Dispositivos Médicos', categoryColor: '#7C3AED', price: 5500, cost: 3500, stock: 55, minStock: 15, criticalStock: 8, expiryDate: null, location: 'Estante M-2', unitType: 'Paquete', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 20 },
  { code: 'CURA', barcode: '7701000000097', name: 'Curitas x20 Unidades', category: 'Dispositivos Médicos', categoryColor: '#7C3AED', price: 4500, cost: 2800, stock: 80, minStock: 20, criticalStock: 10, expiryDate: null, location: 'Estante M-2', unitType: 'Caja', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 30 },
  { code: 'ALGO', barcode: '7701000000098', name: 'Algodón 100 g', category: 'Dispositivos Médicos', categoryColor: '#7C3AED', price: 3500, cost: 2200, stock: 65, minStock: 18, criticalStock: 9, expiryDate: null, location: 'Estante M-3', unitType: 'Paquete', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 25 },
  { code: 'TENS', barcode: '7701000000099', name: 'Tensiómetro Digital', category: 'Dispositivos Médicos', categoryColor: '#7C3AED', price: 85000, cost: 55000, stock: 10, minStock: 3, criticalStock: 2, expiryDate: null, location: 'Mostrador', unitType: 'Unidad', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 5 },
  { code: 'OXIM', barcode: '7701000000100', name: 'Oxímetro de Pulso', category: 'Dispositivos Médicos', categoryColor: '#7C3AED', price: 65000, cost: 42000, stock: 12, minStock: 4, criticalStock: 2, expiryDate: null, location: 'Mostrador', unitType: 'Unidad', conversionFactor: 1, taxRate: 0, suggestedPurchaseQty: 5 },
];

export async function seedProducts(): Promise<void> {
  const forceSeed = process.env.SEED_PRODUCTS_FORCE === 'true';
  const existingProducts = await prisma.product.count();
  const existingCategories = await prisma.category.count();

  // Bootstrap only: seed products only on fresh install (no categories exist yet).
  // If categories exist but products don't, respect user's choice to delete products.
  if (!forceSeed) {
    if (existingProducts > 0) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(
          `ℹ️ seedProducts skipped (existing products: ${existingProducts}). Set SEED_PRODUCTS_FORCE=true to reseed.`,
        );
      }
      return;
    }
    
    // Only seed if this is a completely fresh install (no categories)
    if (existingCategories > 0) {
      console.log(
        `ℹ️ seedProducts skipped (categories exist: ${existingCategories}, but no products). Products were intentionally deleted.`,
      );
      return;
    }
  }

  // --- ADMIN USER ---
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (!existingAdmin) {
    const defaultPassword = generateDefaultPassword();
    const adminPassword = await bcrypt.hash(defaultPassword, BCRYPT_ROUNDS);

    await prisma.user.create({
      data: {
        username: 'admin',
        password: adminPassword,
        fullName: 'Administrador',
        role: 'ADMIN',
        active: true,
        mustChangePassword: true,
      },
    });

    console.log('═══════════════════════════════════════════════════');
    console.log('  TuCajero - Default Admin Account Created');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Username: admin`);
    console.log(`  Password: ${defaultPassword}`);
    console.log('');
    console.log('  ⚠️  This password was auto-generated.');
    console.log('  You will be required to change it on first login.');
    console.log('═══════════════════════════════════════════════════');
  }

  // --- CATEGORIES & PRODUCTS ---
  const categoryMap = new Map<string, { id: number; color: string }>();

  for (const product of PRODUCTS) {
    // Get or create category
    if (!categoryMap.has(product.category)) {
      const cat = await prisma.category.upsert({
        where: { name: product.category },
        update: { color: product.categoryColor },
        create: { name: product.category, color: product.categoryColor },
      });
      categoryMap.set(product.category, { id: cat.id, color: cat.color ?? product.categoryColor });
    }

    const cat = categoryMap.get(product.category)!;

    const exists = await prisma.product.findUnique({ where: { code: product.code } });
    if (exists) continue;

    await prisma.product.create({
      data: {
        code: product.code,
        barcode: product.barcode,
        name: product.name,
        price: product.price,
        cost: product.cost,
        stock: product.stock,
        minStock: product.minStock,
        criticalStock: product.criticalStock,
        taxRate: product.taxRate,
        suggestedPurchaseQty: product.suggestedPurchaseQty,
        expiryDate: product.expiryDate ? new Date(product.expiryDate) : null,
        location: product.location,
        unitType: product.unitType,
        conversionFactor: product.conversionFactor,
        isActive: true,
        categoryId: cat.id,
      },
    });
  }

  console.log(`✅ Seeded ${PRODUCTS.length} products across ${categoryMap.size} categories.`);
}
