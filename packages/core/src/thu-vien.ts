// Kiểu và kiểm tra cho thư viện nội dung trong thư mục data/ (do giáo viên duyệt).
import { z } from "zod";
import { CauHinhThiNghiemSchema } from "./schema";
import type { CauHinhThiNghiem, LoaiThiNghiem, MaNgoNhan } from "./types";

const LoaiThiNghiemSchema = z.enum(["co_dieu_kien", "hoi_tu", "so_sanh_day", "xac_suat_lap", "xuc_xac", "dong_xu", "bi", "the", "bai_toan"]);

export const NgoNhanSchema = z.object({
  ma: z.enum(["M0", "M1", "M2", "M3", "M4", "M5", "M6", "KXD"]),
  ten: z.string(),
  mo_ta: z.string(),
  vi_du: z.array(z.string()),
  tu_khoa: z.array(z.string()),
  thi_nghiem_mac_dinh: LoaiThiNghiemSchema.nullable(),
  cau_hoi_mo_rong: z.string().optional(),
});

export const ThuVienNgoNhanSchema = z.object({
  phien_ban: z.string(),
  ghi_chu: z.string().optional(),
  ngo_nhan: z.array(NgoNhanSchema),
  khuon_phan_hoi: z.record(LoaiThiNghiemSchema, z.string()),
});

/** Cấu hình thí nghiệm trong tình huống chưa có seed; seed được gán khi chạy. */
const CauHinhKhongSeedSchema = z.record(z.string(), z.unknown());

export const TinhHuongSchema = z.object({
  id: z.string(),
  tieu_de: z.string(),
  noi_dung: z.string(),
  /** Tên hai mặt cho các thí nghiệm đồng xu; tình huống xúc xắc không cần. */
  nhan: z.object({ N: z.string(), S: z.string() }).default({ N: "ngửa", S: "sấp" }),
  /**
   * Từ khóa riêng của tình huống, THAY cho từ khóa trong thư viện ở mã tương ứng.
   * Cần khi cùng một câu có nghĩa khác nhau tùy bài: "như nhau" là đúng với hai dãy đồng xu
   * nhưng là ngộ nhận M3 với "tổng 7 và tổng 12".
   */
  tu_khoa: z.partialRecord(z.enum(["M0", "M1", "M2", "M3", "M4", "M5", "M6", "KXD"]), z.array(z.string())).optional(),
  chinh: LoaiThiNghiemSchema,
  thi_nghiem: z.partialRecord(LoaiThiNghiemSchema, CauHinhKhongSeedSchema),
});

export const ThuVienTinhHuongSchema = z.object({
  phien_ban: z.string(),
  ghi_chu: z.string().optional(),
  tinh_huong: z.array(TinhHuongSchema),
});

export type NgoNhan = z.infer<typeof NgoNhanSchema>;
export type ThuVienNgoNhan = z.infer<typeof ThuVienNgoNhanSchema>;
export type TinhHuong = z.infer<typeof TinhHuongSchema>;
export type ThuVienTinhHuong = z.infer<typeof ThuVienTinhHuongSchema>;

/**
 * Kiểm tra thư viện khi nạp: schema đúng, đủ mã M0–M5 và KXD,
 * mọi thí nghiệm trong tình huống đều hợp lệ khi gán thử seed.
 */
export function kiemTraThuVien(ngoNhanRaw: unknown, tinhHuongRaw: unknown) {
  const ngoNhan = ThuVienNgoNhanSchema.parse(ngoNhanRaw);
  const tinhHuong = ThuVienTinhHuongSchema.parse(tinhHuongRaw);

  const ma = new Set(ngoNhan.ngo_nhan.map((n) => n.ma));
  for (const can of ["M0", "M1", "M2", "M3", "M4", "M5", "M6", "KXD"] as MaNgoNhan[]) {
    if (!ma.has(can)) throw new Error(`Thư viện ngộ nhận thiếu mã ${can}`);
  }
  for (const n of ngoNhan.ngo_nhan) {
    for (const tk of n.tu_khoa) new RegExp(tk); // ném lỗi nếu biểu thức sai
  }
  for (const th of tinhHuong.tinh_huong) {
    for (const ds of Object.values(th.tu_khoa ?? {})) for (const tk of ds) new RegExp(tk);
    if (!th.thi_nghiem[th.chinh]) throw new Error(`Tình huống ${th.id} thiếu thí nghiệm chính ${th.chinh}`);
    for (const [loai, ch] of Object.entries(th.thi_nghiem)) {
      const kq = CauHinhThiNghiemSchema.safeParse({ ...ch, seed: 1 });
      if (!kq.success || kq.data.loai !== loai) {
        throw new Error(`Tình huống ${th.id}: thí nghiệm ${loai} không hợp lệ`);
      }
    }
  }
  return { ngoNhan, tinhHuong };
}

/** Lấy cấu hình thí nghiệm của tình huống và gán seed. */
export function layCauHinh(th: TinhHuong, loai: LoaiThiNghiem, seed: number): CauHinhThiNghiem | null {
  const ch = th.thi_nghiem[loai];
  if (!ch) return null;
  return CauHinhThiNghiemSchema.parse({ ...ch, seed }) as CauHinhThiNghiem;
}
