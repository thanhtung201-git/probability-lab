// Mặt xúc xắc vẽ bằng chấm tròn trên lưới 3x3.

// Vị trí chấm theo ô lưới (0..8, đọc từ trái sang phải, trên xuống dưới).
const CHAM: Record<number, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export function MatXucXac({ mat, dangLac, kichThuoc = 120 }: { mat: number; dangLac: boolean; kichThuoc?: number }) {
  const cham = new Set(CHAM[mat] ?? []);
  return (
    <div
      className={`xuc-xac${dangLac ? " dang-lac" : ""}`}
      style={{ width: kichThuoc, height: kichThuoc, opacity: mat === 0 ? 0.3 : 1 }}
      role="img"
      aria-label={mat === 0 ? "Chưa gieo" : `Xúc xắc mặt ${mat}`}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={cham.has(i) ? "cham" : ""} />
      ))}
    </div>
  );
}
