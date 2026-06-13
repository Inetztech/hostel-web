import {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";

import {
  fetchAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  shareAnnouncementWhatsApp,
  getUserRole,
} from "@/lib/store";

import { Announcement, AnnouncementRequest } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { toast } from "sonner";
import { Plus, Pencil, Trash2, Send } from "lucide-react";

import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";

/* ================= HELPERS ================= */

function formatDate(raw: string): string {
  try {
    return new Date(raw).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return raw;
  }
}

/* ================= COMPONENT ================= */

const AnnouncementPage = () => {
  /* ================= STATE ================= */

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharingId, setSharingId] = useState<number | null>(null);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<AnnouncementRequest>({
    title: "",
    content: "",
    createdBy: "Admin",
  });

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editAnnouncement, setEditAnnouncement] = useState<Announcement | null>(null);

  const role = getUserRole()?.toUpperCase();
  const hasAccess = role === "ADMIN" || role === "WARDEN";

  const didLoad = useRef(false);


  /* ================= RESET HELPERS ================= */

      const resetCreateForm = () => {
        setForm({
          title: "",
          content: "",
          createdBy: "Admin",
        });
      };

      const closeCreateDialog = () => {
        setAddOpen(false);
        resetCreateForm();
      };

      const closeEditDialog = () => {
        setEditOpen(false);
        setEditAnnouncement(null);
      };

  /* ================= LOAD ================= */

  const reload = useCallback(async () => {
    try {
      const data = await fetchAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load announcements");
    }
  }, []);

  /* ================= INIT ================= */

  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;

    reload();
  }, [reload]);

  /* ================= CRUD ================= */

  const handleCreate = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("All fields are required");
      return;
    }

    try {
      setLoading(true);
      await createAnnouncement(form);

      toast.success("Announcement created");

      closeCreateDialog();

      await reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Create failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editAnnouncement) return;

    if (!editAnnouncement.title?.trim() || !editAnnouncement.content?.trim()) {
      toast.error("All fields are required");
      return;
    }

    try {
      setLoading(true);
      await updateAnnouncement(editAnnouncement.id, {
        title: editAnnouncement.title,
        content: editAnnouncement.content,
        createdBy: editAnnouncement.createdBy,
      } as AnnouncementRequest);

      toast.success("Announcement updated");

      setEditOpen(false);
      setEditAnnouncement(null);

      await reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteAnnouncement(id);

      toast.success("Announcement deleted");

      await reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Delete failed");
    }
  };

  /* ================= SHARE (toast only — no navigation) ================= */

  const handleShare = async (id: number) => {
    try {
      setSharingId(id);

      await shareAnnouncementWhatsApp(id);

      toast.success("Shared on WhatsApp successfully");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "WhatsApp share failed");
    } finally {
      setSharingId(null);
    }
  };

  /* ================= GRID ================= */

  const rowData = useMemo(() => announcements, [announcements]);

  const columnDefs: ColDef<Announcement>[] = useMemo(
    () => [
      {
        headerName: "Title",
        field: "title",
        filter: true,
      },
      {
        headerName: "Content",
        field: "content",
        filter: true,
        flex: 2,
      },
      {
        headerName: "Created By",
        field: "createdBy",
        filter: true,
      },
      {
        headerName: "Created At",
        field: "createdAt",
        filter: true,
        valueFormatter: (params) =>
          params.value ? formatDate(params.value) : "",
      },

      ...(hasAccess
        ? [
            {
              headerName: "Actions",
              cellRenderer: (params: { data: Announcement }) => (
                <div className="flex items-center justify-center gap-2 h-full">

                  {/* EDIT */}
                  <Button
                  size="icon"
                  className="h-9 w-9 rounded-xl bg-blue-500 hover:bg-blue-600 text-white"

                    title="Edit announcement"
                    onClick={() => {
                      setEditAnnouncement({ ...params.data });
                      setEditOpen(true);
                    }}
                  >
                     <Pencil className="h-4 w-4" />
                  </Button>

                  {/* SHARE */}
                  <Button
                  size="icon"
                  className="h-9 w-9 rounded-xl bg-green-500 hover:bg-green-600 text-white"

                    disabled={sharingId === params.data.id}
                    onClick={() => handleShare(params.data.id)}
                    title="Share via WhatsApp"
                  >
                    <Send className="h-4 w-4" />
                  </Button>

                  {/* DELETE */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        className="h-9 w-9 rounded-xl bg-red-500 hover:bg-red-600 text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>

                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Delete "{params.data.title}"?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>

                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async (e) => {
                            e.preventDefault();

                            await handleDelete(params.data.id);
                          }}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                </div>
              ),
            },
          ]
        : []),
    ],
    [hasAccess, sharingId]
  );

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      resizable: true,
      flex: 1,
    }),
    []
  );

  /* ================= UI ================= */

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Announcements
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Create and manage hostel announcements
          </p>
        </div>

        {hasAccess && (
          <Dialog
                open={addOpen}
                onOpenChange={(open) => {
                  setAddOpen(open);

                  if (!open) {
                    resetCreateForm();
                  }
                }}
              >
            <DialogTrigger asChild>
              <Button className="h-11 rounded-xl px-5 bg-blue-600 hover:bg-blue-700 shadow-md">
                <Plus className="h-4 w-4 mr-2" />
                Add Announcement
              </Button>
            </DialogTrigger>

            <DialogContent className="rounded-3xl max-w-lg">

              <DialogHeader>
                <DialogTitle className="text-2xl">
                  Create Announcement
                </DialogTitle>
                <DialogDescription>
                  Share important updates with hostel tenants via WhatsApp.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <Input
                  placeholder="Title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />

                <Input
                  placeholder="Created By"
                  value={form.createdBy}
                  onChange={(e) =>
                    setForm({ ...form, createdBy: e.target.value })
                  }
                />

                <Textarea
                  placeholder="Content"
                  rows={5}
                  value={form.content}
                  onChange={(e) =>
                    setForm({ ...form, content: e.target.value })
                  }
                />
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button
                  variant="outline"
                  onClick={closeCreateDialog}
                >
                  Cancel
                </Button>
                </DialogClose>

                <Button onClick={handleCreate} disabled={loading}>
                  {loading ? "Creating…" : "Create"}
                </Button>
              </DialogFooter>

            </DialogContent>
          </Dialog>
        )}

      </div>

      {/* EDIT DIALOG */}
      <Dialog
            open={editOpen}
            onOpenChange={(open) => {
              setEditOpen(open);

              if (!open) {
                setEditAnnouncement(null);
              }
            }}
          >
        <DialogContent className="rounded-3xl max-w-lg">

          <DialogHeader>
            <DialogTitle className="text-2xl">Edit Announcement</DialogTitle>
            <DialogDescription>
              Update the announcement details.
            </DialogDescription>
          </DialogHeader>

          {editAnnouncement && (
            <div className="space-y-4">
              <Input
                placeholder="Title"
                value={editAnnouncement.title}
                onChange={(e) =>
                  setEditAnnouncement({
                    ...editAnnouncement,
                    title: e.target.value,
                  })
                }
              />

              <Input
                placeholder="Created By"
                value={editAnnouncement.createdBy}
                onChange={(e) =>
                  setEditAnnouncement({
                    ...editAnnouncement,
                    createdBy: e.target.value,
                  })
                }
              />

              <Textarea
                placeholder="Content"
                rows={5}
                value={editAnnouncement.content}
                onChange={(e) =>
                  setEditAnnouncement({
                    ...editAnnouncement,
                    content: e.target.value,
                  })
                }
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeEditDialog}
            >
              Cancel
            </Button>

            <Button onClick={handleEdit} disabled={loading}>
              {loading ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>


        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

    <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 shadow-lg">
      <div className="flex items-center justify-between">

        <div>
          <p className="text-sm text-blue-100">
            Total Announcements
          </p>

          <h2 className="text-3xl font-bold mt-2">
            {announcements.length}
          </h2>
        </div>

        <div className="bg-white/20 p-3 rounded-2xl">
          <Send className="h-7 w-7" />
        </div>

      </div>
    </div>

    <div className="rounded-3xl border bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">
        Active Users
      </p>

      <h2 className="text-3xl font-bold mt-2 text-slate-800">
        {announcements.length}
      </h2>
    </div>

    <div className="rounded-3xl border bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">
        WhatsApp Share Enabled
      </p>

      <h2 className="text-3xl font-bold mt-2 text-green-600">
        Yes
      </h2>
    </div>

  </div>

      {/* GRID */}
      <div className="rounded-3xl overflow-hidden border bg-white shadow-sm">

    <div className="px-6 py-5 border-b bg-slate-50">
      <h2 className="text-lg font-semibold text-slate-800">
        Announcement List
      </h2>

      <p className="text-sm text-slate-500">
        View and manage announcements
      </p>
    </div>

    <div
      className="ag-theme-alpine"
      style={{
        height: 600,
        width: "100%",
      }}
    >
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          pagination
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 20, 50, 100]}
          rowHeight={72}
          headerHeight={60}
          suppressCellFocus={true}
        />
      </div>
    </div>
    </div>
  );
};

export default AnnouncementPage;