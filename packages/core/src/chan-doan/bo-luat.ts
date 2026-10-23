// Bộ luật từ khóa: bắt nhanh các mẫu câu rõ ràng và là phương án dự phòng khi không gọi được LLM.
import type { MaNgoNhan } from "../types";
import type { ThuVienNgoNhan, TinhHuong } from "../thu-vien";
import { chuanHoa } from "./chuan-hoa";

export interface KetQuaLuat {
  /** null khi không khớp từ khóa nào. */
  ma_ngo_nhan: MaNgoNhan | null;
  diem: Partial<Record<MaNgoNhan, number>>;
  khop: { ma: MaNgoNhan; tu_khoa: string }[];
  do_tin_cay: number;
}

export function chanDoanBangLuat(text: string, thuVien: ThuVienNgoNhan, tinhHuong?: Pick<TinhHuong, "tu_khoa">): KetQuaLuat {
  const t = chuanHoa(text);
  const diem: Partial<Record<MaNgoNhan, number>> = {};
  const khop: KetQuaLuat["khop"] = [];

  for (const n of thuVien.ngo_nhan) {
    // Từ khóa riêng của tình huống (nếu có) thay cho từ khóa chung của mã này.
    for (const tk of tinhHuong?.tu_khoa?.[n.ma] ?? n.tu_khoa) {
      if (new RegExp(tk).test(t)) {
        diem[n.ma] = (diem[n.ma] ?? 0) + 1;
        khop.push({ ma: n.ma, tu_khoa: tk });
      }
    }
  }

  const xepHang = (Object.entries(diem) as [MaNgoNhan, number][]).sort((a, b) => b[1] - a[1]);
  if (xepHang.length === 0) return { ma_ngo_nhan: null, diem, khop, do_tin_cay: 0 };

  const [maDau, diemDau] = xepHang[0]!;
  const diemNhi = xepHang[1]?.[1] ?? 0;
  const diemM0 = diem.M0 ?? 0;
  const diemSai = Math.max(0, ...xepHang.filter(([m]) => m !== "M0").map(([, d]) => d));

  // Câu hiểu đúng thường vẫn nhắc "lần sau", "lệch"... nên M0 thắng khi điểm ít nhất bằng ngộ nhận mạnh nhất.
  let ma: MaNgoNhan = maDau;
  if (diemM0 > 0 && diemM0 >= diemSai) ma = "M0";

  // Hòa điểm giữa hai ngộ nhận khác nhau thì không đủ chắc.
  const hoa = ma !== "M0" && diemDau === diemNhi;
  const doTinCay = hoa ? 0.3 : Math.min(0.85, 0.5 + 0.15 * (diemDau - diemNhi));
  return { ma_ngo_nhan: hoa ? "KXD" : ma, diem, khop, do_tin_cay: doTinCay };
}
