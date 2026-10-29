// Đồng xu 3D: mặt trước vàng (ngửa, N), mặt sau bạc (sấp, S), có viền dày. Khi đang tung thì xoay; khi dừng,
// đồng xu tung lên, xoay rồi rơi xuống đúng mặt kết quả (do thuật toán quyết định).
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, type CSSProperties } from "react";

const LOP_VIEN = [-3, -2, -1, 0, 1, 2, 3];

export function MatDongXu({ mat, dangLac, kichThuoc = 120 }: { mat: number; dangLac: boolean; kichThuoc?: number }) {
  const dong = useRef<HTMLDivElement>(null);
  const nhan = mat === 1 ? "Ngửa" : mat === 2 ? "Sấp" : "";

  useGSAP(
    () => {
      const el = dong.current;
      if (!el || dangLac) return;
      const goc = mat === 2 ? 180 : 0;
      const giam = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (mat === 0 || giam) {
        gsap.set(el, { rotateX: mat === 0 ? -18 : goc, y: 0, scale: 1 });
        return;
      }
      gsap.fromTo(el, { rotateX: goc + 360 * 3 }, { rotateX: goc, duration: 0.95, ease: "power2.out" });
      gsap
        .timeline()
        .fromTo(el, { y: 0, scale: 1 }, { y: -kichThuoc * 0.8, scale: 1.2, duration: 0.38, ease: "power2.out" })
        .to(el, { y: 0, scale: 1, duration: 0.55, ease: "bounce.out" });
    },
    { dependencies: [dangLac, mat] },
  );

  return (
    <div
      className={`xu3d${dangLac ? " dang-lat" : ""}${mat === 0 ? " chua" : ""}`}
      style={{ width: kichThuoc, height: kichThuoc, fontSize: kichThuoc * 0.42, "--k": `${kichThuoc}px` } as CSSProperties}
      role="img"
      aria-label={mat === 0 ? "Chưa tung" : `Đồng xu mặt ${nhan.toLowerCase()}`}
    >
      <div className="dong" ref={dong}>
        {LOP_VIEN.map((z) => (
          <div key={z} className="lop-vien" style={{ transform: `translateZ(calc(var(--k) * ${z * 0.012}))` }} />
        ))}
        <div className="mat-xu-truoc">
          <span className="chu">{mat === 1 ? "N" : ""}</span>
          <span className="nhan-mat" style={{ fontSize: Math.max(11, kichThuoc * 0.13) }}>
            {mat === 1 ? "Ngửa" : ""}
          </span>
        </div>
        <div className="mat-xu-sau">
          <span className="chu">{mat === 2 ? "S" : ""}</span>
          <span className="nhan-mat" style={{ fontSize: Math.max(11, kichThuoc * 0.13) }}>
            {mat === 2 ? "Sấp" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
