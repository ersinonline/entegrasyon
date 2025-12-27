# 🛒 Marketplace Integration Platform

5 büyük Türk pazaryeri için eksiksiz entegrasyon sistemi:
- **n11** (REST + SOAP)
- **Trendyol** (REST + Basic Auth)
- **Hepsiburada** (REST + Basic Auth)
- **Pazarama** (REST + Async)
- **İdefix** (REST + Token Auth)

## 🚀 Özellikler

### ✅ Ürün Yönetimi
- Ürün oluşturma ve güncelleme
- Kategori ve özellik eşleştirme
- Toplu ürün yükleme
- Varyant yönetimi (renk, beden, vb.)

### 📦 Envanter Yönetimi
- Gerçek zamanlı stok senkronizasyonu
- Toplu fiyat güncelleme
- Otomatik stok uyarıları
- Multi-store envanter takibi

### 🛍️ Sipariş Yönetimi
- Otomatik sipariş çekme (Webhook + Polling)
- Sipariş statü güncelleme
- Paketleme ve kargoya verme
- Fatura entegrasyonu

### 🔄 İade & İptal
- İade talep yönetimi
- Otomatik onay/red sistemi
- İptal nedeni takibi
- Müşteri iletişimi

### 📊 Raporlama
- Pazaryeri bazlı satış raporları
- Stok takip raporları
- Entegrasyon log'ları
- Hata analizi

## 🏗️ Mimari

```
├── functions/          # Firebase Cloud Functions (Backend)
│   ├── src/
│   │   ├── connectors/   # Marketplace adaptörleri
│   │   │   ├── n11/
│   │   │   ├── trendyol/
│   │   │   ├── hepsiburada/
│   │   │   ├── pazarama/
│   │   │   └── idefix/
│   │   ├── services/     # Business logic
│   │   ├── models/       # Data models
│   │   ├── jobs/         # Background jobs
│   │   └── utils/        # Helpers
│   └── package.json
│
├── web/                # Next.js Admin Panel
│   ├── src/
│   │   ├── app/          # Pages
│   │   ├── components/   # UI Components
│   │   └── services/     # API Services
│   └── package.json
│
├── firestore.rules     # Firestore güvenlik kuralları
└── firebase.json       # Firebase config
```

## 📦 Kurulum

### 1. Firebase CLI Yükle
```bash
npm install -g firebase-tools
firebase login
```

### 2. Projeyi Başlat
```bash
# Dependencies yükle
npm install
cd functions && npm install
cd ../web && npm install
```

### 3. Firebase Projesini Bağla
```bash
firebase use --add
# Project ID: teknotech-app
```

### 4. Environment Variables
`functions/.env` dosyası oluştur:
```env
ENCRYPTION_KEY=your-32-char-encryption-key-here
```

### 5. Geliştirme Modu
```bash
# Terminal 1: Functions
cd functions
npm run serve

# Terminal 2: Web
cd web
npm run dev
```

### 6. Deploy
```bash
# Tüm proje
npm run deploy

# Sadece functions
npm run deploy:functions

# Sadece hosting
npm run deploy:hosting
```

## 🔐 Güvenlik

- ✅ Firestore Security Rules
- ✅ API credentials şifrelemesi (AES-256)
- ✅ Rate limiting
- ✅ Request validation
- ✅ Audit logging

## 📖 Dokümantasyon

### Connector Kullanımı

```typescript
import { N11Connector } from './connectors/n11';

const connector = new N11Connector({
  appKey: 'xxx',
  appSecret: 'yyy'
});

// Ürün güncelle
await connector.updateProduct({
  sku: 'PROD-001',
  title: 'Ürün Başlığı',
  price: 99.90,
  stock: 10
});

// Siparişleri çek
const orders = await connector.getOrders({
  startDate: '2025-01-01',
  endDate: '2025-01-31'
});
```

## 🎯 Firebase Free Tier Limitler

- ✅ Firestore: 50K okuma, 20K yazma, 20K silme (günlük)
- ✅ Functions: 2M çağrı, 400K GB-sn (aylık)
- ✅ Hosting: 10GB depolama, 360MB/gün transfer
- ✅ Storage: 5GB depolama, 1GB/gün transfer

## 🛠️ Kullanılan Teknolojiler

- **Backend**: Firebase Cloud Functions + TypeScript
- **Database**: Firestore (NoSQL)
- **Storage**: Firebase Storage
- **Auth**: Firebase Authentication
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Queue**: Cloud Tasks
- **Monitoring**: Firebase Analytics

## 📝 Lisans

MIT
