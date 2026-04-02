# FCopier: Website Cloning & Security Forensic Framework

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Version: 1.0.0](https://img.shields.io/badge/Version-1.0.0-cyan.svg)](#)

FCopier adalah sebuah framework teknis yang dirancang untuk kebutuhan analisis infrastruktur web, riset keamanan, dan preservasi aset digital secara presisi. Dibangun menggunakan teknologi Playwright, proyek ini menawarkan kontrol granular terhadap ekstraksi data pada situs web dinamis yang kompleks.

Dokumentasi Resmi: [https://ferzdevz.github.io/fcopier/](https://ferzdevz.github.io/fcopier/)

## Filosofi dan Kapabilitas

FCopier dikembangkan untuk mengisi celah antara alat *cloning* tradisional dan kebutuhan forensik modern. Beberapa kapabilitas utama meliputi:

*   **API Snapping & Mocking**: Rekam instruksi jaringan secara pasif dan simulasikan melalui server internal.
*   **Keamanan & Forensik**: Pemindaian otomatis untuk mendeteksi paparan kredensial (API Keys, Tokens) dan data sensitif (PII) pada aset yang dikelola.
*   **Efisiensi Bandwidth**: Implementasi *Intelligent Sync* dengan verifikasi `ETag` untuk menghindari redundansi data.
*   **Arsitektur Modular**: Struktur kode yang terorganisir untuk memudahkan integrasi dan pengembangan tingkat lanjut.

## Fitur Teknis

1.  **Website Cloning**: Ekstraksi aset (JS, CSS, Gambar) dengan metode penulisan ulang path yang akurat.
2.  **Secret Scanner**: Mesin pendeteksi otomatis untuk kebocoran AWS Keys, GitHub Tokens, dan kredensial lainnya.
3.  **Aset Dokumentasi**: Ekspor halaman web ke format PDF, PNG, atau Single-File HTML mandiri.
4.  **Simulasi Proxy Server**: Penyajian konten melalui server lokal yang terintegrasi dengan simulasi API.
5.  **Interactive Record Mode**: Mode navigasi manual untuk merekam aktivitas jaringan secara spesifik.
6.  **Proxy & Stealth**: Mendukung konfigurasi rotasi proxy dan teknik mitigasi deteksi bot.

## Panduan Instalasi

Kebutuhan sistem: **Node.js 18+**.

```bash
# Kloning repositori
git clone https://github.com/FerzDevZ/fcopier.git
cd fcopier

# Inisialisasi melalui script installer
bash install.sh
```

## Contoh Penggunaan

**Analisis Struktur:**
```bash
fcopier analyze https://target-website.com
```

**Kloning dengan Audit Keamanan:**
```bash
fcopier clone https://target-website.com --scan --depth 2
```

**Ekspor Dokumen:**
```bash
fcopier export https://target-website.com --type pdf --output report.pdf
```

**Penyajian Server:**
```bash
fcopier serve ./cloned_site --open
```

## Layanan & Kontak

Untuk kebutuhan audit keamanan, pengembangan sistem otomasi, atau konsultasi teknis lainnya, silakan hubungi melalui kanal di bawah ini:

*   **Layanan & Portfolio**: [Linktree FerzPedia](https://linktr.ee/ferzpedia)
*   **Repository**: [GitHub FerzDevZ](https://github.com/FerzDevZ/fcopier)

## Lisensi

Proyek ini menggunakan lisensi **ISC**. Penggunaan alat ini harus tetap mematuhi batasan hukum dan etika profesional yang berlaku.

---
*Dikembangkan secara independen oleh **FerzDevZ**.*
