// // import { ShieldX, Info } from "lucide-react";
// // import AbscondedListPanel from "@/components/AbscondedListPanel";
// // import { getUserRole } from "@/lib/auth";

// // /**
// //  * Standalone Absconded List. This is the one module a new (Free plan) customer can open.
// //  * Same data and filters as the Tenants-page dialog; both render AbscondedListPanel.
// //  */
// // export default function AbscondedPage() {
// //   const isCustomer = getUserRole() === "CUSTOMER";

// //   return (
// //     <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
// //       <AbscondedListPanel
// //         active
// //         renderHeader={(total) => (
// //           <div className="space-y-1">
// //             <h2 className="flex items-center gap-2 text-lg font-semibold text-orange-700">
// //               <ShieldX className="h-5 w-5 shrink-0" aria-hidden="true" /> Absconded Tenants
// //               <span className="text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-full px-2 py-0.5">
// //                 {total}
// //               </span>
// //             </h2>
// //             <p className="text-sm text-slate-500">
// //               Absconded tenants reported across hostel admins and branches. Check a prospective tenant before you admit them.
// //             </p>
// //             {isCustomer && (
// //               <p className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
// //                 <Info className="h-4 w-4 shrink-0 mt-px" aria-hidden="true" />
// //                 ID proof numbers and emails are partly hidden on your plan.
// //               </p>
// //             )}
// //           </div>
// //         )}
// //       />
// //     </div>
// //   );
// // }































// import { ShieldX, Info } from "lucide-react";
// import AbscondedListPanel from "@/components/AbscondedListPanel";
// import { getUserRole } from "@/lib/auth";

// /**
//  * Standalone Absconded List. This is the one module a new (Free plan) customer can open.
//  * Same data and filters as the Tenants-page dialog; both render AbscondedListPanel.
//  */
// export default function AbscondedPage() {
//   const isCustomer = getUserRole() === "CUSTOMER";

//   return (
//     <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
//       <AbscondedListPanel
//         active
//         renderHeader={(total) => (
//           <div className="space-y-1">
//             <h2 className="flex items-center gap-2 text-lg font-semibold text-orange-700">
//               <ShieldX className="h-5 w-5 shrink-0" aria-hidden="true" /> Absconded Tenants
//               <span className="text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-full px-2 py-0.5">
//                 {total}
//               </span>
//             </h2>
//             <p className="text-sm text-slate-500">
//               Absconded tenants reported across hostel admins and branches. Check a prospective tenant before you admit them.
//             </p>
//             {isCustomer && (
//               <p className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
//                 <Info className="h-4 w-4 shrink-0 mt-px" aria-hidden="true" />
//                 ID proof numbers and emails are partly hidden on your plan. Search a full phone, Aadhaar, Voter ID or Driving Licence number to see that tenant’s full details.
//               </p>
//             )}
//           </div>
//         )}
//       />
//     </div>
//   );
// }










































import { ShieldX, Info } from "lucide-react";
import AbscondedListPanel from "@/components/AbscondedListPanel";
import { getUserRole } from "@/lib/auth";

/**
 * Standalone Absconded List. This is the one module a new (Free plan) customer can open.
 * Same data and filters as the Tenants-page dialog; both render AbscondedListPanel.
 */
export default function AbscondedPage() {
  const isCustomer = getUserRole() === "CUSTOMER";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
      <AbscondedListPanel
        active
        searchOnly={isCustomer}
        renderHeader={(total) => (
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-orange-700">
              <ShieldX className="h-5 w-5 shrink-0" aria-hidden="true" /> Absconded Tenants
              {!isCustomer && (
                <span className="text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-full px-2 py-0.5">
                  {total}
                </span>
              )}
            </h2>
            <p className="text-sm text-slate-500">
              {isCustomer
                ? "Check a prospective tenant before you admit them: search a full phone, Aadhaar, Voter ID or Driving Licence number to see their absconded record."
                : "Absconded tenants reported across hostel admins and branches. Check a prospective tenant before you admit them."}
            </p>
            {isCustomer && (
              <p className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                <Info className="h-4 w-4 shrink-0 mt-px" aria-hidden="true" />
                The list is not browsable on your plan. A matching record shows its full details.
              </p>
            )}
          </div>
        )}
      />
    </div>
  );
}
