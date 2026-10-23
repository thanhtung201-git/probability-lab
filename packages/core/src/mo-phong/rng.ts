// Bộ sinh số ngẫu nhiên có seed (thuật toán mulberry32).
// Cùng một seed luôn cho cùng một dãy số, nên mỗi thí nghiệm đều chạy lại được.

export type Rng = () => number;

/** Trả về hàm sinh số thực trong [0, 1). */
export function taoRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seed ngẫu nhiên cho một lượt làm mới (dùng khi chưa có seed). */
export function taoSeed(): number {
  return Math.floor(Math.random() * 2 ** 32) >>> 0;
}
