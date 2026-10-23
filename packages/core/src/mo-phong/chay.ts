import { CauHinhThiNghiemSchema } from "../schema";
import type { CauHinhThiNghiem, KetQuaThiNghiem } from "../types";
import { chayCoDieuKien } from "./thi-nghiem/co-dieu-kien";
import { chayHoiTu } from "./thi-nghiem/hoi-tu";
import { chaySoSanhDay } from "./thi-nghiem/so-sanh-day";
import { chayXacSuatLap } from "./thi-nghiem/xac-suat-lap";
import { chayBaiToan } from "./thi-nghiem/bai-toan";
import { chayBi } from "./thi-nghiem/bi";
import { chayDongXuTT } from "./thi-nghiem/dong-xu-tt";
import { chayThe } from "./thi-nghiem/the";
import { chayXucXac } from "./thi-nghiem/xuc-xac";

/**
 * Điểm vào duy nhất của bộ mô phỏng: kiểm tra cấu hình theo schema rồi chạy đúng dạng thí nghiệm.
 * Ném ZodError nếu cấu hình không hợp lệ.
 */
export function chayThiNghiem(cauHinh: CauHinhThiNghiem): KetQuaThiNghiem {
  const ch = CauHinhThiNghiemSchema.parse(cauHinh) as CauHinhThiNghiem;
  switch (ch.loai) {
    case "xuc_xac":
      return chayXucXac(ch);
    case "dong_xu":
      return chayDongXuTT(ch);
    case "bi":
      return chayBi(ch);
    case "the":
      return chayThe(ch);
    case "bai_toan":
      return chayBaiToan(ch);
    case "co_dieu_kien":
      return chayCoDieuKien(ch);
    case "hoi_tu":
      return chayHoiTu(ch);
    case "so_sanh_day":
      return chaySoSanhDay(ch);
    case "xac_suat_lap":
      return chayXacSuatLap(ch);
  }
}
