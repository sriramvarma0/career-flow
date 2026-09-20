import { Card, CardContent } from "@/components/ui/card";

export function StatsCard({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</div>
        </div>
        {icon ? <div className="absolute right-4 bottom-4 rounded-2xl bg-blue-50 p-2.5 text-blue-700">{icon}</div> : null}
      </CardContent>
    </Card>
  );
}
