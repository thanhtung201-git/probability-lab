// Kiểu dữ liệu dùng chung cho toàn hệ thống.

/** Mặt đồng xu: N = ngửa, S = sấp. */
export type MatDongXu = "N" | "S";

export type MaNgoNhan = "M0" | "M1" | "M2" | "M3" | "M4" | "M5" | "M6" | "KXD";

export type LoaiThiNghiem = "co_dieu_kien" | "hoi_tu" | "so_sanh_day" | "xac_suat_lap" | "xuc_xac" | "dong_xu" | "bi" | "the" | "bai_toan";

/** Xác suất viết dạng phân số để tính lý thuyết chính xác, ví dụ { tu: 1, mau: 2 }. */
export interface XacSuat {
  tu: number;
  mau: number;
}

/** Giả thuyết AI trích ra từ lời giải thích của học sinh. */
export interface GiaThuyet {
  loai_thi_nghiem: LoaiThiNghiem | "khong_co";
  dieu_kien: string;
  bien_co: string;
  du_doan_hs: string;
}

export interface ChanDoan {
  ma_ngo_nhan: MaNgoNhan;
  can_cu: string;
  gia_thuyet: GiaThuyet;
  /** 0 đến 1 */
  do_tin_cay: number;
  cau_hoi_goi_mo: string;
  nguon: "luat" | "llm" | "lai";
}

/** M1: sau `so_lan_truoc` lần cùng ra `ket_qua_lap`, lần kế tiếp ra `bien_co` bao nhiêu? */
export interface CauHinhCoDieuKien {
  loai: "co_dieu_kien";
  so_lan_truoc: number;
  ket_qua_lap: MatDongXu;
  bien_co: MatDongXu;
  /** Số chuỗi thỏa điều kiện cần thu thập. */
  so_chuoi: number;
  xac_suat_ngua: XacSuat;
  seed: number;
}

/** M2: tần suất ra ngửa thay đổi thế nào khi số lần tung tăng dần. */
export interface CauHinhHoiTu {
  loai: "hoi_tu";
  moc: number[];
  xac_suat_ngua: XacSuat;
  seed: number;
}

/** M4: hai dãy cụ thể (cùng độ dài) xuất hiện bao nhiêu lần. */
export interface CauHinhSoSanhDay {
  loai: "so_sanh_day";
  day_a: string;
  day_b: string;
  so_lan: number;
  xac_suat_ngua: XacSuat;
  seed: number;
}

/** M5: một biến cố có xác suất p, lặp lại trong nhiều ngày. */
export interface CauHinhXacSuatLap {
  loai: "xac_suat_lap";
  xac_suat: XacSuat;
  so_ngay: number;
  seed: number;
}

/** Thí nghiệm xúc xắc trong phòng thí nghiệm tương tác (xem mo-phong/thi-nghiem/xuc-xac.ts). */
export type CheDoXucXac =
  /** Gieo 1 con (ghi mặt) hoặc 2 đến 6 con (ghi tổng); `theo_doi` là các giá trị cần làm nổi bật. */
  | { che_do: "phan_phoi"; so_xuc_xac: number; theo_doi: number[] }
  /** Sau `so_lan_truoc` lần không ra mặt `mat`, lần kế tiếp có ra `mat` không. */
  | { che_do: "dieu_kien"; so_lan_truoc: number; mat: number; theo_doi: string[] }
  /** Mỗi lượt gieo một dãy cùng độ dài, đếm số lần trùng `day_a` và `day_b`. */
  | { che_do: "day"; day_a: number[]; day_b: number[]; theo_doi: string[] };

export type CauHinhXucXac = { loai: "xuc_xac"; so_lan_goi_y: number; seed: number } & CheDoXucXac;

/**
 * Thí nghiệm đồng xu cân đối trong phòng thí nghiệm tương tác (mo-phong/thi-nghiem/dong-xu-tt.ts).
 * Mặt đồng xu trong dãy viết bằng chữ: N = ngửa, S = sấp.
 */
export type CheDoDongXuTT =
  /** Tung `so_dong_xu` đồng xu (1 đến 10). 1 đồng: ghi N/S. Nhiều đồng: ghi số mặt ngửa ("0", "1", …). */
  | { che_do: "phan_phoi"; so_dong_xu: number; theo_doi: string[] }
  /** Chỉ tính các lượt có `so_lan_truoc` lần đầu cùng ra `mat`; ghi kết quả lần kế tiếp (N hoặc S). */
  | { che_do: "dieu_kien"; so_lan_truoc: number; mat: MatDongXu; theo_doi: string[] }
  /** Mỗi lượt tung một dãy cùng độ dài, đếm số lần trùng `day_a` và `day_b`. */
  | { che_do: "day"; day_a: string; day_b: string; theo_doi: string[] };

export type CauHinhDongXuTT = { loai: "dong_xu"; so_lan_goi_y: number; seed: number } & CheDoDongXuTT;

/** Một nhóm bi cùng màu trong hộp. `ten` là tên màu ("đỏ", "xanh"), cũng dùng làm khóa ghi kết quả. */
export interface NhomBi {
  ten: string;
  so: number;
}

/**
 * Cái được ghi nhận khi lấy từ 2 bi trở lên:
 * - "dem" (mặc định): số bi màu `mau_muc_tieu` ("0", "1", …);
 * - "it_nhat": có ít nhất 1 bi màu `mau_muc_tieu` ("co" / "khong");
 * - "cung_mau" / "khac_mau": lấy 2 bi, hai bi cùng màu / khác màu ("co" / "khong").
 */
export type SuKienBi = "dem" | "it_nhat" | "cung_mau" | "khac_mau";

/** Thí nghiệm lấy bi từ hộp (mo-phong/thi-nghiem/bi.ts). */
export type CheDoBi =
  /** Lấy `so_lay` bi (1 đến 3), có hoặc không hoàn lại. 1 bi: ghi màu. Nhiều bi: ghi số bi màu `mau_muc_tieu`. */
  | { che_do: "phan_phoi"; so_lay: 1 | 2 | 3; hoan_lai: boolean; mau_muc_tieu: string; su_kien?: SuKienBi; theo_doi: string[] }
  /** Có hoàn lại: chỉ tính các lượt có `so_lan_truoc` lần đầu cùng ra màu `mau_lap`; ghi màu ở lần kế tiếp. */
  | { che_do: "dieu_kien"; so_lan_truoc: number; mau_lap: string; theo_doi: string[] };

export type CauHinhBi = { loai: "bi"; hop: NhomBi[]; so_lan_goi_y: number; seed: number } & CheDoBi;

/** Biến cố về số ghi trên thẻ. `k` dùng cho "boi", "lon_hon", "nho_hon"; `so` là danh sách số tự chọn của "tap_hop". */
export interface BienCoThe {
  kieu: "chan" | "le" | "boi" | "nguyen_to" | "lon_hon" | "nho_hon" | "tap_hop";
  k?: number;
  so?: number[];
}

/** Thí nghiệm rút thẻ đánh số 1..so_the (mo-phong/thi-nghiem/the.ts). */
export type CheDoThe =
  /** Rút 1 thẻ có hoàn lại, ghi từng số. */
  | { che_do: "tung_so"; theo_doi: string[] }
  /** Rút 1 thẻ có hoàn lại, ghi "co" nếu thỏa biến cố, "khong" nếu không. */
  | { che_do: "bien_co"; bien_co: BienCoThe; theo_doi: string[] }
  /** Rút 2 thẻ, ghi số thẻ thỏa biến cố ("0", "1", "2"). */
  | { che_do: "hai_the"; hoan_lai: boolean; bien_co: BienCoThe; theo_doi: string[] };

export type CauHinhThe = { loai: "the"; so_the: number; so_lan_goi_y: number; seed: number } & CheDoThe;

/** Một vật trong tập vật của bài toán tổng quát: có màu, có số, hoặc cả hai. */
export interface VatTongQuat {
  mau?: string;
  so?: number;
}

/** Điều kiện trên một giá trị số (tổng, tích, …). */
export type DieuKienBaiToan =
  | { loai: "chan" }
  | { loai: "le" }
  | { loai: "nguyen_to" }
  | { loai: "chia_het"; k: number }
  | { loai: "du"; m: number; r: number }
  | { loai: "bang"; k: number }
  | { loai: "lon_hon"; k: number }
  | { loai: "nho_hon"; k: number }
  | { loai: "chinh_phuong" }
  /** Các chữ số đều khác nhau (11 không thỏa, 12 thỏa). */
  | { loai: "chu_so_khac_nhau" }
  /** Số đối xứng, đọc xuôi ngược như nhau (121, 44). */
  | { loai: "doi_xung" }
  /** Có chữ số d trong cách viết thập phân. */
  | { loai: "co_chu_so"; d: number };

/** Biến cố của bài toán tổng quát: trên các số ghi trên vật, hoặc trên màu của vật. */
export type BienCoBaiToan =
  | { kieu: "so"; dai_luong: "tong" | "tich" | "lon_nhat" | "nho_nhat" | "ghep"; dieu_kien: DieuKienBaiToan; khong?: boolean }
  | { kieu: "mau"; loai: "it_nhat" | "dung" | "cung_mau" | "khac_mau"; mau?: string; k?: number; khong?: boolean }
  /** Ghép nhiều biến cố con: "va" = xảy ra đồng thời, "hoac" = ít nhất một. `khong` đảo kết quả của cả nhóm. */
  | { kieu: "gop"; phep: "va" | "hoac"; cac: BienCoBaiToan[]; khong?: boolean };

/**
 * Bài toán tổng quát (mo-phong/thi-nghiem/bai-toan.ts): lấy lần lượt `so_lan` vật từ `vat`, có hoặc không hoàn lại,
 * ghi nhận "co" / "khong" tùy kết quả có thỏa `bien_co` (đảo lại nếu `phu_dinh`).
 */
export interface CauHinhBaiToan {
  loai: "bai_toan";
  che_do: "bai_toan";
  vat: VatTongQuat[];
  /** Tên gọi vật trong lời giải: "bi", "thẻ", "học sinh"… */
  ten_vat?: string;
  so_lan: number;
  hoan_lai: boolean;
  bien_co: BienCoBaiToan;
  phu_dinh?: boolean;
  theo_doi: string[];
  so_lan_goi_y: number;
  seed: number;
}

export type CauHinhThiNghiem =
  | CauHinhBaiToan
  | CauHinhBi
  | CauHinhThe
  | CauHinhCoDieuKien
  | CauHinhHoiTu
  | CauHinhSoSanhDay
  | CauHinhXacSuatLap
  | CauHinhXucXac
  | CauHinhDongXuTT;

export interface DiemBieuDo {
  x: number;
  y: number;
}

export interface KetQuaThiNghiem {
  cau_hinh: CauHinhThiNghiem;
  /** Số lần xuất hiện của từng kết quả quan tâm. */
  tan_so: Record<string, number>;
  /** Tần suất thực nghiệm của biến cố chính. */
  tan_suat: number;
  /** Xác suất lý thuyết của biến cố chính, dạng "1/2". */
  ly_thuyet: string;
  ly_thuyet_so: number;
  du_lieu_bieu_do: DiemBieuDo[];
  /** Số liệu bổ sung riêng cho từng dạng thí nghiệm. */
  chi_tiet: Record<string, number | string>;
}
