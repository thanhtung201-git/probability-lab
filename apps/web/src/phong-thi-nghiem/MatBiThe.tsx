// Hình viên bi, thẻ số và hộp đựng, vẽ bằng CSS. Giá trị "mặt" 0 nghĩa là chưa lấy/rút.
import { useGSAP } from "@gsap/react";
import { cacSoThuanLoi, nhanVat, thoaBienCo, type BienCoThe, type NhomBi, type VatTongQuat } from "@plab/core";
import gsap from "gsap";
import { useRef, type CSSProperties } from "react";
import { useNayRa } from "../hieu-ung";

const BANG_MAU: Record<string, string> = {
  đỏ: "#dc2626",
  xanh: "#2563eb",
  "xanh dương": "#2563eb",
  "xanh lá": "#16a34a",
  lá: "#16a34a",
  vàng: "#f6c945",
  trắng: "#f3f4f6",
  đen: "#1f2937",
  cam: "#f97316",
  tím: "#7c3aed",
  hồng: "#ec4899",
  nâu: "#92400e",
  xám: "#9ca3af",
};
const DU_PHONG = ["#dc2626", "#2563eb", "#f6c945", "#16a34a", "#7c3aed", "#f97316"];

/** Màu hiển thị cho một nhóm bi theo tên; tên lạ dùng màu dự phòng theo thứ tự. */
export const mauBi = (ten: string, chiSo: number) => BANG_MAU[ten.toLowerCase().trim()] ?? DU_PHONG[chiSo % DU_PHONG.length]!;

/** Chỉ số màu ổn định theo tên, để tên lạ vẫn ra cùng một màu ở mọi nơi. */
const chiSoTheoTen = (ten: string) => [...ten].reduce((s, c) => s + c.charCodeAt(0), 0);

/** Một vật của bài toán tổng quát: vòng tròn màu (nếu có màu) ghi số (nếu có số); chỉ có số thì vẽ thẻ số. */
export function MatVatTQ({ vat, kichThuoc = 90, dangLac }: { vat?: VatTongQuat; kichThuoc?: number; dangLac: boolean }) {
  const biRef = useRef<HTMLDivElement>(null);
  useNayRa(biRef, dangLac, !!vat && vat.mau !== undefined);
  if (!vat) {
    return (
      <div className="bi-o" style={{ width: kichThuoc }} role="img" aria-label="Chưa lấy">
        <div className={`bi chua${dangLac ? " dang-lac" : ""}`} style={{ width: kichThuoc, height: kichThuoc, backgroundColor: "#c7cbd6" }} />
      </div>
    );
  }
  if (vat.mau === undefined) {
    return (
      <div className={`the-so${dangLac ? " dang-lac" : ""}`} style={{ width: kichThuoc * 0.9, height: kichThuoc, fontSize: kichThuoc * 0.46 }} role="img" aria-label={`Số ${vat.so}`}>
        {vat.so}
      </div>
    );
  }
  const nen = mauBi(vat.mau, chiSoTheoTen(vat.mau));
  return (
    <div className="bi-o" style={{ width: kichThuoc }} role="img" aria-label={nhanVat(vat)}>
      <div ref={biRef} className={`bi${dangLac ? " dang-lac" : ""}`} style={{ width: kichThuoc, height: kichThuoc, backgroundColor: nen, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: kichThuoc * 0.42, textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}>
        {vat.so ?? ""}
      </div>
      <span className="nhan-bi" style={{ fontSize: Math.max(11, kichThuoc * 0.16) }}>
        {vat.mau}
      </span>
    </div>
  );
}

/** Tập vật của bài toán tổng quát, để cả lớp thấy có những vật nào. */
export function TapVatTQ({ vat, tenVat }: { vat: VatTongQuat[]; tenVat: string }) {
  // Tập vật lớn chỉ vẽ và liệt kê phần đầu, tránh vẽ hàng trăm ô làm chậm trang.
  const toiDa = 60;
  const hienThi = vat.length > toiDa ? vat.slice(0, toiDa) : vat;
  return (
    <div className="hop-thong-tin">
      <div className="hop-bi" aria-label={`Các ${tenVat} trong tập`}>
        {hienThi.map((v, i) =>
          v.mau === undefined ? (
            <span key={i} className="the-nho">
              {v.so}
            </span>
          ) : (
            <span
              key={i}
              className="bi-nho"
              title={nhanVat(v)}
              style={{ background: mauBi(v.mau, chiSoTheoTen(v.mau)), color: "#fff", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26 }}
            >
              {v.so ?? ""}
            </span>
          ),
        )}
        {vat.length > toiDa && <span className="the-nho">…</span>}
      </div>
      <div className="muted">
        {vat.length} {tenVat}: {hienThi.map(nhanVat).join(" · ")}
        {vat.length > toiDa && ` · … (còn ${vat.length - toiDa} ${tenVat})`}
      </div>
    </div>
  );
}

export function MatBi({ mat, hop, kichThuoc = 90, dangLac }: { mat: number; hop: NhomBi[]; kichThuoc?: number; dangLac: boolean }) {
  const nhom = hop[mat - 1];
  const mau = nhom ? mauBi(nhom.ten, mat - 1) : "#c7cbd6";
  const biRef = useRef<HTMLDivElement>(null);
  useNayRa(biRef, dangLac, !!nhom);
  return (
    <div className="bi-o" style={{ width: kichThuoc }} role="img" aria-label={nhom ? `Bi ${nhom.ten}` : "Chưa lấy"}>
      <div
        ref={biRef}
        className={`bi${dangLac ? " dang-lac" : ""}${nhom ? "" : " chua"}`}
        style={{ width: kichThuoc, height: kichThuoc, backgroundColor: mau }}
      />
      <span className="nhan-bi" style={{ fontSize: Math.max(11, kichThuoc * 0.16) }}>
        {nhom ? nhom.ten : ""}
      </span>
    </div>
  );
}

export function MatThe({
  so,
  thuanLoi,
  kichThuoc = 96,
  dangLac,
}: {
  so: number;
  /** true/false khi thí nghiệm có biến cố; undefined khi chỉ ghi từng số. */
  thuanLoi?: boolean;
  kichThuoc?: number;
  dangLac: boolean;
}) {
  const trang = thuanLoi === false ? " khong-thuan-loi" : " thuan-loi";
  const lat = useRef<HTMLDivElement>(null);
  // Đang rút: thẻ úp (lắc nhẹ); rút xong: thẻ lật ngửa lên để lộ số.
  useGSAP(
    () => {
      const el = lat.current;
      if (!el) return;
      const giam = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (dangLac || so === 0) gsap.set(el, { rotateY: 180 });
      else if (giam) gsap.set(el, { rotateY: 0 });
      else gsap.fromTo(el, { rotateY: 180, y: -30 }, { rotateY: 0, y: 0, duration: 0.7, ease: "back.out(1.4)" });
    },
    { dependencies: [dangLac, so] },
  );
  return (
    <div
      className={`the3d${dangLac ? " dang-lac" : ""}${so === 0 ? " chua" : ""}`}
      style={{ width: kichThuoc * 0.9, height: kichThuoc, fontSize: kichThuoc * 0.46 } as CSSProperties}
      role="img"
      aria-label={so === 0 ? "Chưa rút" : `Thẻ số ${so}`}
    >
      <div className="lat" ref={lat}>
        <div className={`mat-the-truoc${trang}`}>
          {so === 0 ? "" : so}
          {so !== 0 && thuanLoi !== undefined && (
            <span className="dau-the" style={{ fontSize: Math.max(11, kichThuoc * 0.15), whiteSpace: "nowrap" }}>
              {thuanLoi ? "✓ thuận lợi" : "✗ không"}
            </span>
          )}
        </div>
        <div className="mat-the-sau">?</div>
      </div>
    </div>
  );
}

/** Hộp bi: các viên bi theo màu kèm số lượng, để cả lớp thấy hộp chứa gì. */
export function HopBi({ hop, dangTron = false }: { hop: NhomBi[]; dangTron?: boolean }) {
  const tong = hop.reduce((s, g) => s + g.so, 0);
  return (
    <div className="hop-thong-tin">
      <div className={`hop-bi${dangTron ? " dang-tron" : ""}`} aria-label="Các viên bi trong hộp">
        {hop.map((g, i) =>
          Array.from({ length: g.so }, (_, k) => (
            <span key={`${i}-${k}`} className="bi-nho" style={{ backgroundColor: mauBi(g.ten, i), "--i": i * 7 + k } as CSSProperties} />
          )),
        )}
      </div>
      <div className="muted">
        {hop.map((g) => `${g.so} ${g.ten}`).join(" · ")} · tổng {tong} bi
      </div>
    </div>
  );
}

/** Bộ thẻ 1..n; nếu có biến cố thì tô các thẻ thỏa biến cố. */
export function BoThe({ soThe, bienCo, tenBienCo }: { soThe: number; bienCo?: BienCoThe; tenBienCo?: string }) {
  const thuan = bienCo ? new Set(cacSoThuanLoi(soThe, bienCo)) : null;
  // Bộ thẻ lớn chỉ vẽ một phần đầu và thẻ cuối, tránh vẽ hàng nghìn thẻ làm chậm trang.
  const toiDaVe = 60;
  const ve = soThe <= toiDaVe ? Array.from({ length: soThe }, (_, i) => i + 1) : Array.from({ length: toiDaVe - 1 }, (_, i) => i + 1);
  return (
    <div className="hop-thong-tin">
      <div className="hop-the" aria-label="Các thẻ trong bộ">
        {ve.map((x) => (
          <span key={x} className={`the-nho${thuan ? (thoaBienCo(bienCo!, x) ? " thuan-loi" : "") : ""}`}>
            {x}
          </span>
        ))}
        {soThe > toiDaVe && (
          <>
            <span className="the-nho">…</span>
            <span className={`the-nho${thuan ? (thoaBienCo(bienCo!, soThe) ? " thuan-loi" : "") : ""}`}>{soThe}</span>
          </>
        )}
      </div>
      <div className="muted">
        {soThe.toLocaleString("vi-VN")} thẻ ghi các số từ 1 đến {soThe.toLocaleString("vi-VN")}
        {thuan && ` · biến cố “${tenBienCo}”: ${thuan.size}/${soThe} thẻ`}
      </div>
    </div>
  );
}
