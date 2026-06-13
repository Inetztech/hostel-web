import {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";

import {
  getFoodSchedules,
  createFoodSchedule,
  updateFoodSchedule,
  deleteFoodSchedule,
  getUserRole,
} from "@/lib/store";

import {
  FoodTimetable,
  FoodTimetableRequest,
} from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

import {
  Plus,
  Pencil,
  Trash2,
  Download,
  Printer,
} from "lucide-react";

import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";

/* =====================================================
   CONSTANTS
===================================================== */
const ALL_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/* =====================================================
   TAMIL DAY NAME MAP
===================================================== */
const DAY_TAMIL: Record<string, string> = {
  monday:    "திங்கள்",
  tuesday:   "செவ்வாய்",
  wednesday: "புதன்",
  thursday:  "வியாழன்",
  friday:    "வெள்ளி",
  saturday:  "சனி",
  sunday:    "ஞாயிறு",
};

function tamilDay(day: string): string {
  return DAY_TAMIL[day.trim().toLowerCase()] ?? day;
}

/* =====================================================
   TAMIL MEAL NAME MAP
===================================================== */
const MEAL_TAMIL: Record<string, string> = {
  "semiya":              "சேமியா",
  "khichdi":              "கிச்சடி",
  "pongal":               "பொங்கல்",
  "upma":                 "உப்மா",
  "rava upma":            "ரவா உப்மா",
  "idli":                 "இட்லி",
  "idly":                 "இட்லி",
  "dosa":                 "தோசை",
  "dosai":                "தோசை",
  "chapati":              "சப்பாத்தி",
  "puri":                 "பூரி",
  "bread":                "பிரட்",
  "omelette":             "ஆம்லெட்",
  "egg":                  "முட்டை",
  "puttu":                "புட்டு",
  "appam":                "ஆப்பம்",
  "idiyappam":            "இடியாப்பம்",
  "poori":                "பூரி",
  "parotta":              "பரோட்டா",
  "thakkali sadham":      "தக்காளி சாதம்",
  "tomato rice":          "தக்காளி சாதம்",
  "sambar sadham":        "சாம்பார் சாதம்",
  "thayir sadham":        "தயிர் சாதம்",
  "curd rice":            "தயிர் சாதம்",
  "kara kuzhambu":        "கார குழம்பு",
  "puliyodharai":         "புளியோதரை",
  "tamarind rice":        "புளியோதரை",
  "lemon rice":           "எலுமிச்சை சாதம்",
  "coconut rice":         "தேங்காய் சாதம்",
  "variety rice":         "வெரைட்டி சாதம்",
  "fried rice":           "பிரைட் ரைஸ்",
  "chicken":              "சிக்கன்",
  "chicken curry":        "சிக்கன் கறி",
  "fish curry":           "மீன் கறி",
  "egg curry":            "முட்டை கறி",
  "pirinji":              "பிரிஞ்சி",
  "biryani":              "பிரியாணி",
  "biriyani":             "பிரியாணி",
  "mutta":                "முட்டை",
  "rice":                 "சாதம்",
  "white rice":           "வெள்ளை சாதம்",
  "sambar":               "சாம்பார்",
  "rasam":                "ரசம்",
  "sambar / rasam":       "சாம்பார் / ரசம்",
  "chutney":              "சட்னி",
  "coconut chutney":      "தேங்காய் சட்னி",
  "tomato chutney":       "தக்காளி சட்னி",
  "pickle":               "ஊறுகாய்",
  "papad":                "அப்பளம்",
  "appalam":              "அப்பளம்",
  "raita":                "ரைத்தா",
  "dal":                  "பருப்பு",
  "kootu":                "கூட்டு",
  "poriyal":              "பொரியல்",
  "curry":                "கறி",
  "food":                 "சாப்பாடு",
};

function tamilMeal(meal: string): string {
  if (!meal) return meal;
  const key = meal.trim().toLowerCase();
  if (MEAL_TAMIL[key]) return MEAL_TAMIL[key];
  const plusSep  = meal.includes(" + ");
  const dashSep  = meal.includes(" - ");
  const separator = plusSep ? " + " : dashSep ? " - " : null;
  if (separator) {
    return meal
      .split(separator)
      .map((part) => MEAL_TAMIL[part.trim().toLowerCase()] ?? part.trim())
      .join(separator);
  }
  return meal;
}

/* =====================================================
   COMPONENT
===================================================== */
const FoodTimetablePage = () => {

  /* ── STATE ── */
  const [schedules,    setSchedules]    = useState<FoodTimetable[]>([]);
  const [form,         setForm]         = useState<FoodTimetableRequest>({ dayName: "", breakfast: "", lunch: "", dinner: "" });
  const [addOpen,      setAddOpen]      = useState(false);
  const [editOpen,     setEditOpen]     = useState(false);
  const [editSchedule, setEditSchedule] = useState<FoodTimetable | null>(null);
  const [downloading,  setDownloading]  = useState(false);
  const [printing,     setPrinting]     = useState(false);

  const role      = getUserRole()?.toUpperCase();
  const hasAccess = role === "ADMIN";
  const didLoad   = useRef(false);

  /* ── DERIVED: days not yet scheduled ── */
  const usedDays = useMemo(
    () => schedules.map((s) => s.dayName.trim().toLowerCase()),
    [schedules]
  );

  const availableDays = useMemo(
    () => ALL_DAYS.filter((d) => !usedDays.includes(d.toLowerCase())),
    [usedDays]
  );

  /* Hide Add button when all 7 days are already scheduled */
  const allDaysScheduled = schedules.length >= 7;

  /* ── LOAD ── */
  const reload = useCallback(async () => {
    try {
      const data = await getFoodSchedules();
      setSchedules(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load food schedules");
    }
  }, []);

  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    reload();
  }, [reload]);

  /* ── ADD ── */
  const handleAdd = async () => {
    if (!form.dayName || !form.breakfast || !form.lunch || !form.dinner) {
      toast.error("All fields are required");
      return;
    }
    try {
      await createFoodSchedule(form);
      toast.success("Food Schedule Created");
      setAddOpen(false);
      setForm({ dayName: "", breakfast: "", lunch: "", dinner: "" });
      await reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Create failed");
    }
  };

  /* ── UPDATE ── */
  const handleEdit = async () => {
    if (!editSchedule) return;
    try {
      await updateFoodSchedule(editSchedule.id, {
        dayName:   editSchedule.dayName,
        breakfast: editSchedule.breakfast,
        lunch:     editSchedule.lunch,
        dinner:    editSchedule.dinner,
      });
      toast.success("Food Schedule Updated");
      setEditOpen(false);
      setEditSchedule(null);
      await reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Update failed");
    }
  };

  /* ── DELETE ── */
  const handleDelete = async (id: number) => {
    try {
      await deleteFoodSchedule(id);
      toast.success("Food Schedule Deleted");
      await reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Delete failed");
    }
  };

  /* =====================================================
     DOWNLOAD – ENGLISH ONLY WORD (.docx)
  ===================================================== */
  const handleDownloadDocx = async () => {
    if (schedules.length === 0) { toast.error("No schedules to download"); return; }
    setDownloading(true);

    try {
      const {
        Document, Packer, Paragraph, TextRun,
        Table, TableRow, TableCell,
        AlignmentType, WidthType, BorderStyle,
        ShadingType, VerticalAlign,
      } = await import("docx");

      const { saveAs } = await import("file-saver");

      const bHead  = { style: BorderStyle.SINGLE, size: 4, color: "1D4ED8" };
      const bLight = { style: BorderStyle.SINGLE, size: 1, color: "BFDBFE" };
      const bordersHead  = { top: bHead,  bottom: bHead,  left: bHead,  right: bHead  };
      const bordersLight = { top: bLight, bottom: bLight, left: bLight, right: bLight };

      const colW = [1900, 2375, 2375, 2376];

      const hCell = (label: string, i: number) =>
        new TableCell({
          borders: bordersHead,
          width: { size: colW[i], type: WidthType.DXA },
          shading: { fill: "1D4ED8", type: ShadingType.CLEAR },
          verticalAlign: VerticalAlign.CENTER,
          margins: { top: 120, bottom: 120, left: 140, right: 140 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: label, bold: true, color: "FFFFFF", size: 24, font: "Arial" }),
              ],
            }),
          ],
        });

      const headerRow = new TableRow({
        tableHeader: true,
        children: [
          hCell("Day",       0),
          hCell("Breakfast", 1),
          hCell("Lunch",     2),
          hCell("Dinner",    3),
        ],
      });

      const dataRows = schedules.map((s, idx) => {
        const rowFill = idx % 2 === 0 ? "EFF6FF" : "FFFFFF";
        const dayFill = idx % 2 === 0 ? "DBEAFE" : "EFF6FF";

        const mealCell = (text: string, i: number) =>
          new TableCell({
            borders: bordersLight,
            width: { size: colW[i], type: WidthType.DXA },
            shading: { fill: rowFill, type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 90, bottom: 90, left: 140, right: 140 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: text ?? "", size: 20, font: "Arial", color: "1E293B" }),
                ],
              }),
            ],
          });

        return new TableRow({
          children: [
            new TableCell({
              borders: bordersLight,
              width: { size: colW[0], type: WidthType.DXA },
              shading: { fill: dayFill, type: ShadingType.CLEAR },
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 90, bottom: 90, left: 140, right: 140 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: s.dayName, bold: true, size: 22, font: "Arial", color: "1D4ED8" }),
                  ],
                }),
              ],
            }),
            mealCell(s.breakfast, 1),
            mealCell(s.lunch,     2),
            mealCell(s.dinner,    3),
          ],
        });
      });

      const doc = new Document({
        styles: {
          default: { document: { run: { font: "Arial", size: 20 } } },
        },
        sections: [{
          properties: {
            page: {
              size: { width: 11906, height: 16838 },
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
            },
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 60 },
              children: [
                new TextRun({ text: "Hostel Food Time Table", bold: true, size: 44, font: "Arial", color: "1D4ED8" }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 60 },
              children: [
                new TextRun({ text: "Weekly Meal Schedule", size: 26, font: "Arial", color: "3B82F6" }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 80 },
              children: [
                new TextRun({ text: "Hostel HMS – Management System", size: 20, font: "Arial", color: "64748B" }),
              ],
            }),
            new Paragraph({
              spacing: { after: 200 },
              border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: "1D4ED8", space: 1 } },
              children: [],
            }),
            new Paragraph({
              spacing: { after: 40 },
              children: [
                new TextRun({ text: "Morning (Breakfast) : ",  bold: true, size: 20, font: "Arial", color: "1E293B" }),
                new TextRun({ text: "8:00 AM – 9:30 AM",       size: 20,   font: "Arial",           color: "475569" }),
              ],
            }),
            new Paragraph({
              spacing: { after: 40 },
              children: [
                new TextRun({ text: "Afternoon (Lunch) : ",    bold: true, size: 20, font: "Arial", color: "1E293B" }),
                new TextRun({ text: "1:00 PM – 2:00 PM",       size: 20,   font: "Arial",           color: "475569" }),
              ],
            }),
            new Paragraph({
              spacing: { after: 240 },
              children: [
                new TextRun({ text: "Night (Dinner) : ",       bold: true, size: 20, font: "Arial", color: "1E293B" }),
                new TextRun({ text: "8:30 PM – 9:30 PM",       size: 20,   font: "Arial",           color: "475569" }),
              ],
            }),
            new Table({
              width: { size: 9026, type: WidthType.DXA },
              columnWidths: colW,
              rows: [headerRow, ...dataRows],
            }),
            new Paragraph({
              spacing: { before: 400, after: 60 },
              children: [
                new TextRun({ text: "Note: ", bold: true, size: 18, font: "Arial", color: "475569" }),
                new TextRun({
                  text: "Items like Chapati, Dosai, Puri are temporarily suspended. They will be resumed once the issue is resolved.",
                  size: 18, font: "Arial", color: "64748B",
                }),
              ],
            }),
            new Paragraph({
              spacing: { before: 80 },
              children: [
                new TextRun({ text: "– Hostel Management", size: 18, font: "Arial", italics: true, color: "94A3B8" }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { before: 200 },
              children: [
                new TextRun({
                  text: `Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}`,
                  size: 16, font: "Arial", color: "94A3B8", italics: true,
                }),
              ],
            }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, "food-timetable-english.docx");
      toast.success("Downloaded");

    } catch (err) {
      console.error(err);
      toast.error("Failed to generate document");
    } finally {
      setDownloading(false);
    }
  };

  /* =====================================================
     PRINT – TAMIL ONLY
  ===================================================== */
  const handlePrint = () => {
    if (schedules.length === 0) { toast.error("No schedules to print"); return; }
    setPrinting(true);

    const rows = schedules
      .map((s, i) => `
        <tr style="background:${i % 2 === 0 ? "#eff6ff" : "#fff"}">
          <td class="day-cell" style="background:${i % 2 === 0 ? "#dbeafe" : "#eff6ff"}">
            ${tamilDay(s.dayName)}
          </td>
          <td>${tamilMeal(s.breakfast)}</td>
          <td>${tamilMeal(s.lunch)}</td>
          <td>${tamilMeal(s.dinner)}</td>
        </tr>`)
      .join("");

    const dateStr = new Date().toLocaleDateString("ta-IN", {
      day: "2-digit", month: "long", year: "numeric",
    });

    const html = `<!DOCTYPE html>
<html lang="ta">
<head>
<meta charset="UTF-8"/>
<title>விடுதி உணவு அட்டவணை</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600;700&display=swap" rel="stylesheet"/>
<style>
  *  { margin:0; padding:0; box-sizing:border-box }
  body {
    font-family: 'Noto Sans Tamil', serif;
    padding: 28px 36px;
    color: #1e293b;
    background: #fff;
    font-size: 11pt;
  }
  .title-main {
    font-size: 22pt;
    font-weight: 700;
    color: #1d4ed8;
    text-align: center;
    display: block;
    margin-bottom: 4px;
  }
  .title-sub {
    font-size: 11pt;
    color: #64748b;
    text-align: center;
    display: block;
    margin-bottom: 12px;
  }
  hr { border: none; border-top: 3px solid #1d4ed8; margin: 10px 0 14px }
  .timings { font-size: 10pt; margin-bottom: 14px; line-height: 2.1 }
  .timings .lbl { font-weight: 700; color: #1e293b }
  .timings .val { color: #475569 }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px }
  thead tr { background: #1d4ed8 }
  thead th {
    padding: 10px 12px;
    color: #fff;
    border: 1.5px solid #1d4ed8;
    text-align: center;
    vertical-align: middle;
    font-size: 13pt;
    font-weight: 700;
  }
  tbody td {
    padding: 8px 12px;
    border: 1px solid #bfdbfe;
    font-size: 11pt;
    color: #1e293b;
    vertical-align: middle;
  }
  .day-cell {
    font-size: 13pt;
    font-weight: 700;
    color: #1d4ed8;
    vertical-align: middle;
  }
  .note { font-size: 9.5pt; color: #64748b; line-height: 1.9; margin-top: 6px }
  .note b { color: #475569 }
  .sign { margin-top: 12px; font-size: 10pt; color: #475569 }
  .gen  { text-align: right; font-size: 8pt; color: #94a3b8; font-style: italic; margin-top: 10px }
  @media print {
    body { padding: 8mm 12mm }
    @page { size: A4 portrait; margin: 8mm 12mm }
  }
</style>
</head>
<body>
  <span class="title-main">விடுதி உணவு அட்டவணை</span>
  <span class="title-sub">விடுதி மேலாண்மை அமைப்பு – Hostel HMS</span>
  <hr/>
  <div class="timings">
    <span class="lbl">காலை :</span> <span class="val">காலை 8:00 – 9:30</span><br/>
    <span class="lbl">மதியம் :</span> <span class="val">மதியம் 1:00 – 2:00</span><br/>
    <span class="lbl">இரவு :</span> <span class="val">இரவு 8:30 – 9:30</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>நாள்</th>
        <th>காலை</th>
        <th>மதியம்</th>
        <th>இரவு</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="note">
    <p>
      <b>குறிப்பு:</b>
      சிவிண்டர் பிரச்சினையால் சப்பாத்தி, தோசை, பூரி போன்ற உணவு தற்காலிகமாக
      நிறுத்திவைக்கப்பட்டுள்ளன. பிரச்சினை தீர்ந்தபின் மீண்டும் வழங்கப்படும்.
    </p>
  </div>
  <div class="sign">இப்படிக்கு, விடுதி நிர்வாகம்.</div>
  <div class="gen">உருவாக்கப்பட்ட தேதி: ${dateStr}</div>
  <script>
    document.fonts.ready.then(() => {
      window.print();
      window.onafterprint = () => window.close();
    });
  <\/script>
</body>
</html>`;

    const w = window.open("", "_blank", "width=900,height=720");
    if (w) {
      w.document.write(html);
      w.document.close();
    } else {
      toast.error("Popup blocked – please allow popups for this site.");
    }
    setPrinting(false);
  };

  /* ── GRID ── */
  const rowData = useMemo(() => schedules, [schedules]);

  const columnDefs: ColDef<FoodTimetable>[] = useMemo(
    () => [
      { headerName: "Day",       field: "dayName",   filter: true },
      { headerName: "Breakfast", field: "breakfast", filter: true },
      { headerName: "Lunch",     field: "lunch",     filter: true },
      { headerName: "Dinner",    field: "dinner",    filter: true },
      ...(hasAccess
        ? [{
            headerName: "Actions",
            cellRenderer: (params: { data: FoodTimetable }) => (
              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => { setEditSchedule({ ...params.data }); setEditOpen(true); }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Food Schedule?</AlertDialogTitle>
                      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(params.data.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ),
          }]
        : []),
    ],
    [hasAccess]
  );

  const defaultColDef = useMemo(
    () => ({ sortable: true, resizable: true, flex: 1 }),
    []
  );

  /* ── UI ── */
  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">

        <div>
          <h1 className="text-2xl font-bold">Food Timetable</h1>
          <p className="text-sm text-muted-foreground">{schedules.length} schedules</p>
        </div>

        <div className="flex items-center gap-2">

          {/* PRINT – Tamil only */}
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrint}
            disabled={printing || schedules.length === 0}
          >
            <Printer className="h-4 w-4 mr-2" />
            {printing ? "Opening..." : "Print (Tamil)"}
          </Button>

          {/* DOWNLOAD – English only .docx */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadDocx}
            disabled={downloading || schedules.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            {downloading ? "Generating..." : "Download (English)"}
          </Button>

          {/* ADD – admin only, hidden when all 7 days are scheduled */}
          {hasAccess && !allDaysScheduled && (
            <Dialog
              open={addOpen}
              onOpenChange={(open) => {
                setAddOpen(open);
                if (!open) {
                  setForm({ dayName: "", breakfast: "", lunch: "", dinner: "" });
                }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Schedule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Food Schedule</DialogTitle>
                  <DialogDescription>Create weekly food timetable</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Day dropdown – only shows unscheduled days */}
                  <select
                    value={form.dayName}
                    onChange={(e) => setForm({ ...form, dayName: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Select Day</option>
                    {availableDays.map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                  <Input
                    placeholder="Breakfast"
                    value={form.breakfast}
                    onChange={(e) => setForm({ ...form, breakfast: e.target.value })}
                  />
                  <Input
                    placeholder="Lunch"
                    value={form.lunch}
                    onChange={(e) => setForm({ ...form, lunch: e.target.value })}
                  />
                  <Input
                    placeholder="Dinner"
                    value={form.dinner}
                    onChange={(e) => setForm({ ...form, dinner: e.target.value })}
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleAdd}>Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

        </div>
      </div>

      {/* EDIT DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Food Schedule</DialogTitle>
            <DialogDescription>Update timetable details</DialogDescription>
          </DialogHeader>
          {editSchedule && (
            <div className="space-y-4">
              <Input
                value={editSchedule.dayName}
                onChange={(e) => setEditSchedule({ ...editSchedule, dayName: e.target.value })}
              />
              <Input
                value={editSchedule.breakfast}
                onChange={(e) => setEditSchedule({ ...editSchedule, breakfast: e.target.value })}
              />
              <Input
                value={editSchedule.lunch}
                onChange={(e) => setEditSchedule({ ...editSchedule, lunch: e.target.value })}
              />
              <Input
                value={editSchedule.dinner}
                onChange={(e) => setEditSchedule({ ...editSchedule, dinner: e.target.value })}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GRID */}
      <div className="ag-theme-alpine" style={{ height: 513 }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          pagination
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 20, 50, 100]}
        />
      </div>

    </div>
  );
};

export default FoodTimetablePage;