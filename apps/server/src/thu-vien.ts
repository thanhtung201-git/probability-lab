import { kiemTraThuVien, TinhHuongSchema, type ThuVienTinhHuong, type TinhHuong } from "@plab/core";
import { readFileSync } from "node:fs";
import path from "node:path";
import { CONFIG } from "./config";
import { lay, layNhieu, type Dong } from "./db";

const doc = (ten: string) => JSON.parse(readFileSync(path.join(CONFIG.thuMucData, ten), "utf8"));

/** Nạp và kiểm tra thư viện một lần khi khởi động; sai cấu trúc thì dừng máy chủ ngay. */
export const { ngoNhan: THU_VIEN_NGO_NHAN, tinhHuong: THU_VIEN_TINH_HUONG } = kiemTraThuVien(
  doc("ngo_nhan.json"),
  doc("tinh_huong.json"),
);

/** Mã của bài giáo viên tự soạn và lưu, để phân biệt với tình huống trong thư viện data/. */
export const TIEN_TO_BAI_TU_NHAP = "tn_";

const docBai = (dong: Dong): TinhHuong | null => {
  const kq = TinhHuongSchema.safeParse(JSON.parse(String(dong.tinh_huong)));
  return kq.success ? kq.data : null;
};

/** Các bài giáo viên đã lưu, cũ trước mới sau. Dòng hỏng thì bỏ qua, không làm hỏng cả thư viện. */
export const cacBaiTuNhap = async (): Promise<TinhHuong[]> =>
  (await layNhieu(`SELECT tinh_huong FROM bai_tu_nhap ORDER BY rowid`)).map(docBai).filter((t): t is TinhHuong => t !== null);

/** Thư viện tình huống gồm bài có sẵn và bài giáo viên đã lưu. */
export const thuVienTinhHuong = async (): Promise<ThuVienTinhHuong> => ({
  ...THU_VIEN_TINH_HUONG,
  tinh_huong: [...THU_VIEN_TINH_HUONG.tinh_huong, ...(await cacBaiTuNhap())],
});

export async function timTinhHuong(id: string): Promise<TinhHuong | null> {
  const co = THU_VIEN_TINH_HUONG.tinh_huong.find((t) => t.id === id);
  if (co) return co;
  const dong = await lay(`SELECT tinh_huong FROM bai_tu_nhap WHERE id = ?`, id);
  return dong ? docBai(dong) : null;
}
