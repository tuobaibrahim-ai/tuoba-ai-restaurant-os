const STORAGE_KEY = 'tuoba-ultimate-all-in-one-i18n-v1';

const BRANDS = {
  'TUOBA Fried & Grill':['Giza Main','Nasr City'],
  'TUOBA Cafe':['Sheikh Zayed','New Cairo'],
  'TUOBA Express':['Alexandria']
};

const MENU = [
  {name_ar:'برجر دجاج', name_en:'Chicken Burger', name_fr:'Burger Poulet', name_es:'Hamburguesa de pollo', name_tr:'Tavuk Burger', price:85, prep:12},
  {name_ar:'برجر لحم', name_en:'Beef Burger', name_fr:'Burger Boeuf', name_es:'Hamburguesa de carne', name_tr:'Et Burger', price:95, prep:14},
  {name_ar:'وجبة استربس', name_en:'Strips Meal', name_fr:'Menu Strips', name_es:'Combo Strips', name_tr:'Strips Menü', price:120, prep:15},
  {name_ar:'فرايز', name_en:'Fries', name_fr:'Frites', name_es:'Papas fritas', name_tr:'Patates', price:35, prep:6},
  {name_ar:'كولا', name_en:'Cola', name_fr:'Cola', name_es:'Cola', name_tr:'Kola', price:25, prep:1},
  {name_ar:'قهوة', name_en:'Coffee', name_fr:'Café', name_es:'Café', name_tr:'Kahve', price:45, prep:4}
];

const DELIVERY_LINKS = [
  {name:'Talabat', url:'https://www.talabat.com/egypt'},
  {name:'elmenus', url:'https://elmenus.com/'},
  {name:'Mrsool', url:'https://mrsool.co/'},
  {name:'Rabbit', url:'https://rabbitmart.com/'},
  {name:'HurryApp', url:'https://play.google.com/store/apps/details?id=com.tawaf.hurryapp'}
];
const DRIVERS = ['مندوب 1','مندوب 2','مندوب 3'];

const I18N = {
  ar: {
    dir:'rtl',
    appTitle:'TUOBA Ultimate All-in-One Multilingual Enterprise',
    appSubtitle:'تشغيل + POS + مالية + HR + كول سنتر + أمان + جودة + مدفوعات',
    export:'تصدير', passkey:'Passkey', location:'الموقع',
    overview:'الرئيسية', pos:'POS', orders:'الطلبات', kds:'KDS', pickup:'Pickup', apps:'Apps', printing:'الطباعة',
    expenses:'المصروفات', recipe:'الريسيبي', geidea:'جيديا', finance:'المالية', callcenter:'الكول سنتر', crm:'CRM',
    attendance:'الحضور', payments:'الدفع', security:'الأمان', reports:'التقارير',
    dashboard:'لوحة التحكم الموحدة', aiBrief:'الملخص الذكي', activeSituation:'الوضع التشغيلي الحالي مستقر.',
    table:'طاولات', takeaway:'Take Away', delivery:'Delivery', orderType:'نوع الطلب', tables:'الطاولات', currentTable:'الطاولة الحالية',
    deliveryInfo:'بيانات التوصيل', customerName:'اسم العميل', phone:'رقم الهاتف', appChannel:'اسم التطبيق / القناة', address:'العنوان',
    menu:'المنيو', cart:'السلة', total:'الإجمالي', clear:'مسح', cash:'كاش', card:'فيزا',
    noData:'لا توجد بيانات', noOrders:'لا توجد طلبات', preparing:'تحت التجهيز', ready:'جاهز', picked:'تم الاستلام',
    allOrders:'كل الطلبات', kitchenDisplay:'شاشة المطبخ', pickupScreen:'شاشة الاستلام', printingSettings:'إعدادات الطباعة',
    cashierCopies:'عدد نسخ الكاشير', kitchenCopies:'عدد نسخ المطبخ', pickupCopies:'عدد نسخ البيك أب', save:'حفظ',
    addExpense:'إضافة مصروف / استلام', title:'الاسم', amount:'المبلغ', notes:'ملاحظات', saveRecord:'حفظ السجل',
    expenseLog:'سجل المصروفات', addRecipe:'إضافة ريسيبي', recipeIntelligence:'ذكاء الريسيبي', cost:'التكلفة', price:'السعر', ingredients:'المكونات',
    geideaUpload:'رفع ملف جيديا CSV', columns:'الأعمدة', autoMap:'ربط تلقائي', import:'استيراد',
    financeCenter:'مركز المالية', branchPL:'P&L الفرع', brandPL:'P&L البراند', cashFlow:'التدفق النقدي', sales:'المبيعات', profit:'الربح',
    callCenter:'الكول سنتر', createOrder:'إنشاء طلب', zone:'المنطقة / الزون', orderDetails:'تفاصيل الطلب', prepTime:'وقت التجهيز بالدقائق',
    crmCustomers:'عملاء CRM', attendanceByLocation:'الحضور باللوكيشن', currentLocation:'الموقع الحالي', employee:'اسم الموظف', checkIn:'حضور', checkOut:'انصراف',
    paymentCreate:'إنشاء عملية دفع', paymentMethod:'طريقة الدفع', nfc:'NFC / Contactless', qr:'QR', wallet:'Wallet', split:'Split',
    securityLayers:'طبقات الأمان', securityLogs:'السجلات الأمنية', renewal:'تنبيه', openLink:'فتح الرابط'
  },
  en: {
    dir:'ltr',
    appTitle:'TUOBA Ultimate All-in-One Multilingual Enterprise',
    appSubtitle:'Operations + POS + Finance + HR + Call Center + Security + Quality + Payments',
    export:'Export', passkey:'Passkey', location:'Location',
    overview:'Overview', pos:'POS', orders:'Orders', kds:'KDS', pickup:'Pickup', apps:'Apps', printing:'Printing',
    expenses:'Expenses', recipe:'Recipes', geidea:'Geidea', finance:'Finance', callcenter:'Call Center', crm:'CRM',
    attendance:'Attendance', payments:'Payments', security:'Security', reports:'Reports',
    dashboard:'Unified Dashboard', aiBrief:'AI Brief', activeSituation:'The current operating status is stable.',
    table:'Tables', takeaway:'Take Away', delivery:'Delivery', orderType:'Order Type', tables:'Tables', currentTable:'Current table',
    deliveryInfo:'Delivery information', customerName:'Customer name', phone:'Phone', appChannel:'App / Channel', address:'Address',
    menu:'Menu', cart:'Cart', total:'Total', clear:'Clear', cash:'Cash', card:'Card',
    noData:'No data', noOrders:'No orders', preparing:'Preparing', ready:'Ready', picked:'Picked',
    allOrders:'All orders', kitchenDisplay:'Kitchen Display Screen', pickupScreen:'Pickup Screen', printingSettings:'Printing settings',
    cashierCopies:'Cashier copies', kitchenCopies:'Kitchen copies', pickupCopies:'Pickup copies', save:'Save',
    addExpense:'Add expense / receipt', title:'Title', amount:'Amount', notes:'Notes', saveRecord:'Save record',
    expenseLog:'Expense log', addRecipe:'Add recipe', recipeIntelligence:'Recipe Intelligence', cost:'Cost', price:'Price', ingredients:'Ingredients',
    geideaUpload:'Upload Geidea CSV', columns:'Columns', autoMap:'Auto map', import:'Import',
    financeCenter:'Finance Center', branchPL:'Branch P&L', brandPL:'Brand P&L', cashFlow:'Cash Flow', sales:'Sales', profit:'Profit',
    callCenter:'Call Center', createOrder:'Create order', zone:'Zone', orderDetails:'Order details', prepTime:'Prep time (min)',
    crmCustomers:'CRM Customers', attendanceByLocation:'Attendance by location', currentLocation:'Current location', employee:'Employee name', checkIn:'Check in', checkOut:'Check out',
    paymentCreate:'Create payment', paymentMethod:'Payment method', nfc:'NFC / Contactless', qr:'QR', wallet:'Wallet', split:'Split',
    securityLayers:'Security layers', securityLogs:'Security logs', renewal:'Reminder', openLink:'Open link'
  },
  fr: {
    dir:'ltr',
    appTitle:'TUOBA Ultimate All-in-One Multilingual Enterprise',
    appSubtitle:'Opérations + POS + Finance + RH + Centre d’appels + Sécurité + Qualité + Paiements',
    export:'Exporter', passkey:'Passkey', location:'Localisation',
    overview:'Aperçu', pos:'POS', orders:'Commandes', kds:'KDS', pickup:'Pickup', apps:'Apps', printing:'Impression',
    expenses:'Dépenses', recipe:'Recettes', geidea:'Geidea', finance:'Finance', callcenter:'Centre d’appels', crm:'CRM',
    attendance:'Présence', payments:'Paiements', security:'Sécurité', reports:'Rapports',
    dashboard:'Tableau de bord unifié', aiBrief:'Résumé IA', activeSituation:'Le statut opérationnel actuel est stable.',
    table:'Tables', takeaway:'À emporter', delivery:'Livraison', orderType:'Type de commande', tables:'Tables', currentTable:'Table actuelle',
    deliveryInfo:'Informations de livraison', customerName:'Nom du client', phone:'Téléphone', appChannel:'Application / Canal', address:'Adresse',
    menu:'Menu', cart:'Panier', total:'Total', clear:'Effacer', cash:'Espèces', card:'Carte',
    noData:'Aucune donnée', noOrders:'Aucune commande', preparing:'Préparation', ready:'Prêt', picked:'Retiré',
    allOrders:'Toutes les commandes', kitchenDisplay:'Écran cuisine', pickupScreen:'Écran de retrait', printingSettings:'Paramètres d’impression',
    cashierCopies:'Copies caissier', kitchenCopies:'Copies cuisine', pickupCopies:'Copies retrait', save:'Enregistrer',
    addExpense:'Ajouter dépense / reçu', title:'Nom', amount:'Montant', notes:'Notes', saveRecord:'Enregistrer',
    expenseLog:'Journal des dépenses', addRecipe:'Ajouter recette', recipeIntelligence:'Intelligence recette', cost:'Coût', price:'Prix', ingredients:'Ingrédients',
    geideaUpload:'Téléverser CSV Geidea', columns:'Colonnes', autoMap:'Auto mapping', import:'Importer',
    financeCenter:'Centre financier', branchPL:'P&L succursale', brandPL:'P&L marque', cashFlow:'Flux de trésorerie', sales:'Ventes', profit:'Profit',
    callCenter:'Centre d’appels', createOrder:'Créer commande', zone:'Zone', orderDetails:'Détails de commande', prepTime:'Temps de préparation (min)',
    crmCustomers:'Clients CRM', attendanceByLocation:'Présence par localisation', currentLocation:'Localisation actuelle', employee:'Nom employé', checkIn:'Entrée', checkOut:'Sortie',
    paymentCreate:'Créer paiement', paymentMethod:'Mode de paiement', nfc:'NFC / Sans contact', qr:'QR', wallet:'Portefeuille', split:'Split',
    securityLayers:'Couches de sécurité', securityLogs:'Journaux de sécurité', renewal:'Rappel', openLink:'Ouvrir le lien'
  },
  es: {
    dir:'ltr',
    appTitle:'TUOBA Ultimate All-in-One Multilingual Enterprise',
    appSubtitle:'Operaciones + POS + Finanzas + RRHH + Call Center + Seguridad + Calidad + Pagos',
    export:'Exportar', passkey:'Passkey', location:'Ubicación',
    overview:'Resumen', pos:'POS', orders:'Pedidos', kds:'KDS', pickup:'Pickup', apps:'Apps', printing:'Impresión',
    expenses:'Gastos', recipe:'Recetas', geidea:'Geidea', finance:'Finanzas', callcenter:'Call Center', crm:'CRM',
    attendance:'Asistencia', payments:'Pagos', security:'Seguridad', reports:'Reportes',
    dashboard:'Panel unificado', aiBrief:'Resumen IA', activeSituation:'El estado operativo actual es estable.',
    table:'Mesas', takeaway:'Para llevar', delivery:'Entrega', orderType:'Tipo de pedido', tables:'Mesas', currentTable:'Mesa actual',
    deliveryInfo:'Datos de entrega', customerName:'Nombre del cliente', phone:'Teléfono', appChannel:'App / Canal', address:'Dirección',
    menu:'Menú', cart:'Carrito', total:'Total', clear:'Borrar', cash:'Efectivo', card:'Tarjeta',
    noData:'Sin datos', noOrders:'Sin pedidos', preparing:'Preparando', ready:'Listo', picked:'Entregado',
    allOrders:'Todos los pedidos', kitchenDisplay:'Pantalla de cocina', pickupScreen:'Pantalla de retiro', printingSettings:'Configuración de impresión',
    cashierCopies:'Copias de caja', kitchenCopies:'Copias cocina', pickupCopies:'Copias retiro', save:'Guardar',
    addExpense:'Agregar gasto / recibo', title:'Nombre', amount:'Monto', notes:'Notas', saveRecord:'Guardar registro',
    expenseLog:'Registro de gastos', addRecipe:'Agregar receta', recipeIntelligence:'Inteligencia de recetas', cost:'Costo', price:'Precio', ingredients:'Ingredientes',
    geideaUpload:'Subir CSV de Geidea', columns:'Columnas', autoMap:'Auto map', import:'Importar',
    financeCenter:'Centro financiero', branchPL:'P&L sucursal', brandPL:'P&L marca', cashFlow:'Flujo de caja', sales:'Ventas', profit:'Beneficio',
    callCenter:'Call Center', createOrder:'Crear pedido', zone:'Zona', orderDetails:'Detalles del pedido', prepTime:'Tiempo de preparación (min)',
    crmCustomers:'Clientes CRM', attendanceByLocation:'Asistencia por ubicación', currentLocation:'Ubicación actual', employee:'Nombre del empleado', checkIn:'Entrada', checkOut:'Salida',
    paymentCreate:'Crear pago', paymentMethod:'Método de pago', nfc:'NFC / Sin contacto', qr:'QR', wallet:'Billetera', split:'Split',
    securityLayers:'Capas de seguridad', securityLogs:'Registros de seguridad', renewal:'Recordatorio', openLink:'Abrir enlace'
  },
  tr: {
    dir:'ltr',
    appTitle:'TUOBA Ultimate All-in-One Multilingual Enterprise',
    appSubtitle:'Operasyon + POS + Finans + İK + Çağrı Merkezi + Güvenlik + Kalite + Ödeme',
    export:'Dışa aktar', passkey:'Passkey', location:'Konum',
    overview:'Genel', pos:'POS', orders:'Siparişler', kds:'KDS', pickup:'Pickup', apps:'Uygulamalar', printing:'Yazdırma',
    expenses:'Giderler', recipe:'Reçeteler', geidea:'Geidea', finance:'Finans', callcenter:'Çağrı Merkezi', crm:'CRM',
    attendance:'Devam', payments:'Ödemeler', security:'Güvenlik', reports:'Raporlar',
    dashboard:'Birleşik Panel', aiBrief:'AI Özeti', activeSituation:'Mevcut operasyon durumu stabil.',
    table:'Masalar', takeaway:'Gel Al', delivery:'Teslimat', orderType:'Sipariş Türü', tables:'Masalar', currentTable:'Geçerli masa',
    deliveryInfo:'Teslimat bilgileri', customerName:'Müşteri adı', phone:'Telefon', appChannel:'Uygulama / Kanal', address:'Adres',
    menu:'Menü', cart:'Sepet', total:'Toplam', clear:'Temizle', cash:'Nakit', card:'Kart',
    noData:'Veri yok', noOrders:'Sipariş yok', preparing:'Hazırlanıyor', ready:'Hazır', picked:'Teslim edildi',
    allOrders:'Tüm siparişler', kitchenDisplay:'Mutfak ekranı', pickupScreen:'Teslim ekranı', printingSettings:'Yazdırma ayarları',
    cashierCopies:'Kasa kopyaları', kitchenCopies:'Mutfak kopyaları', pickupCopies:'Teslim kopyaları', save:'Kaydet',
    addExpense:'Gider / fiş ekle', title:'Ad', amount:'Tutar', notes:'Notlar', saveRecord:'Kaydı kaydet',
    expenseLog:'Gider kaydı', addRecipe:'Reçete ekle', recipeIntelligence:'Reçete zekâsı', cost:'Maliyet', price:'Fiyat', ingredients:'İçerikler',
    geideaUpload:'Geidea CSV yükle', columns:'Sütunlar', autoMap:'Otomatik eşle', import:'İçe aktar',
    financeCenter:'Finans merkezi', branchPL:'Şube P&L', brandPL:'Marka P&L', cashFlow:'Nakit akışı', sales:'Satış', profit:'Kâr',
    callCenter:'Çağrı Merkezi', createOrder:'Sipariş oluştur', zone:'Bölge', orderDetails:'Sipariş detayları', prepTime:'Hazırlık süresi (dk)',
    crmCustomers:'CRM müşterileri', attendanceByLocation:'Konuma göre devam', currentLocation:'Geçerli konum', employee:'Çalışan adı', checkIn:'Giriş', checkOut:'Çıkış',
    paymentCreate:'Ödeme oluştur', paymentMethod:'Ödeme yöntemi', nfc:'NFC / Temassız', qr:'QR', wallet:'Cüzdan', split:'Böl',
    securityLayers:'Güvenlik katmanları', securityLogs:'Güvenlik kayıtları', renewal:'Hatırlatma', openLink:'Bağlantıyı aç'
  }
};

const initialState = {
  lang:'ar',
  brand:'TUOBA Fried & Grill',
  branch:'Giza Main',
  cart:[],
  currentMode:'table',
  currentTable:'T1',
  tables:[
    {id:'T1', occupied:false},{id:'T2', occupied:false},{id:'T3', occupied:false},
    {id:'T4', occupied:false},{id:'T5', occupied:false},{id:'T6', occupied:false}
  ],
  printer:{cashierCopies:1, kitchenCopies:1, pickupCopies:1},
  orders:[],
  expenses:[],
  recipes:[],
  geidea:[],
  finance:[
    {brand:'TUOBA Fried & Grill', branch:'Giza Main', foodCost:168000, payroll:95000, rent:40000, other:32000},
    {brand:'TUOBA Fried & Grill', branch:'Nasr City', foodCost:120000, payroll:70000, rent:35000, other:25000},
    {brand:'TUOBA Cafe', branch:'Sheikh Zayed', foodCost:90000, payroll:65000, rent:42000, other:22000},
    {brand:'TUOBA Cafe', branch:'New Cairo', foodCost:85000, payroll:60000, rent:40000, other:21000},
    {brand:'TUOBA Express', branch:'Alexandria', foodCost:70000, payroll:50000, rent:30000, other:18000}
  ],
  customerCalls:[],
  customers:[
    {brand:'TUOBA Fried & Grill', branch:'Giza Main', name:'عميل 1', phone:'01000000001', lastPayment:'NFC'}
  ],
  attendance:[],
  location:{lat:null,lng:null,label:'غير متاح'},
  shifts:[
    {name:'Morning', start:'09:00', end:'18:00'},
    {name:'Evening', start:'14:00', end:'23:00'}
  ],
  payments:[],
  securityLogs:[
    {brand:'TUOBA Fried & Grill', branch:'Giza Main', type:'login', detail:'Passkey login simulated', time:new Date().toLocaleString()}
  ]
};

function loadState(){ try{return JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(initialState)}catch{return structuredClone(initialState)} }
let state = loadState();
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

const brandSelect = document.getElementById('brand-select');
const branchSelect = document.getElementById('branch-select');
const langSelect = document.getElementById('lang-select');
const content = document.getElementById('content');
const buttons = document.querySelectorAll('.nav-btn');

function t(key){
  return (I18N[state.lang] && I18N[state.lang][key]) || I18N.en[key] || key;
}
function menuName(item){
  const k = 'name_' + state.lang;
  return item[k] || item.name_en || item.name_ar;
}
function setLang(lang){
  state.lang = lang;
  const dir = I18N[lang]?.dir || 'ltr';
  document.documentElement.lang = lang;
  document.documentElement.dir = dir;
  saveState();
  renderNavLabels();
  renderHeaderLabels();
  render(currentTab);
}
function renderHeaderLabels(){
  document.getElementById('app-title').textContent = t('appTitle');
  document.getElementById('app-subtitle').textContent = t('appSubtitle');
  document.getElementById('export-btn').textContent = t('export');
  document.getElementById('passkey-btn').textContent = t('passkey');
  document.getElementById('location-btn').textContent = t('location');
}
function renderNavLabels(){
  const keys = ['overview','pos','orders','kds','pickup','apps','printing','expenses','recipe','geidea','finance','callcenter','crm','attendance','payments','security','reports'];
  buttons.forEach((btn, i)=> btn.textContent = t(keys[i]));
}
function initSelectors(){
  brandSelect.innerHTML = Object.keys(BRANDS).map(b=>`<option value="${b}">${b}</option>`).join('');
  brandSelect.value = state.brand;
  updateBranches();

  langSelect.innerHTML = `
    <option value="ar">العربية</option>
    <option value="en">English</option>
    <option value="fr">Français</option>
    <option value="es">Español</option>
    <option value="tr">Türkçe</option>
  `;
  langSelect.value = state.lang;

  brandSelect.onchange = ()=>{ state.brand = brandSelect.value; state.branch = BRANDS[state.brand][0]; saveState(); updateBranches(); render(currentTab); };
  branchSelect.onchange = ()=>{ state.branch = branchSelect.value; saveState(); render(currentTab); };
  langSelect.onchange = ()=> setLang(langSelect.value);

  setLang(state.lang);
}
function updateBranches(){
  const arr = BRANDS[state.brand] || [];
  branchSelect.innerHTML = arr.map(b=>`<option value="${b}">${b}</option>`).join('');
  if(!arr.includes(state.branch)) state.branch = arr[0] || '';
  branchSelect.value = state.branch;
}
function scoped(arr){ return arr.filter(x=>x.brand===state.brand && x.branch===state.branch); }
function setActive(tab){ buttons.forEach(b=>b.classList.toggle('active', b.dataset.tab===tab)); }
function kpi(label, value, delta=''){ return `<div class="card"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div><div class="kpi-delta">${delta}</div></div>`; }
function minutesLeft(readyAt){ const diff = Math.ceil((new Date(readyAt).getTime() - Date.now())/60000); return diff > 0 ? diff : 0; }

function branchPL(brand, branch){
  const salesRec = state.geidea.find(x=>x.brand===brand && x.branch===branch);
  const fin = state.finance.find(x=>x.brand===brand && x.branch===branch) || {foodCost:0,payroll:0,rent:0,other:0};
  const sales = salesRec?.total || 0;
  const totalCost = Number(fin.foodCost||0)+Number(fin.payroll||0)+Number(fin.rent||0)+Number(fin.other||0);
  const profit = sales - totalCost;
  const margin = sales > 0 ? Math.round((profit / sales) * 100) : 0;
  return {sales, ...fin, totalCost, profit, margin};
}
function brandPL(brand){
  return (BRANDS[brand] || []).reduce((acc, branch)=>{
    const p = branchPL(brand, branch);
    acc.sales += p.sales; acc.foodCost += p.foodCost||0; acc.payroll += p.payroll||0; acc.rent += p.rent||0; acc.other += p.other||0; acc.totalCost += p.totalCost; acc.profit += p.profit;
    return acc;
  }, {sales:0,foodCost:0,payroll:0,rent:0,other:0,totalCost:0,profit:0});
}
function aiBrief(){
  const openOrders = scoped(state.orders).filter(o=>o.status!=='picked').length;
  const openCalls = scoped(state.customerCalls).filter(o=>o.status!=='delivered').length;
  const p = branchPL(state.brand, state.branch);
  const notes = [];
  if(openOrders) notes.push(`${openOrders} ${t('orders')}`);
  if(openCalls) notes.push(`${openCalls} ${t('callcenter')}`);
  if(p.sales > 0) notes.push(`${t('profit')}: ${p.profit.toFixed(2)}`);
  if(!notes.length) notes.push(t('activeSituation'));
  return notes;
}

function renderOverview(){
  const orders = scoped(state.orders);
  const calls = scoped(state.customerCalls);
  const payments = scoped(state.payments);
  const p = branchPL(state.brand, state.branch);
  content.innerHTML = `
    <div class="hero">
      <div class="section-title">${t('dashboard')}</div>
      <div class="small">${state.brand} · ${state.branch}</div>
    </div>
    <div class="grid-2">
      ${kpi(t('orders'), orders.length, 'POS')}
      ${kpi(t('callcenter'), calls.length, 'CC')}
      ${kpi(t('payments'), payments.length, 'Pay')}
      ${kpi(t('crm'), scoped(state.customers).length, 'CRM')}
      ${kpi(t('sales'), p.sales.toFixed(2), t('finance'))}
      ${kpi(t('profit'), p.profit.toFixed(2), 'P&L')}
    </div>
    <div class="card">
      <div class="section-title">${t('aiBrief')}</div>
      <div class="list">${aiBrief().map(n=>`<div class="list-item">${n}</div>`).join('')}</div>
    </div>
  `;
}

function renderPOS(){
  const cartTotal = state.cart.reduce((a,b)=>a+(b.price*b.qty),0);
  content.innerHTML = `
    <div class="card">
      <div class="section-title">${t('orderType')}</div>
      <div class="btn-row">
        <button class="btn ${state.currentMode==='table' ? 'primary' : 'soft'}" onclick="setOrderMode('table')">${t('table')}</button>
        <button class="btn ${state.currentMode==='takeaway' ? 'primary' : 'soft'}" onclick="setOrderMode('takeaway')">${t('takeaway')}</button>
        <button class="btn ${state.currentMode==='delivery' ? 'primary' : 'soft'}" onclick="setOrderMode('delivery')">${t('delivery')}</button>
      </div>
    </div>
    ${state.currentMode==='table' ? `<div class="card"><div class="section-title">${t('tables')}</div><div class="table-grid">${state.tables.map(ti=>`<button class="table-card ${ti.occupied ? 'occupied' : ''}" onclick="selectTable('${ti.id}')">${ti.id}</button>`).join('')}</div><div class="note">${t('currentTable')}: ${state.currentTable}</div></div>` : ''}
    ${state.currentMode==='delivery' ? `<div class="card"><div class="section-title">${t('deliveryInfo')}</div><div class="form-grid"><input id="customer-name" class="input" placeholder="${t('customerName')}" /><input id="customer-phone" class="input" placeholder="${t('phone')}" /><input id="delivery-app" class="input" placeholder="${t('appChannel')}" /><textarea id="delivery-address" class="textarea" placeholder="${t('address')}"></textarea></div></div>` : ''}
    <div class="card"><div class="section-title">${t('menu')}</div><div class="menu-grid">${MENU.map((m, idx)=>`<button class="menu-btn" onclick="addToCart(${idx})"><strong>${menuName(m)}</strong><div class="muted">${m.price}</div><div class="small">Prep ${m.prep} min</div></button>`).join('')}</div></div>
    <div class="card"><div class="section-title">${t('cart')}</div><div class="list">${state.cart.length ? state.cart.map((i,idx)=>`<div class="cart-row"><div><strong>${menuName(i)}</strong><div class="muted">${i.qty} × ${i.price}</div></div><div><button class="btn soft" onclick="changeQty(${idx}, 1)">+</button><button class="btn soft" onclick="changeQty(${idx}, -1)">-</button></div></div>`).join('') : `<div class="muted">${t('noData')}</div>`}</div><div class="section-title">${t('total')}: ${cartTotal.toFixed(2)}</div><div class="btn-row"><button class="btn soft" onclick="clearCart()">${t('clear')}</button><button class="btn primary" onclick="placeOrder('cash')">${t('cash')}</button><button class="btn primary" onclick="placeOrder('card')">${t('card')}</button></div></div>
  `;
}
function addToCart(idx){
  const item = MENU[idx];
  const existing = state.cart.find(x=>x.name_en===item.name_en);
  if(existing) existing.qty += 1; else state.cart.push({...item, qty:1});
  saveState(); render('pos');
}
function changeQty(idx, delta){ if(!state.cart[idx]) return; state.cart[idx].qty += delta; if(state.cart[idx].qty <= 0) state.cart.splice(idx,1); saveState(); render('pos'); }
function clearCart(){ state.cart = []; saveState(); render('pos'); }
function setOrderMode(mode){ state.currentMode = mode; saveState(); render('pos'); }
function selectTable(id){ state.currentTable = id; saveState(); render('pos'); }
function placeOrder(payment){
  if(!state.cart.length) return alert(t('noData'));
  let customer = {};
  if(state.currentMode==='delivery'){
    customer = {
      name: document.getElementById('customer-name')?.value.trim() || '',
      phone: document.getElementById('customer-phone')?.value.trim() || '',
      app: document.getElementById('delivery-app')?.value.trim() || '',
      address: document.getElementById('delivery-address')?.value.trim() || ''
    };
    if(customer.phone) upsertCustomer(customer.name || 'Customer', customer.phone, payment);
  }
  const orderNo = 'ORD-' + Math.floor(Date.now()/1000);
  const prepMinutes = Math.max(...state.cart.map(i => i.prep), 5);
  const total = state.cart.reduce((a,b)=>a+(b.price*b.qty),0);
  state.orders.unshift({
    brand: state.brand, branch: state.branch, orderNo, mode: state.currentMode, table: state.currentMode==='table' ? state.currentTable : '',
    customer, payment, items: JSON.parse(JSON.stringify(state.cart)), total, prepMinutes,
    createdAt: new Date().toISOString(), readyAt: new Date(Date.now() + prepMinutes*60000).toISOString(), status:'preparing',
    cashierCopies: Number(state.printer.cashierCopies||1), kitchenCopies: Number(state.printer.kitchenCopies||1), pickupCopies: Number(state.printer.pickupCopies||1)
  });
  if(state.currentMode==='table'){ const ti = state.tables.find(x=>x.id===state.currentTable); if(ti) ti.occupied = true; }
  state.cart = [];
  saveState(); render('orders');
}

function renderOrders(){
  const posOrders = scoped(state.orders);
  content.innerHTML = `
    <div class="card"><div class="section-title">${t('allOrders')}</div><div class="list">${posOrders.length ? posOrders.map((o,idx)=>`
      <div class="list-item">
        <span class="badge ${o.status==='preparing' ? 'preparing' : o.status==='ready' ? 'ready' : 'picked'}">${t(o.status) || o.status}</span>
        <div><strong>${o.orderNo}</strong> — ${o.mode} — ${o.total.toFixed(2)}</div>
        <div class="muted">${o.table ? t('table')+': '+o.table+' — ' : ''}${t('prepTime')}: ${o.prepMinutes} — Left: ${minutesLeft(o.readyAt)}</div>
        <div class="small">${t('cashierCopies')}: ${o.cashierCopies} · ${t('kitchenCopies')}: ${o.kitchenCopies} · ${t('pickupCopies')}: ${o.pickupCopies}</div>
        <div class="btn-row"><button class="btn soft" onclick="setPosOrderStatus(${idx}, 'preparing')">${t('preparing')}</button><button class="btn soft" onclick="setPosOrderStatus(${idx}, 'ready')">${t('ready')}</button><button class="btn soft" onclick="setPosOrderStatus(${idx}, 'picked')">${t('picked')}</button></div>
      </div>`).join('') : `<div class="muted">${t('noOrders')}</div>`}</div></div>
  `;
}
function setPosOrderStatus(idx, status){
  const orders = scoped(state.orders); const target = orders[idx]; if(!target) return;
  const realIdx = state.orders.findIndex(x=>x===target); state.orders[realIdx].status = status;
  if(status==='picked' && target.mode==='table' && target.table){ const ti = state.tables.find(x=>x.id===target.table); if(ti) ti.occupied = false; }
  saveState(); render('orders');
}

function renderKDS(){
  const orders = scoped(state.orders).filter(o=>o.status==='preparing');
  content.innerHTML = `<div class="card"><div class="section-title">${t('kitchenDisplay')}</div><div class="list">${orders.length ? orders.map(o=>`
    <div class="list-item"><span class="badge preparing">${t('preparing')}</span><div><strong>${o.orderNo}</strong> — ${o.mode}</div><div class="muted">${t('prepTime')}: ${o.prepMinutes} — Left: ${minutesLeft(o.readyAt)}</div><div class="list">${o.items.map(i=>`<div class="small">${i.qty} × ${menuName(i)}</div>`).join('')}</div></div>`).join('') : `<div class="muted">${t('noOrders')}</div>`}</div></div>`;
}

function renderPickup(){
  const orders = scoped(state.orders).filter(o=>o.status==='ready');
  content.innerHTML = `<div class="card"><div class="section-title">${t('pickupScreen')}</div><div class="list">${orders.length ? orders.map(o=>`
    <div class="list-item"><span class="badge ready">${t('ready')}</span><div><strong>${o.orderNo}</strong></div><div class="muted">${o.mode} ${o.customer?.name ? '— '+o.customer.name : ''}</div><div class="small">${t('pickupCopies')}: ${o.pickupCopies}</div></div>`).join('') : `<div class="muted">${t('noOrders')}</div>`}</div></div>`;
}

function renderApps(){
  content.innerHTML = `<div class="card"><div class="section-title">${t('apps')}</div><div class="channel-grid">${DELIVERY_LINKS.map(x=>`<a class="link-btn" href="${x.url}" target="_blank" rel="noopener noreferrer"><strong>${x.name}</strong><div class="muted">${t('openLink')}</div></a>`).join('')}</div></div>`;
}

function renderPrinting(){
  content.innerHTML = `
    <div class="card"><div class="section-title">${t('printingSettings')}</div><div class="form-grid">
      <input id="cashier-copies" class="input" type="number" min="1" value="${state.printer.cashierCopies}" placeholder="${t('cashierCopies')}" />
      <input id="kitchen-copies" class="input" type="number" min="1" value="${state.printer.kitchenCopies}" placeholder="${t('kitchenCopies')}" />
      <input id="pickup-copies" class="input" type="number" min="1" value="${state.printer.pickupCopies}" placeholder="${t('pickupCopies')}" />
      <button class="btn primary" onclick="savePrinterSettings()">${t('save')}</button>
    </div></div>
  `;
}
function savePrinterSettings(){
  state.printer.cashierCopies = Math.max(1, Number(document.getElementById('cashier-copies').value || 1));
  state.printer.kitchenCopies = Math.max(1, Number(document.getElementById('kitchen-copies').value || 1));
  state.printer.pickupCopies = Math.max(1, Number(document.getElementById('pickup-copies').value || 1));
  saveState(); render('printing');
}

async function readImage(file){
  return new Promise((resolve) => {
    const r = new FileReader(); r.onload = ()=>resolve(r.result || ''); r.onerror = ()=>resolve(''); r.readAsDataURL(file);
  });
}
async function handleReceiptPreview(e){
  const file = e.target.files?.[0];
  const box = document.getElementById('receipt-preview-wrap');
  if(!file || !box) return;
  const src = await readImage(file);
  box.innerHTML = `<div class="small">${file.name}</div><img class="preview-image" src="${src}" alt="receipt" />`;
}
function renderExpenses(){
  const items = scoped(state.expenses);
  content.innerHTML = `
    <div class="card"><div class="section-title">${t('addExpense')}</div><div class="form-grid">
      <input id="exp-title" class="input" placeholder="${t('title')}" />
      <input id="exp-amount" class="input" type="number" placeholder="${t('amount')}" />
      <input id="exp-receipt" class="input" type="file" accept="image/*" capture="environment" />
      <div id="receipt-preview-wrap" class="note">Upload receipt image</div>
      <textarea id="exp-note" class="textarea" placeholder="${t('notes')}"></textarea>
      <button class="btn primary" onclick="addExpense()">${t('saveRecord')}</button>
    </div></div>
    <div class="card"><div class="section-title">${t('expenseLog')}</div><div class="list">${items.length ? items.map(e=>`<div class="list-item"><strong>${e.title}</strong> — ${e.amount}<div class="muted">${e.note||''}</div>${e.receiptName ? `<div class="small">${e.receiptName}</div>` : ''}</div>`).join('') : `<div class="muted">${t('noData')}</div>`}</div></div>
  `;
  document.getElementById('exp-receipt').addEventListener('change', handleReceiptPreview);
}
async function addExpense(){
  const title = document.getElementById('exp-title').value.trim();
  const amount = document.getElementById('exp-amount').value.trim();
  const note = document.getElementById('exp-note').value.trim();
  const receipt = document.getElementById('exp-receipt').files?.[0];
  if(!title || !amount) return alert(t('noData'));
  state.expenses.unshift({brand:state.brand, branch:state.branch, title, amount, note, receiptName: receipt ? receipt.name : ''});
  saveState(); render('expenses');
}

function renderRecipe(){
  const items = scoped(state.recipes);
  content.innerHTML = `
    <div class="card"><div class="section-title">${t('addRecipe')}</div><div class="form-grid">
      <input id="r-name" class="input" placeholder="${t('title')}" />
      <input id="r-cost" class="input" type="number" placeholder="${t('cost')}" />
      <input id="r-price" class="input" type="number" placeholder="${t('price')}" />
      <textarea id="r-ing" class="textarea" placeholder="${t('ingredients')}"></textarea>
      <button class="btn primary" onclick="addRecipe()">${t('save')}</button>
    </div></div>
    <div class="card"><div class="section-title">${t('recipeIntelligence')}</div><div class="list">${items.length ? items.map(r=>`<div class="list-item"><span class="badge ${Number(r.margin)>=40?'good':'pending'}">${r.margin}%</span><div><strong>${r.name}</strong></div><div class="muted">${t('cost')}: ${r.cost} — ${t('price')}: ${r.price}</div></div>`).join('') : `<div class="muted">${t('noData')}</div>`}</div></div>
  `;
}
function addRecipe(){
  const name = document.getElementById('r-name').value.trim();
  const cost = Number(document.getElementById('r-cost').value || 0);
  const price = Number(document.getElementById('r-price').value || 0);
  const ingredients = document.getElementById('r-ing').value.trim();
  if(!name || !cost || !price) return alert(t('noData'));
  const margin = price > 0 ? Math.round(((price - cost) / price) * 100) : 0;
  state.recipes.unshift({brand:state.brand, branch:state.branch, name, cost, price, ingredients, margin});
  saveState(); render('recipe');
}

let geideaHeaders = [], geideaRows = [];
function parseCSV(text){
  const lines = text.split(/\r?\n/).filter(Boolean);
  if(!lines.length) return {headers:[], rows:[]};
  const parseLine = (line) => {
    const out=[]; let cur=''; let inQuotes=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if(ch === '"'){ if(inQuotes && line[i+1] === '"'){ cur += '"'; i++; } else inQuotes = !inQuotes; }
      else if(ch === ',' && !inQuotes){ out.push(cur.trim()); cur=''; } else cur += ch;
    }
    out.push(cur.trim()); return out;
  };
  const headers = parseLine(lines[0]).map(h=>h.replace(/^"|"$/g,'').trim());
  const rows = lines.slice(1).map(line => { const vals = parseLine(line); const obj={}; headers.forEach((h,i)=>obj[h]=(vals[i]||'').replace(/^"|"$/g,'').trim()); return obj; });
  return {headers, rows};
}
function normalize(s){ return String(s || '').toLowerCase().replace(/[_\-\s]+/g,''); }
function renderGeidea(){
  content.innerHTML = `
    <div class="card"><div class="section-title">${t('geideaUpload')}</div><input id="file-input" class="input" type="file" accept=".csv,text/csv" /><div class="note">CSV</div></div>
    <div class="card"><div class="section-title">${t('columns')}</div><div id="columns-box" class="muted">${t('noData')}</div></div>
    <div class="card"><div class="section-title">${t('autoMap')}</div><div class="form-grid">
      <label>Date <select id="map-date" class="select"></select></label>
      <label>Time <select id="map-time" class="select"></select></label>
      <label>${t('amount')} <select id="map-amount" class="select"></select></label>
    </div><div class="btn-row"><button class="btn soft" onclick="autoMap()">${t('autoMap')}</button><button class="btn primary" onclick="runImport()">${t('import')}</button></div></div>
    <div class="card"><div class="section-title">${t('reports')}</div><div id="results-box" class="muted">${t('noData')}</div></div>
  `;
  document.getElementById('file-input').addEventListener('change', async (e)=>{
    const file = e.target.files?.[0]; if(!file) return;
    const parsed = parseCSV(await file.text()); geideaHeaders = parsed.headers; geideaRows = parsed.rows;
    fillMapSelects(); renderHeaders(); autoMap();
  });
}
function fillMapSelects(){ ['map-date','map-time','map-amount'].forEach(id => { const sel = document.getElementById(id); sel.innerHTML = '<option value="">--</option>' + geideaHeaders.map(h => `<option value="${h}">${h}</option>`).join(''); }); }
function renderHeaders(){ document.getElementById('columns-box').innerHTML = geideaHeaders.length ? geideaHeaders.map(h => `<div class="list-item">${h}</div>`).join('') : '—'; }
function autoMap(){ const guess = (patterns) => geideaHeaders.find(h => patterns.some(p => normalize(h).includes(p))); document.getElementById('map-date').value = guess(['date','تاريخ']) || ''; document.getElementById('map-time').value = guess(['time','وقت']) || ''; document.getElementById('map-amount').value = guess(['amount','total','gross','net','مبلغ','قيمة']) || ''; }
function runImport(){
  const amountCol = document.getElementById('map-amount').value;
  if(!amountCol) return alert(t('noData'));
  const cleaned = geideaRows.map(r => ({amount: Number(String(r[amountCol] || '0').replace(/[^0-9.\-]/g,'')) || 0}));
  const total = cleaned.reduce((a,b)=>a+b.amount,0);
  const count = cleaned.length;
  const avg = count ? total / count : 0;
  const idx = state.geidea.findIndex(x=>x.brand===state.brand && x.branch===state.branch);
  const rec = {brand:state.brand, branch:state.branch, total, count, avg};
  if(idx >= 0) state.geidea[idx] = rec; else state.geidea.unshift(rec);
  saveState();
  document.getElementById('results-box').innerHTML = `<div class="list"><div class="list-item">${t('sales')}: ${total.toFixed(2)}</div><div class="list-item">Count: ${count}</div><div class="list-item">Avg: ${avg.toFixed(2)}</div></div>`;
}

function renderFinance(){
  const p = branchPL(state.brand, state.branch);
  const b = brandPL(state.brand);
  const cIn = p.sales, cOut = p.totalCost, balance = p.sales - p.totalCost;
  const bMargin = b.sales > 0 ? Math.round((b.profit/b.sales)*100) : 0;
  content.innerHTML = `
    <div class="card"><div class="section-title">${t('branchPL')} — ${state.branch}</div><div class="list">
      <div class="list-item">${t('sales')}: ${p.sales.toFixed(2)}</div>
      <div class="list-item">${t('cost')}: ${p.foodCost}</div>
      <div class="list-item">Payroll: ${p.payroll}</div>
      <div class="list-item">Rent: ${p.rent}</div>
      <div class="list-item">Other: ${p.other}</div>
      <div class="list-item"><strong>${t('profit')}: ${p.profit.toFixed(2)}</strong></div>
      <div class="list-item"><strong>Margin: ${p.margin}%</strong></div>
    </div></div>
    <div class="card"><div class="section-title">${t('brandPL')} — ${state.brand}</div><div class="list">
      <div class="list-item">${t('sales')}: ${b.sales.toFixed(2)}</div>
      <div class="list-item">Total Cost: ${b.totalCost.toFixed(2)}</div>
      <div class="list-item"><strong>${t('profit')}: ${b.profit.toFixed(2)}</strong></div>
      <div class="list-item"><strong>Margin: ${bMargin}%</strong></div>
    </div></div>
    <div class="card"><div class="section-title">${t('cashFlow')}</div><div class="list"><div class="list-item">In: ${cIn.toFixed(2)}</div><div class="list-item">Out: ${cOut.toFixed(2)}</div><div class="list-item"><strong>Balance: ${balance.toFixed(2)}</strong></div></div></div>
  `;
}

function renderCallCenter(){
  const calls = scoped(state.customerCalls);
  content.innerHTML = `
    <div class="card"><div class="section-title">${t('callCenter')}</div><div class="form-grid">
      <input id="cc-phone" class="input" placeholder="${t('phone')}" />
      <input id="cc-name" class="input" placeholder="${t('customerName')}" />
      <select id="cc-type" class="select"><option value="delivery">${t('delivery')}</option><option value="takeaway">${t('takeaway')}</option><option value="table">${t('table')}</option></select>
      <input id="cc-zone" class="input" placeholder="${t('zone')}" />
      <textarea id="cc-order" class="textarea" placeholder="${t('orderDetails')}"></textarea>
      <input id="cc-prep" class="input" type="number" placeholder="${t('prepTime')}" value="20" />
      <button class="btn primary" onclick="createCallOrder()">${t('createOrder')}</button>
    </div></div>
    <div class="card"><div class="section-title">${t('orders')}</div><div class="list">${calls.length ? calls.map((o,idx)=>`
      <div class="list-item"><span class="badge ${o.status==='new'?'pending':o.status==='assigned'?'pending':o.status==='out'?'preparing':'ready'}">${o.status}</span>
        <div><strong>${o.customerName}</strong> — ${o.phone}</div>
        <div class="muted">${o.orderText}</div>
        <div class="small">Driver: ${o.driver || '-'} · Left: ${minutesLeft(o.readyAt)}</div>
        <div class="btn-row"><button class="btn soft" onclick="assignDriverPrompt(${idx})">Assign</button><button class="btn soft" onclick="setCallStatus(${idx}, 'out')">Out</button><button class="btn soft" onclick="setCallStatus(${idx}, 'delivered')">Done</button></div>
      </div>`).join('') : `<div class="muted">${t('noData')}</div>`}</div></div>
  `;
}
function createCallOrder(){
  const phone = document.getElementById('cc-phone').value.trim();
  const customerName = document.getElementById('cc-name').value.trim();
  const type = document.getElementById('cc-type').value;
  const zone = document.getElementById('cc-zone').value.trim();
  const orderText = document.getElementById('cc-order').value.trim();
  const prep = Number(document.getElementById('cc-prep').value || 20);
  if(!phone || !customerName || !orderText) return alert(t('noData'));
  const order = { brand: state.brand, branch: state.branch, id: 'CC-' + Math.floor(Date.now()/1000), phone, customerName, type, zone, orderText, status:'new', driver:'', createdAt: new Date().toISOString(), readyAt: new Date(Date.now() + prep*60000).toISOString() };
  state.customerCalls.unshift(order); upsertCustomer(customerName, phone, 'CC'); saveState(); render('callcenter');
}
function assignDriverPrompt(idx){
  const driver = prompt('Driver', DRIVERS[0]); if(!driver) return;
  const orders = scoped(state.customerCalls); const target = orders[idx]; if(!target) return;
  const realIdx = state.customerCalls.findIndex(x => x === target); state.customerCalls[realIdx].driver = driver; state.customerCalls[realIdx].status = 'assigned'; saveState(); render('callcenter');
}
function setCallStatus(idx, status){
  const orders = scoped(state.customerCalls); const target = orders[idx]; if(!target) return;
  const realIdx = state.customerCalls.findIndex(x => x === target); state.customerCalls[realIdx].status = status; saveState(); render('callcenter');
}

function renderCRM(){
  const customers = scoped(state.customers);
  content.innerHTML = `<div class="card"><div class="section-title">${t('crmCustomers')}</div><div class="list">${customers.length ? customers.map(c=>`<div class="list-item"><div><strong>${c.name}</strong> — ${c.phone}</div><div class="muted">Last payment/source: ${c.lastPayment || '-'}</div></div>`).join('') : `<div class="muted">${t('noData')}</div>`}</div></div>`;
}
function upsertCustomer(name, phone, lastPayment){
  const idx = state.customers.findIndex(x=>x.brand===state.brand && x.phone===phone);
  if(idx >= 0){ state.customers[idx].name = name; state.customers[idx].lastPayment = lastPayment; }
  else state.customers.push({brand:state.brand, branch:state.branch, name, phone, lastPayment});
}

function renderAttendance(){
  const rows = scoped(state.attendance);
  content.innerHTML = `
    <div class="card"><div class="section-title">${t('attendanceByLocation')}</div><div class="muted">${t('currentLocation')}: ${state.location.label}</div><div class="form-grid">
      <input id="emp-name" class="input" placeholder="${t('employee')}" />
      <select id="emp-shift" class="select">${state.shifts.map(s=>`<option value="${s.name}">${s.name} (${s.start}-${s.end})</option>`).join('')}</select>
      <div class="btn-row"><button class="btn primary" onclick="checkIn()">${t('checkIn')}</button><button class="btn soft" onclick="checkOut()">${t('checkOut')}</button><button class="btn soft" onclick="getCurrentLocation()">${t('location')}</button></div>
    </div></div>
    <div class="card"><div class="section-title">${t('attendance')}</div><div class="list">${rows.length ? rows.map(r=>`<div class="list-item"><div><strong>${r.employee}</strong> — ${r.shift}</div><div class="muted">In: ${r.checkInAt || '-'} · Out: ${r.checkOutAt || '-'}</div><div class="small">Hours: ${r.hoursWorked || 0} · Overtime: ${r.overtime || 0}</div></div>`).join('') : `<div class="muted">${t('noData')}</div>`}</div></div>
  `;
}
function getCurrentLocation(){
  if(!navigator.geolocation){ state.location = {lat:null,lng:null,label:'Geolocation unsupported'}; saveState(); render(currentTab); return; }
  navigator.geolocation.getCurrentPosition((pos)=>{ state.location = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}` }; saveState(); render(currentTab); }, ()=>{ state.location = {lat:null,lng:null,label:'Location unavailable'}; saveState(); render(currentTab); });
}
function checkIn(){
  const employee = document.getElementById('emp-name').value.trim(); const shift = document.getElementById('emp-shift').value; if(!employee) return alert(t('noData'));
  state.attendance.unshift({ brand:state.brand, branch:state.branch, employee, shift, checkInAt:new Date().toLocaleString(), checkOutAt:'', location:state.location.label, hoursWorked:0, overtime:0 });
  saveState(); render('attendance');
}
function checkOut(){
  const employee = document.getElementById('emp-name').value.trim(); if(!employee) return alert(t('noData'));
  const idx = state.attendance.findIndex(x=>x.brand===state.brand && x.branch===state.branch && x.employee===employee && !x.checkOutAt); if(idx < 0) return alert(t('noData'));
  state.attendance[idx].checkOutAt = new Date().toLocaleString(); state.attendance[idx].hoursWorked = 9; state.attendance[idx].overtime = 1; saveState(); render('attendance');
}

function renderPayments(){
  const payments = scoped(state.payments);
  content.innerHTML = `
    <div class="card"><div class="section-title">${t('paymentCreate')}</div><div class="form-grid">
      <input id="pay-customer" class="input" placeholder="${t('customerName')}" />
      <input id="pay-phone" class="input" placeholder="${t('phone')}" />
      <input id="pay-amount" class="input" type="number" placeholder="${t('amount')}" />
      <select id="pay-method" class="select">
        <option value="NFC">${t('nfc')}</option>
        <option value="Card">${t('card')}</option>
        <option value="QR">${t('qr')}</option>
        <option value="Cash">${t('cash')}</option>
        <option value="Wallet">${t('wallet')}</option>
        <option value="Split">${t('split')}</option>
      </select>
      <button class="btn primary" onclick="createPayment()">${t('save')}</button>
    </div></div>
    <div class="card"><div class="section-title">${t('payments')}</div><div class="list">${payments.length ? payments.map(p=>`<div class="list-item"><span class="badge good">${p.method}</span><div><strong>${p.customer}</strong> — ${p.amount}</div><div class="muted">${p.phone} · ${p.txId}</div></div>`).join('') : `<div class="muted">${t('noData')}</div>`}</div></div>
  `;
}
function createPayment(){
  const customer = document.getElementById('pay-customer').value.trim();
  const phone = document.getElementById('pay-phone').value.trim();
  const amount = Number(document.getElementById('pay-amount').value || 0);
  const method = document.getElementById('pay-method').value;
  if(!customer || !phone || !amount) return alert(t('noData'));
  const txId = 'TX-' + Math.floor(Date.now()/1000);
  state.payments.unshift({brand:state.brand, branch:state.branch, customer, phone, amount, method, txId});
  upsertCustomer(customer, phone, method);
  state.securityLogs.unshift({brand:state.brand, branch:state.branch, type:'payment', detail:`${method} payment ${txId}`, time:new Date().toLocaleString()});
  saveState(); render('payments');
}

function renderSecurity(){
  const logs = scoped(state.securityLogs);
  content.innerHTML = `
    <div class="card"><div class="section-title">${t('securityLayers')}</div><div class="list">
      <div class="list-item"><span class="badge sec">Passkey/Biometric</span> Modern login.</div>
      <div class="list-item"><span class="badge sec">Brand isolation</span> Brand-scoped customers, payments, and records.</div>
      <div class="list-item"><span class="badge sec">Audit logs</span> Trace sensitive actions.</div>
      <div class="list-item"><span class="badge warn">MVP</span> Local prototype, not direct bank integration.</div>
    </div></div>
    <div class="card"><div class="section-title">${t('securityLogs')}</div><div class="list">${logs.length ? logs.map(l=>`<div class="list-item"><div><strong>${l.type}</strong></div><div class="muted">${l.detail}</div><div class="small">${l.time}</div></div>`).join('') : `<div class="muted">${t('noData')}</div>`}</div></div>
  `;
}
function simulateBiometric(){
  state.securityLogs.unshift({brand:state.brand, branch:state.branch, type:'login', detail:'Passkey/biometric simulated', time:new Date().toLocaleString()});
  saveState();
  alert('Passkey/Biometric simulated');
  render('security');
}

function renderReports(){
  const orders = scoped(state.orders);
  const calls = scoped(state.customerCalls);
  const payments = scoped(state.payments);
  const brandSummary = brandPL(state.brand);
  const brandMargin = brandSummary.sales > 0 ? Math.round((brandSummary.profit / brandSummary.sales) * 100) : 0;
  content.innerHTML = `
    <div class="hero"><div class="section-title">${t('reports')}</div><div class="small">${state.brand}</div></div>
    <div class="grid-2">
      ${kpi(t('orders'), orders.length, 'POS')}
      ${kpi(t('callcenter'), calls.length, 'CC')}
      ${kpi(t('payments'), payments.length, 'Pay')}
      ${kpi('Brand Margin', brandMargin + '%', 'Brand')}
    </div>
    <div class="card"><div class="section-title">${t('aiBrief')}</div><div class="list">${aiBrief().map(n=>`<div class="list-item">${n}</div>`).join('')}</div></div>
  `;
}

function exportData(){
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'tuoba-ultimate-all-in-one-i18n-data.json'; a.click();
}

let currentTab = 'overview';
function render(tab){
  currentTab = tab; setActive(tab);
  if(tab==='overview') renderOverview();
  if(tab==='pos') renderPOS();
  if(tab==='orders') renderOrders();
  if(tab==='kds') renderKDS();
  if(tab==='pickup') renderPickup();
  if(tab==='apps') renderApps();
  if(tab==='printing') renderPrinting();
  if(tab==='expenses') renderExpenses();
  if(tab==='recipe') renderRecipe();
  if(tab==='geidea') renderGeidea();
  if(tab==='finance') renderFinance();
  if(tab==='callcenter') renderCallCenter();
  if(tab==='crm') renderCRM();
  if(tab==='attendance') renderAttendance();
  if(tab==='payments') renderPayments();
  if(tab==='security') renderSecurity();
  if(tab==='reports') renderReports();
}
buttons.forEach(btn=>btn.addEventListener('click', ()=>render(btn.dataset.tab)));

window.setOrderMode = setOrderMode;
window.selectTable = selectTable;
window.addToCart = addToCart;
window.changeQty = changeQty;
window.clearCart = clearCart;
window.placeOrder = placeOrder;
window.setPosOrderStatus = setPosOrderStatus;
window.savePrinterSettings = savePrinterSettings;
window.addExpense = addExpense;
window.addRecipe = addRecipe;
window.autoMap = autoMap;
window.runImport = runImport;
window.createCallOrder = createCallOrder;
window.assignDriverPrompt = assignDriverPrompt;
window.setCallStatus = setCallStatus;
window.getCurrentLocation = getCurrentLocation;
window.checkIn = checkIn;
window.checkOut = checkOut;
window.createPayment = createPayment;
window.simulateBiometric = simulateBiometric;
window.exportData = exportData;

if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js').catch(()=>{}); }
initSelectors();
render('overview');
