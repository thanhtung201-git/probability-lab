// Đề bài do giáo viên tự nhập: dựng tình huống + cấu hình thí nghiệm (xúc xắc hoặc đồng xu) từ lựa chọn
// của giáo viên hoặc từ đề xuất của AI. Mọi cấu hình đều được kiểm tra bằng schema của lõi trước khi lưu.
import {
  CauHinhBaiToanSchema,
  CauHinhBiSchema,
  CauHinhDongXuTTSchema,
  CauHinhTheSchema,
  CauHinhXucXacSchema,
  FORM_BAI_TOAN_MAC_DINH,
  xayBaiToan,
  GIOI_HAN,
  TinhHuongSchema,
  type CheDoDongXuTT,
  type CheDoXucXac,
  type NhomBi,
  type TinhHuong,
} from "@plab/core";
import { z } from "zod";
import { deXuatThiNghiemBangLLM, docDeBangLLM, llmDangBat, loiGroqCuoi, type DocDe } from "./llm/groq";
import { THU_VIEN_TINH_HUONG } from "./thu-vien";

export const KIEU = ["tu_dong", "mot_con", "hai_con", "dieu_kien", "day"] as const;
/** Thêm "bien_co" (rút 1 thẻ theo biến cố), chỉ dùng cho thẻ số. */
const KIEU_DAY_DU = [...KIEU, "bien_co"] as const;
export type Kieu = (typeof KIEU)[number];
export type Vat = "xuc_xac" | "dong_xu";

export const DeBaiSchema = z.object({
  tieu_de: z.string().trim().max(80).optional(),
  noi_dung: z.string().trim().min(10, "Đề bài quá ngắn").max(1500),
  vat: z.enum(["xuc_xac", "dong_xu", "bi", "the", "bai_toan"]).default("xuc_xac"),
  /** Bài toán tổng quát (vat = "bai_toan"): cấu hình dựng từ biểu mẫu, được kiểm tra lại bằng schema của lõi. */
  mo_hinh: z.unknown().optional(),
  kieu: z.enum(KIEU_DAY_DU).default("tu_dong"),
  so_lan_truoc: z.number().int().min(1).max(8).optional(),
  /** Xúc xắc: mặt 1-6. */
  mat: z.number().int().min(1).max(6).optional(),
  /** Đồng xu: N (ngửa) hoặc S (sấp). */
  mat_xu: z.enum(["N", "S"]).optional(),
  /** Xúc xắc: "6-6-6" hoặc "666". Đồng xu: "NNNNNN". */
  day_a: z.string().trim().max(20).optional(),
  day_b: z.string().trim().max(20).optional(),
  /** Các giá trị cần theo dõi, viết dạng "7, 12". */
  theo_doi: z.string().trim().max(40).optional(),
  /** Hộp bi: "đỏ 3, xanh 5". */
  hop: z.string().trim().max(120).optional(),
  /** Hộp bi: tên màu cần theo dõi (đếm, hoặc lặp lại trong thí nghiệm có điều kiện). */
  mau: z.string().trim().max(12).optional(),
  /** Hộp bi, lấy từ 2 bi: ghi nhận "ít nhất 1 bi màu `mau`", "cùng màu" hoặc "khác màu" thay vì đếm số bi. */
  su_kien: z.enum(["it_nhat", "cung_mau", "khac_mau"]).optional(),
  /** Hộp bi và thẻ số: lấy/rút 2 lần có hoàn lại hay không. */
  hoan_lai: z.boolean().optional(),
  /** Thẻ số: số thẻ (từ 2) và biến cố cần xét. */
  so_the: z.number().int().min(2).max(GIOI_HAN.SO_THE_TOI_DA).optional(),
  bien_co: z
    .object({
      kieu: z.enum(["chan", "le", "boi", "nguyen_to", "lon_hon", "nho_hon", "tap_hop"]),
      k: z.number().int().min(1).max(GIOI_HAN.SO_THE_TOI_DA).optional(),
      so: z.array(z.number().int().min(1).max(GIOI_HAN.SO_THE_TOI_DA)).max(GIOI_HAN.SO_THE_TOI_DA).optional(),
    })
    .optional(),
});
export type DeBai = z.infer<typeof DeBaiSchema>;

export class LoiDeBai extends Error {}

const taoDayXucXac = (s: string | undefined, ten: string): number[] => {
  const so = (s ?? "").match(/[1-6]/g)?.map(Number) ?? [];
  if (!/^[\s1-6,\-+·.]*$/.test(s ?? "") || so.length < 1 || so.length > 6) {
    throw new LoiDeBai(`${ten} chỉ gồm các số từ 1 đến 6 (tối đa 6 số), ví dụ 6-6-6`);
  }
  return so;
};

const taoDayDongXu = (s: string | undefined, ten: string): string => {
  const d = (s ?? "").toUpperCase().replace(/[\s,\-+·.]/g, "");
  if (!/^[NS]{1,8}$/.test(d)) throw new LoiDeBai(`${ten} chỉ gồm chữ N (ngửa) và S (sấp), tối đa 8 chữ, ví dụ NSNSSN`);
  return d;
};

const taoTheoDoiSo = (s: string | undefined, min: number, max: number): number[] =>
  [...new Set((s ?? "").match(/\d+/g)?.map(Number).filter((n) => n >= min && n <= max) ?? [])].slice(0, 4);

interface ThamSo {
  vat: Vat;
  kieu: Exclude<Kieu, "tu_dong">;
  so_lan_truoc?: number | null;
  mat?: number | null;
  mat_xu?: "N" | "S" | null;
  day_a?: number[] | null;
  day_b?: number[] | null;
  day_a_xu?: string | null;
  day_b_xu?: string | null;
  theo_doi?: number[];
}

type CheDo = CheDoXucXac | CheDoDongXuTT;

function taoCheDo(t: ThamSo): CheDo {
  if (t.vat === "dong_xu") {
    switch (t.kieu) {
      case "mot_con":
        return { che_do: "phan_phoi", so_dong_xu: 1, theo_doi: ["N"] };
      case "hai_con":
        return { che_do: "phan_phoi", so_dong_xu: 2, theo_doi: t.theo_doi?.length ? t.theo_doi.filter((n) => n <= 2).map(String) : ["1"] };
      case "dieu_kien": {
        const mat = t.mat_xu ?? "N";
        return { che_do: "dieu_kien", so_lan_truoc: t.so_lan_truoc ?? 5, mat, theo_doi: [mat === "N" ? "S" : "N"] };
      }
      case "day":
        return { che_do: "day", day_a: t.day_a_xu ?? "NNNNNN", day_b: t.day_b_xu ?? "NSNSSN", theo_doi: ["a", "b"] };
    }
  }
  switch (t.kieu) {
    case "mot_con":
      return { che_do: "phan_phoi", so_xuc_xac: 1, theo_doi: t.theo_doi?.length ? t.theo_doi.filter((n) => n <= 6) : [6] };
    case "hai_con":
      return { che_do: "phan_phoi", so_xuc_xac: 2, theo_doi: t.theo_doi?.length ? t.theo_doi : [7] };
    case "dieu_kien":
      return { che_do: "dieu_kien", so_lan_truoc: t.so_lan_truoc ?? 5, mat: t.mat ?? 6, theo_doi: ["ra"] };
    case "day":
      return { che_do: "day", day_a: t.day_a ?? [6, 6, 6], day_b: t.day_b ?? [2, 5, 3], theo_doi: ["a", "b"] };
  }
}

/** Số lượt gợi ý: đủ để thấy tần suất tiến về lý thuyết, với dãy thì tỷ lệ theo số dãy có thể xảy ra. */
function soLanGoiY(vat: Vat, c: CheDo): number {
  if (c.che_do === "phan_phoi") return 1000;
  if (c.che_do === "dieu_kien") return 3000;
  const doDai = (c.day_a as string | number[]).length;
  return Math.min(100_000, (vat === "dong_xu" ? 2 : 6) ** doDai * 100 * (vat === "dong_xu" ? 10 : 1));
}

/** Tình huống mẫu có từ khóa phù hợp với từng kiểu thí nghiệm, dùng cho bộ luật khi không có AI. */
const MAU_TU_KHOA = (vat: Vat, c: CheDo) => {
  const id =
    vat === "dong_xu"
      ? c.che_do === "phan_phoi" && "so_dong_xu" in c && c.so_dong_xu >= 2
        ? "dx_hai_dong"
        : null
      : c.che_do === "dieu_kien"
        ? "xx_mat_6"
        : c.che_do === "day"
          ? "xx_day"
          : "so_xuc_xac" in c && c.so_xuc_xac === 2
            ? "xx_tong_7_12"
            : "xx_lech";
  return id ? THU_VIEN_TINH_HUONG.tinh_huong.find((t) => t.id === id)?.tu_khoa : undefined;
};

export interface KetQuaDeBai {
  tinh_huong: TinhHuong;
  /** Cách chọn thí nghiệm, để hiện cho giáo viên: do giáo viên chọn, do AI chọn, hay mặc định. */
  nguon: "giao_vien" | "ai" | "mac_dinh";
  ly_do: string;
  canh_bao: string | null;
}

/** Bài toán tổng quát: giáo viên (hoặc AI) đã điền biểu mẫu, ở đây chỉ kiểm tra và đóng gói thành tình huống. */
function taoDeBaiTongQuat(deBai: DeBai): KetQuaDeBai {
  const kq = CauHinhBaiToanSchema.safeParse({ ...(deBai.mo_hinh as object), seed: 1 });
  if (!kq.success) throw new LoiDeBai(kq.error.issues[0]?.message ?? "Cấu hình bài toán chưa hợp lệ");
  const { seed: _seed, ...cauHinh } = kq.data;
  const tinhHuong = TinhHuongSchema.parse({
    id: "tu_nhap",
    tieu_de: deBai.tieu_de?.trim() || "Bài toán tự nhập",
    noi_dung: deBai.noi_dung,
    chinh: "bai_toan",
    thi_nghiem: { bai_toan: cauHinh },
  });
  return { tinh_huong: tinhHuong, nguon: "giao_vien", ly_do: "Giáo viên cấu hình bài toán này.", canh_bao: null };
}

export async function taoDeBai(deBai: DeBai): Promise<KetQuaDeBai> {
  if (deBai.vat === "bai_toan") return taoDeBaiTongQuat(deBai);
  if (deBai.vat === "bi" || deBai.vat === "the") return taoDeBaiHop(deBai);
  let vat = deBai.vat as Vat;
  let tham: ThamSo | null = null;
  let tieuDe = deBai.tieu_de?.trim() || "";
  let nguon: KetQuaDeBai["nguon"] = "giao_vien";
  let lyDo = "";
  let canhBao: string | null = null;
  const tenVat = () => (vat === "dong_xu" ? "đồng xu" : "xúc xắc");

  if (deBai.kieu === "tu_dong") {
    const dx = llmDangBat() ? await deXuatThiNghiemBangLLM(deBai.noi_dung) : null;
    if (dx && dx.kieu !== "khong_phu_hop") {
      nguon = "ai";
      lyDo = dx.ly_do;
      vat = dx.vat;
      tieuDe ||= dx.tieu_de;
      tham = {
        vat,
        kieu: dx.kieu,
        so_lan_truoc: dx.so_lan_truoc,
        mat: dx.mat,
        mat_xu: dx.mat_xu === "N" || dx.mat_xu === "S" ? dx.mat_xu : null,
        day_a: dx.day_a,
        day_b: dx.day_b,
        day_a_xu: dx.day_a_xu?.toUpperCase() ?? null,
        day_b_xu: dx.day_b_xu?.toUpperCase() ?? null,
        theo_doi: dx.theo_doi,
      };
    } else {
      nguon = "mac_dinh";
      if (dx) {
        canhBao = `AI cho rằng đề này không kiểm chứng được bằng ${tenVat()} cân đối. Đang dùng thí nghiệm 1 ${vat === "dong_xu" ? "đồng xu" : "con xúc xắc"}; bạn có thể chọn kiểu khác.`;
        lyDo = dx.ly_do;
      } else {
        canhBao = llmDangBat()
          ? `Không nhận được đề xuất từ AI. Đang dùng thí nghiệm 1 ${vat === "dong_xu" ? "đồng xu" : "con xúc xắc"}; bạn có thể chọn kiểu khác.`
          : `AI chưa bật nên chưa tự chọn thí nghiệm. Đang dùng thí nghiệm 1 ${vat === "dong_xu" ? "đồng xu" : "con xúc xắc"}; hãy chọn kiểu phù hợp với đề.`;
      }
    }
  } else {
    if (deBai.kieu === "bien_co") throw new LoiDeBai("Kiểu “theo biến cố” chỉ dùng cho thẻ số");
    const kieu = deBai.kieu;
    tham = {
      vat,
      kieu,
      so_lan_truoc: deBai.so_lan_truoc,
      mat: deBai.mat,
      mat_xu: deBai.mat_xu,
      day_a: kieu === "day" && vat === "xuc_xac" ? taoDayXucXac(deBai.day_a, "Dãy thứ nhất") : null,
      day_b: kieu === "day" && vat === "xuc_xac" ? taoDayXucXac(deBai.day_b, "Dãy thứ hai") : null,
      day_a_xu: kieu === "day" && vat === "dong_xu" ? taoDayDongXu(deBai.day_a, "Dãy thứ nhất") : null,
      day_b_xu: kieu === "day" && vat === "dong_xu" ? taoDayDongXu(deBai.day_b, "Dãy thứ hai") : null,
      theo_doi:
        vat === "xuc_xac"
          ? taoTheoDoiSo(deBai.theo_doi, kieu === "mot_con" ? 1 : 2, kieu === "mot_con" ? 6 : 12)
          : taoTheoDoiSo(deBai.theo_doi, 0, 2),
    };
    lyDo = "Giáo viên chọn kiểu thí nghiệm này.";
  }

  const dung = (v: Vat, c: CheDo) => ({ loai: v, so_lan_goi_y: soLanGoiY(v, c), ...c });
  const kiemTra = (v: Vat, c: ReturnType<typeof dung>) =>
    (v === "dong_xu" ? CauHinhDongXuTTSchema : CauHinhXucXacSchema).safeParse({ ...c, loai: v === "dong_xu" ? "dong_xu" : "xuc_xac", seed: 1 });

  let cheDo = taoCheDo(tham ?? { vat, kieu: "mot_con" });
  let cauHinh = dung(vat, cheDo);
  // Gán loai đúng giá trị của lõi: "xuc_xac" hoặc "dong_xu".
  const loai = (v: Vat) => (v === "dong_xu" ? ("dong_xu" as const) : ("xuc_xac" as const));
  cauHinh = { ...cauHinh, loai: loai(vat) } as typeof cauHinh;

  // Kiểm tra bằng schema của lõi; nếu AI đề xuất sai (hai dãy khác độ dài, giá trị ngoài phạm vi) thì quay về mặc định.
  const hopLe = kiemTra(vat, cauHinh);
  if (!hopLe.success) {
    if (nguon === "giao_vien") throw new LoiDeBai(hopLe.error.issues[0]?.message ?? "Cấu hình thí nghiệm không hợp lệ");
    cheDo = taoCheDo({ vat, kieu: "mot_con" });
    cauHinh = { ...dung(vat, cheDo), loai: loai(vat) } as typeof cauHinh;
    nguon = "mac_dinh";
    canhBao = `Đề xuất của AI không hợp lệ nên đang dùng thí nghiệm 1 ${vat === "dong_xu" ? "đồng xu" : "con xúc xắc"}. Bạn có thể chọn kiểu khác.`;
    if (!kiemTra(vat, cauHinh).success) throw new LoiDeBai("Cấu hình thí nghiệm không hợp lệ");
  }

  const tinhHuong = TinhHuongSchema.parse({
    id: "tu_nhap",
    tieu_de: tieuDe || "Đề bài tự nhập",
    noi_dung: deBai.noi_dung,
    tu_khoa: MAU_TU_KHOA(vat, cheDo),
    chinh: loai(vat),
    thi_nghiem: { [loai(vat)]: cauHinh },
  });
  return { tinh_huong: tinhHuong, nguon, ly_do: lyDo, canh_bao: canhBao };
}

// --- Hộp bi và thẻ số: giáo viên tự cấu hình, AI chưa tự chọn thí nghiệm cho hai vật này ---

/** Đọc cách mô tả hộp bi, ví dụ "đỏ 3, xanh 5". Các giới hạn khác do schema của lõi kiểm tra. */
function docHop(text: string | undefined): NhomBi[] {
  const phan = (text ?? "")
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter(Boolean);
  return phan.map((p) => {
    // Chấp nhận cả "đỏ 3" lẫn "3 đỏ".
    const m = p.match(/^(.+?)\s+(\d+)$/);
    if (m) return { ten: m[1]!.trim(), so: Number(m[2]) };
    const n = p.match(/^(\d+)\s+(.+)$/);
    if (!n) throw new LoiDeBai(`Không hiểu “${p}” trong hộp bi. Viết dạng: đỏ 3, xanh 5`);
    return { ten: n[2]!.trim(), so: Number(n[1]) };
  });
}

const tinhHuongMau = (id: string | null) => (id ? THU_VIEN_TINH_HUONG.tinh_huong.find((t) => t.id === id)?.tu_khoa : undefined);

/**
 * Đối chiếu kết quả AI đọc với chữ trong đề. AI hay hiểu nhầm "không trả lại" thành "có hoàn lại" hoặc thành biến cố phủ định,
 * nên các điểm này kiểm tra lại bằng chữ trong đề và ghi chú cho giáo viên khi phải sửa.
 */
function doiChieuDe(d: DocDe, noiDung: string): { d: DocDe; ghiChu: string[] } {
  const ghiChu: string[] = [];
  const t = noiDung.toLowerCase();
  const KHONG_HOAN = /không\s+(?:được\s+)?(?:trả|hoàn|bỏ|đặt|thay)/;
  const khongHoan = KHONG_HOAN.test(t);
  const conLai = t.replace(new RegExp(KHONG_HOAN.source, "g"), " ");
  const coHoan = /(?:trả lại|hoàn lại|bỏ lại|đặt lại|trả về)/.test(conLai);
  const kq = { ...d };
  if (khongHoan && !coHoan && kq.hoan_lai) {
    kq.hoan_lai = false;
    ghiChu.push("đề ghi không trả lại nên lấy KHÔNG hoàn lại");
  } else if (coHoan && !khongHoan && !kq.hoan_lai) {
    kq.hoan_lai = true;
    ghiChu.push("đề ghi trả lại nên lấy CÓ hoàn lại");
  }
  if (kq.phu_dinh && !/(?:\bkhông\b(?!\s+gian)|\bchưa\b|ngoại trừ)/.test(conLai)) {
    kq.phu_dinh = false;
    ghiChu.push("đề không hỏi biến cố “không xảy ra” nên bỏ phủ định");
  }
  return { d: kq, ghiChu };
}

const BIEN_CO_THE: Record<string, "chan" | "le" | "nguyen_to" | "boi" | "lon_hon" | "nho_hon" | "tap_hop"> = {
  chan: "chan",
  le: "le",
  nguyen_to: "nguyen_to",
  chia_het: "boi",
  lon_hon: "lon_hon",
  nho_hon: "nho_hon",
  bang: "tap_hop",
};

/** "Để AI chọn theo đề" cho hộp bi và thẻ số: AI đọc đề, điền biểu mẫu bài toán tổng quát, mã dựng cấu hình và kiểm tra lại. */
async function taoDeBaiTuDongHop(deBai: DeBai): Promise<KetQuaDeBai> {
  const vat = deBai.vat as "bi" | "the";
  const tenVat = vat === "bi" ? "hộp bi" : "thẻ số";
  const huongDan = "Hãy chọn một kiểu thí nghiệm ở ô bên dưới.";
  if (!llmDangBat()) throw new LoiDeBai(`AI chưa bật nên chưa tự chọn thí nghiệm cho ${tenVat}. ${huongDan}`);
  const tho = await docDeBangLLM(deBai.noi_dung);
  if (!tho) throw new LoiDeBai(`AI chưa đọc được đề (${loiGroqCuoi()}). Bạn thử lại, hoặc ${huongDan.toLowerCase()}`);
  if (!tho.khop) throw new LoiDeBai(`AI thấy đề này không thuộc dạng lấy vật rồi xét một biến cố (${tho.ly_do}). ${huongDan}`);
  const { d, ghiChu } = doiChieuDe(tho, deBai.noi_dung);
  const tieuDe = deBai.tieu_de?.trim() || d.tieu_de || "Đề bài tự nhập";
  const lyDo = `AI đọc đề: ${d.ly_do}`;
  const canhBao =
    "Kiểm tra lại dòng “Thí nghiệm” ngay dưới đề; nếu chưa đúng ý, quay lại và chọn kiểu thí nghiệm thủ công." +
    (ghiChu.length ? ` Đã chỉnh theo chữ trong đề: ${ghiChu.join("; ")}.` : "");

  // Rút 1 thẻ trong bộ thẻ lớn (hơn 30 thẻ): dùng thí nghiệm "rút 1 thẻ theo biến cố" gọn hơn bài toán tổng quát (vốn liệt kê mọi cách lấy).
  if (vat === "the" && d.che_do_vat === "danh_so" && d.so_lan === 1 && d.loai_bien_co === "so" && d.n && d.n > 30 && d.dieu_kien) {
    const kieu = BIEN_CO_THE[d.dieu_kien];
    if (!kieu) throw new LoiDeBai(`Đề có ${d.n} thẻ nhưng biến cố này chưa dùng được với bộ thẻ lớn. ${huongDan}`);
    const bienCo =
      kieu === "tap_hop" ? { kieu, so: [d.k ?? 1] } : kieu === "boi" || kieu === "lon_hon" || kieu === "nho_hon" ? { kieu, k: d.k ?? 1 } : { kieu };
    const cauHinh = { loai: "the", so_the: d.n, che_do: "bien_co", bien_co: bienCo, theo_doi: [d.phu_dinh ? "khong" : "co"], so_lan_goi_y: 1000 };
    const kq = CauHinhTheSchema.safeParse({ ...cauHinh, seed: 1 });
    if (!kq.success) throw new LoiDeBai(`AI đọc đề nhưng cấu hình chưa hợp lệ (${kq.error.issues[0]?.message}). ${huongDan}`);
    const tinhHuong = TinhHuongSchema.parse({
      id: "tu_nhap",
      tieu_de: tieuDe,
      noi_dung: deBai.noi_dung,
      tu_khoa: tinhHuongMau("the_boi_3"),
      chinh: "the",
      thi_nghiem: { the: cauHinh },
    });
    return { tinh_huong: tinhHuong, nguon: "ai", ly_do: lyDo, canh_bao: canhBao };
  }

  const ket = xayBaiToan({
    ...FORM_BAI_TOAN_MAC_DINH,
    che_do_vat: d.che_do_vat,
    n: d.n ?? FORM_BAI_TOAN_MAC_DINH.n,
    nhom: d.nhom ?? "",
    ten_vat: d.ten_vat || (vat === "bi" ? "bi" : "thẻ"),
    so_lan: Math.min(4, Math.max(1, d.so_lan)),
    hoan_lai: d.hoan_lai,
    loai_bien_co: d.loai_bien_co,
    dai_luong: d.dai_luong ?? FORM_BAI_TOAN_MAC_DINH.dai_luong,
    dieu_kien: d.dieu_kien ?? FORM_BAI_TOAN_MAC_DINH.dieu_kien,
    k: d.k ?? FORM_BAI_TOAN_MAC_DINH.k,
    m: d.m ?? FORM_BAI_TOAN_MAC_DINH.m,
    r: d.r ?? FORM_BAI_TOAN_MAC_DINH.r,
    mau_loai: d.mau_loai ?? FORM_BAI_TOAN_MAC_DINH.mau_loai,
    mau: d.mau ?? "",
    k_mau: d.k_mau ?? FORM_BAI_TOAN_MAC_DINH.k_mau,
    phu_dinh: d.phu_dinh,
  });
  if ("loi" in ket) throw new LoiDeBai(`AI đọc đề nhưng chưa dựng được thí nghiệm (${ket.loi}). ${huongDan}`);
  try {
    const kq = taoDeBaiTongQuat({ ...deBai, vat: "bai_toan", mo_hinh: ket.cau_hinh, tieu_de: tieuDe });
    return { ...kq, nguon: "ai", ly_do: lyDo, canh_bao: canhBao };
  } catch (e) {
    if (e instanceof LoiDeBai) throw new LoiDeBai(`AI đọc đề nhưng cấu hình chưa hợp lệ (${e.message}). ${huongDan}`);
    throw e;
  }
}

async function taoDeBaiHop(deBai: DeBai): Promise<KetQuaDeBai> {
  if (deBai.kieu === "tu_dong") return taoDeBaiTuDongHop(deBai);
  const vat = deBai.vat as "bi" | "the";
  let kieu = deBai.kieu;
  let nguon: KetQuaDeBai["nguon"] = "giao_vien";
  let lyDo = "Giáo viên chọn kiểu thí nghiệm này.";
  let canhBao: string | null = null;

  let cauHinh: Record<string, unknown>;
  let mauId: string | null = null;
  let loiSchema: string | null = null;

  if (vat === "bi") {
    const hop = docHop(deBai.hop ?? "đỏ 3, xanh 2");
    if (hop.length < 2 || hop.length > 6) throw new LoiDeBai("Hộp cần từ 2 đến 6 màu, ví dụ: đỏ 3, xanh 2");
    const ten = deBai.mau?.trim() || hop[0]?.ten || "";
    const khac = hop.find((g) => g.ten !== ten)?.ten ?? ten;
    const goc = { loai: "bi", hop };
    switch (kieu) {
      case "mot_con":
        cauHinh = { ...goc, che_do: "phan_phoi", so_lay: 1, hoan_lai: true, mau_muc_tieu: ten, theo_doi: [ten], so_lan_goi_y: 1000 };
        mauId = "bi_mot";
        break;
      case "hai_con": {
        const hoanLai = deBai.hoan_lai ?? false;
        cauHinh = deBai.su_kien
          ? { ...goc, che_do: "phan_phoi", so_lay: 2, hoan_lai: hoanLai, mau_muc_tieu: ten, su_kien: deBai.su_kien, theo_doi: ["co"], so_lan_goi_y: 1000 }
          : { ...goc, che_do: "phan_phoi", so_lay: 2, hoan_lai: hoanLai, mau_muc_tieu: ten, theo_doi: ["2"], so_lan_goi_y: 1000 };
        mauId = deBai.su_kien || hoanLai ? null : "bi_hai_khong_hoan";
        break;
      }
      case "dieu_kien":
        cauHinh = { ...goc, che_do: "dieu_kien", so_lan_truoc: deBai.so_lan_truoc ?? 4, mau_lap: ten, theo_doi: [khac], so_lan_goi_y: 3000 };
        mauId = "bi_lien_tiep";
        break;
      default:
        throw new LoiDeBai("Kiểu thí nghiệm này không dùng cho hộp bi");
    }
    const kq = CauHinhBiSchema.safeParse({ ...cauHinh, seed: 1 });
    if (!kq.success) loiSchema = kq.error.issues[0]?.message ?? null;
  } else {
    const soThe = deBai.so_the ?? 10;
    const bienCo = deBai.bien_co ?? { kieu: "chan" as const };
    const goc = { loai: "the", so_the: soThe };
    switch (kieu) {
      case "mot_con": {
        const td = taoTheoDoiSo(deBai.theo_doi, 1, soThe).map(String);
        cauHinh = { ...goc, che_do: "tung_so", theo_doi: td.length ? td : [...new Set(["1", String(soThe)])], so_lan_goi_y: 10000 };
        mauId = "the_so_dac_biet";
        break;
      }
      case "bien_co":
        cauHinh = { ...goc, che_do: "bien_co", bien_co: bienCo, theo_doi: ["co"], so_lan_goi_y: 1000 };
        mauId = "the_boi_3";
        break;
      case "hai_con": {
        const hoanLai = deBai.hoan_lai ?? false;
        cauHinh = { ...goc, che_do: "hai_the", hoan_lai: hoanLai, bien_co: bienCo, theo_doi: ["2"], so_lan_goi_y: 1000 };
        mauId = hoanLai ? null : "the_hai_khong_hoan";
        break;
      }
      default:
        throw new LoiDeBai("Kiểu thí nghiệm này không dùng cho thẻ số");
    }
    const kq = CauHinhTheSchema.safeParse({ ...cauHinh, seed: 1 });
    if (!kq.success) loiSchema = kq.error.issues[0]?.message ?? null;
  }
  if (loiSchema) throw new LoiDeBai(loiSchema);

  const tinhHuong = TinhHuongSchema.parse({
    id: "tu_nhap",
    tieu_de: deBai.tieu_de?.trim() || "Đề bài tự nhập",
    noi_dung: deBai.noi_dung,
    tu_khoa: tinhHuongMau(mauId),
    chinh: vat,
    thi_nghiem: { [vat]: cauHinh },
  });
  return { tinh_huong: tinhHuong, nguon, ly_do: lyDo, canh_bao: canhBao };
}
