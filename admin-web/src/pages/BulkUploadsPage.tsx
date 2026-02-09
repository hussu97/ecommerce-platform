import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { TableSkeleton } from "../components/TableSkeleton";
import { ChevronDown, ChevronRight, Upload, ArrowLeft } from "lucide-react";

interface BulkUpload {
  id: string;
  filename: string;
  taxonomy_id: number | null;
  status: string;
  total_rows: number;
  processed_rows: number;
  error_rows: number;
  error_details: Record<string, string> | null;
  created_at: string | null;
  completed_at: string | null;
}

export function BulkUploadsPage() {
  const [uploads, setUploads] = useState<BulkUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchUploads = () =>
    api.get("/products/bulk/uploads").then((r) => setUploads(r.data)).finally(() => setLoading(false));

  useEffect(() => {
    fetchUploads();
    const interval = setInterval(fetchUploads, 5000);
    return () => clearInterval(interval);
  }, []);

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-100 text-amber-800",
      processing: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-sand-divider/50 text-text-muted"}`}>
        {status}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link to="/products" className="p-2 border border-sand-divider rounded-xl hover:bg-sand-divider/30 text-text-primary transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary">Bulk Uploads</h1>
          <p className="text-text-muted mt-1">View status of product bulk imports</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-sand-divider overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background-light border-b border-sand-divider">
              <tr>
                <th className="py-3 px-4 text-left text-sm font-medium text-text-muted w-8"></th>
                <th className="py-3 px-4 text-left text-sm font-medium text-text-muted">Filename</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-text-muted">Taxonomy ID</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-text-muted">Status</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-text-muted">Rows</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-text-muted">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} cols={6} />
              ) : uploads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-text-muted">
                    No bulk uploads yet. Upload a file from the Products page.
                  </td>
                </tr>
              ) : (
                uploads.map((u) => (
                  <Fragment key={u.id}>
                    <tr
                      className="border-b border-sand-divider last:border-0 hover:bg-sand-divider/20 cursor-pointer"
                      onClick={() => setExpanded(expanded === u.id ? null : u.id)}
                    >
                      <td className="py-4 px-4">
                        {expanded === u.id ? <ChevronDown className="h-4 w-4 text-text-muted" /> : <ChevronRight className="h-4 w-4 text-text-muted" />}
                      </td>
                      <td className="py-4 px-4 font-medium text-text-primary">{u.filename}</td>
                      <td className="py-4 px-4 text-text-muted">{u.taxonomy_id ?? "—"}</td>
                      <td className="py-4 px-4">{statusBadge(u.status)}</td>
                      <td className="py-4 px-4 text-text-muted">
                        {u.processed_rows}/{u.total_rows}
                        {u.error_rows > 0 && <span className="text-red-600 ml-1">({u.error_rows} errors)</span>}
                      </td>
                      <td className="py-4 px-4 text-text-muted text-sm">{u.created_at ? new Date(u.created_at).toLocaleString() : "—"}</td>
                    </tr>
                    {expanded === u.id && u.error_details && Object.keys(u.error_details).length > 0 && (
                      <tr key={`${u.id}-errors`} className="bg-red-50/50 border-b border-sand-divider">
                        <td colSpan={6} className="py-4 px-4">
                          <div className="text-sm text-red-800 space-y-1">
                            <p className="font-medium mb-2">Error details:</p>
                            {Object.entries(u.error_details).map(([row, msg]) => (
                              <p key={row}>
                                Row {row}: {msg}
                              </p>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
