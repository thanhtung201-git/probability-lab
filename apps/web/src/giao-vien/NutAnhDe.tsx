import { useEffect, useRef, useState } from "react";
import { api } from "../api";

const CANH_DAI_TOI_DA = 1600;

/** Thu nhỏ ảnh về JPEG có cạnh dài tối đa CANH_DAI_TOI_DA để gửi nhẹ và vừa giới hạn của máy chủ. */
async function thuNho(tep: Blob): Promise<string> {
  const anh = await createImageBitmap(tep);
  const tyLe = Math.min(1, CANH_DAI_TOI_DA / Math.max(anh.width, anh.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(anh.width * tyLe);
  canvas.height = Math.round(anh.height * tyLe);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không xử lý được ảnh");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(anh, 0, 0, canvas.width, canvas.height);
  anh.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

interface Props {
  disabled?: boolean;
  /** Nhận chữ AI chép được từ ảnh (để giáo viên kiểm tra rồi mới cho AI điền biểu mẫu). */
  onChu: (chu: string) => void;
  onLoi: (loi: string | null) => void;
}

/** Nút chụp / chọn ảnh đề; cũng nhận ảnh dán bằng Ctrl+V khi con trỏ đang ở trong khung này. */
export function NutAnhDe({ disabled, onChu, onLoi }: Props) {
  const [dang, setDang] = useState(false);
  const [anh, setAnh] = useState<{ url: string; trangThai: "doc" | "xong" | "loi" } | null>(null);
  const oTep = useRef<HTMLInputElement>(null);
  const goc = useRef<HTMLSpanElement>(null);

  async function xuLy(tep: Blob) {
    setDang(true);
    onLoi(null);
    let url: string | null = null;
    try {
      url = await thuNho(tep);
      setAnh({ url, trangThai: "doc" });
      const { noi_dung } = await api.docAnhDe(url);
      onChu(noi_dung);
      setAnh({ url, trangThai: "xong" });
    } catch (e) {
      if (url) setAnh({ url, trangThai: "loi" });
      onLoi((e as Error).message);
    } finally {
      setDang(false);
    }
  }

  // Dán ảnh (Ctrl+V) ở bất kỳ đâu trong trang cha gần nhất là một thẻ; chỉ bắt khi trong clipboard có ảnh.
  useEffect(() => {
    const cha = goc.current?.closest(".the") ?? document;
    const khiDan = (ev: Event) => {
      if (disabled || dang) return;
      const tep = [...((ev as ClipboardEvent).clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
      if (!tep) return;
      ev.preventDefault();
      void xuLy(tep);
    };
    cha.addEventListener("paste", khiDan);
    return () => cha.removeEventListener("paste", khiDan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, dang]);

  return (
    <span ref={goc}>
      <input
        ref={oTep}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const tep = e.target.files?.[0];
          e.target.value = "";
          if (tep) void xuLy(tep);
        }}
      />
      <button type="button" className="phu" onClick={() => oTep.current?.click()} disabled={disabled || dang}>
        {anh ? "📷 Chụp lại" : "📷 Chụp / chọn ảnh đề"}
      </button>
      {anh && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginLeft: "0.6rem", verticalAlign: "middle" }}>
          <span style={{ position: "relative", display: "inline-block" }}>
            <img
              src={anh.url}
              alt="Ảnh đề đã chụp"
              style={{ width: 120, height: 72, objectFit: "contain", background: "#fff", borderRadius: 10, border: "1px solid #555", display: "block" }}
            />
            <button
              type="button"
              aria-label="Bỏ ảnh"
              onClick={() => setAnh(null)}
              disabled={dang}
              style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, padding: 0, lineHeight: "18px", borderRadius: "50%", fontSize: 12 }}
            >
              ×
            </button>
          </span>
          <span className="muted">
            {anh.trangThai === "doc" ? "Đang đọc ảnh…" : anh.trangThai === "xong" ? "Đã chụp, chữ đã điền vào ô đề" : "Đã chụp nhưng chưa đọc được"}
          </span>
        </span>
      )}
    </span>
  );
}
