import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

const DESKTOP_PATH = 'C:\\Users\\UserMaster\\Desktop';
const FILE_NAME = 'Manual_TuCajero.pdf';
const FILE_PATH = path.join(DESKTOP_PATH, FILE_NAME);

const PRIMARY_COLOR = '#2563EB';
const SECONDARY_COLOR = '#7C3AED';
const TEXT_COLOR = '#1F2937';
const LIGHT_GRAY = '#F3F4F6';
const DARK_GRAY = '#4B5563';

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

async function generateManual(): Promise<void> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: 'Manual de Usuario - TuCajero',
      Author: 'TuCajero',
      Subject: 'Guía completa de usuario',
    },
  });

  const stream = fs.createWriteStream(FILE_PATH);
  doc.pipe(stream);

  const primaryRgb = hexToRgb(PRIMARY_COLOR);
  const secondaryRgb = hexToRgb(SECONDARY_COLOR);
  const textRgb = hexToRgb(TEXT_COLOR);
  const grayRgb = hexToRgb(DARK_GRAY);

  let y = 0;
  let pageCount = 1;
  const pageWidth = 595;
  const pageHeight = 842;
  const contentWidth = pageWidth - 100;

  function addPage(): void {
    doc.addPage();
    y = 50;
    pageCount++;
  }

  function drawHeader(text: string, size = 12, color = textRgb): void {
    doc.fillColor(color).fontSize(size).text(text, 50, y, { width: contentWidth });
    y += size + 10;
  }

  function drawTitle(text: string, size = 24, color = primaryRgb): void {
    doc.fillColor(color).fontSize(size).text(text, 50, y, { width: contentWidth, align: 'center' });
    y += size + 15;
  }

  function drawSubtitle(text: string, size = 14, color = secondaryRgb): void {
    doc
      .fillColor(color)
      .fontSize(size)
      .font('Helvetica-Bold')
      .text(text, 50, y, { width: contentWidth });
    doc.font('Helvetica');
    y += size + 8;
  }

  function checkPageBreak(extraSpace: number): void {
    if (y + extraSpace > pageHeight - 80) {
      addPage();
    }
  }

  function drawSeparator(): void {
    y += 15;
    doc.fillColor(grayRgb).rect(50, y, contentWidth, 1).fill();
    y += 15;
  }

  function drawBullet(text: string, indent = 0): void {
    doc
      .fillColor(textRgb)
      .fontSize(10)
      .text(`• ${text}`, 50 + indent, y, { width: contentWidth - indent });
    y += 18;
  }

  function drawImagePlaceholder(label: string): void {
    checkPageBreak(120);
    const boxY = y;
    doc
      .fillColor(LIGHT_GRAY)
      .rect(100, boxY, contentWidth - 100, 100)
      .fill();
    doc
      .fillColor(grayRgb)
      .fontSize(10)
      .text(`[Imagen: ${label}]`, 100, boxY + 40, {
        width: contentWidth - 100,
        align: 'center',
      });
    y += 110;
  }

  // ============ PORTADA ============
  y = 200;
  doc.fillColor(primaryRgb).fontSize(48).font('Helvetica-Bold').text('TuCajero', 50, y, {
    width: contentWidth,
    align: 'center',
  });
  y += 60;
  doc
    .font('Helvetica')
    .fillColor(SECONDARY_COLOR)
    .fontSize(24)
    .text('Sistema de Punto de Venta', 50, y, {
      width: contentWidth,
      align: 'center',
    });
  y += 80;
  doc.fillColor(grayRgb).fontSize(14).text('Manual de Usuario', 50, y, {
    width: contentWidth,
    align: 'center',
  });
  y += 60;
  doc.fontSize(12).text('Versión 1.0.0', 50, y, { width: contentWidth, align: 'center' });

  y = pageHeight - 100;
  doc
    .fillColor(grayRgb)
    .fontSize(10)
    .text('© 2024 TuCajero - Todos los derechos reservados', 50, y, {
      width: contentWidth,
      align: 'center',
    });

  addPage();

  // ============ TABLA DE CONTENIDO ============
  drawTitle('Tabla de Contenido', 20);
  y += 20;

  const toc = [
    { num: '1', title: 'Introducción', page: 3 },
    { num: '2', title: 'Primeros Pasos', page: 4 },
    { num: '3', title: 'Punto de Venta (POS)', page: 5 },
    { num: '4', title: 'Gestión de Inventario', page: 8 },
    { num: '5', title: 'Clientes y Cuentas por Cobrar', page: 10 },
    { num: '6', title: 'Control de Caja', page: 12 },
    { num: '7', title: 'Reportes y Análisis', page: 13 },
    { num: '8', title: 'Gestión de Usuarios', page: 14 },
    { num: '9', title: 'Configuración', page: 15 },
    { num: '10', title: 'Impresora Térmica', page: 16 },
    { num: '11', title: 'Respaldo y Restauración', page: 17 },
    { num: '12', title: 'Trucos y Consejos', page: 18 },
  ];

  toc.forEach((item) => {
    doc.fillColor(textRgb).fontSize(12).text(`${item.num}. ${item.title}`, 50, y);
    doc
      .fillColor(grayRgb)
      .fontSize(10)
      .text(`${item.page}`, pageWidth - 70, y);
    y += 22;
  });

  addPage();

  // ============ CAPÍTULO 1: INTRODUCCIÓN ============
  drawTitle('1. Introducción', 28);
  drawSubtitle('¿Qué es TuCajero?');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text(
      'TuCajero es un sistema moderno de punto de venta (POS) diseñado específicamente para pequeños y medianos comercios. Combina una interfaz intuitiva y atractiva con funcionalidades potentes que te permitirán gestionar tu negocio de manera eficiente, desde la atención en caja hasta el control de inventario y reportes financieros.',
      50,
      y,
      { width: contentWidth },
    );
  y += 60;

  drawSubtitle('Características Principales');
  y += 10;
  const features = [
    'Punto de Venta rápido con búsqueda inteligente de productos',
    'Gestión completa de inventario con alertas de stock',
    'Control de caja apertura y cierre',
    'Gestión de clientes y cuentas por cobrar',
    'Reportes detallados de ventas y analytics',
    'Impresión de tickets en impresora térmica',
    'Generación automática de facturas en PDF',
    'Sistema de respaldo y restauración',
    'Control de acceso por roles y permisos',
  ];

  features.forEach((f) => {
    drawBullet(f);
  });

  checkPageBreak(80);
  drawSeparator();

  drawSubtitle('Roles de Usuario');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text(
      'El sistema cuenta con tres roles principales que definen qué funciones puede realizar cada usuario:',
      50,
      y,
      { width: contentWidth },
    );
  y += 30;

  drawBullet('Administrador: Acceso completo a todas las funciones del sistema');
  drawBullet('Supervisor: Ventas, inventario, reportes y atención al cliente');
  drawBullet('Cajero: Punto de venta y consulta básica');

  addPage();

  // ============ CAPÍTULO 2: PRIMEROS PASOS ============
  drawTitle('2. Primeros Pasos', 28);
  drawSubtitle('Iniciar Sesión');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text(
      'Al abrir la aplicación, verás la pantalla de inicio de sesión. Ingresa tu nombre de usuario y contraseña para acceder al sistema.',
      50,
      y,
      { width: contentWidth },
    );
  y += 30;

  drawImagePlaceholder('Pantalla de Login');
  checkPageBreak(60);

  drawSubtitle('Cambiar Contraseña');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text(
      'Si es tu primera vez o necesitas cambiar tu contraseña, puedes hacerlo desde el menú de Usuario. El sistema te pedirá cambiar tu contraseña periódicamente por seguridad.',
      50,
      y,
      { width: contentWidth },
    );

  drawSeparator();

  drawSubtitle('Abrir la Caja');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text(
      'Antes de realizar ventas, debes abrir la caja desde el módulo de Caja. Especifica el monto inicial de efectivo que tendrás para dar cambio. Este paso es obligatorio para activar el POS.',
      50,
      y,
      { width: contentWidth },
    );
  y += 20;
  drawBullet('Ve a Caja en el menú lateral');
  drawBullet('Haz clic en "Abrir Caja"');
  drawBullet('Ingresa el monto inicial');
  drawBullet('Confirma para comenzar');

  addPage();

  // ============ CAPÍTULO 3: PUNTO DE VENTA ============
  drawTitle('3. Punto de Venta (POS)', 28);
  drawSubtitle('La Pantalla Principal de Ventas');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text(
      'El POS es el corazón del sistema. Tiene dos columnas: a la izquierda los productos disponibles y a la derecha el carrito de compras.',
      50,
      y,
      { width: contentWidth },
    );
  y += 20;

  drawImagePlaceholder('Pantalla del POS');
  checkPageBreak(60);

  drawSubtitle('Buscar Productos');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text(
      'Puedes buscar productos de tres formas: escribiendo el nombre, el código interno, o escaneando el código de barras con un lector.',
      50,
      y,
      { width: contentWidth },
    );
  y += 20;
  drawBullet('Escribe en el campo de búsqueda - busca por nombre, código o barras');
  drawBullet('Usa un escáner de códigos de barras - el sistema detecta automáticamente');

  checkPageBreak(60);
  drawSubtitle('Agregar Productos al Carrito');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text(
      'Haz clic en un producto para agregarlo al carrito. Puedes cambiar la cantidad directamente en el carrito o usar los botones +/-.',
      50,
      y,
      { width: contentWidth },
    );
  y += 20;
  drawBullet('Clic en la tarjeta del producto para agregar 1 unidad');
  drawBullet('Usa +/- para cambiar cantidad');
  drawBullet('Aplica descuentos individuales si es necesario');

  checkPageBreak(60);
  drawSubtitle('Procesar el Pago');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text(
      'Una vez ready los productos, selecciona el método de pago y completa la transacción. El sistema soporta múltiples métodos de pago.',
      50,
      y,
      { width: contentWidth },
    );
  y += 20;
  drawBullet('Efectivo - el sistema calcula el cambio automáticamente');
  drawBullet('Nequi, Daviplata, Transferencia');
  drawBullet('Tarjeta de crédito/débito');
  drawBullet('Crédito al cliente (requiere cliente registrado)');

  checkPageBreak(80);
  drawSeparator();

  drawSubtitle('Métodos de Pago Combinados');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text(
      'Puedes combinar varios métodos de pago en una misma venta. Por ejemplo: parte en efectivo y parte en Nequi.',
      50,
      y,
      { width: contentWidth },
    );
  y += 20;
  drawBullet('Agrega productos al carrito');
  drawBullet('Haz clic en "Agregar Pago"');
  drawBullet('Selecciona el primer método e ingresa el monto');
  drawBullet('Repite para métodos adicionales');

  checkPageBreak(60);
  drawSubtitle('Venta a Crédito');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text(
      'Para ventas a crédito, debes seleccionar un cliente registrado con saldo disponible. El sistema crea una cuenta por cobrar automáticamente.',
      50,
      y,
      { width: contentWidth },
    );
  y += 20;
  drawBullet('Activa la opción "Venta a Crédito"');
  drawBullet('Selecciona el cliente');
  drawBullet('El sistema verifica el límite de crédito');

  addPage();

  // ============ CAPÍTULO 4: GESTIÓN DE INVENTARIO ============
  drawTitle('4. Gestión de Inventario', 28);
  drawSubtitle('Ver y Buscar Productos');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text(
      'La página de inventario muestra todos tus productos organizados en una tabla filtrable. Puedes buscar por nombre, código, categoría o ubicación.',
      50,
      y,
      { width: contentWidth },
    );
  y += 20;

  drawImagePlaceholder('Página de Inventario');
  checkPageBreak(60);

  drawSubtitle('Indicadores de Stock');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text('Los productos tienen indicadores de color según su nivel de stock:', 50, y, {
      width: contentWidth,
    });
  y += 20;
  drawBullet('Verde: Stock saludable (más de 10 unidades)');
  drawBullet('Amarillo: Stock bajo (menos de 10 unidades)');
  drawBullet('Rojo: Stock crítico (menos de 5 unidades)');

  checkPageBreak(60);
  drawSubtitle('Agregar Nuevo Producto');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text(
      'Para agregar un nuevo producto, haz clic en el botón "+" y completa los datos requeridos.',
      50,
      y,
      { width: contentWidth },
    );
  y += 20;
  drawBullet('Código interno (requerido)');
  drawBullet('Nombre del producto (requerido)');
  drawBullet('Categoría');
  drawBullet('Precio de venta');
  drawBullet('Precio de costo');
  drawBullet('Tasa de IVA');
  drawBullet('Cantidad inicial');

  checkPageBreak(60);
  drawSubtitle('Editar Producto');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text(
      'Haz clic en un producto para ver sus detalles o editar su información. Puedes modificar precios, ubicación, fecha de caducidad, etc.',
      50,
      y,
      { width: contentWidth },
    );

  checkPageBreak(60);
  drawSubtitle('Ajustes de Stock');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text(
      'Los ajustes de stock registran cambios en la cantidad de productos. Cada ajuste queda registrado para auditoría.',
      50,
      y,
      { width: contentWidth },
    );
  y += 20;
  drawBullet('Compra: Entrada de mercancía');
  drawBullet('Devolución: Producto devuelto por cliente');
  drawBullet('Daño: Producto dañado');
  drawBullet('Venta: Salida por venta');
  drawBullet('Robo: Inventario perdido');

  addPage();

  // ============ CAPÍTULO 5: CLIENTES ============
  drawTitle('5. Clientes y Cuentas por Cobrar', 28);
  drawSubtitle('Registro de Clientes');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text(
      'Registra tus clientes para ofrecerles crédito y mantener un historial de compras. Cada cliente puede tener un límite de crédito asignado.',
      50,
      y,
      { width: contentWidth },
    );
  y += 20;

  drawImagePlaceholder('Gestión de Clientes');
  checkPageBreak(60);

  drawSubtitle('Datos del Cliente');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text('Al registrar un cliente, puedes guardar:', 50, y, { width: contentWidth });
  y += 20;
  drawBullet('Nombre completo');
  drawBullet('Número de identificación (cédula)');
  drawBullet('Teléfono');
  drawBullet('Correo electrónico');
  drawBullet('Dirección');
  drawBullet('Límite de crédito');
  drawBullet('Notas adicionales');

  checkPageBreak(60);
  drawSubtitle('Cuentas por Cobrar');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text(
      'Las ventas a crédito crean cuentas por cobrar que puedes gestionar desde la página de clientes.',
      50,
      y,
      { width: contentWidth },
    );
  y += 20;
  drawBullet('Consulta las cuentas pendientes');
  drawBullet('Registra abonos o pagos parciales');
  drawBullet('Ver historial de pagos');
  drawBullet('Alertas de vencimiento');

  checkPageBreak(60);
  drawSubtitle('Registrar Abono');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text('Para registrar un pago o abono:', 50, y, { width: contentWidth });
  y += 20;
  drawBullet('Selecciona el cliente');
  drawBullet('Haz clic en "Abonar"');
  drawBullet('Ingresa el monto');
  drawBullet('Selecciona el método de pago');
  drawBullet('Confirma la transacción');

  addPage();

  // ============ CAPÍTULO 6: CONTROL DE CAJA ============
  drawTitle('6. Control de Caja', 28);
  drawSubtitle('Apertura de Caja');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text(
      'Antes de vender, debes abrir la caja specify el monto inicial. Este dinero se usa para dar cambio a los clientes.',
      50,
      y,
      { width: contentWidth },
    );
  y += 20;

  drawBullet('Ve a Caja en el menú');
  drawBullet('Ingresa el monto inicial');
  drawBullet('Confirma la apertura');
  drawBullet('La caja queda lista para ventas');

  checkPageBreak(60);
  drawSubtitle('Transacciones durante el Día');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text('Durante el día, el sistema registra automáticamente:', 50, y, { width: contentWidth });
  y += 20;
  drawBullet('Ventas en efectivo');
  drawBullet('Retiros de dinero');
  drawBullet('Ingresos adicionales');

  checkPageBreak(60);
  drawSubtitle('Cierre de Caja');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text(
      'Al final del día, realiza el cierre de caja para verificar que todo cuadre. El sistema calcula el esperado vs el реальный.',
      50,
      y,
      { width: contentWidth },
    );
  y += 20;
  drawBullet('Cierra todas las ventas');
  drawBullet('Ve a Caja y haz clic en "Cerrar Caja"');
  drawBullet('Cuenta el efectivo físico');
  drawBullet('Ingresa el monto');
  drawBullet('El sistema muestra diferencia (sobrante/faltante)');
  drawBullet('Justifica si hay diferencia');

  addPage();

  // ============ CAPÍTULO 7: REPORTES ============
  drawTitle('7. Reportes y Análisis', 28);
  drawSubtitle('Tipos de Reportes');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text('TuCajero ofrece diversos reportes para analizar tu negocio:', 50, y, {
      width: contentWidth,
    });
  y += 20;

  drawBullet('Ventas por período (día, semana, mes)');
  drawBullet('Ventas por categoría');
  drawBullet('Productos más vendidos');
  drawBullet('Desempeño por cajero');
  drawBullet('Inventario valorizado');
  drawBullet('Cuentas por cobrar (edad de cartera)');

  drawImagePlaceholder('Reportes');

  checkPageBreak(60);
  drawSubtitle('Exportar Reportes');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text('Los reportes se pueden exportar en PDF para impresión o compartir.', 50, y, {
      width: contentWidth,
    });

  addPage();

  // ============ CAPÍTULO 8: GESTIÓN DE USUARIOS ============
  drawTitle('8. Gestión de Usuarios', 28);
  drawSubtitle('Crear Usuarios');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text(
      'Solo los administradores pueden crear nuevos usuarios. Cada usuario tiene un rol específico.',
      50,
      y,
      { width: contentWidth },
    );
  y += 20;

  drawBullet('Ve a Usuarios en el menú');
  drawBullet('Haz clic en "+" para agregar');
  drawBullet('Completa los datos');
  drawBullet('Asigna el rol');
  drawBullet('Guarda el usuario');

  checkPageBreak(60);
  drawSubtitle('Roles y Permisos');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text('Los roles determinan qué puede hacer cada usuario:', 50, y, { width: contentWidth });
  y += 20;
  drawBullet('Administrador: Todo, incluyendo configuración y usuarios');
  drawBullet('Supervisor: Ventas, inventario, clientes, reportes');
  drawBullet('Cajero: Solo POS y consulta básica');

  addPage();

  // ============ CAPÍTULO 9: CONFIGURACIÓN ============
  drawTitle('9. Configuración', 28);
  drawSubtitle('Datos del Negocio');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text('Configura los datos de tu negocio que aparecerán en facturas y tickets.', 50, y, {
      width: contentWidth,
    });
  y += 20;

  drawBullet('Nombre del negocio');
  drawBullet('Dirección');
  drawBullet('Teléfono');
  drawBullet('NIT');
  drawBullet('Correo');

  checkPageBreak(60);
  drawSubtitle('Parámetros del Sistema');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text('Otros ajustes importantes:', 50, y, { width: contentWidth });
  y += 20;
  drawBullet('Tasa de IVA predeterminada');
  drawBullet('Serie de facturas');
  drawBullet('Numeración inicial');

  addPage();

  // ============ CAPÍTULO 10: IMPRESORA ============
  drawTitle('10. Impresora Térmica', 28);
  drawSubtitle('Configuración');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text(
      'TuCajero puede imprimir tickets automáticamente en una impresora térmica ESC/POS.',
      50,
      y,
      { width: contentWidth },
    );
  y += 20;

  drawBullet('Ve a Configuración > Impresora');
  drawBullet('Selecciona el tipo de impresora');
  drawBullet('Configura la conexión (USB, TCP/IP, o nombre de Windows)');
  drawBullet('Prueba la conexión');

  drawImagePlaceholder('Configuración de Impresora');

  checkPageBreak(60);
  drawSubtitle('Conexiones Soportadas');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text('Puedes conectar la impresora de varias formas:', 50, y, { width: contentWidth });
  y += 20;
  drawBullet('USB: Conecta directamente al puerto USB');
  drawBullet('Red: Por TCP/IP (tcp://192.168.1.100:9100)');
  drawBullet('Windows: Por nombre de impresora (printer:Nombre)');

  checkPageBreak(60);
  drawSubtitle('Impresión Automática');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text('Después de cada venta, el sistema genera automáticamente:', 50, y, {
      width: contentWidth,
    });
  y += 20;
  drawBullet('PDF de la factura en Descargas');
  drawBullet('Ticket en la impresora térmica (si está configurada)');

  addPage();

  // ============ CAPÍTULO 11: RESPALDO ============
  drawTitle('11. Respaldo y Restauración', 28);
  drawSubtitle('Crear Respaldo');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text('Protege tus datos creando copias de seguridad regularmente.', 50, y, {
      width: contentWidth,
    });
  y += 20;

  drawBullet('Ve a Respaldo en el menú');
  drawBullet('Haz clic en "Crear Respaldo"');
  drawBullet('Elige la ubicación (por defecto: Mis Documentos)');
  drawBullet('Espera a que complete');

  drawImagePlaceholder('Página de Respaldo');

  checkPageBreak(60);
  drawSubtitle('Restaurar Respaldo');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text('Para restaurar una copia anterior:', 50, y, { width: contentWidth });
  y += 20;
  drawBullet('Ve a Respaldo');
  drawBullet('Selecciona el archivo de respaldo');
  drawBullet('Haz clic en "Restaurar"');
  drawBullet('Confirma la acción');
  drawBullet('La aplicación se reiniciará');

  checkPageBreak(60);
  drawSubtitle('Recomendaciones');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text('Consejos para un buen respaldo:', 50, y, { width: contentWidth });
  y += 20;
  drawBullet('Crea respaldos al menos semanalmente');
  drawBullet('Guarda los archivos en un lugar seguro');
  drawBullet('Antes de actualizaciones importantes');

  addPage();

  // ============ CAPÍTULO 12: TRUCOS ============
  drawTitle('12. Trucos y Consejos', 28);
  drawSubtitle('Atajos de Teclado');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text('Optimiza tu velocidad con estos atajos:', 50, y, { width: contentWidth });
  y += 20;
  drawBullet('Escanea productos directamente - el código de barras los agrega al instante');
  drawBullet('Usa Tab para moverte entre campos');
  drawBullet('Enter para confirmar pagos');
  drawBullet('Escape para cancelar/modales');

  checkPageBreak(60);
  drawSubtitle('Búsqueda Inteligente');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text('El sistema busca en tres campos simultáneamente:', 50, y, { width: contentWidth });
  y += 20;
  drawBullet('Nombre del producto');
  drawBullet('Código interno');
  drawBullet('Código de barras');

  checkPageBreak(60);
  drawSubtitle('Optimiza tu Inventario');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text('Mantén tu inventario organizado:', 50, y, { width: contentWidth });
  y += 20;
  drawBullet('Usa categorías para organizar productos');
  drawBullet('Agrega la ubicación física del producto');
  drawBullet('Configura fechas de caducidad para productos perecederos');
  drawBullet('Revisa las alertas de stock regularmente');

  checkPageBreak(60);
  drawSubtitle('Venta Rápida');
  y += 10;
  doc.fillColor(textRgb).fontSize(11).text('Para ventas rápidas:', 50, y, { width: contentWidth });
  y += 20;
  drawBullet('Escanea todos los productos sin esperar');
  drawBullet('Usa "Pago Exacto" para evitar calcular cambio');
  drawBullet('Si todos pagan lo mismo, divide el total');

  checkPageBreak(60);
  drawSubtitle('Última Factura');
  y += 10;
  doc
    .fillColor(textRgb)
    .fontSize(11)
    .text('Necesitas reimprimir una factura?', 50, y, { width: contentWidth });
  y += 20;
  drawBullet('Ve a Historial de Ventas');
  drawBullet('Busca la venta por número o fecha');
  drawBullet('Abre el detalle');
  drawBullet('El PDF se guarda en Descargas');

  drawSeparator();

  drawSubtitle('Soporte técnico');
  y += 10;
  doc.fillColor(textRgb).fontSize(11).text('Para obtener ayuda:', 50, y, { width: contentWidth });
  y += 20;
  drawBullet('Consulta la página de Alertas para errores');
  drawBullet('Revisa el registro de Auditoría');
  drawBullet('Crea un respaldo antes de reportar problemas');

  // ============ ÚLTIMA PÁGINA ============
  addPage();
  y = 300;
  doc.fillColor(primaryRgb).fontSize(32).font('Helvetica-Bold').text('¡Gracias!', 50, y, {
    width: contentWidth,
    align: 'center',
  });
  y += 50;
  doc
    .font('Helvetica')
    .fillColor(textRgb)
    .fontSize(14)
    .text(' Esperamos que TuCajero sea una herramienta valiosa para tu negocio.', 50, y, {
      width: contentWidth,
      align: 'center',
    });
  y += 40;
  doc
    .fontSize(12)
    .text('Para más información y actualizaciones, visita notre sitio web.', 50, y, {
      width: contentWidth,
      align: 'center',
    });

  y = pageHeight - 100;
  doc
    .fillColor(grayRgb)
    .fontSize(10)
    .text('© 2024 TuCajero - Todos los derechos reservados', 50, y, {
      width: contentWidth,
      align: 'center',
    });

  doc.end();
  console.log(`Manual generado en: ${FILE_PATH}`);
}

generateManual().catch(console.error);
