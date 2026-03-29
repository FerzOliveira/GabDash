import { Users, TrendingDown, BarChart3, Activity } from "lucide-react";
import "./KpiCard.css";

export default function KpiCard({ title, value, subtitle, icon: Icon, color = "#6366f1" }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon-wrapper" style={{ backgroundColor: `${color}15` }}>
        <Icon size={24} color={color} />
      </div>
      <div className="kpi-content">
        <span className="kpi-title">{title}</span>
        <span className="kpi-value">{value}</span>
        {subtitle && <span className="kpi-subtitle">{subtitle}</span>}
      </div>
    </div>
  );
}
