// M1 – ngộ nhận bù trừ: sau k lần cùng ra một mặt, lần kế tiếp có "dễ" ra mặt kia hơn không?
// Tạo các chuỗi tung độc lập, giữ lại chuỗi có k lần đầu đều ra `ket_qua_lap`, rồi đếm lần thứ k+1.
import type { CauHinhCoDieuKien, DiemBieuDo, KetQuaThiNghiem } from "../../types";
import { tungMotLan } from "../dong-xu";
import { xacSuatCoDieuKien } from "../ly-thuyet";
import { PhanSo } from "../phan-so";
import { taoRng } from "../rng";

/** Giới hạn số chuỗi được tạo, phòng khi điều kiện quá hiếm. */
const SO_CHUOI_THU_TOI_DA = 20_000_000;
const SO_DIEM_VE_TOI_DA = 200;

export function chayCoDieuKien(ch: CauHinhCoDieuKien): KetQuaThiNghiem {
  const pNgua = PhanSo.tu(ch.xac_suat_ngua);
  const lyThuyet = xacSuatCoDieuKien(ch.so_lan_truoc, ch.ket_qua_lap, ch.bien_co, pNgua);
  const p = pNgua.soThuc();
  const rng = taoRng(ch.seed);

  let soChuoiThu = 0;
  let thoaDieuKien = 0;
  let raBienCo = 0;
  const buocVe = Math.max(1, Math.ceil(ch.so_chuoi / SO_DIEM_VE_TOI_DA));
  const bieuDo: DiemBieuDo[] = [];

  while (thoaDieuKien < ch.so_chuoi && soChuoiThu < SO_CHUOI_THU_TOI_DA) {
    soChuoiThu++;
    let thoa = true;
    for (let i = 0; i < ch.so_lan_truoc; i++) {
      if (tungMotLan(rng, p) !== ch.ket_qua_lap) {
        thoa = false;
        break;
      }
    }
    if (!thoa) continue;
    thoaDieuKien++;
    if (tungMotLan(rng, p) === ch.bien_co) raBienCo++;
    if (thoaDieuKien % buocVe === 0 || thoaDieuKien === ch.so_chuoi) {
      bieuDo.push({ x: thoaDieuKien, y: raBienCo / thoaDieuKien });
    }
  }

  const khac = thoaDieuKien - raBienCo;
  return {
    cau_hinh: ch,
    tan_so: { [ch.bien_co]: raBienCo, [ch.bien_co === "N" ? "S" : "N"]: khac },
    tan_suat: thoaDieuKien > 0 ? raBienCo / thoaDieuKien : 0,
    ly_thuyet: lyThuyet.toString(),
    ly_thuyet_so: lyThuyet.soThuc(),
    du_lieu_bieu_do: bieuDo,
    chi_tiet: {
      so_chuoi_da_tao: soChuoiThu,
      so_chuoi_thoa_dieu_kien: thoaDieuKien,
      ty_le_thoa_dieu_kien: thoaDieuKien / soChuoiThu,
    },
  };
}
