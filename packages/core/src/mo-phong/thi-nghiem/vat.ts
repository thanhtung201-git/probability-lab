// Bộ điều phối chung cho các "vật" của phòng thí nghiệm tương tác (xúc xắc, đồng xu, hộp bi, thẻ số).
// Giao diện chỉ làm việc với các hàm ở đây, nên thêm một vật mới không phải sửa giao diện.
import type { CauHinhBaiToan, CauHinhBi, CauHinhDongXuTT, CauHinhThe, CauHinhXucXac, KetQuaThiNghiem } from "../../types";
import type { Rng } from "../rng";
import { cacKhoaBaiToan, motLuotBaiToan, soMatHienThiBaiToan, tongHopBaiToan } from "./bai-toan";
import { cacKhoaBi, motLuotBi, soMatHienThiBi, tongHopBi } from "./bi";
import { cacKhoaDongXu, motLuotDongXu, soMatHienThiDongXu, tongHopDongXu } from "./dong-xu-tt";
import { cacKhoaThe, motLuotThe, soMatHienThiThe, tongHopThe } from "./the";
import { cacKhoa, motLuot, soMatHienThi, tongHopXucXac, type KhoaKetQua, type LuotXucXac, type SoLieuXucXac } from "./xuc-xac";

export type CauHinhVat = CauHinhXucXac | CauHinhDongXuTT | CauHinhBi | CauHinhThe | CauHinhBaiToan;
export type SoLieuVat = SoLieuXucXac;

export const laThiNghiemVat = (loai: string): loai is CauHinhVat["loai"] =>
  loai === "xuc_xac" || loai === "dong_xu" || loai === "bi" || loai === "the" || loai === "bai_toan";

export function cacKhoaVat(c: CauHinhVat): KhoaKetQua[] {
  switch (c.loai) {
    case "xuc_xac":
      return cacKhoa(c);
    case "dong_xu":
      return cacKhoaDongXu(c);
    case "bi":
      return cacKhoaBi(c);
    case "the":
      return cacKhoaThe(c);
    case "bai_toan":
      return cacKhoaBaiToan(c);
  }
}

export function motLuotVat(c: CauHinhVat, rng: Rng): LuotXucXac {
  switch (c.loai) {
    case "xuc_xac":
      return motLuot(c, rng);
    case "dong_xu":
      return motLuotDongXu(c, rng);
    case "bi":
      return motLuotBi(c, rng);
    case "the":
      return motLuotThe(c, rng);
    case "bai_toan":
      return motLuotBaiToan(c, rng);
  }
}

export function soMatHienThiVat(c: CauHinhVat): number {
  switch (c.loai) {
    case "xuc_xac":
      return soMatHienThi(c);
    case "dong_xu":
      return soMatHienThiDongXu(c);
    case "bi":
      return soMatHienThiBi(c);
    case "the":
      return soMatHienThiThe(c);
    case "bai_toan":
      return soMatHienThiBaiToan(c);
  }
}

export function tongHopVat(c: CauHinhVat, sl: SoLieuVat): KetQuaThiNghiem {
  switch (c.loai) {
    case "xuc_xac":
      return tongHopXucXac(c, sl);
    case "dong_xu":
      return tongHopDongXu(c, sl);
    case "bi":
      return tongHopBi(c, sl);
    case "the":
      return tongHopThe(c, sl);
    case "bai_toan":
      return tongHopBaiToan(c, sl);
  }
}
