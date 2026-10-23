// Hợp nhất kết quả bộ luật và LLM thành một chẩn đoán cuối cùng.
import type { ChanDoan, GiaThuyet, MaNgoNhan } from "../types";
import type { KetQuaLuat } from "./bo-luat";

export const NGUONG_TIN_CAY = 0.6;

export type ChanDoanLLM = Omit<ChanDoan, "nguon">;

export interface ChanDoanCuoi extends ChanDoan {
  /** true khi cần giáo viên duyệt (đưa vào hàng chờ). */
  can_duyet: boolean;
  ly_do_duyet: string | null;
}

const GIA_THUYET_RONG: GiaThuyet = { loai_thi_nghiem: "khong_co", dieu_kien: "", bien_co: "", du_doan_hs: "" };

/**
 * Quy tắc:
 * - Không có LLM (mất mạng, lỗi, chưa có khóa): dùng bộ luật, luôn đưa vào hàng chờ.
 * - LLM có độ tin cậy dưới ngưỡng: gán KXD, đưa vào hàng chờ.
 * - Luật và LLM cùng mã: nguồn "lai", độ tin cậy lấy giá trị lớn hơn.
 * - Luật và LLM khác mã: giữ mã của LLM (hiểu ngữ cảnh tốt hơn) nhưng đưa vào hàng chờ.
 */
export function hopNhat(luat: KetQuaLuat, llm: ChanDoanLLM | null, cauTraLoi: string): ChanDoanCuoi {
  if (!llm) {
    const ma: MaNgoNhan = luat.ma_ngo_nhan ?? "KXD";
    return {
      ma_ngo_nhan: ma,
      can_cu: cauTraLoi,
      gia_thuyet: GIA_THUYET_RONG,
      do_tin_cay: luat.do_tin_cay,
      cau_hoi_goi_mo: "",
      nguon: "luat",
      can_duyet: true,
      ly_do_duyet: "Không gọi được AI, kết quả chỉ từ bộ luật từ khóa",
    };
  }

  if (llm.do_tin_cay < NGUONG_TIN_CAY || llm.ma_ngo_nhan === "KXD") {
    return {
      ...llm,
      ma_ngo_nhan: "KXD",
      nguon: "llm",
      can_duyet: true,
      ly_do_duyet: `AI không chắc chắn (độ tin cậy ${llm.do_tin_cay.toFixed(2)})`,
    };
  }

  const luatCoMa = luat.ma_ngo_nhan && luat.ma_ngo_nhan !== "KXD";
  if (luatCoMa && luat.ma_ngo_nhan === llm.ma_ngo_nhan) {
    return {
      ...llm,
      nguon: "lai",
      do_tin_cay: Math.max(llm.do_tin_cay, luat.do_tin_cay),
      can_duyet: false,
      ly_do_duyet: null,
    };
  }
  if (luatCoMa) {
    return {
      ...llm,
      nguon: "llm",
      can_duyet: true,
      ly_do_duyet: `Bộ luật gợi ý ${luat.ma_ngo_nhan}, AI chọn ${llm.ma_ngo_nhan}`,
    };
  }
  return { ...llm, nguon: "llm", can_duyet: false, ly_do_duyet: null };
}
