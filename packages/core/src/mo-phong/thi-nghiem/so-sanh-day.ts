// M4 – tính đại diện: dãy "trông ngẫu nhiên" (NSNSSN) có dễ ra hơn dãy lặp lại (NNNNNN) không?
// Mỗi lần thử tung một dãy cùng độ dài, đếm số lần trùng với từng dãy.
import type { CauHinhSoSanhDay, DiemBieuDo, KetQuaThiNghiem } from "../../types";
import { laDiemVe, tungMotLan } from "../dong-xu";
import { xacSuatDay } from "../ly-thuyet";
import { PhanSo } from "../phan-so";
import { taoRng } from "../rng";

export function chaySoSanhDay(ch: CauHinhSoSanhDay): KetQuaThiNghiem {
  const pNgua = PhanSo.tu(ch.xac_suat_ngua);
  const p = pNgua.soThuc();
  const lyThuyetA = xacSuatDay(ch.day_a, pNgua);
  const lyThuyetB = xacSuatDay(ch.day_b, pNgua);
  const rng = taoRng(ch.seed);
  const doDai = ch.day_a.length;

  let trungA = 0;
  let trungB = 0;
  const bieuDo: DiemBieuDo[] = [];

  for (let i = 1; i <= ch.so_lan; i++) {
    let day = "";
    for (let j = 0; j < doDai; j++) day += tungMotLan(rng, p);
    if (day === ch.day_a) trungA++;
    if (day === ch.day_b) trungB++;
    if (laDiemVe(i, ch.so_lan)) bieuDo.push({ x: i, y: trungA / i });
  }

  return {
    cau_hinh: ch,
    tan_so: { [ch.day_a]: trungA, [ch.day_b]: trungB },
    tan_suat: trungA / ch.so_lan,
    ly_thuyet: lyThuyetA.toString(),
    ly_thuyet_so: lyThuyetA.soThuc(),
    du_lieu_bieu_do: bieuDo,
    chi_tiet: {
      tan_suat_b: trungB / ch.so_lan,
      ly_thuyet_b: lyThuyetB.toString(),
      ly_thuyet_b_so: lyThuyetB.soThuc(),
    },
  };
}
