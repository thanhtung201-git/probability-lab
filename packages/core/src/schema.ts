// Schema Zod: kiểm tra dữ liệu đi vào bộ mô phỏng và dữ liệu AI trả về.
import { z } from "zod";

export const GIOI_HAN = {
  SO_LAN_TOI_DA: 100_000,
  SO_CHUOI_TOI_DA: 5_000,
  SO_LAN_TRUOC_TOI_DA: 10,
  DO_DAI_DAY_TOI_DA: 12,
  SO_MOC_TOI_DA: 10,
  /** Số thẻ tối đa: đủ lớn để không vướng đề thực tế; chỉ là chốt an toàn cho bộ nhớ. */
  SO_THE_TOI_DA: 100_000,
  /** Chế độ "từng số" liệt kê mỗi thẻ một lựa chọn nên giữ nhỏ hơn. */
  SO_THE_TUNG_SO_TOI_DA: 1_000,
  /** Bài toán tổng quát: số vật tối đa (còn bị giới hạn thêm bởi số cách lấy, xem SO_CACH_LAY_TOI_DA). */
  SO_VAT_TOI_DA: 1_000,
  /** Bài toán tổng quát liệt kê mọi cách lấy để tính xác suất chính xác nên cần chặn số cách. */
  SO_CACH_LAY_TOI_DA: 500_000,
} as const;

const MatDongXu = z.enum(["N", "S"]);

export const XacSuatSchema = z
  .object({
    tu: z.number().int().min(0),
    mau: z.number().int().min(1).max(1000),
  })
  .refine((p) => p.tu <= p.mau, { message: "Tử số không được lớn hơn mẫu số" });

const Seed = z.number().int().min(0).max(2 ** 32 - 1);

const DayDongXu = z
  .string()
  .regex(/^[NS]+$/, "Dãy chỉ gồm N (ngửa) và S (sấp)")
  .max(GIOI_HAN.DO_DAI_DAY_TOI_DA);

const MatXucXac = z.number().int().min(1).max(6);
const DayXucXac = z.array(MatXucXac).min(1).max(6);
const SoLanGoiY = z.number().int().min(1).max(GIOI_HAN.SO_LAN_TOI_DA);

export const CauHinhXucXacSchema = z.discriminatedUnion("che_do", [
  z.object({
    loai: z.literal("xuc_xac"),
    che_do: z.literal("phan_phoi"),
    so_xuc_xac: z.number().int().min(1).max(6),
    theo_doi: z.array(z.number().int().min(1).max(36)).min(1).max(36),
    so_lan_goi_y: SoLanGoiY,
    seed: Seed,
  }),
  z.object({
    loai: z.literal("xuc_xac"),
    che_do: z.literal("dieu_kien"),
    so_lan_truoc: z.number().int().min(1).max(10),
    mat: MatXucXac,
    theo_doi: z.array(z.enum(["ra", "khong"])).min(1),
    so_lan_goi_y: SoLanGoiY,
    seed: Seed,
  }),
  z
    .object({
      loai: z.literal("xuc_xac"),
      che_do: z.literal("day"),
      day_a: DayXucXac,
      day_b: DayXucXac,
      theo_doi: z.array(z.enum(["a", "b"])).min(1),
      so_lan_goi_y: SoLanGoiY,
      seed: Seed,
    })
    .refine((c) => c.day_a.length === c.day_b.length, { message: "Hai dãy phải cùng độ dài" }),
]);

const CauHinhDongXuSchema = z.discriminatedUnion("loai", [
  z.object({
    loai: z.literal("co_dieu_kien"),
    so_lan_truoc: z.number().int().min(1).max(GIOI_HAN.SO_LAN_TRUOC_TOI_DA),
    ket_qua_lap: MatDongXu,
    bien_co: MatDongXu,
    so_chuoi: z.number().int().min(1).max(GIOI_HAN.SO_CHUOI_TOI_DA),
    xac_suat_ngua: XacSuatSchema,
    seed: Seed,
  }),
  z.object({
    loai: z.literal("hoi_tu"),
    moc: z
      .array(z.number().int().min(1).max(GIOI_HAN.SO_LAN_TOI_DA))
      .min(1)
      .max(GIOI_HAN.SO_MOC_TOI_DA),
    xac_suat_ngua: XacSuatSchema,
    seed: Seed,
  }),
  z
    .object({
      loai: z.literal("so_sanh_day"),
      day_a: DayDongXu,
      day_b: DayDongXu,
      so_lan: z.number().int().min(1).max(GIOI_HAN.SO_LAN_TOI_DA),
      xac_suat_ngua: XacSuatSchema,
      seed: Seed,
    })
    .refine((c) => c.day_a.length === c.day_b.length, {
      message: "Hai dãy phải cùng độ dài",
    }),
  z.object({
    loai: z.literal("xac_suat_lap"),
    xac_suat: XacSuatSchema,
    so_ngay: z.number().int().min(1).max(GIOI_HAN.SO_LAN_TOI_DA),
    seed: Seed,
  }),
]);

const MatDongXuSchema = z.enum(["N", "S"]);
const DayDongXuTT = z.string().regex(/^[NS]+$/, "Dãy chỉ gồm N (ngửa) và S (sấp)").min(1).max(10);

export const CauHinhDongXuTTSchema = z.discriminatedUnion("che_do", [
  z.object({
    loai: z.literal("dong_xu"),
    che_do: z.literal("phan_phoi"),
    so_dong_xu: z.number().int().min(1).max(10),
    theo_doi: z.array(z.string().regex(/^([NS]|[0-9]{1,2})$/)).min(1).max(11),
    so_lan_goi_y: SoLanGoiY,
    seed: Seed,
  }),
  z.object({
    loai: z.literal("dong_xu"),
    che_do: z.literal("dieu_kien"),
    so_lan_truoc: z.number().int().min(1).max(10),
    mat: MatDongXuSchema,
    theo_doi: z.array(MatDongXuSchema).min(1).max(2),
    so_lan_goi_y: SoLanGoiY,
    seed: Seed,
  }),
  z
    .object({
      loai: z.literal("dong_xu"),
      che_do: z.literal("day"),
      day_a: DayDongXuTT,
      day_b: DayDongXuTT,
      theo_doi: z.array(z.enum(["a", "b"])).min(1),
      so_lan_goi_y: SoLanGoiY,
      seed: Seed,
    })
    .refine((c) => c.day_a.length === c.day_b.length, { message: "Hai dãy phải cùng độ dài" }),
]);

const TenMau = z.string().trim().min(1).max(12);

export const CauHinhBiSchema = z
  .object({
    loai: z.literal("bi"),
    hop: z
      .array(z.object({ ten: TenMau, so: z.number().int().min(1).max(20) }))
      .min(2)
      .max(6),
    che_do: z.enum(["phan_phoi", "dieu_kien"]),
    so_lay: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    hoan_lai: z.boolean().optional(),
    mau_muc_tieu: TenMau.optional(),
    su_kien: z.enum(["dem", "it_nhat", "cung_mau", "khac_mau"]).optional(),
    so_lan_truoc: z.number().int().min(1).max(6).optional(),
    mau_lap: TenMau.optional(),
    theo_doi: z.array(z.string().max(12)).min(1).max(6),
    so_lan_goi_y: SoLanGoiY,
    seed: Seed,
  })
  .superRefine((c, ctx) => {
    const ten = c.hop.map((g) => g.ten);
    const loi = (message: string) => ctx.addIssue({ code: "custom", message });
    if (new Set(ten).size !== ten.length) loi("Tên các màu không được trùng nhau");
    const tong = c.hop.reduce((a, g) => a + g.so, 0);
    if (tong > 30) loi("Hộp chứa tối đa 30 viên bi");
    if (c.che_do === "phan_phoi") {
      if (c.so_lay === undefined || c.hoan_lai === undefined) loi("Thiếu số bi lấy hoặc kiểu hoàn lại");
      if (c.su_kien !== undefined && c.su_kien !== "dem") {
        if (c.so_lay === undefined || c.so_lay < 2) loi("Biến cố này cần lấy từ 2 bi");
        if ((c.su_kien === "cung_mau" || c.su_kien === "khac_mau") && c.so_lay !== 2) loi("Cùng màu / khác màu chỉ dùng khi lấy 2 bi");
      }
      if (c.so_lay !== undefined && c.so_lay > 1) {
        if (!c.mau_muc_tieu || !ten.includes(c.mau_muc_tieu)) loi("Màu cần đếm phải là một màu trong hộp");
        if (c.hoan_lai === false && c.so_lay > tong) loi("Không thể lấy nhiều bi hơn số bi trong hộp");
      }
    } else {
      if (!c.mau_lap || !ten.includes(c.mau_lap)) loi("Màu lặp lại phải là một màu trong hộp");
      if (c.so_lan_truoc === undefined) loi("Thiếu số lần liên tiếp");
    }
  });

const BienCoTheSchema = z
  .object({
    kieu: z.enum(["chan", "le", "boi", "nguyen_to", "lon_hon", "nho_hon", "tap_hop"]),
    k: z.number().int().min(1).max(GIOI_HAN.SO_THE_TOI_DA).optional(),
    so: z.array(z.number().int().min(1).max(GIOI_HAN.SO_THE_TOI_DA)).min(1).max(GIOI_HAN.SO_THE_TOI_DA).optional(),
  })
  .refine((b) => !["boi", "lon_hon", "nho_hon"].includes(b.kieu) || b.k !== undefined, { message: "Biến cố cần có số k" })
  .refine((b) => b.kieu !== "tap_hop" || (b.so !== undefined && new Set(b.so).size === b.so.length), {
    message: "Biến cố tự chọn cần danh sách số, không trùng nhau",
  });

export const CauHinhTheSchema = z.discriminatedUnion("che_do", [
  z.object({
    loai: z.literal("the"),
    che_do: z.literal("tung_so"),
    so_the: z.number().int().min(2).max(GIOI_HAN.SO_THE_TUNG_SO_TOI_DA),
    theo_doi: z.array(z.string().regex(/^\d{1,4}$/)).min(1).max(4),
    so_lan_goi_y: SoLanGoiY,
    seed: Seed,
  }),
  z.object({
    loai: z.literal("the"),
    che_do: z.literal("bien_co"),
    so_the: z.number().int().min(2).max(GIOI_HAN.SO_THE_TOI_DA),
    bien_co: BienCoTheSchema,
    theo_doi: z.array(z.enum(["co", "khong"])).min(1),
    so_lan_goi_y: SoLanGoiY,
    seed: Seed,
  }),
  z.object({
    loai: z.literal("the"),
    che_do: z.literal("hai_the"),
    so_the: z.number().int().min(2).max(GIOI_HAN.SO_THE_TOI_DA),
    hoan_lai: z.boolean(),
    bien_co: BienCoTheSchema,
    theo_doi: z.array(z.enum(["0", "1", "2"])).min(1),
    so_lan_goi_y: SoLanGoiY,
    seed: Seed,
  }),
]);

const VatTongQuatSchema = z
  .object({ mau: z.string().trim().min(1).max(12).optional(), so: z.number().int().min(0).max(99).optional() })
  .refine((v) => v.mau !== undefined || v.so !== undefined, { message: "Mỗi vật cần có màu hoặc số" });

const DieuKienBaiToanSchema = z.discriminatedUnion("loai", [
  z.object({ loai: z.literal("chan") }),
  z.object({ loai: z.literal("le") }),
  z.object({ loai: z.literal("nguyen_to") }),
  z.object({ loai: z.literal("chia_het"), k: z.number().int().min(1).max(999) }),
  z.object({ loai: z.literal("du"), m: z.number().int().min(2).max(99), r: z.number().int().min(0).max(98) }),
  z.object({ loai: z.literal("bang"), k: z.number().int().min(0).max(99999) }),
  z.object({ loai: z.literal("lon_hon"), k: z.number().int().min(0).max(99999) }),
  z.object({ loai: z.literal("nho_hon"), k: z.number().int().min(0).max(99999) }),
]);

const BienCoBaiToanSchema = z.discriminatedUnion("kieu", [
  z.object({ kieu: z.literal("so"), dai_luong: z.enum(["tong", "tich", "lon_nhat", "nho_nhat", "ghep"]), dieu_kien: DieuKienBaiToanSchema }),
  z.object({ kieu: z.literal("mau"), loai: z.enum(["it_nhat", "dung", "cung_mau", "khac_mau"]), mau: z.string().max(12).optional(), k: z.number().int().min(0).max(4).optional() }),
]);

export const CauHinhBaiToanSchema = z
  .object({
    loai: z.literal("bai_toan"),
    che_do: z.literal("bai_toan"),
    vat: z.array(VatTongQuatSchema).min(2, "Cần ít nhất 2 vật").max(GIOI_HAN.SO_VAT_TOI_DA, `Tối đa ${GIOI_HAN.SO_VAT_TOI_DA} vật`),
    ten_vat: z.string().trim().min(1).max(12).optional(),
    so_lan: z.number().int().min(1, "Số lần lấy từ 1 đến 4").max(4, "Số lần lấy từ 1 đến 4"),
    hoan_lai: z.boolean(),
    bien_co: BienCoBaiToanSchema,
    phu_dinh: z.boolean().optional(),
    theo_doi: z.array(z.enum(["co", "khong"])).min(1).max(2),
    so_lan_goi_y: SoLanGoiY,
    seed: Seed,
  })
  .superRefine((c, ctx) => {
    const loi = (message: string) => ctx.addIssue({ code: "custom", message });
    const N = c.vat.length;
    if (!c.hoan_lai && c.so_lan > N) loi("Không hoàn lại thì không thể lấy nhiều vật hơn số vật có");
    let cach = 1;
    for (let i = 0; i < c.so_lan; i++) cach *= c.hoan_lai ? N : Math.max(1, N - i);
    if (cach > GIOI_HAN.SO_CACH_LAY_TOI_DA) loi(`Số cách lấy là ${cach.toLocaleString("vi-VN")}, quá lớn (tối đa ${GIOI_HAN.SO_CACH_LAY_TOI_DA.toLocaleString("vi-VN")}). Hãy giảm số vật hoặc số lần lấy`);
    const bc = c.bien_co;
    if (bc.kieu === "so") {
      if (c.vat.some((v) => v.so === undefined)) loi("Biến cố trên số cần mọi vật đều có số");
      if (bc.dieu_kien.loai === "du" && bc.dieu_kien.r >= bc.dieu_kien.m) loi("Số dư phải nhỏ hơn số chia");
    } else {
      if (c.vat.some((v) => v.mau === undefined)) loi("Biến cố trên màu cần mọi vật đều có màu");
      const mauCo = new Set(c.vat.map((v) => v.mau));
      if ((bc.loai === "it_nhat" || bc.loai === "dung") && (!bc.mau || !mauCo.has(bc.mau))) loi("Màu cần xét phải là một màu có trong tập vật");
      if (bc.loai === "dung" && (bc.k === undefined || bc.k > c.so_lan)) loi("Số vật màu cần xét phải từ 0 đến số lần lấy");
      if (bc.loai === "khac_mau" && c.so_lan !== 2) loi("“Khác màu” chỉ dùng khi lấy 2 vật");
      if ((bc.loai === "cung_mau" || bc.loai === "khac_mau") && c.so_lan < 2) loi("Cần lấy từ 2 vật trở lên");
    }
  });

export const CauHinhThiNghiemSchema = z.union([
  CauHinhBaiToanSchema,
  CauHinhDongXuSchema,
  CauHinhXucXacSchema,
  CauHinhDongXuTTSchema,
  CauHinhBiSchema,
  CauHinhTheSchema,
]);

export const GiaThuyetSchema = z.object({
  loai_thi_nghiem: z.enum(["co_dieu_kien", "hoi_tu", "so_sanh_day", "xac_suat_lap", "xuc_xac", "dong_xu", "bi", "the", "bai_toan", "khong_co"]),
  dieu_kien: z.string(),
  bien_co: z.string(),
  du_doan_hs: z.string(),
});

/** Phần AI trả về; trường `nguon` do hệ thống gán sau khi hợp nhất. */
export const ChanDoanLLMSchema = z.object({
  ma_ngo_nhan: z.enum(["M0", "M1", "M2", "M3", "M4", "M5", "M6", "KXD"]),
  can_cu: z.string(),
  gia_thuyet: GiaThuyetSchema,
  do_tin_cay: z.number().min(0).max(1),
  cau_hoi_goi_mo: z.string(),
});
