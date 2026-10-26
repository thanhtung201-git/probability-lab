// Đồng xu vẽ bằng CSS: mặt 1 = ngửa (N), mặt 2 = sấp (S), 0 = chưa tung.
import { useRef } from "react";
import { useDapXuong } from "../hieu-ung";

export function MatDongXu({ mat, dangLac, kichThuoc = 120 }: { mat: number; dangLac: boolean; kichThuoc?: number }) {
  const chu = mat === 1 ? "N" : mat === 2 ? "S" : "";
  const nhan = mat === 1 ? "Ngửa" : mat === 2 ? "Sấp" : "";
  const goc = useRef<HTMLDivElement>(null);
  useDapXuong(goc, dangLac, mat, "dong-xu");
  return (
    <div
      ref={goc}
      className={`dong-xu${mat === 1 ? " ngua" : mat === 2 ? " sap" : " chua"}${dangLac ? " dang-lat" : ""}`}
      style={{ width: kichThuoc, height: kichThuoc, fontSize: kichThuoc * 0.42 }}
      role="img"
      aria-label={mat === 0 ? "Chưa tung" : `Đồng xu mặt ${nhan.toLowerCase()}`}
    >
      <span className="chu">{chu}</span>
      <span className="nhan-mat" style={{ fontSize: Math.max(11, kichThuoc * 0.13) }}>
        {nhan}
      </span>
    </div>
  );
}
