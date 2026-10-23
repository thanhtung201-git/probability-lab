// Tạo câu hỏi gợi mở dựa trên số liệu học sinh vừa tạo, và kiểm duyệt câu hỏi do AI viết.
import type { ThuVienNgoNhan, TinhHuong } from "../thu-vien";
import type { KetQuaThiNghiem, MaNgoNhan } from "../types";

const pt = (x: number) => `${(x * 100).toFixed(1).replace(".", ",")}%`;

function phanSoSangPhanTram(ps: string): string {
  const [t, m] = ps.split("/").map(Number);
  return pt(m ? t! / m : t!);
}

/** Các giá trị điền vào khuôn phản hồi, theo từng loại thí nghiệm. */
export function bienKhuon(kq: KetQuaThiNghiem, th: TinhHuong): Record<string, string | number> {
  const ch = kq.cau_hinh;
  const nhan = th.nhan;
  switch (ch.loai) {
    case "xuc_xac":
    case "dong_xu":
    case "bi":
    case "the":
    case "bai_toan":
      return {
        so_luot: Number(kq.chi_tiet.so_luot).toLocaleString("vi-VN"),
        chi_tiet: String(kq.chi_tiet.mo_ta),
      };
    case "co_dieu_kien":
      return {
        so_chuoi_da_tao: Number(kq.chi_tiet.so_chuoi_da_tao).toLocaleString("vi-VN"),
        so_chuoi: Number(kq.chi_tiet.so_chuoi_thoa_dieu_kien).toLocaleString("vi-VN"),
        k: ch.so_lan_truoc,
        lap: nhan[ch.ket_qua_lap],
        bien_co: nhan[ch.bien_co],
        dem: kq.tan_so[ch.bien_co] ?? 0,
        tan_suat_pt: pt(kq.tan_suat),
        ly_thuyet: kq.ly_thuyet,
      };
    case "hoi_tu": {
      const moc = [...ch.moc].sort((a, b) => a - b);
      const nho = moc[0]!;
      const lon = moc[moc.length - 1]!;
      return {
        moc_nho: nho.toLocaleString("vi-VN"),
        moc_lon: lon.toLocaleString("vi-VN"),
        tan_suat_nho_pt: pt(Number(kq.chi_tiet[`tan_suat_${nho}`])),
        tan_suat_lon_pt: pt(Number(kq.chi_tiet[`tan_suat_${lon}`])),
        nhan_n: nhan.N,
        ly_thuyet: kq.ly_thuyet,
      };
    }
    case "so_sanh_day":
      return {
        so_lan: ch.so_lan.toLocaleString("vi-VN"),
        do_dai: ch.day_a.length,
        day_a: ch.day_a,
        day_b: ch.day_b,
        dem_a: kq.tan_so[ch.day_a] ?? 0,
        dem_b: kq.tan_so[ch.day_b] ?? 0,
        ly_thuyet: kq.ly_thuyet,
      };
    case "xac_suat_lap":
      return {
        so_ngay: ch.so_ngay.toLocaleString("vi-VN"),
        xay_ra: kq.tan_so.xay_ra ?? 0,
        khong_xay_ra: kq.tan_so.khong_xay_ra ?? 0,
        ty_le_khong_pt: pt(Number(kq.chi_tiet.ty_le_khong_xay_ra)),
        ly_thuyet_pt: phanSoSangPhanTram(kq.ly_thuyet),
        nhan_xay_ra: nhan.N,
        nhan_khong: nhan.S,
      };
  }
}

export function dienKhuon(khuon: string, bien: Record<string, string | number>): string {
  return khuon.replace(/\{(\w+)\}/g, (_, k: string) => (k in bien ? String(bien[k]) : `{${k}}`));
}

const DO_DAI_TOI_DA = 220;

/**
 * Câu hỏi của AI chỉ được dùng nếu: không chứa con số / phân số / phần trăm (tránh đưa đáp án),
 * không quá dài và kết thúc bằng dấu hỏi.
 */
export function kiemDuyetCauHoi(cauHoi: string): { hop_le: boolean; ly_do?: string } {
  const c = cauHoi.trim();
  if (!c) return { hop_le: false, ly_do: "Rỗng" };
  if (c.length > DO_DAI_TOI_DA) return { hop_le: false, ly_do: "Quá dài" };
  if (/\d/.test(c)) return { hop_le: false, ly_do: "Chứa con số, có thể lộ đáp án" };
  if (/một nửa|năm mươi phần trăm|như nhau|bằng nhau/i.test(c)) return { hop_le: false, ly_do: "Có thể lộ đáp án" };
  if (!c.endsWith("?")) return { hop_le: false, ly_do: "Không phải câu hỏi" };
  return { hop_le: true };
}

export interface PhanHoi {
  /** Nhận xét dựa trên số liệu thí nghiệm (luôn có). */
  theo_so_lieu: string;
  /** Câu hỏi gợi mở của AI nếu qua kiểm duyệt, nếu không thì câu hỏi mở rộng hoặc null. */
  cau_hoi: string | null;
  nguon_cau_hoi: "ai" | "khuon" | null;
}

export function taoPhanHoi(
  kq: KetQuaThiNghiem,
  th: TinhHuong,
  thuVien: ThuVienNgoNhan,
  ma: MaNgoNhan,
  cauHoiAI: string,
): PhanHoi {
  const khuon = thuVien.khuon_phan_hoi[kq.cau_hinh.loai] ?? "";
  const theoSoLieu = dienKhuon(khuon, bienKhuon(kq, th));
  if (kiemDuyetCauHoi(cauHoiAI).hop_le) return { theo_so_lieu: theoSoLieu, cau_hoi: cauHoiAI.trim(), nguon_cau_hoi: "ai" };
  const moRong = thuVien.ngo_nhan.find((n) => n.ma === ma)?.cau_hoi_mo_rong;
  return { theo_so_lieu: theoSoLieu, cau_hoi: moRong ?? null, nguon_cau_hoi: moRong ? "khuon" : null };
}
