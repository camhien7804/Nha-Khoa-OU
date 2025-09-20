import { useEffect, useState } from "react";
import api from "../../api";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import QRCodeScanner from "../../components/inventory/QRCodeScanner";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const empty = { sku: "", name: "", quantity: 0, unit: "pcs", minQuantity: 0, note: "" };

export default function AdminInventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetDelete, setTargetDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);

  // 🔍 Tìm kiếm & lọc
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  // ---- QR scan states ----
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanDelta, setScanDelta] = useState(-1);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrTarget, setQrTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/inventory");
      setItems(res?.data?.data || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Không thể tải kho vật tư");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(empty);
    setModalOpen(true);
    setErr("");
  }
  function openEdit(row) {
    setEditingId(row._id);
    setForm({
      sku: row.sku || "",
      name: row.name || "",
      quantity: row.quantity ?? 0,
      unit: row.unit || "pcs",
      minQuantity: row.minQuantity ?? 0,
      note: row.note || "",
    });
    setModalOpen(true);
  }
  function openQR(row) {
    setQrTarget(row);
    setQrModalOpen(true);
  }

  async function submit(e) {
    e?.preventDefault();
    setSaving(true);
    setErr("");
    if (!form.sku || !form.name) {
      setErr("SKU và tên là bắt buộc");
      setSaving(false);
      return;
    }
    try {
      const payload = {
        sku: form.sku,
        name: form.name,
        quantity: Number(form.quantity) || 0,
        unit: form.unit,
        minQuantity: Number(form.minQuantity) || 0,
        note: form.note,
      };
      if (editingId) await api.put(`/inventory/${editingId}`, payload);
      else await api.post("/inventory", payload);
      setModalOpen(false);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  }

  function askDelete(row) {
    setTargetDelete(row);
    setConfirmOpen(true);
  }
  async function confirmDelete() {
    if (!targetDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/inventory/${targetDelete._id}`);
      setConfirmOpen(false);
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setDeleting(false);
    }
  }

  // 📌 Xuất Excel báo cáo kho
  function exportToExcel() {
    if (!items || items.length === 0) {
      toast.error("Không có dữ liệu để xuất!");
      return;
    }

    const data = items.map((it, index) => ({
      STT: index + 1,
      SKU: it.sku,
      Tên: it.name,
      "Số lượng": it.quantity,
      "Đơn vị": it.unit,
      "Tồn tối thiểu": it.minQuantity,
      "Ghi chú": it.note || "",
      "Cập nhật": new Date(it.updatedAt).toLocaleString("vi-VN"),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Kho vật tư");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `inventory_report_${Date.now()}.xlsx`);
  }

  // ---- Handle scanned QR (value = _id) ----
  async function handleDetected(scannedText) {
    try {
      const id = scannedText.trim();
      const delta = Number(scanDelta) || -1;

      const res = await api.put(`/inventory/${id}/qr-update`, { delta });

      if (res?.data?.success) {
        const item = res.data.data;
        const action = delta > 0 ? "cộng thêm" : "trừ";

        // ✅ cập nhật state ngay
        setItems((prev) =>
          prev.map((it) => (it._id === id ? { ...it, quantity: item.quantity } : it))
        );

        // ✅ highlight dòng vừa quét
        setHighlightedId(item._id);
        setTimeout(() => setHighlightedId(null), 2000);

        // ✅ hiển thị toast
        if (item.quantity <= item.minQuantity) {
          toast.error(
            `⚠️ Tồn kho ${item.name} còn ${item.quantity} ${item.unit}, dưới mức tối thiểu!`,
            {
              duration: 5000,
              style: {
                fontSize: "18px",
                fontWeight: "bold",
                padding: "16px 24px",
                minWidth: "400px",
                background: "#fee2e2",
                color: "#b91c1c",
              },
            }
          );
        } else {
          toast.success(
            `Đã ${action} ${Math.abs(delta)} ${item.unit} ${item.name}`,
            {
              duration: 4000,
              style: {
                fontSize: "18px",
                padding: "16px 24px",
                minWidth: "350px",
                background: "#ecfdf5",
                color: "#065f46",
              },
            }
          );
        }
      } else {
        toast.error(res?.data?.message || "Không thể cập nhật số lượng");
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    }
  }

  // 📌 Dữ liệu sau khi tìm kiếm & lọc
  const filteredItems = items.filter((it) => {
    const matchSearch =
      it.name.toLowerCase().includes(search.toLowerCase()) ||
      it.sku.toLowerCase().includes(search.toLowerCase());

    let matchFilter = true;
    if (filter === "low") matchFilter = it.quantity > 0 && it.quantity <= it.minQuantity;
    if (filter === "out") matchFilter = it.quantity === 0;
    if (filter === "enough") matchFilter = it.quantity > it.minQuantity;

    return matchSearch && matchFilter;
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-2xl font-bold text-blue-700">Kho vật tư</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Thêm vật tư
          </button>
          <button
            onClick={() => setScannerOpen((v) => !v)}
            className={`px-4 py-2 text-white rounded-lg ${
              scannerOpen ? "bg-gray-600" : "bg-green-600"
            }`}
          >
            {scannerOpen ? "Đóng quét QR" : "Quét QR"}
          </button>
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Xuất Excel
          </button>
          {scannerOpen && (
            <div className="flex items-center gap-2 ml-2">
              <label className="text-sm">Số lượng mỗi lần quét</label>
              <input
                type="number"
                className="w-24 border rounded px-2 py-1"
                value={scanDelta}
                onChange={(e) => setScanDelta(Number(e.target.value))}
              />
              <span className="text-xs text-gray-500">
                (âm để trừ, dương để cộng)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Thanh tìm kiếm + bộ lọc */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
        <input
          type="text"
          placeholder="🔍 Tìm theo SKU hoặc Tên..."
          className="border px-3 py-2 rounded w-full md:w-64"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="all">Tất cả</option>
          <option value="enough">Đủ hàng</option>
          <option value="low">Sắp hết</option>
          <option value="out">Đã hết</option>
        </select>
      </div>

      {/* Khu vực quét QR */}
      {scannerOpen && (
        <div className="bg-white rounded-xl border p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">
            Quét QR để cập nhật số lượng
          </h2>
          <QRCodeScanner onDetected={handleDetected} />
        </div>
      )}

      {/* Danh sách vật tư */}
      {loading ? (
        <div className="text-gray-500">Đang tải…</div>
      ) : err ? (
        <div className="text-red-600">{err}</div>
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-3 py-2 text-left">SKU</th>
                <th className="px-3 py-2 text-left">Tên</th>
                <th className="px-3 py-2 text-left">Số lượng</th>
                <th className="px-3 py-2 text-left">Đơn vị</th>
                <th className="px-3 py-2 text-left">Tồn tối thiểu</th>
                <th className="px-3 py-2 text-left">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-gray-500"
                  >
                    Không tìm thấy dữ liệu
                  </td>
                </tr>
              ) : (
                filteredItems.map((it) => (
                  <tr
                    key={it._id}
                    className={`border-t transition-colors duration-500 ${
                      highlightedId === it._id ? "bg-yellow-100" : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-3 py-2">{it.sku}</td>
                    <td className="px-3 py-2">{it.name}</td>
                    <td className="px-3 py-2">{it.quantity}</td>
                    <td className="px-3 py-2">{it.unit}</td>
                    <td className="px-3 py-2">{it.minQuantity}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openEdit(it)}
                          className="px-3 py-1 rounded border hover:bg-blue-50"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => openQR(it)}
                          className="px-3 py-1 rounded border hover:bg-green-50"
                        >
                          Xem QR
                        </button>
                        <button
                          onClick={() => askDelete(it)}
                          className="px-3 py-1 rounded border text-red-600 hover:bg-red-50"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Thêm/Sửa */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Cập nhật vật tư" : "Thêm vật tư"}
      >
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm">SKU</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm">Tên</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm">Số lượng</label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm">Đơn vị</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm">Tồn tối thiểu</label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                value={form.minQuantity}
                onChange={(e) =>
                  setForm({ ...form, minQuantity: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <label className="block text-sm">Ghi chú</label>
            <textarea
              className="w-full border rounded px-3 py-2"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            ></textarea>
          </div>

          {err && <div className="text-red-600">{err}</div>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded border"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-4 py-2 rounded text-white ${
                saving ? "bg-gray-300" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {saving
                ? "Đang lưu..."
                : editingId
                ? "Cập nhật"
                : "Thêm"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal hiển thị QR của 1 vật tư */}
      <Modal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        title={`QR Code - ${qrTarget?.name || ""}`}
      >
        {qrTarget ? (
          <div className="flex flex-col items-center gap-2">
            <QRCodeSVG value={qrTarget._id} size={180} />
            <div className="text-xs text-gray-600">
              ID: <span className="font-mono">{qrTarget._id}</span>
            </div>
            <div className="text-xs text-gray-600">
              In nhãn QR và dán lên vật tư. Quét để cập nhật số lượng.
            </div>
          </div>
        ) : (
          <div className="text-gray-500">Không có dữ liệu</div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        title="Xác nhận xóa"
        message={`Bạn có chắc muốn xóa "${targetDelete?.name}"?`}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </div>
  );
}
