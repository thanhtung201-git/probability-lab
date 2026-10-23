// Biên dịch chẩn đoán thành cấu hình thí nghiệm.
// AI chỉ được chọn LOẠI thí nghiệm; mọi tham số (số lần, xác suất) lấy từ tình huống đã được giáo viên duyệt.
import type { ThuVienNgoNhan, TinhHuong } from "../thu-vien";
import { layCauHinh } from "../thu-vien";
import type { CauHinhThiNghiem, ChanDoan, LoaiThiNghiem } from "../types";

export interface KetQuaBienDich {
  cau_hinh: CauHinhThiNghiem;
  /** Vì sao chọn thí nghiệm này, để hiện cho giáo viên. */
  ly_do: string;
}

export function bienDich(
  chanDoan: Pick<ChanDoan, "ma_ngo_nhan" | "gia_thuyet">,
  tinhHuong: TinhHuong,
  thuVien: ThuVienNgoNhan,
  seed: number,
): KetQuaBienDich {
  const ungVien: [LoaiThiNghiem | null | undefined, string][] = [
    [
      chanDoan.gia_thuyet.loai_thi_nghiem === "khong_co" ? null : chanDoan.gia_thuyet.loai_thi_nghiem,
      "Theo giả thuyết AI trích từ lời giải thích",
    ],
    [
      thuVien.ngo_nhan.find((n) => n.ma === chanDoan.ma_ngo_nhan)?.thi_nghiem_mac_dinh,
      `Thí nghiệm mặc định của ngộ nhận ${chanDoan.ma_ngo_nhan}`,
    ],
    [tinhHuong.chinh, "Thí nghiệm chính của tình huống"],
  ];

  for (const [loai, lyDo] of ungVien) {
    if (!loai) continue;
    const ch = layCauHinh(tinhHuong, loai, seed);
    if (ch) return { cau_hinh: ch, ly_do: lyDo };
  }
  // Không xảy ra vì kiemTraThuVien bắt buộc tình huống có thí nghiệm chính.
  throw new Error(`Tình huống ${tinhHuong.id} không có thí nghiệm hợp lệ`);
}
