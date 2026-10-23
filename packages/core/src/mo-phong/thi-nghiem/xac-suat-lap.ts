// M5 – hiểu xác suất như lời tiên đoán: "70% mưa mà không mưa thì dự báo sai".
// Mô phỏng nhiều ngày cùng có xác suất p, đếm số ngày biến cố xảy ra và không xảy ra.
import type { CauHinhXacSuatLap, DiemBieuDo, KetQuaThiNghiem } from "../../types";
import { laDiemVe } from "../dong-xu";
import { PhanSo } from "../phan-so";
import { taoRng } from "../rng";

export function chayXacSuatLap(ch: CauHinhXacSuatLap): KetQuaThiNghiem {
  const pXayRa = PhanSo.tu(ch.xac_suat);
  const pKhong = PhanSo.MOT.tru(pXayRa);
  const p = pXayRa.soThuc();
  const rng = taoRng(ch.seed);

  let xayRa = 0;
  const bieuDo: DiemBieuDo[] = [];

  for (let i = 1; i <= ch.so_ngay; i++) {
    if (rng() < p) xayRa++;
    if (laDiemVe(i, ch.so_ngay)) bieuDo.push({ x: i, y: xayRa / i });
  }

  const khong = ch.so_ngay - xayRa;
  return {
    cau_hinh: ch,
    tan_so: { xay_ra: xayRa, khong_xay_ra: khong },
    tan_suat: xayRa / ch.so_ngay,
    ly_thuyet: pXayRa.toString(),
    ly_thuyet_so: p,
    du_lieu_bieu_do: bieuDo,
    chi_tiet: {
      ty_le_khong_xay_ra: khong / ch.so_ngay,
      ly_thuyet_khong_xay_ra: pKhong.toString(),
      ky_vong_so_ngay_xay_ra: p * ch.so_ngay,
    },
  };
}
