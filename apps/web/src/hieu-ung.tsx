// Hiệu ứng chuyển động dùng GSAP. Mọi hiệu ứng tự tắt khi người dùng bật "giảm chuyển động" của hệ điều hành.
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type RefObject, useEffect, useRef } from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const GIAM_CHUYEN_DONG = "(prefers-reduced-motion: reduce)";
const BINH_THUONG = "(prefers-reduced-motion: no-preference)";

/** Các thẻ ngoài cùng (không nằm trong thẻ khác) để xuất hiện lần lượt. */
function theNgoaiCung(goc: HTMLElement): HTMLElement[] {
  return gsap.utils.toArray<HTMLElement>(".the, .tinh-huong, .buoc", goc).filter((el) => !el.parentElement?.closest(".the"));
}

/** Các thẻ hiện dần khi cuộn tới (ScrollTrigger), lần lượt từng đợt; thẻ đã thấy sẵn thì vào ngay. */
export function useVaoTrang(goc: RefObject<HTMLElement | null>, khoa: unknown[]) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(BINH_THUONG, () => {
        if (!goc.current) return;
        const cacThe = theNgoaiCung(goc.current);
        if (cacThe.length === 0) return;
        gsap.set(cacThe, { opacity: 0, y: 46, scale: 0.97 });
        ScrollTrigger.batch(cacThe, {
          start: "top 95%",
          once: true,
          onEnter: (lo) =>
            gsap.to(lo, { opacity: 1, y: 0, scale: 1, duration: 0.75, ease: "power3.out", stagger: 0.1, clearProps: "opacity,transform" }),
        });
        // Phòng khi bố cục dịch chuyển làm thẻ không bao giờ chạm mốc: sau vài giây hiện hết.
        const du = gsap.delayedCall(2.5, () => {
          const con = cacThe.filter((el) => Number(gsap.getProperty(el, "opacity")) < 1);
          if (con.length) gsap.to(con, { opacity: 1, y: 0, scale: 1, duration: 0.5, clearProps: "opacity,transform" });
        });
        ScrollTrigger.refresh();
        return () => du.kill();
      });
      return () => mm.revert();
    },
    { dependencies: khoa, scope: goc, revertOnUpdate: true },
  );
}

/** Hai vệt sáng mờ trôi chậm ở nền, tạo chiều sâu mà không gây rối mắt khi chiếu. */
export function NenDong() {
  const goc = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(BINH_THUONG, () => {
        gsap.to(".vet-1", { x: 90, y: 60, scale: 1.15, duration: 14, ease: "sine.inOut", repeat: -1, yoyo: true });
        gsap.to(".vet-2", { x: -80, y: -50, scale: 1.2, duration: 17, ease: "sine.inOut", repeat: -1, yoyo: true });
      });
      return () => mm.revert();
    },
    { scope: goc },
  );
  return (
    <div className="nen-dong" ref={goc} aria-hidden="true">
      <span className="vet vet-1" />
      <span className="vet vet-2" />
    </div>
  );
}

/** Con số đếm lên mượt thay vì nhảy cách quãng. */
export function SoChay({ gia, dinhDang = (x: number) => x.toLocaleString("vi-VN") }: { gia: number; dinhDang?: (x: number) => string }) {
  const nhan = useRef<HTMLSpanElement>(null);
  const hienTai = useRef({ v: gia });
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      const dat = () => {
        hienTai.current.v = gia;
        if (nhan.current) nhan.current.textContent = dinhDang(gia);
      };
      mm.add(GIAM_CHUYEN_DONG, dat);
      mm.add(BINH_THUONG, () => {
        gsap.to(hienTai.current, {
          v: gia,
          duration: 0.45,
          ease: "power2.out",
          overwrite: true,
          onUpdate: () => {
            if (nhan.current) nhan.current.textContent = dinhDang(Math.round(hienTai.current.v));
          },
          onComplete: dat,
        });
        // Mỗi lần số đổi, con số "nảy" nhẹ để mắt bắt được thay đổi.
        if (nhan.current) gsap.fromTo(nhan.current, { scale: 1.22, display: "inline-block" }, { scale: 1, duration: 0.4, ease: "back.out(2.4)" });
      });
      return () => mm.revert();
    },
    { dependencies: [gia] },
  );
  return <span ref={nhan}>{dinhDang(gia)}</span>;
}

/**
 * Vật vừa rơi xuống bàn: nảy lên rồi đáp xuống với độ co giãn.
 * `kieu` quyết định cách xoay: xúc xắc quay tròn, đồng xu lật quanh trục ngang.
 */
export function useDapXuong(goc: RefObject<HTMLElement | null>, dangLac: boolean, mat: number, kieu: "xuc-xac" | "dong-xu") {
  useGSAP(
    () => {
      if (dangLac || mat === 0 || !goc.current) return;
      const mm = gsap.matchMedia();
      mm.add(BINH_THUONG, () => {
        const tl = gsap.timeline();
        if (kieu === "dong-xu") {
          tl.fromTo(goc.current, { rotateX: 540, y: -34, scale: 0.8 }, { rotateX: 0, y: 0, scale: 1, duration: 0.7, ease: "back.out(1.6)" });
        } else {
          tl.fromTo(goc.current, { rotate: -200, y: -30, scale: 0.7 }, { rotate: 0, y: 0, scale: 1, duration: 0.65, ease: "elastic.out(1, 0.55)" });
        }
        tl.eventCallback("onComplete", () => {
          gsap.set(goc.current, { clearProps: "transform" });
        });
      });
      return () => mm.revert();
    },
    { dependencies: [dangLac, mat] },
  );
}

/** Thanh chuyển động trượt dưới mục điều hướng đang chọn. */
export function useThanhDieuHuong(goc: RefObject<HTMLElement | null>, khoa: unknown) {
  useGSAP(
    () => {
      const dat = (nhanh: boolean) => {
        const nav = goc.current;
        const vet = nav?.querySelector<HTMLElement>(".vet-nav");
        const dangO = nav?.querySelector<HTMLElement>("a.dang-o");
        if (!nav || !vet) return;
        if (!dangO) {
          gsap.to(vet, { opacity: 0, duration: 0.2 });
          return;
        }
        gsap.to(vet, { x: dangO.offsetLeft, width: dangO.offsetWidth, opacity: 1, duration: nhanh ? 0 : 0.45, ease: "power3.inOut" });
      };
      const mm = gsap.matchMedia();
      mm.add(BINH_THUONG, () => dat(false));
      mm.add(GIAM_CHUYEN_DONG, () => dat(true));
      const khiDoiKichThuoc = () => dat(true);
      window.addEventListener("resize", khiDoiKichThuoc);
      return () => {
        window.removeEventListener("resize", khiDoiKichThuoc);
        mm.revert();
      };
    },
    { dependencies: [khoa], scope: goc },
  );
}

/** Logo xuất hiện lúc mở trang. */
export function useMoDauTrang(goc: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(BINH_THUONG, () => {
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from(".ten", { opacity: 0, x: -24, duration: 0.6 })
          .from(".dieu-huong a", { opacity: 0, y: -14, duration: 0.45, stagger: 0.08 }, "-=0.35")
          .from(".huy-hieu", { opacity: 0, scale: 0.8, duration: 0.4 }, "-=0.2");
      });
      return () => mm.revert();
    },
    { scope: goc },
  );
}

const VAT_BAY = [
  { ky: "🎲", cls: "vb-1", do: 0.05 },
  { ky: "🪙", cls: "vb-2", do: 0.09 },
  { ky: "🔴", cls: "vb-3", do: 0.14 },
  { ky: "🔢", cls: "vb-4", do: 0.07 },
  { ky: "🎯", cls: "vb-5", do: 0.11 },
  { ky: "✦", cls: "vb-6", do: 0.16 },
];

/** Banner đầu trang: tiêu đề hiện từng từ, các vật xác suất bay lơ lửng và dõi theo con trỏ chuột. */
export function Banner({ khoa, tieuDe, moTa }: { khoa: string; tieuDe: string; moTa: string }) {
  const goc = useRef<HTMLElement>(null);

  // Vật bay lơ lửng: chạy một lần, không phụ thuộc trang.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(BINH_THUONG, () => {
        gsap.utils.toArray<HTMLElement>(".vat-bay").forEach((el, i) => {
          gsap.from(el, { opacity: 0, scale: 0, rotate: -120, duration: 1, delay: 0.3 + i * 0.12, ease: "back.out(1.8)" });
          gsap.to(el, { y: i % 2 ? 16 : -16, rotate: i % 2 ? 14 : -14, duration: 3 + i * 0.6, ease: "sine.inOut", repeat: -1, yoyo: true });
        });
        // Dõi theo chuột: vật càng "gần" càng dịch nhiều.
        const doi = gsap.utils.toArray<HTMLElement>(".vat-theo").map((el) => ({
          x: gsap.quickTo(el, "x", { duration: 0.8, ease: "power3.out" }),
          y: gsap.quickTo(el, "y", { duration: 0.8, ease: "power3.out" }),
          d: Number(el.dataset.do ?? 0.1),
        }));
        const khiDiChuyen = (e: PointerEvent) => {
          const hcn = goc.current?.getBoundingClientRect();
          if (!hcn) return;
          const dx = e.clientX - (hcn.left + hcn.width / 2);
          const dy = e.clientY - (hcn.top + hcn.height / 2);
          for (const o of doi) {
            o.x(-dx * o.d);
            o.y(-dy * o.d);
          }
        };
        window.addEventListener("pointermove", khiDiChuyen);
        return () => window.removeEventListener("pointermove", khiDiChuyen);
      });
      return () => mm.revert();
    },
    { scope: goc },
  );

  // Tiêu đề: mỗi từ trượt lên từ sau một "mặt nạ"; chạy lại mỗi khi đổi trang.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(BINH_THUONG, () => {
        gsap
          .timeline({ defaults: { ease: "power4.out" } })
          .from(".tu-trong", { yPercent: 115, rotate: 4, duration: 0.85, stagger: 0.07 })
          .from(".banner-mo-ta", { opacity: 0, y: 16, duration: 0.6 }, "-=0.45")
          .from(".banner-vach", { scaleX: 0, transformOrigin: "left center", duration: 0.7 }, "-=0.6");
      });
      return () => mm.revert();
    },
    { dependencies: [khoa], scope: goc, revertOnUpdate: true },
  );

  return (
    <section className="banner" ref={goc} aria-label={tieuDe}>
      <div className="banner-luoi" aria-hidden="true" />
      {VAT_BAY.map((v) => (
        <span key={v.cls} className={`vat-theo ${v.cls}`} data-do={v.do} aria-hidden="true">
          <span className="vat-bay">{v.ky}</span>
        </span>
      ))}
      <div className="banner-chu">
        <p className="banner-tieu-de" role="heading" aria-level={1}>
          {tieuDe.split(" ").map((tu, i) => (
            <span key={`${khoa}-${i}`} className="tu-mat-na">
              <span className="tu-trong">{tu}</span>
            </span>
          ))}
        </p>
        <span className="banner-vach" aria-hidden="true" />
        <p className="banner-mo-ta">{moTa}</p>
      </div>
    </section>
  );
}

/** Bấm nút gieo thì bắn ra các hạt màu như pháo hoa nhỏ. */
export function useNoPhao() {
  useEffect(() => {
    const MAU = ["#dc2626", "#1f4fd1", "#f6c945", "#11804a", "#8b5cf6"];
    const khiBam = (e: MouseEvent) => {
      const nut = (e.target as HTMLElement).closest<HTMLButtonElement>(".nut-gieo, .nut-lo button:not(.dat-lai)");
      if (!nut || nut.disabled) return;
      if (window.matchMedia(GIAM_CHUYEN_DONG).matches) return;
      const hcn = nut.getBoundingClientRect();
      const x0 = e.clientX || hcn.left + hcn.width / 2;
      const y0 = e.clientY || hcn.top + hcn.height / 2;
      for (let i = 0; i < 14; i++) {
        const hat = document.createElement("span");
        hat.className = "hat-no";
        hat.style.background = MAU[i % MAU.length]!;
        document.body.appendChild(hat);
        const goc = (Math.PI * 2 * i) / 14 + Math.random() * 0.4;
        const xa = gsap.utils.random(46, 110);
        gsap.fromTo(
          hat,
          { x: x0, y: y0, scale: gsap.utils.random(0.6, 1.2), opacity: 1 },
          {
            x: x0 + Math.cos(goc) * xa,
            y: y0 + Math.sin(goc) * xa + 30,
            scale: 0,
            opacity: 0,
            rotate: gsap.utils.random(-180, 180),
            duration: gsap.utils.random(0.6, 0.95),
            ease: "power3.out",
            onComplete: () => hat.remove(),
          },
        );
      }
    };
    document.addEventListener("click", khiBam);
    return () => document.removeEventListener("click", khiBam);
  }, []);
}

/** Sân khấu xúc xắc/đồng xu nghiêng 3D nhẹ theo con trỏ chuột, như đang cầm trên tay. */
export function useNghiengSanKhau(goc: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(`${BINH_THUONG} and (hover: hover)`, () => {
        const nen = goc.current;
        if (!nen) return;
        const khiDi = (e: PointerEvent) => {
          const sk = (e.target as HTMLElement).closest<HTMLElement>(".san-khau");
          for (const el of nen.querySelectorAll<HTMLElement>(".san-khau")) {
            if (el !== sk) gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.8, ease: "power3.out", overwrite: "auto" });
          }
          if (!sk) return;
          const h = sk.getBoundingClientRect();
          const nx = (e.clientX - h.left) / h.width - 0.5;
          const ny = (e.clientY - h.top) / h.height - 0.5;
          gsap.to(sk, { rotateY: nx * 10, rotateX: -ny * 10, transformPerspective: 900, duration: 0.5, ease: "power2.out", overwrite: "auto" });
        };
        nen.addEventListener("pointermove", khiDi);
        return () => {
          nen.removeEventListener("pointermove", khiDi);
          gsap.set(nen.querySelectorAll(".san-khau"), { clearProps: "transform" });
        };
      });
      return () => mm.revert();
    },
    { scope: goc },
  );
}
