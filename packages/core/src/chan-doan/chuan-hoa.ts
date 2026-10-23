// Chuẩn hóa lời giải thích tiếng Việt của học sinh để bộ luật so khớp ổn định:
// bỏ dấu, viết thường, thay chữ viết tắt, gộp khoảng trắng.

const VIET_TAT: Record<string, string> = {
  ko: "khong",
  k: "khong",
  kh: "khong",
  hok: "khong",
  hong: "khong",
  dc: "duoc",
  dk: "duoc",
  vs: "voi",
  j: "gi",
  bt: "biet",
  ng: "nguoi",
  nx: "nhung",
  "%": " %",
};

/** Bỏ dấu tiếng Việt, giữ chữ cái gốc. */
export function boDau(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

export function chuanHoa(s: string): string {
  const coBan = boDau(s.toLowerCase())
    .replace(/(\d),(\d)/g, "$1.$2") // 0,7 -> 0.7
    .replace(/[“”"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return coBan
    .split(" ")
    .map((tu) => VIET_TAT[tu] ?? tu)
    .join(" ");
}
