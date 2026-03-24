import { useEffect, useState } from "react";
import { getDashboard } from "@/lib/store";

import { Card, CardContent } from "@/components/ui/card";

import {
  Building2,
  Users,
  Zap,
  IndianRupee,
  BedDouble,
  AlertTriangle,
  GitBranch,
} from "lucide-react";

const Dashboard = () => {
  const [data, setData] = useState<any>(null);

  /* =========================
     LOAD DASHBOARD
  ========================= */
  const loadDashboard = async () => {
    try {
      const res = await getDashboard();
      setData(res);
    } catch (err) {
      console.error("Dashboard load failed", err);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (!data) return null;

  /* =========================
     STATS CARDS (FROM API)
  ========================= */

  const stats = [
    {
      label: "Total Branches",
      value: data.totalBranches,
      sub: "Active hostel units",
      icon: GitBranch,
      color: "text-indigo-600",
    },
    {
      label: "Total Rooms",
      value: data.totalRooms,
      sub: "All branches combined",
      icon: Building2,
      color: "text-primary",
    },
    {
      label: "Total Beds",
      value: data.totalBeds,
      sub: `${data.occupiedBeds} Occupied · ${data.availableBeds} Available`,
      icon: BedDouble,
      color: "text-info",
    },
    {
      label: "Active Tenants",
      value: data.activeTenants,
      sub: "Currently staying",
      icon: Users,
      color: "text-accent",
    },
    {
      label: "EB Units",
      value: data.totalUnits.toLocaleString(),
      sub: "Current Month",
      icon: Zap,
      color: "text-warning",
    },
    {
      label: "Rent Collected",
      value: `₹${data.rentCollected.toLocaleString()}`,
      sub: "Current Month",
      icon: IndianRupee,
      color: "text-success",
    },
    {
      label: "Pending Dues",
      value: `₹${data.pendingDues.toLocaleString()}`,
      sub: `${data.unpaidCount} unpaid`,
      icon: AlertTriangle,
      color: "text-destructive",
    },
  ];

  return (
    <div>
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Hostel overview
        </p>
      </div>

      {/* ================= STATS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label} className="border shadow-none">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.sub}
                  </p>
                </div>

                <div className="h-10 w-10 rounded border bg-muted/50 flex items-center justify-center">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ================= BRANCH STATS ================= */}

      {/* ROOMS BY BRANCH */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold mb-4">
          Rooms by Branch
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.branches.map((b: any) => (
            <Card key={b.branchId}>
              <CardContent className="p-5 flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {b.branchName}
                  </p>
                  <p className="text-2xl font-bold">{b.rooms}</p>
                </div>
                <Building2 className="h-5 w-5 text-primary" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <div className="mt-10">
        <h2 className="text-lg font-semibold mb-4">
          Beds by Branch
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.branches.map((b: any) => (
            <Card key={b.branchId}>
              <CardContent className="p-5 flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {b.branchName}
                  </p>
                  <p className="text-2xl font-bold">{b.beds}</p>
                </div>
                <BedDouble className="h-5 w-5 text-primary" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold mb-4">
          Active Tenants by Branch
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.branches.map((b: any) => (
            <Card key={b.branchId}>
              <CardContent className="p-5 flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {b.branchName}
                  </p>
                  <p className="text-2xl font-bold">
                    {b.activeTenants}
                  </p>
                </div>
                <Users className="h-5 w-5 text-primary" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold mb-4">
          EB Units by Branch
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.branches.map((b: any) => (
            <Card key={b.branchId}>
              <CardContent className="p-5 flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {b.branchName}
                  </p>
                  <p className="text-2xl font-bold">
                    {b.ebUnits}
                  </p>
                </div>
                <Zap className="h-5 w-5 text-warning" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold mb-4">
          Rent Collected by Branch
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.branches.map((b: any) => (
            <Card key={b.branchId}>
              <CardContent className="p-5 flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {b.branchName}
                  </p>
                  <p className="text-2xl font-bold">
                    ₹{b.collected.toLocaleString()}
                  </p>
                </div>
                <IndianRupee className="h-5 w-5 text-green-600" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold mb-4">
          Pending Amount by Branch
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.branches.map((b: any) => (
            <Card key={b.branchId}>
              <CardContent className="p-5 flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {b.branchName}
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    ₹{b.pending.toLocaleString()}
                  </p>
                </div>
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;