# 🖼️ Cloudinary Setup Guide untuk Persistent Image Storage

Aplikasi sekarang menggunakan **Cloudinary** untuk menyimpan foto produk agar tidak hilang saat redeploy.

## 📝 Langkah-Langkah Setup

### 1️⃣ Daftar Akun Cloudinary (Gratis)
- Kunjungi: https://cloudinary.com/users/register/free
- Gunakan email atau GitHub account
- Verifikasi email Anda

### 2️⃣ Ambil Credentials dari Cloudinary Dashboard
1. Login ke https://cloudinary.com/console
2. Di halaman utama dashboard, Anda akan melihat:
   - **Cloud Name** - tulisan di bawah "Cloud name:"
   - **API Key** - bagian dari "API credentials"
   - **API Secret** - bagian dari "API credentials"

Contoh:
```
Cloud Name: dxxxxxxxxx
API Key: xxxxxxxxx
API Secret: xxxxxxxxxxxxxxxxxxx
```

### 3️⃣ Update .env File di Server

Buka `/server/.env` dan ganti dengan credentials Anda:

```env
# Cloudinary Configuration (Get from https://cloudinary.com/console)
CLOUDINARY_CLOUD_NAME=your_cloud_name_di_sini
CLOUDINARY_API_KEY=your_api_key_di_sini
CLOUDINARY_API_SECRET=your_api_secret_di_sini
```

Contoh yang sudah diisi:
```env
CLOUDINARY_CLOUD_NAME=djn7k8x9j
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=AbCdEfGhIjKlMnOpQrStUvWxYz
```

### 4️⃣ Untuk Production (Render/Vercel/Railway)

1. Buka dashboard Render/platform yang Anda gunakan
2. Masuk ke settings aplikasi
3. Tambah Environment Variables:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
4. Isi dengan credentials dari Cloudinary
5. **PENTING**: Jangan share credentials ini di public!

## ✅ Verification

Setelah setup, coba upload foto produk:
1. Login ke dashboard admin
2. Tambah/edit produk
3. Upload foto
4. Foto akan tersimpan di Cloudinary (bukan lokal)
5. Saat redeploy, foto tetap ada ✅

## 🎯 Cloudinary Free Tier Coverage

- **25 GB** monthly storage
- **Unlimited** transformations  
- **CDN global** untuk loading cepat
- Cukup untuk ~5000 foto 2MB

## ⚠️ Jika Belum Setup Cloudinary

Aplikasi akan otomatis fallback ke **local disk storage** (folder `/server/uploads`), tapi foto AKAN HILANG saat redeploy.

Untuk production yang reliable: **HARUS setup Cloudinary!**

## 🚀 Tips

- Gunakan Cloud Name yang mudah diingat
- Jangan commit API Secret ke Git
- Gunakan `.env` untuk local development
- Gunakan Environment Variables untuk production

---

Pertanyaan? Cek dokumentasi Cloudinary: https://cloudinary.com/documentation
