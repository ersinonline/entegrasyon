# ⚡ Quick Start Guide

5 dakikada pazaryeri entegrasyonunu çalıştır!

## 🎯 Hızlı Başlangıç (Development)

### 1. Repository Clone

```bash
git clone <repo-url>
cd entegrasyon
```

### 2. Install Dependencies

```bash
# Functions
cd functions
npm install

# Web
cd ../web
npm install
```

### 3. Environment Setup

#### functions/.env
```bash
cat > functions/.env << 'EOF'
ENCRYPTION_KEY=test-key-for-development-only-32ch
NODE_ENV=development
EOF
```

#### web/.env.local
```bash
cat > web/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:5001/teknotech-app/europe-west1/api
EOF
```

### 4. Firebase Emulator Başlat

```bash
# Terminal 1: Functions
cd functions
npm run serve

# Terminal 2: Web
cd web
npm run dev
```

### 5. Tarayıcıda Aç

http://localhost:3000

## 🔐 İlk Kullanıcı (Emulator)

Firebase Auth Emulator UI: http://localhost:4000/auth

1. "Add User" tıkla
2. Email: `admin@test.com`
3. Password: `test123`
4. User ID'yi kopyala

Firestore Emulator'da user dokümantı ekle:
http://localhost:4000/firestore

```json
Collection: users
Document ID: [USER_ID]
{
  "email": "admin@test.com",
  "displayName": "Test Admin",
  "role": "admin"
}
```

## 🏪 İlk Mağaza Ekleme

### Web UI'dan:

1. Login ol (admin@test.com / test123)
2. "Mağaza Ekle" butonuna tıkla
3. Pazaryeri seç (örn: n11)
4. Credentials gir:
   - n11: appKey + appSecret
   - Trendyol: supplierId + username + password
   - vb.

### API ile (Test):

```bash
curl -X POST http://localhost:5001/teknotech-app/europe-west1/api/stores \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "merchant-123",
    "marketplace": "n11",
    "storeName": "Test n11 Mağazası",
    "credentials": {
      "appKey": "your-app-key",
      "appSecret": "your-app-secret"
    },
    "syncSettings": {
      "autoSyncInventory": true,
      "inventorySyncInterval": 30,
      "autoSyncOrders": true,
      "orderSyncInterval": 10,
      "useWebhook": false
    }
  }'
```

## 📦 Test Senaryoları

### 1. Kategori Listele

```bash
curl "http://localhost:5001/teknotech-app/europe-west1/api/categories?storeId=STORE_ID"
```

### 2. Ürün Senkronize Et

```bash
curl -X POST http://localhost:5001/teknotech-app/europe-west1/api/products/PRODUCT_ID/sync \
  -H "Content-Type: application/json" \
  -d '{"storeIds": ["STORE_ID"]}'
```

### 3. Sipariş Çek

```bash
curl -X POST http://localhost:5001/teknotech-app/europe-west1/api/orders/sync \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": "STORE_ID",
    "startDate": "2025-12-01",
    "endDate": "2025-12-27"
  }'
```

### 4. Stok Güncelle

```bash
curl -X POST http://localhost:5001/teknotech-app/europe-west1/api/inventory/sync \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": "STORE_ID",
    "items": [
      {
        "sku": "PROD-001",
        "quantity": 50,
        "listPrice": 199.90,
        "salePrice": 149.90
      }
    ]
  }'
```

## 🎨 Marketplace Test Credentials

Test için sandbox credentials gerekli. Her pazaryerinin test ortamı farklı:

### n11
- Test ortamı: https://sandbox.n11.com
- Sandbox hesap oluştur: n11 Entegratör Programı

### Trendyol
- Test ortamı: Trendyol Partner Sandbox
- Test credentials: Trendyol Integration Team'den talep et

### Hepsiburada
- Test ortamı: https://mpop-sit.hepsiburada.com
- Sandbox: Hepsiburada Merchant Panel

### Pazarama
- Test ortamı: Pazarama test API
- Test credentials: Pazarama entegrasyon ekibinden talep et

### İdefix
- Test ortamı: https://developer.idefix.com
- Test credentials: İdefix merchant dashboard

## 📊 Firestore Koleksiyonları

Development'da manuel data ekle:

```javascript
// merchants collection
{
  "userId": "user-123",
  "companyName": "Test Şirketi",
  "email": "test@test.com",
  "isActive": true
}

// products collection
{
  "merchantId": "merchant-123",
  "sku": "PROD-001",
  "title": "Test Ürün",
  "description": "Test açıklaması",
  "brand": "Test Marka",
  "quantity": 100,
  "listPrice": 199.90,
  "salePrice": 149.90,
  "currency": "TRY",
  "isActive": true
}
```

## 🔍 Debug & Logs

### Functions Logs (Emulator)

Terminal'de canlı görünür. Veya:
http://localhost:4000/logs

### Integration Logs

Firestore Emulator > integrationLogs koleksiyonu

### Firestore Data

http://localhost:4000/firestore

## ⚡ Hızlı Komutlar

```bash
# Tüm emulators
firebase emulators:start

# Sadece firestore
firebase emulators:start --only firestore

# Build functions
cd functions && npm run build

# Firestore'u temizle
firebase emulators:exec --only firestore "echo 'cleared'"
```

## 🚀 Production'a Geçiş

Development'da her şey çalıştığında:

1. `DEPLOYMENT.md` dökümanını oku
2. Production credentials ekle
3. Firebase'e deploy et

```bash
npm run build
firebase deploy
```

## 🆘 Sık Karşılaşılan Sorunlar

### Port already in use

```bash
# Çalışan emulator'ları kapat
pkill -f firebase
```

### CORS hatası

Emulator'da CORS otomatik açık. Production'da functions/src/index.ts kontrol et.

### Firestore permission denied

Emulator'da rules bypass edilir. Production'da firestore.rules deploy et.

## 📚 Daha Fazla

- [README.md](README.md) - Genel bilgi
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment
- API Docs: http://localhost:5001/teknotech-app/europe-west1/api/health

---

**Happy coding! 🎉**
