# 🚀 Deployment Guide

## Ön Hazırlık

### 1. Firebase CLI Kurulumu
```bash
npm install -g firebase-tools
firebase login
```

### 2. Firebase Projesini Bağla
```bash
firebase use teknotech-app
```

## 📦 İlk Kurulum

### 1. Dependencies Yükle

```bash
# Root dependencies
npm install

# Functions dependencies
cd functions
npm install
cd ..

# Web dependencies
cd web
npm install
cd ..
```

### 2. Environment Variables

#### Functions (.env)
`functions/.env` dosyası oluştur:
```env
ENCRYPTION_KEY=your-32-character-secure-encryption-key-here-12345
NODE_ENV=production

# Marketplace API URLs (production)
N11_API_BASE_URL=https://api.n11.com
TRENDYOL_API_BASE_URL=https://api.trendyol.com/sapigw
HEPSIBURADA_API_BASE_URL=https://mpop.hepsiburada.com
PAZARAMA_API_BASE_URL=https://isortagimapi.pazarama.com
IDEFIX_API_BASE_URL=https://merchantapi.idefix.com
```

#### Web (.env.local)
`web/.env.local` dosyası oluştur:
```env
NEXT_PUBLIC_API_URL=https://europe-west1-teknotech-app.cloudfunctions.net/api
```

### 3. Encryption Key Oluştur

```bash
# Node.js ile güvenli encryption key oluştur
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Bu çıktıyı `functions/.env` içindeki `ENCRYPTION_KEY` değerine yapıştır.

## 🔥 Firebase Deploy

### Tüm Projeyi Deploy Et

```bash
# Build ve deploy
npm run build
firebase deploy
```

### Sadece Functions

```bash
cd functions
npm run build
firebase deploy --only functions
```

### Sadece Hosting (Web)

```bash
cd web
npm run build
cd ..
firebase deploy --only hosting
```

### Sadece Firestore Rules

```bash
firebase deploy --only firestore:rules
```

## 🔐 İlk Kullanıcı Oluşturma

### Firebase Console'dan:

1. https://console.firebase.google.com/project/teknotech-app/authentication
2. "Add user" butonuna tıkla
3. Email ve şifre gir
4. Kullanıcı oluşturulduktan sonra Firestore'da user dokümantı oluştur:

```bash
firebase firestore:write users/[USER_ID] '{
  "email": "admin@example.com",
  "displayName": "Admin User",
  "role": "admin",
  "createdAt": "2025-12-27T00:00:00.000Z",
  "updatedAt": "2025-12-27T00:00:00.000Z"
}'
```

Veya Firebase Console'dan manuel olarak `users` koleksiyonuna dokümant ekle.

## 🧪 Test Etme

### Local Test (Emulator)

```bash
# Terminal 1: Functions emulator
cd functions
npm run serve

# Terminal 2: Web dev server
cd web
npm run dev
```

Tarayıcıda aç: http://localhost:3000

### Production Test

1. Deploy sonrası Firebase Hosting URL'ini aç
2. Login sayfasında oluşturduğun kullanıcı ile giriş yap
3. Mağaza ekle ve credentials test et

## 📊 Monitoring

### Firestore İndeksler

İlk çalıştırmada Firestore query hataları alırsanız:

```bash
firebase deploy --only firestore:indexes
```

### Logs Görüntüleme

```bash
# Tüm function logs
firebase functions:log

# Sadece hata logs
firebase functions:log --only error

# Belirli bir function
firebase functions:log --only api
```

### Cloud Console

- Functions: https://console.cloud.google.com/functions
- Firestore: https://console.firebase.google.com/project/teknotech-app/firestore
- Logs: https://console.cloud.google.com/logs

## 🔄 Güncelleme (Update)

```bash
# Code değişikliklerinden sonra
git pull
npm run build
firebase deploy
```

## ⚠️ Önemli Notlar

### Free Tier Limitler

Firebase free tier (Spark Plan) limitlerde:
- Firestore: 50K okuma, 20K yazma (günlük)
- Functions: 2M çağrı (aylık)
- Hosting: 10GB depolama

Yoğun kullanımda **Blaze Plan** (pay-as-you-go) gerekir.

### Güvenlik

1. ✅ `.env` dosyalarını ASLA git'e commit etme
2. ✅ Firestore rules deploy et
3. ✅ Functions CORS ayarlarını kontrol et
4. ✅ Encryption key'i güvenli sakla

### Backup

Firestore backup:
```bash
# Export
gcloud firestore export gs://teknotech-app-backups/$(date +%Y%m%d)

# Import
gcloud firestore import gs://teknotech-app-backups/20251227
```

## 🆘 Sorun Giderme

### "Permission denied" hatası

Firestore rules'u deploy et:
```bash
firebase deploy --only firestore:rules
```

### Functions timeout hatası

`functions/src/index.ts` içinde timeout'u artır:
```typescript
.runWith({ timeoutSeconds: 540 })
```

### CORS hatası

Functions'da CORS düzgün ayarlandı mı kontrol et.

### Marketplace API hataları

Integration logs'u kontrol et:
- Firestore > integrationLogs koleksiyonu
- requestPayload ve responsePayload alanlarına bak

## 📝 Environment Variables Checklist

- [ ] `functions/.env` oluşturuldu
- [ ] `ENCRYPTION_KEY` 32 karakter
- [ ] `web/.env.local` oluşturuldu
- [ ] Firebase config doğru
- [ ] Marketplace API URLs production

## ✅ Deploy Checklist

- [ ] Dependencies yüklendi
- [ ] Environment variables ayarlandı
- [ ] Build başarılı (`npm run build`)
- [ ] Firestore rules deploy edildi
- [ ] Functions deploy edildi
- [ ] Hosting deploy edildi
- [ ] İlk kullanıcı oluşturuldu
- [ ] Login test edildi

## 🎯 Next Steps

1. İlk mağazanı ekle (n11, Trendyol, vb.)
2. Test credentials ile bağlantıyı test et
3. İlk ürünü senkronize et
4. Sipariş senkronizasyonunu test et
5. Scheduled jobs'ları Cloud Console'dan kontrol et

---

**Başarılı bir deployment dileriz! 🚀**
