// Xúc xắc là khối lập phương 3D: lắc khi đang gieo, rồi lăn, nảy và dừng đúng mặt kết quả.
// Kết quả do thuật toán quyết định (`mat`); chuyển động chỉ minh họa kết quả đó.
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, type CSSProperties } from "react";

// Vị trí chấm theo ô lưới (0..8, đọc từ trái sang phải, trên xuống dưới).
const CHAM: Record<number, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

// Mỗi mặt đặt ở một phía của khối: 1 trước, 6 sau, 3 phải, 4 trái, 5 trên, 2 dưới.
const MAT_KHOI: [number, string][] = [
  [1, "rotateY(0deg)"],
  [6, "rotateY(180deg)"],
  [3, "rotateY(90deg)"],
  [4, "rotateY(-90deg)"],
  [5, "rotateX(90deg)"],
  [2, "rotateX(-90deg)"],
];

// Góc xoay của cả khối để mặt cần hiện quay ra phía trước. Chưa gieo: nghiêng nhẹ cho thấy dạng khối.
const GOC_HIEN: Record<number, [number, number]> = {
  1: [0, 0],
  6: [0, 180],
  3: [0, -90],
  4: [0, 90],
  5: [-90, 0],
  2: [90, 0],
};
const GOC_CHUA_GIEO: [number, number] = [-24, 32];

export function MatXucXac({ mat, dangLac, kichThuoc = 120 }: { mat: number; dangLac: boolean; kichThuoc?: number }) {
  const khoi = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = khoi.current;
      if (!el || dangLac) return;
      const [rx, ry] = GOC_HIEN[mat] ?? GOC_CHUA_GIEO;
      const giam = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (mat === 0 || giam) {
        gsap.set(el, { rotateX: rx, rotateY: ry, rotateZ: 0, y: 0 });
        return;
      }
      gsap.fromTo(
        el,
        { rotateX: rx + 360 * gsap.utils.random(1, 2, 1), rotateY: ry - 360 * gsap.utils.random(1, 2, 1), rotateZ: gsap.utils.random(-100, 100) },
        { rotateX: rx, rotateY: ry, rotateZ: 0, duration: 0.95, ease: "power3.out" },
      );
      gsap.fromTo(el, { y: -kichThuoc * 0.7 }, { y: 0, duration: 0.95, ease: "bounce.out" });
    },
    { dependencies: [dangLac, mat] },
  );

  return (
    <div
      className={`xx3d${dangLac ? " dang-lac" : ""}${mat === 0 ? " chua" : ""}`}
      style={{ width: kichThuoc, height: kichThuoc, "--k": `${kichThuoc}px` } as CSSProperties}
      role="img"
      aria-label={mat === 0 ? "Chưa gieo" : `Xúc xắc mặt ${mat}`}
    >
      <div className="khoi" ref={khoi}>
        {MAT_KHOI.map(([so, bienDoi]) => {
          const cham = new Set(CHAM[so]);
          return (
            <div key={so} className="mat-khoi" style={{ transform: `${bienDoi} translateZ(calc(var(--k) / 2))` }}>
              {Array.from({ length: 9 }, (_, i) => (
                <span key={i} className={cham.has(i) ? "cham" : ""} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
