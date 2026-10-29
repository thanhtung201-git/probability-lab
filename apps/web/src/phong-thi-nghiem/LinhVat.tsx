// Linh vật Xu Xu: câu thoại soạn sẵn theo tiến trình thí nghiệm (không phải phản hồi của AI).
import type { ReactNode } from "react";

export interface TrangThaiLinhVat {
  dongTu: string;
  DongTu: string;
  soLuot: number;
  dangChay: boolean;
  /** Số lượt thỏa điều kiện (chỉ có nghĩa ở chế độ có điều kiện). */
  soGhiNhan: number;
  coDieuKien: boolean;
  lechLonNhat: number;
  hoiTu: boolean;
}

type BieuCam = "vui" | "hoi-hop" | "wow";

const so = (x: number) => x.toLocaleString("vi-VN");
const chon = (ds: string[], i: number) => ds[i % ds.length]!;

export function loiLinhVat(t: TrangThaiLinhVat): { loi: string; bieuCam: BieuCam } {
  const { dongTu, DongTu, soLuot: n } = t;
  if (t.dangChay) return { bieuCam: "hoi-hop", loi: chon([`Hồi hộp quá… ${DongTu} đây!`, `Đang ${dongTu}… đừng chớp mắt nha!`, "Kết quả sắp lộ diện rồi!"], n) };
  if (n === 0)
    return {
      bieuCam: "vui",
      loi: `Chào bạn, mình là Xu Xu! Hãy dự đoán trước, rồi bấm ${dongTu} thử nào.`,
    };
  if (t.hoiTu)
    return {
      bieuCam: "wow",
      loi: `Tuyệt vời! Sau ${so(n)} lượt, thực nghiệm chỉ lệch ${(t.lechLonNhat * 100).toFixed(1).replace(".", ",")}% so với lý thuyết. Càng thử nhiều, kết quả càng ổn định!`,
    };
  if (t.coDieuKien && n < 1000)
    return { bieuCam: "vui", loi: `Mình chỉ đếm những lượt thỏa điều kiện thôi nha. Hiện có ${so(t.soGhiNhan)} lượt như vậy, thử thêm để đủ số liệu!` };
  if (n < 10)
    return { bieuCam: "vui", loi: chon([`Mới ${so(n)} lượt thôi, ít lắm! Kết quả lúc này hay “nhảy múa”, đừng vội kết luận nhé.`, `${so(n)} lượt chưa đủ để tin đâu. ${DongTu} thêm đi!`], n) };
  if (n < 100) return { bieuCam: "vui", loi: chon([`${so(n)} lượt rồi! Bảng tần số bắt đầu có hình dáng đấy.`, `Ồ, ${so(n)} lượt. Thử ${dongTu} nhanh hàng trăm lượt xem sao?`], n) };
  if (n < 1000) return { bieuCam: "vui", loi: `Đã ${so(n)} lượt! Nhìn đường tần suất xem, nó có đang tiến dần về xác suất lý thuyết không?` };
  return { bieuCam: "vui", loi: `${so(n)} lượt rồi mà vẫn lệch chút xíu? Bình thường thôi, ngẫu nhiên mà! Thử thêm một lô nữa nhé.` };
}

function Mat({ bieuCam }: { bieuCam: BieuCam }): ReactNode {
  return (
    <svg viewBox="0 0 100 100" width="88" height="88" aria-hidden="true" className={`xu-xu bc-${bieuCam}`}>
      <defs>
        <radialGradient id="xx-vang" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#ffe58a" />
          <stop offset="0.6" stopColor="#f6c945" />
          <stop offset="1" stopColor="#e0a91b" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="52" r="44" fill="#c68f12" />
      <circle cx="50" cy="48" r="44" fill="url(#xx-vang)" stroke="#d9a21b" strokeWidth="4" />
      <circle cx="50" cy="48" r="35" fill="none" stroke="#f9dc7c" strokeWidth="3" />
      {bieuCam === "wow" && (
        <>
          <path d="M26 32 Q34 24 42 31" fill="none" stroke="#7a5200" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M58 31 Q66 24 74 32" fill="none" stroke="#7a5200" strokeWidth="3.5" strokeLinecap="round" />
        </>
      )}
      <g className="mat-xu">
        <ellipse cx="36" cy="44" rx="6" ry="8" fill="#3a2800" />
        <ellipse cx="64" cy="44" rx="6" ry="8" fill="#3a2800" />
        <circle cx="38" cy="41" r="2.2" fill="#fff" />
        <circle cx="66" cy="41" r="2.2" fill="#fff" />
      </g>
      {bieuCam === "vui" && <path d="M34 62 Q50 78 66 62" fill="none" stroke="#3a2800" strokeWidth="4.5" strokeLinecap="round" />}
      {bieuCam === "hoi-hop" && <ellipse cx="50" cy="66" rx="5" ry="6" fill="#3a2800" />}
      {bieuCam === "wow" && <path d="M33 60 Q50 84 67 60 Z" fill="#3a2800" />}
      <ellipse cx="26" cy="58" rx="6" ry="3.5" fill="#ff9a8a" opacity="0.55" />
      <ellipse cx="74" cy="58" rx="6" ry="3.5" fill="#ff9a8a" opacity="0.55" />
    </svg>
  );
}

export function LinhVat({ trangThai }: { trangThai: TrangThaiLinhVat }) {
  const { loi, bieuCam } = loiLinhVat(trangThai);
  return (
    <div className="linh-vat" role="status" aria-live="polite">
      <div className="linh-vat-than">
        <Mat bieuCam={bieuCam} />
        <span className="linh-vat-ten">Xu Xu</span>
      </div>
      <p className="linh-vat-loi">{loi}</p>
    </div>
  );
}
