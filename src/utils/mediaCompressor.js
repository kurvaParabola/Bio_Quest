/**
 * BioQuest Media Compressor Utility
 * Mengompresi dan mengoptimalkan gambar soal dan opsi kuis
 * agar berukuran ringan (< 150 KB) saat dimuat oleh siswa,
 * tanpa kehilangan ketajaman visual untuk diagram/anatomi biologi.
 */

export const MAX_RAW_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB batas awal file
export const DEFAULT_MAX_DIMENSION = 1200; // 1200px lebar/tinggi maksimal gambar soal
export const OPTION_MAX_DIMENSION = 600;   // 600px maksimal gambar opsi jawaban
export const TARGET_MAX_SIZE_BYTES = 200 * 1024; // 200 KB target ukuran terkompresi

/**
 * Kompresi file gambar secara otomatis di sisi browser (client-side)
 * @param {File} file - Objek file gambar dari <input type="file">
 * @param {Object} options - Pengaturan kompresi { maxDimension, quality, targetMaxBytes }
 * @returns {Promise<{ success: boolean, dataUrl: string, approxKb: number, width: number, height: number, error?: string }>}
 */
export const compressImageFile = (file, options = {}) => {
    return new Promise((resolve, reject) => {
        if (!file) {
            return reject(new Error('File tidak ditemukan.'));
        }

        // 1. Validasi tipe file
        if (!file.type || !file.type.startsWith('image/')) {
            return reject(new Error('Format file tidak didukung. Harap unggah file gambar (PNG, JPG, JPEG, WEBP, atau GIF).'));
        }

        // 2. Validasi batas ukuran file asli
        if (file.size > MAX_RAW_FILE_SIZE_BYTES) {
            const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
            return reject(new Error(`Ukuran file terlalu besar (${sizeInMb} MB). Maksimal ukuran file adalah 5 MB.`));
        }

        // Jika GIF animasi kecil (< 300KB), bisa langsung dibaca tanpa merusak frame animasi
        if (file.type === 'image/gif' && file.size < 300 * 1024) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target.result;
                const approxKb = Math.round((dataUrl.length * 3) / 4 / 1024);
                resolve({
                    success: true,
                    dataUrl,
                    approxKb,
                    width: 0,
                    height: 0,
                    format: 'gif'
                });
            };
            reader.onerror = () => reject(new Error('Gagal membaca file GIF.'));
            reader.readAsDataURL(file);
            return;
        }

        const maxDimension = options.maxDimension || DEFAULT_MAX_DIMENSION;
        const initialQuality = options.quality || 0.8;
        const targetMaxBytes = options.targetMaxBytes || TARGET_MAX_SIZE_BYTES;

        const reader = new FileReader();
        reader.onload = (readerEvent) => {
            const img = new Image();
            img.onload = () => {
                try {
                    let width = img.width;
                    let height = img.height;

                    // Hitung dimensi proporsional agar tidak melebihi batas maksimal
                    if (width > maxDimension || height > maxDimension) {
                        if (width > height) {
                            height = Math.round((height * maxDimension) / width);
                            width = maxDimension;
                        } else {
                            width = Math.round((width * maxDimension) / height);
                            height = maxDimension;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        return reject(new Error('Gagal memproses gambar pada canvas.'));
                    }

                    // Render dengan kualitas tinggi (anti-aliasing)
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);

                    // Coba kompresi ke format WebP terlebih dahulu (efisiensi rasio kompresi terbaik)
                    let format = 'image/webp';
                    let quality = initialQuality;
                    let dataUrl = canvas.toDataURL(format, quality);

                    // Fallback ke JPEG jika browser tidak mendukung WebP export
                    if (!dataUrl.startsWith('data:image/webp')) {
                        format = 'image/jpeg';
                        dataUrl = canvas.toDataURL(format, quality);
                    }

                    // Cek estimasi ukuran base64: panjang * (3/4)
                    let approxBytes = (dataUrl.length * 3) / 4;

                    // Pass kedua jika gambar masih melebihi target (misal grafik yang sangat kompleks)
                    if (approxBytes > targetMaxBytes && quality > 0.5) {
                        quality = 0.65;
                        const scaleDown = 0.85;
                        canvas.width = Math.round(width * scaleDown);
                        canvas.height = Math.round(height * scaleDown);
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        dataUrl = canvas.toDataURL(format, quality);
                        approxBytes = (dataUrl.length * 3) / 4;
                    }

                    const approxKb = Math.round(approxBytes / 1024);

                    resolve({
                        success: true,
                        dataUrl,
                        approxKb,
                        width: canvas.width,
                        height: canvas.height,
                        format
                    });
                } catch (err) {
                    reject(new Error(`Gagal mengompresi gambar: ${err.message}`));
                }
            };

            img.onerror = () => {
                reject(new Error('Gagal memuat gambar untuk proses kompresi.'));
            };

            img.src = readerEvent.target.result;
        };

        reader.onerror = () => {
            reject(new Error('Gagal membaca file gambar dari perangkat.'));
        };

        reader.readAsDataURL(file);
    });
};

/**
 * Cek apakah string media merupakan URL yang valid dan aman ditampilkan
 * @param {string} url 
 * @returns {boolean}
 */
export const isValidMediaUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (!trimmed) return false;
    // Blokir link blob browser lokal yang sudah kadaluarsa dari sesi sebelumnya
    if (trimmed.startsWith('blob:')) return false;
    return (
        trimmed.startsWith('data:image/') ||
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('/')
    );
};

