// Lọc thông tin cá nhân trước khi gửi văn bản cho AI.
export function locThongTin(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
    .replace(/(\+?84|0)\d{8,10}\b/g, "[so dien thoai]")
    .slice(0, 1000);
}
