import type { BienCoAI, CauHinhThiNghiem, DkAI, ChanDoanCuoi, GiaThuyet, MaNgoNhan, ThuVienNgoNhan, ThuVienTinhHuong, TinhHuong } from "@plab/core";

async function goi<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${url}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { loi?: string }).loi ?? `Lỗi ${res.status}`);
  return data as T;
}

const post = <T>(url: string, body: unknown) => goi<T>(url, { method: "POST", body: JSON.stringify(body) });

export interface TraLoi {
  lan: number;
  noi_dung: string;
  muc_rubric: number | null;
  nhan_xet: string | null;
}

export interface GiaiThich {
  nhan_xet: string;
  giai_thich: string[];
  vi_du: string;
  cau_chot: string;
  nguon: "ai" | "mac_dinh";
  ly_do_mac_dinh: string | null;
}

export interface TrangThaiLuot {
  luot: { id: string; phien_id: string; ma_nhom: string; seed: number };
  giai_thich: GiaiThich | null;
  tra_loi: TraLoi[];
  chan_doan: (Omit<ChanDoanCuoi, "gia_thuyet"> & { id: string; gia_thuyet: GiaThuyet; ket_luan: string | null; ma_sua: string | null }) | null;
  thi_nghiem: { cau_hinh: CauHinhThiNghiem; ly_do: string; tom_tat: unknown } | null;
}

export interface NhomTongQuan {
  id: string;
  ma_nhom: string;
  chan_doan_id: string | null;
  ma_ngo_nhan: MaNgoNhan | null;
  ma_cuoi: MaNgoNhan | null;
  do_tin_cay: number | null;
  nguon: string | null;
  can_duyet: boolean;
  ly_do_duyet: string | null;
  can_cu: string | null;
  ket_luan: string | null;
  ma_sua: string | null;
  lan1: string | null;
  lan2: string | null;
  lan3: string | null;
  muc1: number | null;
  muc2: number | null;
  muc3: number | null;
}

export interface TongQuan {
  ban_do: Record<MaNgoNhan, number>;
  nhom: NhomTongQuan[];
  hang_cho: string[];
  chuyen_doi: { so_nhom: number; so_tang: number; ty_le: number };
}

export type KieuThiNghiem = "tu_dong" | "mot_con" | "hai_con" | "dieu_kien" | "day" | "bien_co";

export interface BienCoGui {
  kieu: "chan" | "le" | "boi" | "nguyen_to" | "lon_hon" | "nho_hon" | "tap_hop";
  k?: number;
  so?: number[];
}

/** Đề bài giáo viên tự nhập; chỉ gửi các tham số liên quan đến vật và kiểu thí nghiệm đã chọn. */
export interface DeBaiTuNhap {
  tieu_de?: string;
  noi_dung: string;
  vat?: "xuc_xac" | "dong_xu" | "bi" | "the" | "bai_toan";
  /** Bài toán tổng quát: cấu hình dựng từ biểu mẫu. */
  mo_hinh?: unknown;
  kieu: KieuThiNghiem;
  so_lan_truoc?: number;
  mat?: number;
  mat_xu?: "N" | "S";
  day_a?: string;
  day_b?: string;
  theo_doi?: string;
  hop?: string;
  mau?: string;
  hoan_lai?: boolean;
  su_kien?: "it_nhat" | "cung_mau" | "khac_mau";
  so_the?: number;
  bien_co?: BienCoGui;
}

export interface KetQuaTaoPhien {
  id: string;
  nguon: "giao_vien" | "ai" | "mac_dinh";
  ly_do: string;
  canh_bao: string | null;
}

export interface KetQuaLuuBai extends KetQuaTaoPhien {
  tinh_huong: TinhHuong;
}

/** Biểu mẫu mà AI điền sau khi đọc đề (xem apps/server/src/llm/groq.ts). */
export interface DocDe {
  khop: boolean;
  ly_do: string;
  tieu_de: string;
  ten_vat: string;
  che_do_vat: "danh_so" | "theo_mau" | "mau_va_so";
  n: number | null;
  nhom: string | null;
  so_lan: number;
  hoan_lai: boolean;
  loai_bien_co: "so" | "mau";
  dai_luong: "tong" | "tich" | "lon_nhat" | "nho_nhat" | "ghep" | null;
  dieu_kien: "chan" | "le" | "nguyen_to" | "chia_het" | "du" | "bang" | "lon_hon" | "nho_hon" | null;
  k: number | null;
  m: number | null;
  r: number | null;
  mau_loai: "it_nhat" | "dung" | "cung_mau" | "khac_mau" | null;
  mau: string | null;
  k_mau: number | null;
  phu_dinh: boolean;
  dap_an: string[];
}

export type DkMo = DkAI;

/** Kết quả AI đọc đề cho tab "Bài toán mở" (chỉ là các khối điền sẵn, chưa có con số xác suất). */
export interface DocDeMo {
  khop: boolean;
  ly_do: string;
  /** Các cách hiểu khác nhau của đề (nếu đề mơ hồ); null nếu đề rõ ràng. */
  mo_ho: string | null;
  tieu_de: string;
  ten_vat: string;
  nguon_kieu: "day_so" | "ds_so" | "danh_so" | "theo_mau" | "mau_va_so";
  tu: number | null;
  den: number | null;
  buoc: number | null;
  loc: DkMo[];
  text: string | null;
  n: number | null;
  nhom: string | null;
  so_lan: number;
  hoan_lai: boolean;
  phep: "va" | "hoac" | "xor";
  bien_co: BienCoAI[];
  phu_dinh: boolean;
  dap_an: string[];
}

export const api = {
  docDeMo: (noi_dung: string) => post<DocDeMo>("/doc-de-mo", { noi_dung }),
  docAnhDe: (anh: string) => post<{ noi_dung: string }>("/doc-anh-de", { anh }),
  docDe: (noi_dung: string) => post<DocDe>("/doc-de", { noi_dung }),
  trangThai: () => goi<{ llm_bat: boolean; mo_hinh: string | null }>("/trang-thai"),
  thuVien: () => goi<{ ngo_nhan: ThuVienNgoNhan; tinh_huong: ThuVienTinhHuong }>("/thu-vien"),
  taoPhien: (tinh_huong_id: string) => post<{ id: string }>("/phien", { tinh_huong_id }),
  taoPhienTuNhap: (deBai: DeBaiTuNhap) => post<KetQuaTaoPhien>("/phien", deBai),
  luuBai: (deBai: DeBaiTuNhap) => post<KetQuaLuuBai>("/bai-tu-nhap", deBai),
  xoaBai: (id: string) => goi<{ ok: boolean }>(`/bai-tu-nhap/${encodeURIComponent(id)}`, { method: "DELETE" }),
  phien: (id: string) => goi<{ phien: { id: string }; tinh_huong: TinhHuong }>(`/phien/${encodeURIComponent(id)}`),
  tongQuan: (id: string) => goi<TongQuan>(`/phien/${encodeURIComponent(id)}/tong-quan`),
  vaoLuot: (phien_id: string, ma_nhom: string) => post<TrangThaiLuot>("/luot", { phien_id, ma_nhom }),
  luot: (id: string) => goi<TrangThaiLuot>(`/luot/${id}`),
  traLoi: (id: string, lan: number, noi_dung: string) =>
    post<{ danh_gia: { muc: number | null; nhan_xet: string } }>(`/luot/${id}/tra-loi`, { lan, noi_dung }),
  giaiThichBai: (cau_hinh: unknown, khoa: string) => post<GiaiThich>("/giai-thich-bai", { cau_hinh, khoa }),
  giaiThich: (id: string, lai = false) => post<GiaiThich>(`/luot/${id}/giai-thich${lai ? "?lai=1" : ""}`, {}),
  luuKetQua: (id: string, tom_tat: Record<string, unknown>) => post(`/luot/${id}/ket-qua`, { tom_tat }),
  danhGia: (chanDoanId: string, ket_luan: "dung" | "chua_phu_hop" | "sai", ma_sua?: MaNgoNhan | null) =>
    post(`/chan-doan/${chanDoanId}/danh-gia`, { ket_luan, ma_sua }),
};
