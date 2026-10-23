// M2 – kết luận vội từ ít lần thử: tần suất ra ngửa dao động mạnh lúc đầu và ổn định dần khi tung nhiều.
import type { CauHinhHoiTu, DiemBieuDo, KetQuaThiNghiem } from "../../types";
import { laDiemVe, tungMotLan } from "../dong-xu";
import { PhanSo } from "../phan-so";
import { taoRng } from "../rng";

export function chayHoiTu(ch: CauHinhHoiTu): KetQuaThiNghiem {
  const pNgua = PhanSo.tu(ch.xac_suat_ngua);
  const p = pNgua.soThuc();
  const rng = taoRng(ch.seed);
  const moc = [...new Set(ch.moc)].sort((a, b) => a - b);
  const tong = moc[moc.length - 1]!;
  const tapMoc = new Set(moc);

  let soNgua = 0;
  const bieuDo: DiemBieuDo[] = [];
  const chiTiet: Record<string, number> = {};

  for (let i = 1; i <= tong; i++) {
    if (tungMotLan(rng, p) === "N") soNgua++;
    const tanSuat = soNgua / i;
    if (laDiemVe(i, tong) || tapMoc.has(i)) bieuDo.push({ x: i, y: tanSuat });
    if (tapMoc.has(i)) {
      chiTiet[`tan_suat_${i}`] = tanSuat;
      chiTiet[`do_lech_${i}`] = Math.abs(tanSuat - p);
    }
  }

  return {
    cau_hinh: ch,
    tan_so: { N: soNgua, S: tong - soNgua },
    tan_suat: soNgua / tong,
    ly_thuyet: pNgua.toString(),
    ly_thuyet_so: p,
    du_lieu_bieu_do: bieuDo,
    chi_tiet: chiTiet,
  };
}
