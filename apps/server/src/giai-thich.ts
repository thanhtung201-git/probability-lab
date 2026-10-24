// Giải thích dành cho học sinh sau khi nhóm làm xong 3 bước: dựa trên đúng câu trả lời của nhóm, ngộ nhận đã chẩn đoán,
// số liệu thí nghiệm của nhóm và lời giải đã tính sẵn bằng mã. AI chỉ diễn đạt lại; mọi con số trong lời AI phải nằm trong dữ liệu đưa vào.
import { loiGiai, type CauHinhVat, type MaNgoNhan } from "@plab/core";
import { chay, lay, layNhieu } from "./db";
import { LoiNghiepVu } from "./dich-vu";
import { giaiThichBangLLM, loiGroqCuoi, type GiaiThichLLM } from "./llm/groq";
import { CauHinhThiNghiemSchema } from "@plab/core";
import { THU_VIEN_NGO_NHAN } from "./thu-vien";

export interface GiaiThich extends GiaiThichLLM {
  nguon: "ai" | "mac_dinh";
  /** Khi dùng bản soạn sẵn: vì sao không dùng AI. */
  ly_do_mac_dinh: string | null;
}

const pt = (x: number) => `${(x * 100).toFixed(1).replace(".", ",")}%`;
const so = (x: number) => x.toLocaleString("vi-VN");

/** Các số nguyên xuất hiện trong một đoạn chữ, để kiểm tra AI không bịa số. */
const cacSo = (s: string) => new Set((s.match(/\d+/g) ?? []).map(Number));

interface TomTat {
  so_luot?: number;
  so_ghi_nhan?: number;
  dem?: Record<string, number>;
}

/** Mô tả số liệu thí nghiệm của nhóm cho kết quả đang xét, hoặc null nếu nhóm chưa gieo. */
function moTaSoLieu(ch: CauHinhVat, khoa: string, nhan: string, t: TomTat | null): string | null {
  if (!t || !t.so_luot) return null;
  const n = ch.che_do === "day" ? t.so_luot : (t.so_ghi_nhan ?? 0);
  if (!n) return null;
  const d = t.dem?.[khoa] ?? 0;
  return `Nhóm đã làm ${so(t.so_luot)} lượt; “${nhan}” xuất hiện ${so(d)} lần trên ${so(n)} lượt được ghi nhận (${pt(d / n)}).`;
}

function banSoanSan(
  ma: MaNgoNhan,
  cauNhom: string,
  lg: ReturnType<typeof loiGiai>,
  soLieu: string | null,
): Omit<GiaiThich, "nguon" | "ly_do_mac_dinh"> {
  const ng = THU_VIEN_NGO_NHAN.ngo_nhan.find((n) => n.ma === ma);
  const nhanXet =
    ma === "M0"
      ? `Các em đã nghĩ đúng hướng: “${cauNhom}”. Cùng kiểm tra lại bằng cách tính để chắc chắn hơn nhé.`
      : ma === "KXD" || !ng
        ? `Các em đã nêu: “${cauNhom}”. Cùng xem lại bài toán này từng bước nhé.`
        : `Các em đã nghĩ: “${cauNhom}”. Cách nghĩ này rất hay gặp (${ng.ten.toLowerCase()}), nhưng chưa khớp với bài này. Cùng xem vì sao.`;
  return {
    nhan_xet: nhanXet,
    giai_thich: lg.de_hieu,
    vi_du: lg.luu_y ?? "",
    cau_chot: [soLieu, lg.ket_qua].filter(Boolean).join(" "),
  };
}

const boNho = new Map<string, GiaiThich>();

/** Giải thích cho một bài (một cấu hình thí nghiệm và một kết quả), dùng ở phòng thí nghiệm; không cần câu trả lời học sinh. */
export async function giaiThichBai(cauHinh: unknown, khoa: string): Promise<GiaiThich> {
  const ch = CauHinhThiNghiemSchema.parse(cauHinh) as CauHinhVat;
  if (!["xuc_xac", "dong_xu", "bi", "the", "bai_toan"].includes(ch.loai)) throw new LoiNghiepVu("Kiểu thí nghiệm này chưa có giải thích", 409);
  // Hạt giống và số lượt gợi ý không ảnh hưởng lời giải nên không đưa vào khóa nhớ.
  const { seed: _s, so_lan_goi_y: _n, ...phanChinh } = ch as unknown as Record<string, unknown>;
  const key = JSON.stringify([phanChinh, khoa]);
  const cu = boNho.get(key);
  if (cu) return cu;

  const lg = loiGiai(ch, khoa);
  const duLieu = { lan1: "", ma: "M0", loi_giai: lg };
  const llm = await giaiThichBangLLM(duLieu);
  let kq: GiaiThich | null = null;
  let lyDo: string | null = null;
  if (!llm) lyDo = `Không gọi được AI: ${loiGroqCuoi()}`;
  else {
    const choPhep = cacSo(JSON.stringify(duLieu));
    choPhep.add(1).add(2);
    const la = [...cacSo([llm.nhan_xet, ...llm.giai_thich, llm.vi_du, llm.cau_chot].join(" "))].filter((x) => !choPhep.has(x));
    if (la.length) lyDo = `AI dùng số không có trong lời giải (${la.slice(0, 3).join(", ")})`;
    else kq = { ...llm, nguon: "ai", ly_do_mac_dinh: null };
  }
  if (!kq) {
    // Không lưu bản soạn sẵn vào bộ nhớ để lần sau còn thử gọi lại AI.
    return { nhan_xet: "", giai_thich: lg.de_hieu, vi_du: lg.luu_y ?? "", cau_chot: lg.ket_qua, nguon: "mac_dinh", ly_do_mac_dinh: lyDo };
  }
  boNho.set(key, kq);
  return kq;
}

export async function taoGiaiThich(luotId: string, lai = false): Promise<GiaiThich> {
  const luot = await lay(`SELECT * FROM luot_lam WHERE id = ?`, luotId);
  if (!luot) throw new LoiNghiepVu("Không tìm thấy lượt làm", 404);
  if (luot.giai_thich && !lai) return JSON.parse(String(luot.giai_thich)) as GiaiThich;

  const traLoi = await layNhieu(`SELECT lan, noi_dung FROM tra_loi WHERE luot_id = ? ORDER BY lan`, luotId);
  if (traLoi.length < 3) throw new LoiNghiepVu("Nhóm cần hoàn thành cả 3 bước trước khi xem giải thích", 409);
  const lanN = (n: number) => String(traLoi.find((t) => Number(t.lan) === n)?.noi_dung ?? "");

  const cd = await lay(
    `SELECT c.ma_ngo_nhan, d.ma_sua FROM chan_doan c LEFT JOIN danh_gia_gv d ON d.chan_doan_id = c.id WHERE c.luot_id = ?`,
    luotId,
  );
  const ma = ((cd?.ma_sua ?? cd?.ma_ngo_nhan ?? "KXD") as MaNgoNhan);
  const tn = await lay(`SELECT cau_hinh, tom_tat FROM thi_nghiem WHERE luot_id = ?`, luotId);
  if (!tn) throw new LoiNghiepVu("Lượt làm chưa có thí nghiệm", 409);
  const ch = JSON.parse(String(tn.cau_hinh)) as CauHinhVat;
  if (!["xuc_xac", "dong_xu", "bi", "the", "bai_toan"].includes(ch.loai)) {
    throw new LoiNghiepVu("Bài này dùng kiểu thí nghiệm cũ, chưa có giải thích", 409);
  }
  const t = tn.tom_tat ? (JSON.parse(String(tn.tom_tat)) as TomTat) : null;

  const khoa = String(ch.theo_doi[0] ?? "");
  const lg = loiGiai(ch, khoa);
  const nhanKhoa = lg.de.replace(/^.*?, tính xác suất\s*/i, "").replace(/^(KHÔNG )?(xảy ra|được):?\s*/i, "").replace(/\.$/, "") || khoa;
  const soLieu = moTaSoLieu(ch, khoa, nhanKhoa, t);

  const ng = THU_VIEN_NGO_NHAN.ngo_nhan.find((n) => n.ma === ma);
  const duLieu = {
    lan1: lanN(1),
    lan2: lanN(2),
    lan3: lanN(3),
    ma,
    ten_ngo_nhan: ng?.ten ?? "",
    mo_ta_ngo_nhan: ng?.mo_ta ?? "",
    loi_giai: lg,
    so_lieu: soLieu,
  };

  let kq: GiaiThich | null = null;
  let lyDo: string | null = null;
  const llm = await giaiThichBangLLM(duLieu);
  if (!llm) {
    lyDo = `Không gọi được AI: ${loiGroqCuoi()}`;
  } else {
    // Mọi số nguyên trong lời AI phải có trong dữ liệu đã tính (cộng 1 và 2 cho các cách nói thông thường).
    const choPhep = cacSo(JSON.stringify(duLieu));
    choPhep.add(1).add(2);
    const loiAI = [llm.nhan_xet, ...llm.giai_thich, llm.vi_du, llm.cau_chot].join(" ");
    const la = [...cacSo(loiAI)].filter((x) => !choPhep.has(x));
    if (la.length) lyDo = `AI dùng số không có trong lời giải (${la.slice(0, 3).join(", ")}) nên dùng bản soạn sẵn`;
    else kq = { ...llm, nguon: "ai", ly_do_mac_dinh: null };
  }
  if (!kq) kq = { ...banSoanSan(ma, lanN(1), lg, soLieu), nguon: "mac_dinh", ly_do_mac_dinh: lyDo };

  await chay(`UPDATE luot_lam SET giai_thich = ? WHERE id = ?`, JSON.stringify(kq), luotId);
  return kq;
}
